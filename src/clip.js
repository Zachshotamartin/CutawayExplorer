import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2, Vector3 } from 'three';
const EPS = 1e-6;
const key = p => p.map(value => Math.round(value / EPS)).join(',');
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function inside(point, polygon) {
  let contained = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) contained = !contained;
  }
  return contained;
}
function geometryFrom(positions) {
  const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  if (positions.length) { geometry.computeVertexNormals(); geometry.computeBoundingSphere(); }
  return geometry;
}

/** Clip a closed triangular solid to n·p <= offset and fill every closed section loop, including nested holes. */
export function clipSolid(geometry, normal = [1, 0, 0], offset = 0) {
  if (!geometry?.attributes?.position || !normal.every(Number.isFinite) || Math.hypot(...normal) < EPS || !Number.isFinite(offset)) throw new RangeError('A mesh and finite cutting plane are required.');
  const length = Math.hypot(...normal), n = normal.map(v => v / length), plane = offset / length;
  const position = geometry.attributes.position, index = geometry.index, count = index ? index.count : position.count;
  const body = [], segments = [];
  const get = i => { const j = index ? index.getX(i) : i; return [position.getX(j), position.getY(j), position.getZ(j)]; };
  for (let i = 0; i < count; i += 3) {
    const triangle = [get(i), get(i + 1), get(i + 2)], distances = triangle.map(p => dot(n, p) - plane);
    const polygon = [], crossing = [];
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3], da = distances[j], db = distances[(j + 1) % 3];
      if (da <= EPS) polygon.push(a);
      if ((da < -EPS && db > EPS) || (da > EPS && db < -EPS)) {
        const t = da / (da - db), p = a.map((value, k) => value + t * (b[k] - value)); polygon.push(p); crossing.push(p);
      }
      if (Math.abs(da) <= EPS) crossing.push(a);
    }
    for (let j = 1; j < polygon.length - 1; j++) body.push(...polygon[0], ...polygon[j], ...polygon[j + 1]);
    if (distances.some(d => d > EPS) && distances.some(d => d < -EPS)) {
      const unique = [...new Map(crossing.map(p => [key(p), p])).values()];
      if (unique.length === 2) segments.push(unique);
    }
  }
  const nodes = new Map(), edges = new Map();
  for (const [a, b] of segments) {
    const ka = key(a), kb = key(b); if (ka === kb) continue;
    const edge = [ka, kb].sort().join('|');
    if (edges.has(edge)) continue;
    edges.set(edge, [ka, kb]);
    for (const [k, p, other] of [[ka, a, kb], [kb, b, ka]]) { if (!nodes.has(k)) nodes.set(k, { point: p, neighbors: [] }); nodes.get(k).neighbors.push(other); }
  }
  const visited = new Set(), loops = []; let openChains = 0;
  for (const [start, node] of nodes) {
    if (visited.has(start)) continue;
    if (node.neighbors.length !== 2) { openChains++; visited.add(start); continue; }
    let current = start, previous = null, complete = false; const loop = [];
    for (let safety = 0; safety <= nodes.size; safety++) {
      if (current === start && loop.length > 2) { complete = true; break; }
      if (visited.has(current)) break;
      visited.add(current); const next = nodes.get(current); loop.push(next.point);
      if (next.neighbors.length !== 2) break;
      const neighbor = next.neighbors.find(k => k !== previous); previous = current; current = neighbor;
    }
    if (complete) loops.push(loop); else openChains++;
  }
  const N = new Vector3(...n), helper = Math.abs(n[1]) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  const u = new Vector3().crossVectors(helper, N).normalize(), v = new Vector3().crossVectors(N, u).normalize();
  const shapes = loops.map(points => {
    const projected = points.map(p => new Vector2(dot(p, u.toArray()), dot(p, v.toArray())));
    return { points, projected, area: Math.abs(ShapeUtils.area(projected)), parent: -1, depth: 0 };
  });
  shapes.forEach((shape, i) => {
    let parentArea = Infinity;
    shapes.forEach((candidate, j) => { if (i !== j && candidate.area > shape.area + EPS && candidate.area < parentArea && inside(shape.projected[0], candidate.projected)) { shape.parent = j; parentArea = candidate.area; } });
  });
  for (const shape of shapes) { let parent = shape.parent; while (parent !== -1) { shape.depth++; parent = shapes[parent].parent; } }
  const cap = []; let sectionArea = 0, perimeter = 0;
  for (const loop of loops) for (let i = 0; i < loop.length; i++) perimeter += Math.hypot(...loop[i].map((value, k) => value - loop[(i + 1) % loop.length][k]));
  shapes.forEach((shape, i) => {
    if (shape.depth % 2) return;
    const holes = shapes.filter(candidate => candidate.parent === i && candidate.depth === shape.depth + 1);
    // ShapeUtils removes duplicate closing vertices but does not reorder the arrays.
    const contour = shape.projected.map(p => p.clone()), holeContours = holes.map(h => h.projected.map(p => p.clone()));
    const triangles = ShapeUtils.triangulateShape(contour, holeContours);
    const points = [...shape.points, ...holes.flatMap(h => h.points)];
    for (const triangle of triangles) {
      let [a, b, c] = triangle.map(k => new Vector3(...points[k]));
      const cross = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
      if (cross.dot(N) < 0) [b, c] = [c, b];
      sectionArea += cross.length() * 0.5; cap.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    }
  });
  return { body: geometryFrom(body), cap: geometryFrom(cap), loops, sectionArea, perimeter, openChains };
}

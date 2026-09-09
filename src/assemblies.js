import * as T from 'three';

export const ASSEMBLIES = ['Planetary gearbox', 'Pressure valve', 'Optical lens'];
function annulus(outer, inner, depth, segments = 64) {
  const shape = new T.Shape(), hole = new T.Path();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); shape.holes.push(hole);
  const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: segments / 2 }); geometry.translate(0, 0, -depth / 2); return geometry;
}
function gear(radius, teeth, depth) {
  const shape = new T.Shape(), hole = new T.Path();
  for (let i = 0; i < teeth * 4; i++) { const angle = i * Math.PI * 2 / (teeth * 4), r = radius * (i % 4 === 0 || i % 4 === 3 ? 0.84 : 1); const x = Math.cos(angle) * r, y = Math.sin(angle) * r; if (!i) shape.moveTo(x, y); else shape.lineTo(x, y); }
  shape.closePath(); hole.absarc(0, 0, radius * 0.28, 0, Math.PI * 2, true); shape.holes.push(hole);
  const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, -depth / 2); return g;
}
export function createAssembly(name = ASSEMBLIES[0]) {
  const parts = [];
  function add(label, geometry, position = [0, 0, 0], rotation = [0, 0, 0], color = 0xa6bab2, explode = position.map(v => v * 0.4)) {
    geometry.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...position), new T.Quaternion().setFromEuler(new T.Euler(...rotation)), new T.Vector3(1, 1, 1)));
    parts.push({ name: label, geometry, color, explode });
  }
  const zCylinder = (r, h, sides = 48) => new T.CylinderGeometry(r, r, h, sides).rotateX(Math.PI / 2);
  if (name === 'Pressure valve') {
    add('Valve body', annulus(0.68, 0.36, 1.1), [0, -0.15, 0], [Math.PI / 2, 0, 0], 0x8aaf9f, [0, -0.3, 0]);
    for (const direction of [-1, 1]) {
      add(`Flanged port ${direction}`, annulus(0.43, 0.22, 0.16), [direction * 1.02, -0.2, 0], [0, Math.PI / 2, 0], 0xd99976, [direction * 0.6, 0, 0]);
      add(`Port tube ${direction}`, annulus(0.3, 0.22, 0.6), [direction * 0.73, -0.2, 0], [0, Math.PI / 2, 0]);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; add('Flange bolt', zCylinder(0.055, 0.26, 6), [direction * 1.02, -0.2 + Math.cos(a) * 0.33, Math.sin(a) * 0.33], [0, Math.PI / 2, 0], 0x536a65); }
    }
    add('Threaded stem', new T.CylinderGeometry(0.105, 0.105, 2.1, 32), [0, 0.45, 0], [0, 0, 0], 0xd9bc81, [0, 0.6, 0]);
    for (let i = 0; i < 13; i++) add('Stem thread', new T.TorusGeometry(0.115, 0.018, 6, 24), [0, 0.2 + i * 0.055, 0], [Math.PI / 2, 0, 0], 0xb09b6b, [0, 0.6, 0]);
    add('Sealing disc', new T.CylinderGeometry(0.34, 0.34, 0.14, 48), [0, -0.55, 0], [0, 0, 0], 0x344c44, [0, -0.65, 0]);
    add('Bonnet', annulus(0.51, 0.14, 0.24), [0, 0.55, 0], [Math.PI / 2, 0, 0], 0x6c8f80, [0, 0.45, 0]);
    add('Handwheel', new T.TorusGeometry(0.75, 0.09, 12, 64), [0, 1.58, 0], [Math.PI / 2, 0, 0], 0xd99976, [0, 0.85, 0]);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; add('Handwheel spoke', new T.BoxGeometry(1.42, 0.08, 0.09), [0, 1.58, 0], [0, a, 0], 0xd99976, [0, 0.85, 0]); }
  } else if (name === 'Optical lens') {
    for (let i = 0; i < 4; i++) {
      add(`Barrel segment ${i + 1}`, annulus(1.03 - i * 0.07, 0.8 - i * 0.065, 0.38), [0, 0, -0.72 + i * 0.46], [0, 0, 0], [0x354b45, 0x53695f, 0x78958a, 0x354b45][i], [0, 0, (i - 1.5) * 0.48]);
      const glass = new T.SphereGeometry(0.76 - i * 0.065, 40, 20); glass.scale(1, 1, 0.2);
      add(`Optical element ${i + 1}`, glass, [0, 0, -0.68 + i * 0.46], [0, 0, 0], 0x86bdc2, [0, 0, (i - 1.5) * 0.42]);
      add('Retaining ring', annulus(0.89 - i * 0.065, 0.74 - i * 0.065, 0.065), [0, 0, -0.49 + i * 0.46], [0, 0, 0], 0xd9bc81, [0, 0, (i - 1.5) * 0.45]);
    }
    for (let i = 0; i < 32; i++) { const a = i * Math.PI * 2 / 32; add('Focus grip rib', new T.BoxGeometry(0.035, 0.05, 0.35), [Math.cos(a) * 1.035, Math.sin(a) * 1.035, -0.7], [0, 0, a - Math.PI / 2], 0x899c91, [0, 0, -0.7]); }
    add('Rear mount', annulus(0.84, 0.57, 0.14), [0, 0, 1], [0, 0, 0], 0xa6bab2, [0, 0, 1]);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; add('Mount screw', zCylinder(0.045, 0.14, 6), [Math.cos(a) * 0.71, Math.sin(a) * 0.71, 1.1], [0, 0, 0], 0x334b43, [0, 0, 1.1]); }
  } else {
    add('Hollow gearbox casing', annulus(1.3, 1.12, 0.94), [0, 0, 0], [0, 0, 0], 0x5e8173, [0, 0, -0.4]);
    for (const sign of [-1, 1]) {
      add('Bearing cover', annulus(1.35, 0.28, 0.12), [0, 0, sign * 0.59], [0, 0, 0], 0xa6bab2, [0, 0, sign * 1.05]);
      add('Shaft bearing', annulus(0.32, 0.2, 0.19), [0, 0, sign * 0.67], [0, 0, 0], 0xd9bc81, [0, 0, sign * 1.2]);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; add('Case bolt', zCylinder(0.065, 0.18, 6), [Math.cos(a) * 1.23, Math.sin(a) * 1.23, sign * 0.68], [0, 0, 0], 0x334b43, [Math.cos(a) * 0.14, Math.sin(a) * 0.14, sign * 1.15]); }
    }
    add('Sun gear', gear(0.42, 18, 0.36), [0, 0, 0], [0, 0, 0], 0xd9bc81, [0, 0, 0.3]);
    add('Output shaft', zCylinder(0.19, 2), [0, 0, 0], [0, 0, 0], 0xd3dfd9, [0, 0, 0.5]);
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3 + Math.PI / 2, p = [Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0];
      add(`Planet gear ${i + 1}`, gear(0.33, 14, 0.32), p, [0, 0, a], 0xd99976, [p[0] * 0.5, p[1] * 0.5, 0]);
      add('Planet pin', zCylinder(0.082, 0.65), p, [0, 0, 0], 0xe7ece1, [p[0] * 0.5, p[1] * 0.5, 0.2]);
      add('Carrier arm', new T.BoxGeometry(0.18, 0.85, 0.11), [p[0] * 0.5, p[1] * 0.5, 0.3], [0, 0, a - Math.PI / 2], 0x718f84, [0, 0, 0.55]);
    }
  }
  return parts;
}

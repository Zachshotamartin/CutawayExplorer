import { clipSolid } from './clip.js';
import { ASSEMBLIES, createAssembly } from './assemblies.js';

export const metadata = {
  id: 'cutaway-explorer', title: 'Cutaway Explorer',
  description: 'Slice into a mechanical assembly, inspect the filled section, and separate its working parts.',
  technique: 'CPU triangle clipping, connected section loops, nested-hole triangulation, and exploded assembly transforms.',
  instructions: ['Move the cutting plane through the assembly. Orange faces are newly constructed caps.', 'Change the plane axis to reveal shafts, bearings, seals, and hollow passages.', 'Explode the assembly or inspect it without the cut. Export the visible geometry as OBJ.'],
  limitations: ['Illustrative assemblies, not dimensioned manufacturing designs or working mechanical simulations.', 'Section area is summed across components; overlapping parts are not boolean-unioned.', 'CPU caps require closed manifold components. The included solids are tested; arbitrary CAD upload is not supported.'],
};

export function createExperiment(ctx) {
  const { THREE: T, root, ui } = ctx;
  let preset = ASSEMBLIES[0], axis = 'X', offset = 0.12, explode = 0, cut = true, planeVisible = false, parts = [], pending = false;
  const model = new T.Group(); root.add(model);
  const materialCache = new Map();
  function material(color) { if (!materialCache.has(color)) materialCache.set(color, new T.MeshStandardMaterial({ color, roughness: 0.43, metalness: 0.38 })); return materialCache.get(color); }
  const capMaterial = new T.MeshStandardMaterial({ color: 0xe5a37d, roughness: 0.75, metalness: 0.02 });
  const guide = new T.Group(); ctx.scene.add(guide);
  const guideFrame = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(4, 4)), new T.LineBasicMaterial({ color: 0xe8ccb1, transparent: true, opacity: 0.7 })); guide.add(guideFrame);
  const arrow = new T.ArrowHelper(new T.Vector3(0, 0, 1), new T.Vector3(1.75, 1.75, 0), 0.4, 0xe5a37d, 0.12, 0.06); guide.add(arrow);
  function clearModel() { for (const child of [...model.children]) { child.geometry.dispose(); model.remove(child); } }
  function rebuild() {
    pending = false; clearModel();
    const normal = axis === 'X' ? [1, 0, 0] : axis === 'Y' ? [0, 1, 0] : [0, 0, 1];
    let area = 0, perimeter = 0, capped = 0, invalid = 0;
    for (const part of parts) {
      const shift = part.explode.map(value => value * explode), localOffset = offset - shift.reduce((sum, value, k) => sum + normal[k] * value, 0);
      const result = cut ? clipSolid(part.geometry, normal, localOffset) : { body: part.geometry.clone(), cap: null };
      const body = new T.Mesh(result.body, material(part.color)); body.position.set(...shift); body.name = part.name; body.castShadow = body.receiveShadow = true; model.add(body);
      if (result.cap?.attributes.position.count) {
        const cap = new T.Mesh(result.cap, capMaterial); cap.position.set(...shift); cap.name = `${part.name} section`; model.add(cap);
        area += result.sectionArea; perimeter += result.perimeter; capped++;
      } else result.cap?.dispose();
      invalid += result.openChains || 0;
    }
    guide.visible = planeVisible && cut; guide.position.set(...normal.map(v => v * offset)); guide.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(...normal));
    ctx.setStatus(cut ? `${parts.length} parts · ${capped} intersected · area ${area.toFixed(3)} units² · perimeter ${perimeter.toFixed(3)} units${invalid ? ` · ${invalid} open section loops` : ''}` : `${parts.length} solid parts · section disabled`);
    ctx.invalidate();
  }
  function request() { pending = true; ctx.invalidate(); }
  function load() {
    for (const part of parts) part.geometry.dispose(); parts = createAssembly(preset); rebuild();
    // Frame the complete assembly, even when the initial section hides half.
    const boundsGroup = new T.Group(); for (const part of parts) boundsGroup.add(new T.Mesh(part.geometry, material(part.color))); ctx.fit(boundsGroup);
  }
  ui.section('Assembly');
  ui.select('Object', ASSEMBLIES, preset, value => { preset = value; load(); });
  ui.toggle('Cutaway enabled', cut, value => { cut = value; request(); });
  ui.select('Cutting axis', ['X', 'Y', 'Z'], axis, value => { axis = value; request(); });
  const positionSlider = ui.range('Plane position', { min: -2.2, max: 2.2, step: 0.01, value: offset, onChange: value => { offset = value; request(); } });
  ui.toggle('Show cutting guide', planeVisible, value => { planeVisible = value; request(); });
  ui.section('Inspect');
  ui.range('Explode parts', { min: 0, max: 1.25, step: 0.025, value: 0, onChange: value => { explode = value; request(); } });
  ui.button('Center section', () => { offset = 0; positionSlider.value = '0'; request(); }, { primary: true });
  ui.button('Export visible cutaway OBJ', () => { if (pending) rebuild(); ctx.exportOBJ(model, 'cutaway-assembly.obj'); });
  ui.note('Orange caps are geometry, including the annular openings in hollow parts. Measurements are model units, not manufacturing dimensions.');
  const stop = ctx.onFrame(() => { if (pending) rebuild(); });
  load();
  return { dispose() { stop(); for (const part of parts) part.geometry.dispose(); for (const m of materialCache.values()) m.dispose(); capMaterial.dispose(); } };
}

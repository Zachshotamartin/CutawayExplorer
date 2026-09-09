# Verification

- `npm test`: 4 tests pass. They verify exact cube section area and perimeter, plane-aligned cap vertices, correct winding, holes in annular caps, out-of-range planes, and finite closed cuts through every supplied mechanical part on multiple axes.
- `npm run build`: passes.
- Chromium: moved the cut and explode sliders, switched between all three assemblies, toggled the cut, changed cutting axes, and exported visible OBJ geometry including separate cap objects. No JavaScript errors.
- At 390 × 844, the document has no horizontal overflow.

## Recorded examples

`examples/01.png` captures an exploded gearbox section. `examples/02.png` captures a section through the optical lens barrel. These are actual viewport renders of CPU-clipped bodies and newly triangulated caps, with steps and captions in `examples/manifest.json`.

Measurements sum the component sections rather than their boolean union. Assemblies are illustrative, not manufacturing CAD. These limits are stated in the interface and README.

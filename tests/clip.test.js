import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { clipSolid } from '../src/clip.js';
import { createAssembly, ASSEMBLIES } from '../src/assemblies.js';

function dispose(result) { result.body.dispose(); result.cap.dispose(); }
test('a cube section is closed, has the exact area, and places all cap vertices on the plane', () => {
  const cube = new T.BoxGeometry(2, 2, 2), original = cube.attributes.position.array.slice();
  for (const offset of [-0.73, 0, 0.43]) {
    const result = clipSolid(cube, [1, 0, 0], offset);
    assert.equal(result.openChains, 0); assert.equal(result.loops.length, 1); assert.ok(Math.abs(result.sectionArea - 4) < 1e-5); assert.ok(Math.abs(result.perimeter - 8) < 1e-5);
    const p = result.body.attributes.position, cap = result.cap.attributes.position, n = result.cap.attributes.normal;
    for (let i = 0; i < p.count; i++) assert.ok(p.getX(i) <= offset + 1e-5);
    for (let i = 0; i < cap.count; i++) { assert.ok(Math.abs(cap.getX(i) - offset) < 1e-5); assert.ok(n.getX(i) > 0.99); }
    dispose(result);
  }
  assert.deepEqual(cube.attributes.position.array, original); cube.dispose();
});
test('nested section loops leave the bore open instead of capping it with a solid disc', () => {
  const ring = new T.TorusGeometry(1, 0.25, 24, 64), result = clipSolid(ring, [0, 0, 1], 0.02);
  assert.equal(result.openChains, 0); assert.equal(result.loops.length, 2);
  const expected = Math.PI * ((1 + Math.sqrt(0.25 ** 2 - 0.02 ** 2)) ** 2 - (1 - Math.sqrt(0.25 ** 2 - 0.02 ** 2)) ** 2);
  assert.ok(Math.abs(result.sectionArea - expected) < expected * 0.03);
  const p = result.cap.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    assert.ok(Math.hypot(x, y) > 0.7, 'No cap triangle may fill the central hole.');
  }
  ring.dispose(); dispose(result);
});
test('out-of-range planes retain or discard the full solid without a false cap', () => {
  const geometry = new T.BoxGeometry();
  const full = clipSolid(geometry, [0, 1, 0], 2), empty = clipSolid(geometry, [0, 1, 0], -2);
  assert.equal(full.body.attributes.position.count, 36); assert.equal(full.cap.attributes.position.count, 0);
  assert.equal(empty.body.attributes.position.count, 0); assert.equal(empty.sectionArea, 0);
  dispose(full); dispose(empty); geometry.dispose();
});
test('every supplied mechanical part produces finite, closed sections on multiple axes', () => {
  for (const name of ASSEMBLIES) {
    const parts = createAssembly(name); assert.ok(parts.length >= 20);
    for (const part of parts) for (const normal of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const result = clipSolid(part.geometry, normal, 0.117);
      assert.equal(result.openChains, 0, `${name}/${part.name} must form closed cap loops.`);
      assert.ok(Number.isFinite(result.sectionArea)); assert.ok(result.body.attributes.position.array.every(Number.isFinite)); dispose(result);
    }
    parts.forEach(part => part.geometry.dispose());
  }
});

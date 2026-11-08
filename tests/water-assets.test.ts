import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=process.cwd();
const data=JSON.parse(readFileSync(resolve(root,'public/water/drop-surface.json'),'utf8')) as {profiles:Record<string,{positions:number[];indices:number[];morphs:number[][]}>};
const composition=JSON.parse(readFileSync(resolve(root,'src/lib/water-composition.json'),'utf8')) as {id:string;profile:string;r:number;angle:number;amber:number}[];
test('Every authored liquid profile has a valid closed triangulated surface and compatible shape keys',()=>{
 assert.deepEqual(Object.keys(data.profiles).sort(),['bead','lens','ribbon','wave']);
 for(const [name,mesh] of Object.entries(data.profiles)){
  const n=mesh.positions.length/3;assert.ok(Number.isInteger(n)&&n>1000,name);
  assert.ok(mesh.positions.every(Number.isFinite));assert.equal(mesh.indices.length%3,0);
  assert.ok(mesh.indices.every(i=>Number.isInteger(i)&&i>=0&&i<n));
  assert.equal(mesh.morphs.length,2);
  for(const morph of mesh.morphs){assert.equal(morph.length,mesh.positions.length);assert.ok(morph.every(Number.isFinite));}
 }
 assert.equal(new Set(Object.values(data.profiles).map(p=>JSON.stringify(p.positions))).size,4,'all four profiles must have different silhouettes');
});
test('Reference composition has matching Blender optical assets, unique anchors and finite sizing',()=>{
 assert.equal(composition.length,12);assert.equal(new Set(composition.map(l=>l.id)).size,12);
 for(const layer of composition){
  assert.ok(data.profiles[layer.profile]);assert.ok(layer.r>0&&layer.r<1);assert.ok(Number.isFinite(layer.angle));
  const file=layer.profile+(layer.amber>.4?'-amber':'')+'.webp';
  assert.ok(existsSync(resolve(root,'public/water',file)),file+' must exist for devices without WebGL');
 }
});

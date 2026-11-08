import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=process.cwd();
const data=JSON.parse(readFileSync(resolve(root,'public/water/drop-surface.json'),'utf8')) as {profiles:Record<string,{positions:number[];indices:number[];morphs:number[][]}>};
const composition=JSON.parse(readFileSync(resolve(root,'src/lib/water-composition.json'),'utf8')) as {id:string;profile:string;x:number;y:number;r:number;angle:number;amber:number}[];
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
  const night=file.replace('.webp','-night.webp');
  assert.ok(existsSync(resolve(root,'public/water',night)),night+' must have dedicated night lighting');
  assert.notDeepEqual(readFileSync(resolve(root,'public/water',file)),readFileSync(resolve(root,'public/water',night)),'night lighting must be rendered separately');
 }
});

test('Shared Blender and live shader palettes have matching finite linear color channels',()=>{
 const optics=JSON.parse(readFileSync(resolve(root,'src/lib/water-optics.json'),'utf8')) as Record<string,Record<string,number[]>>;
 assert.deepEqual(Object.keys(optics.light).sort(),Object.keys(optics.dark).sort());
 for(const palette of Object.values(optics))for(const channels of Object.values(palette)){
  assert.equal(channels.length,3);assert.ok(channels.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 }
 assert.notDeepEqual(optics.light,optics.dark);
});

// Count actual authored surface points, not the much larger transparent sprite
// box. Exercise drift/turn extrema so a passing static screenshot is insufficient.
test('Lower-right water remains visible inside the corner throughout its motion envelope',()=>{
 const corner=composition.find(l=>l.id==='lower-right');assert.ok(corner);
 const positions=data.profiles[corner.profile].positions;
 for(const [width,height] of [[1200,675],[1348,930],[390,844],[320,760]]){
  const unit=Math.min(width,height),radius=corner.r*unit;
  for(const dx of [-.026,.026])for(const dy of [-.026,.026])for(const turn of [-.10,.10]){
   const angle=corner.angle+turn;let visible=0;
   for(let i=0;i<positions.length;i+=3){
    const vx=positions[i]*.93,vy=positions[i+1]*.93;
    const x=corner.x*width+(vx*Math.cos(angle)-vy*Math.sin(angle))*radius+dx*unit;
    const y=corner.y*height-(vx*Math.sin(angle)+vy*Math.cos(angle))*radius+dy*unit;
    if(x>.76*width&&x<width-8&&y>.76*height&&y<height-8)visible++;
   }
   assert.ok(visible>75,`${width}x${height}: visible water points ${visible}; corner must survive drift and clipping`);
  }
 }
});

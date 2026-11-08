import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Matrix4,Vector3,Quaternion,Box3} from 'three';
import {petCatalog,findPet,ownsPet} from '../src/lib/pets';
import {rewardCatalog,redeemCatalog} from '../src/lib/rewards';
test('ten distinct Blender models have valid GLB structure, portraits and expressive parts',()=>{
 assert.equal(petCatalog.length,10);assert.equal(new Set(petCatalog.map(p=>p.animal)).size,10);
 for(const pet of petCatalog){
  const glb=readFileSync(new URL('../public/pets/'+pet.animal+'.glb',import.meta.url));
  assert.equal(glb.readUInt32LE(0),0x46546c67);assert.equal(glb.readUInt32LE(4),2);assert.equal(glb.readUInt32LE(8),glb.length);
  const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
  assert.ok(json.asset.generator.includes('Blender'));
  assert.ok(json.nodes.some((n:{extras?:{petMotion?:string}})=>n.extras?.petMotion==='head'));
  assert.ok(json.nodes.some((n:{name:string})=>n.name.startsWith('Eye')));
  assert.ok(json.meshes.length>40);
  // Verify Blender parenting preserves face scale in world space. A wrongly
  // inherited transform can otherwise turn an eye into a face-sized sphere.
  function visit(index:number,parent:Matrix4){
   const n=json.nodes[index];
   const local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3().fromArray(n.translation||[0,0,0]),new Quaternion().fromArray(n.rotation||[0,0,0,1]),new Vector3().fromArray(n.scale||[1,1,1]));
   const world=parent.clone().multiply(local);
   if(n.name==='Eye'||n.name.startsWith('Eye.')){
    const accessor=json.accessors[json.meshes[n.mesh].primitives[0].attributes.POSITION];
    const box=new Box3(new Vector3().fromArray(accessor.min),new Vector3().fromArray(accessor.max)).applyMatrix4(world);
    assert.ok(box.getSize(new Vector3()).length()<.8,pet.animal+' eye must retain its small world-space size');
   }
   for(const child of n.children||[])visit(child,world);
  }
  for(const root of json.scenes[json.scene||0].nodes)visit(root,new Matrix4());
  const poster=readFileSync(new URL('../public/pets/'+pet.animal+'.webp',import.meta.url));assert.equal(poster.subarray(0,4).toString(),'RIFF');assert.equal(poster.subarray(8,12).toString(),'WEBP');
  assert.ok(json.materials.some((m:{normalTexture?:unknown})=>m.normalTexture),'packed plush/knit normal maps');
  assert.ok(json.materials.some((m:{pbrMetallicRoughness?:{baseColorTexture?:unknown}})=>m.pbrMetallicRoughness?.baseColorTexture),'smooth painted coat boundaries');
  assert.ok(glb.length<2800000,'mobile model size budget');
 }
});
test('pets share redeem catalog while all six badge IDs remain unchanged',()=>{
 assert.equal(rewardCatalog.length,6);assert.equal(redeemCatalog.length,16);assert.equal(new Set(redeemCatalog.map(p=>p.id)).size,16);
 assert.equal(findPet('pet-cat')?.cost,20);assert.equal(findPet('invalid'),undefined);
 assert.equal(ownsPet([{rewardId:'pet-cat'}],'pet-cat'),true);
 assert.equal(ownsPet([{rewardId:'pet-cat'}],'pet-dog'),false);
 assert.equal(ownsPet([{rewardId:'invented'}],'invented'),false);
});

const referenceFeatures:Record<string,string[]>={
 cat:['Knitted scarf wrap','Tail plush','Cocoa whisker','Cat forehead stripe','Star gold bezel'],
 rabbit:['Bow folded satin loop','Long floppy ear','Leather book cover','Paw toe pad'],
 fox:['Cape velvet','Graduation mortarboard','Tail plush','Gold tassel cord'],
 bear:['Cream knitted sweater','Leather backpack','Hexagonal pencil','Paw large heart pad'],
 owl:['Layered breast feather','Round gold spectacle rim','Graduation mortarboard','Layered wing feather'],
 dog:['Corgi short leg','Saddle leather bag','Corgi orange collar','Tail plush','Corgi hanging tongue'],
 panda:['Head plush','Leather backpack','Knitted scarf wrap','Book charm'],
 deer:['Antler branch','Deer forehead spot','Notebook spiral','Bow folded satin loop'],
 hedgehog:['Soft caramel quill','Leather backpack','Hexagonal pencil','Cream knitted sweater'],
 penguin:['Head plush','Round gold spectacle rim','Graduation mortarboard','Open leather cover','Cape velvet']
};
test('all ten reference species and their identifying accessories are actual GLB meshes',()=>{
 assert.deepEqual(petCatalog.map(p=>p.animal).sort(),Object.keys(referenceFeatures).sort());
 const manifest=JSON.parse(readFileSync(new URL('../public/pets/manifest.json',import.meta.url),'utf8')) as {animal:string;version:string}[];
 assert.deepEqual(manifest.map(p=>p.animal).sort(),Object.keys(referenceFeatures).sort());
 for(const pet of petCatalog){
  const bytes=readFileSync(new URL('../public/pets/'+pet.animal+'.glb',import.meta.url));
  const glb=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  for(const feature of referenceFeatures[pet.animal])assert.ok(glb.nodes.some((n:{name:string;mesh?:number})=>n.name.startsWith(feature)&&n.mesh!==undefined),pet.animal+' missing '+feature);
  const head=glb.nodes.findIndex((n:{extras?:{petMotion?:string}})=>n.extras?.petMotion==='head');
  const attached=new Set<number>();function visit(i:number){attached.add(i);for(const child of glb.nodes[i].children||[])visit(child);}visit(head);
  glb.nodes.forEach((n:{name:string;mesh?:number},i:number)=>{if(/^(Graduation|Round gold spectacle|Bow folded|Antler branch)/.test(n.name))assert.ok(attached.has(i),n.name+' must move with head');});
 }
});
test('reference species update preserves already unlocked reward slots',()=>{
 assert.equal(findPet('pet-turtle')?.animal,'hedgehog');assert.equal(findPet('pet-chick')?.animal,'owl');
 assert.equal(ownsPet([{rewardId:'pet-turtle'}],'pet-turtle'),true);
 assert.equal(ownsPet([{rewardId:'pet-chick'}],'pet-chick'),true);
});

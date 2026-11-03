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
  assert.ok(json.nodes.some((n:{name:string})=>n.name==='Head'));
  assert.ok(json.nodes.some((n:{name:string})=>n.name.startsWith('Eye')));
  assert.ok(json.meshes.length>10);
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
  const png=readFileSync(new URL('../public/pets/'+pet.animal+'.png',import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.ok(glb.length<400000,'mobile model size budget');
 }
});
test('pets share redeem catalog while all six badge IDs remain unchanged',()=>{
 assert.equal(rewardCatalog.length,6);assert.equal(redeemCatalog.length,16);assert.equal(new Set(redeemCatalog.map(p=>p.id)).size,16);
 assert.equal(findPet('pet-cat')?.cost,20);assert.equal(findPet('invalid'),undefined);
 assert.equal(ownsPet([{rewardId:'pet-cat'}],'pet-cat'),true);
 assert.equal(ownsPet([{rewardId:'pet-cat'}],'pet-dog'),false);
 assert.equal(ownsPet([{rewardId:'invented'}],'invented'),false);
});

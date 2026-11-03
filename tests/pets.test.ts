import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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

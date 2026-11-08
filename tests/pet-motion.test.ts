import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {petCatalog,type PetAction} from '../src/lib/pets';
import {createPetRig} from '../src/lib/pet-rig';

async function loadGeometry(animal:string){
 const bytes=readFileSync(new URL('../public/pets/'+animal+'.glb',import.meta.url));
 const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString());
 delete json.images;delete json.textures;delete json.samplers;delete json.extensionsRequired;delete json.extensionsUsed;
 json.materials=[{pbrMetallicRoughness:{baseColorFactor:[1,1,1,1]}}];
 for(const mesh of json.meshes)for(const primitive of mesh.primitives)primitive.material=0;
 const text=Buffer.from(JSON.stringify(json)),padded=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
 const binary=bytes.subarray(20+length),out=Buffer.alloc(20+padded.length+binary.length);
 out.writeUInt32LE(0x46546c67);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);binary.copy(out,20+padded.length);
 return new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');
}

for(const pet of petCatalog)test(pet.animal+': authored acting keeps planted feet and held props; preserves reference face',async()=>{
 const gltf=await loadGeometry(pet.animal),model=gltf.scene;
 const expected=['Blink','Feed','Hello','Idle','Pet','Play'];assert.deepEqual(gltf.animations.map(a=>a.name).sort(),expected);
 const names=gltf.animations.flatMap(a=>a.tracks.map(t=>t.name));assert.ok(names.some(n=>n.includes('quaternion')),'actual joint animation');
 const roots:T.Object3D[]=[];model.traverse(n=>roots.push(n));model.updateMatrixWorld(true);
 const original=roots.map(n=>n.matrixWorld.clone());const rig=createPetRig(model,pet.animal,gltf.animations,42);
 assert.equal(roots.length,(()=>{let c=0;model.traverse(()=>c++);return c;})(),'runtime must not replace or invent face geometry');
 assert.equal(rig.eyes.length,4);
 const open=rig.eyes.filter(e=>e.kind==='eyeOpen'&&e.defaultVisible).length;
 assert.equal(open,pet.animal==='owl'?2:['rabbit','bear'].includes(pet.animal)?1:0,'reference smile/wink expression');
 const feet=roots.filter(n=>n.userData.petMotion==='foot'||n.userData.petMotion==='front');
 const baseline=feet.map(n=>n.getWorldPosition(new T.Vector3()));
 const prop=roots.find(n=>n.userData.petMotion==='book');
 const palms=roots.filter(n=>n.userData.petMotion==='holding'&&n.parent===prop);
 const palmLocal=palms.map(n=>n.matrix.clone());
 let changed=false;
 for(let tick=0;tick<5;tick++)for(let i=0;i<150;i++){
  rig.update(1/30,{kind:(['hello','feed','play','pet','hello'] as PetAction[])[tick],tick},true,{x:0,y:0});model.updateMatrixWorld(true);
  for(let j=0;j<feet.length;j++)assert.ok(feet[j].getWorldPosition(new T.Vector3()).distanceTo(baseline[j])<.001,'sitting feet must remain grounded');
  for(let j=0;j<palms.length;j++)assert.ok(palms[j].matrix.equals(palmLocal[j]),'palms must stay attached to book');
  if(roots.some((n,j)=>n.matrixWorld.elements.some((v,k)=>Math.abs(v-original[j].elements[k])>.005)))changed=true;
  for(const n of roots)assert.ok(n.matrixWorld.elements.every(Number.isFinite),'finite skin and joint transforms');
 }
 assert.ok(changed,'authored actions must actually move');
 rig.update(1/30,{kind:'hello',tick:6},false,{x:0,y:0});model.updateMatrixWorld(true);
 for(let j=0;j<roots.length;j++)assert.ok(roots[j].matrixWorld.elements.every((v,k)=>Math.abs(v-original[j].elements[k])<.0001),'motion off restores '+roots[j].name);
 rig.dispose();
});

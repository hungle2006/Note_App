import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {petCatalog,type PetAction} from '../src/lib/pets';
import {petBehaviors,samplePetPose} from '../src/lib/pet-motion';
import {createPetRig} from '../src/lib/pet-rig';

async function loadGeometry(animal:string){
 const bytes=readFileSync(new URL('../public/pets/'+animal+'.glb',import.meta.url));
 const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString());
 // Keep the actual exported geometry and hierarchy. Texture decoding belongs to browser QA.
 delete json.images;delete json.textures;delete json.samplers;delete json.extensionsRequired;delete json.extensionsUsed;
 json.materials=[{pbrMetallicRoughness:{baseColorFactor:[1,1,1,1]}}];
 for(const mesh of json.meshes)for(const primitive of mesh.primitives)primitive.material=0;
 const text=Buffer.from(JSON.stringify(json)),padded=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
 const binary=bytes.subarray(20+length),out=Buffer.alloc(20+padded.length+binary.length);
 out.writeUInt32LE(0x46546c67);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);binary.copy(out,20+padded.length);
 return (await new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'')).scene;
}

test('ten species have distinct gestures and finite bounded poses, with smooth returns',()=>{
 const signatures=new Set<string>();
 for(const pet of petCatalog){
  assert.equal(new Set(petBehaviors[pet.animal]).size,3);
  const samples=[];
  for(let behavior=0;behavior<3;behavior++)for(const action of ['hello','feed','play','pet'] as PetAction[]){
   for(let t=0;t<5;t+=.05){const p=samplePetPose(pet.animal,t,behavior,t,action,t);assert.ok(Object.values(p).every(Number.isFinite));assert.ok(Math.abs(p.headY)<1);assert.ok(Math.abs(p.bodyZ)<.2);assert.ok(p.y>=0&&p.y<.4);samples.push(p);}
   const end=samplePetPose(pet.animal,5,behavior,5,action,5);assert.ok(Math.abs(end.y)<1e-8);assert.ok(Math.abs(end.x)<1e-8);
  }
  signatures.add(JSON.stringify(samples));
 }
 assert.equal(signatures.size,10);
});

for(const pet of petCatalog)test(pet.animal+': bind actual GLB without moving geometry; blink and reset every joint',async()=>{
 const model=await loadGeometry(pet.animal);model.updateMatrixWorld(true);
 const originals:T.Object3D[]=[];model.traverse(n=>originals.push(n));
 const before=originals.map(n=>n.matrixWorld.clone());const rig=createPetRig(model,pet.animal,42);model.updateMatrixWorld(true);
 const closeMatrices=(a:T.Matrix4,b:T.Matrix4)=>a.elements.every((v,i)=>Math.abs(v-b.elements[i])<.0001);
 for(let i=0;i<originals.length;i++)assert.ok(closeMatrices(before[i],originals[i].matrixWorld),'bind moved '+originals[i].name);
 assert.equal(rig.eyes.length,2);assert.ok(rig.joints.head?.length);assert.ok(rig.joints.torso?.length);
 if(['cat','dog','fox'].includes(pet.animal))assert.equal(rig.joints.front?.length,2);
 if(pet.animal==='owl')assert.equal(rig.joints.wing?.length,2);
 if(pet.animal==='penguin')assert.equal(rig.joints.holding?.length,2);
 let blinks=0;const motions=new Set<string>();
 for(let i=0;i<1200;i++){
  rig.update(1/30,{kind:'hello',tick:0},true,{x:.5,y:.2});
  if(rig.eyes.every(e=>e.closed.visible))blinks++;
  motions.add(rig.behavior);
 }
 assert.ok(blinks>0,'both eyelids must visibly close');assert.ok(motions.size>=3,'idle repertoire must advance');
 for(let tick=1;tick<=4;tick++)for(let i=0;i<180;i++)rig.update(1/30,{kind:(['feed','play','pet','hello'] as PetAction[])[tick-1],tick},true,{x:0,y:0});
 rig.update(1/30,{kind:'hello',tick:5},false,{x:0,y:0});model.updateMatrixWorld(true);
 for(let i=0;i<originals.length;i++)assert.ok(closeMatrices(before[i],originals[i].matrixWorld),'reset drifted '+originals[i].name);
 for(const eye of rig.eyes){assert.equal(eye.open.visible,true);assert.equal(eye.closed.visible,false);}
});

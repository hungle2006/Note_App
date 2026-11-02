import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWaterBodies,stepWater,type WaterBody} from '../src/lib/water-physics';
function body(x:number,r=20,vx=0):WaterBody{
 return {x,y:0,z:0,vx,vy:0,vz:0,r,sx:1,sy:1,seed:0,mass:r**3,
  squash:0,squashVelocity:0,nx:1,ny:0,nz:0,contacts:0};
}
test('Contact separates two approaching drops and conserves horizontal momentum',()=>{
 const a=body(-19,20,5),b=body(39,40,-1);
 const momentum=a.mass*a.vx+b.mass*b.vx;
 stepWater([a,b],1/60,1000,1000,0);
 assert.ok(b.x-a.x>=a.r+b.r-1e-8);
 assert.ok(b.vx-a.vx>0,'relative velocity must reverse after impact');
 assert.ok(Math.abs(a.mass*a.vx+b.mass*b.vx-momentum)<1e-6);
 assert.equal(a.contacts,1);assert.equal(b.contacts,1);
 assert.ok(a.squash>0&&b.squash>0);
});
test('Separating neighbors do not receive repeated collision impulses',()=>{
 const a=body(-19,20,-3),b=body(19,20,3);
 stepWater([a,b],1/60,1000,1000,0);
 assert.equal(a.contacts,0);assert.equal(b.contacts,0);
});
test('Surface tension settles impact deformation rather than leaving a flattened drop',()=>{
 const a=body(0);a.squash=.2;
 for(let i=0;i<360;i++)stepWater([a],1/60,1000,1000,i/60);
 assert.ok(Math.abs(a.squash)<.001);
});
for(const [w,h,mobile] of [[320,760,true],[390,844,true],[1280,844,false]] as const){
 test('Stable bounded simulation and actual collisions at '+w+'px',()=>{
  const bodies=createWaterBodies(w,h,mobile);
  assert.equal(bodies.length,mobile?12:30);
  assert.ok(Math.max(...bodies.map(b=>b.r))/Math.min(...bodies.map(b=>b.r))>2);
  for(let i=0;i<3600;i++)stepWater(bodies,1/60,w,h,i/60);
  assert.ok(bodies.reduce((n,b)=>n+b.contacts,0)>0);
  for(const b of bodies){
   assert.ok(Object.values(b).every(Number.isFinite));
   assert.ok(Math.abs(b.x)<w/2&&Math.abs(b.y)<h/2);
   assert.ok(Math.hypot(b.vx,b.vy,b.vz)<20);
   assert.ok(Math.abs(b.squash)<.25);
  }
 });
}

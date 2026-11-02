/** Lightweight soft-body approximation: independent inertia, mass-weighted
 * contact impulses and damped surface oscillation. Units are CSS pixels/second.
 * This is intentionally not a baked Mantaflow/SPH simulation. */
export type WaterBody = {
 x:number;y:number;z:number;vx:number;vy:number;vz:number;r:number;
 sx:number;sy:number;seed:number;mass:number;
 squash:number;squashVelocity:number;nx:number;ny:number;nz:number;contacts:number;
};
export function createWaterBodies(width:number,height:number,mobile:boolean):WaterBody[]{
 let seed=62741;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const cols=mobile?3:6,rows=mobile?4:5;
 const cellW=width/cols,cellH=height/rows;
 const bodies=Array.from({length:cols*rows},(_,i)=>{
  const col=i%cols,row=Math.floor(i/cols),tier=i%5;
  const base=mobile?(tier===0?40:tier<3?25:13):(tier===0?73:tier<3?43:21);
  const r=Math.min(base*(.86+random()*.28),cellW*.36,cellH*.36);
  const sx=.85+random()*.35,sy=1.02/sx;
  return {
   x:(col+.5)*cellW-width/2+(random()-.5)*cellW*.12,
   y:(row+.5)*cellH-height/2+(random()-.5)*cellH*.16,
   z:(random()-.5)*30,
   vx:(col%2===0?1:-1)*(mobile?5:8)*( .8+random()*.4),
   vy:(random()-.5)*5,vz:(random()-.5)*1.2,
   r,sx,sy,seed:random()*Math.PI*2,mass:r*r*r,
   squash:0,squashVelocity:0,nx:1,ny:0,nz:0,contacts:0,
  };
 });
 // Start a few neighboring drops close enough to meet shortly after enabling
 // the effect. After impact they follow free trajectories, never paired loops.
 for(let row=0;row<rows;row++){
  const a=bodies[row*cols],b=bodies[row*cols+1];
  const midpoint=-width/2+cellW;
  const gap=10+row*3;
  a.x=midpoint-a.r*a.sx-gap/2;
  b.x=midpoint+b.r*b.sx+gap/2;
  a.y=b.y=(row+.5)*cellH-height/2;
  a.z=b.z=(row%3-1)*14;
 }
 return bodies;
}
function radiusAlong(b:WaterBody,nx:number,ny:number,nz:number){
 return b.r/Math.sqrt((nx/b.sx)**2+(ny/b.sy)**2+(nz/.82)**2);
}
export function stepWater(bodies:WaterBody[],dt:number,width:number,height:number,time:number){
 dt=Math.min(Math.max(dt,0),1/30);
 for(const b of bodies){
  // Weak circulation sustains drift without attracting bodies into chains.
  b.vx+=Math.sin(time*.15+b.seed)*.13*dt;
  b.vy+=Math.cos(time*.13+b.seed)*.16*dt;
  const speed=Math.hypot(b.vx,b.vy,b.vz),limit=12;
  if(speed>limit){b.vx*=limit/speed;b.vy*=limit/speed;b.vz*=limit/speed;}
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
  const rx=b.r*b.sx*1.13,ry=b.r*b.sy*1.13;
  const boundX=Math.max(rx,width*.5-rx),boundY=Math.max(ry,height*.5-ry);
  if(Math.abs(b.x)>boundX){b.x=Math.sign(b.x)*boundX;b.vx=-Math.sign(b.x)*Math.abs(b.vx);}
  if(Math.abs(b.y)>boundY){b.y=Math.sign(b.y)*boundY;b.vy=-Math.sign(b.y)*Math.abs(b.vy);}
  if(Math.abs(b.z)>65){b.z=Math.sign(b.z)*65;b.vz*=-1;}
  // Surface tension restores a rounder shape after the contact flattens it.
  b.squashVelocity+=(-15*b.squash-4.5*b.squashVelocity)*dt;
  b.squash+=b.squashVelocity*dt;
 }
 for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
  const a=bodies[i],b=bodies[j];
  let dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
  const distance=Math.hypot(dx,dy,dz);
  if(distance<.0001) {dx=1;dy=0;dz=0;}
  const len=distance<.0001?1:distance,nx=dx/len,ny=dy/len,nz=dz/len;
  const contact=radiusAlong(a,nx,ny,nz)+radiusAlong(b,nx,ny,nz);
  if(distance>=contact)continue;
  const wa=b.mass/(a.mass+b.mass),wb=1-wa;
  const overlap=contact-distance;
  // Correct penetration every step; impulse only while approaching.
  a.x-=nx*overlap*wa;a.y-=ny*overlap*wa;a.z-=nz*overlap*wa;
  b.x+=nx*overlap*wb;b.y+=ny*overlap*wb;b.z+=nz*overlap*wb;
  const incoming=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny+(b.vz-a.vz)*nz;
  if(incoming>=0)continue;
  const impulse=-(1+.82)*incoming;
  a.vx-=impulse*wa*nx;a.vy-=impulse*wa*ny;a.vz-=impulse*wa*nz;
  b.vx+=impulse*wb*nx;b.vy+=impulse*wb*ny;b.vz+=impulse*wb*nz;
  for(const body of [a,b]){
   body.nx=nx;body.ny=ny;body.nz=nz;
   body.squash=Math.min(.22,body.squash+.055+Math.abs(incoming)*.007);
   body.squashVelocity=0;body.contacts++;
  }
 }
}

/** Lightweight soft-body approximation: independent inertia, mass-weighted
 * contact impulses and damped surface oscillation. Units are CSS pixels/second.
 * This is intentionally not a baked Mantaflow/SPH simulation. */
export type WaterBody = {
 x:number;y:number;z:number;vx:number;vy:number;vz:number;r:number;
 sx:number;sy:number;seed:number;mass:number;
 squash:number;squashVelocity:number;nx:number;ny:number;nz:number;contacts:number;
};
export function createWaterBodies(width:number,height:number,mobile:boolean):WaterBody[]{
 // Curated negative space and varied sizes rather than a uniform grid.
 const layout=[
  [.52,.17,27,1.15,.84], [.86,.20,21,.91,1.13], [.965,.63,17,1,1.08],
  [.50,.86,26,1.15,.88], [.03,.29,9,.85,1.12], [.39,.72,13,1,.91],
  [.72,.91,10,1.12,.87], [.12,.58,15,.87,1.06], [.62,.62,12,1.07,.9],
  [.655,.62,11,.92,1.08],
 ];
 const unit=Math.min(width,height)/760;
 const selected=mobile?layout.slice(0,6):layout;
 const bodies=selected.map(([px,py,r,sx,sy],i)=>{
  const radius=r*Math.min(1.22,Math.max(.65,unit));
  return {
   x:(px-.5)*width,y:(.5-py)*height,z:(i%3-1)*14,
   vx:(i%2===0?1:-1)*(mobile?2.1:3.2),vy:Math.sin(i*1.7)*1.6,vz:Math.cos(i)*.22,
   r:radius,sx,sy,seed:i*2.399+.7,mass:radius**3,
   squash:0,squashVelocity:0,nx:1,ny:0,nz:0,contacts:0,
  };
 });
 // A pair of small drops can gently touch and recover through surface tension.
 const a=bodies[mobile?4:8],b=bodies[mobile?5:9];
 const midpoint=mobile?width*.24:width*.13;
 a.x=midpoint-a.r*a.sx-3;b.x=midpoint+b.r*b.sx+3;
 a.y=b.y=-height*.15;a.z=b.z=0;a.vx=3;b.vx=-3;
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

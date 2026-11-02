"use client";

import {useEffect,useRef} from "react";

type Blob={x:number;y:number;vx:number;vy:number;r:number;mass:number;phase:number;squash:number;tilt:number};
type Spray={x:number;y:number;vx:number;vy:number;r:number;life:number;maxLife:number};
type Palette={warm:string;cool:string;highlight:string;rim:string;bridge:string;spark:string};

/**
 * Real-time 2D liquid-body physics with mass-weighted elastic collisions,
 * viscous impulses, proximity bridges (metaball-like), and spray particles.
 * Canvas shading adds a glossy 3D look; it is NOT a full fluid solver.
 * Desktop: 34 variable-size bodies + up to 70 splashes @ ~36 fps.
 * Mobile: 14 bodies + up to 22 splashes @ ~22 fps at lower pixel density.
 * Unmounting on 3D off cancels the animation and frees its canvas.
 */
const PHI=2.399963229728653;
function limit(v:number,lo:number,hi:number){return Math.max(lo,Math.min(hi,v));}
function palette(dark:boolean):Palette{
 return dark
  ?{warm:"238,162,113",cool:"154,186,205",highlight:"255,245,224",rim:"254,188,142",bridge:"235,157,125",spark:"251,208,161"}
  :{warm:"225,154,111",cool:"169,204,209",highlight:"255,255,249",rim:"199,125,85",bridge:"227,167,135",spark:"255,212,154"};
}
function color(rgb:string,alpha:number){return "rgba("+rgb+","+limit(alpha,0,1).toFixed(3)+")";}

export function WaterAtmosphere({active}:{active:boolean}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(!active||!ref.current||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const canvas=ref.current;
  const ctx=canvas.getContext("2d",{alpha:true,desynchronized:true});
  if(!ctx)return;
  let mobile=innerWidth<=760,width=innerWidth,height=innerHeight;
  let dpr=1,raf=0,last=0,t=0,acc=0,frames=0,visible=!document.hidden,stopped=false;
  let bodies:Blob[]=[],sprays:Spray[]=[];
  const collisionClock=new Map<number,number>();
  let p=palette(document.documentElement.dataset.theme==="dark");
  // These particles are decorative, not interactive; deterministic initialization
  // avoids bursts of random allocation during animation.
  let seed=173291;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const count=()=>mobile?14:34;
  const maxSprays=()=>mobile?22:70;
  const fillTarget=()=>mobile?22:36;
  const rmin=()=>mobile?10:16;
  const rmax=()=>mobile?43:74;

  function populate(){
   bodies=Array.from({length:count()},(_,i)=>{
    const mix=rand(),radius=rmin()+Math.pow(mix,1.3)*(rmax()-rmin());
    const angle=i*PHI+rand()*.8;
    const x=limit(width/2+Math.cos(angle)*(width*.28+rand()*width*.22),radius+5,width-radius-5);
    const y=limit(height/2+Math.sin(angle)*(height*.29+rand()*height*.22),radius+5,height-radius-5);
    const direction=rand()*Math.PI*2,velocity=(mobile?.28:.38)+rand()*(mobile?.45:.95);
    return {x,y,vx:Math.cos(direction)*velocity,vy:Math.sin(direction)*velocity,r:radius,mass:radius*radius,
      phase:rand()*Math.PI*2,squash:0,tilt:direction};
   });
   sprays=[];collisionClock.clear();
  }
  function resize(){
   mobile=window.matchMedia("(max-width: 760px)").matches;
   width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
   dpr=Math.min(devicePixelRatio||1,mobile?.8:1.2);
   // A lower backing resolution is intentional; it reduces fill-rate on phones.
   canvas.width=Math.max(1,Math.floor(width*dpr));
   canvas.height=Math.max(1,Math.floor(height*dpr));
   canvas.style.width=width+"px";canvas.style.height=height+"px";
   ctx!.setTransform(dpr,0,0,dpr,0,0);
   populate();
  }
  function burst(a:Blob,b:Blob,nx:number,ny:number,speed:number){
   const amount=mobile?2:Math.min(7,Math.max(3,Math.round(speed*1.5)));
   const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
   const direction=Math.atan2(ny,nx)+Math.PI/2;
   for(let k=0;k<amount&&sprays.length<maxSprays();k++){
    const ang=direction+(k%2?Math.PI:0)+(rand()-.5)*1.5;
    const v=(mobile?1:1.4)+rand()*2.8+speed*.28;
    const life=25+rand()*38;
    sprays.push({x:cx+(rand()-.5)*9,y:cy+(rand()-.5)*9,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v,
      r:(mobile?1.1:1.5)+rand()*(mobile?2.6:4.9),life,maxLife:life});
   }
  }
  function update(dt:number){
   const step=Math.min(dt,2);
   t+=step;
   for(let i=0;i<bodies.length;i++){
    const a=bodies[i];
    // Organic vortices with weak centering keep droplets moving across the scene.
    const swirl=Math.sin(t*.013+a.phase);
    a.vx+=(Math.cos(a.phase+t*.008)*.024+swirl*.012)*step;
    a.vy+=(Math.sin(a.phase+t*.011)*.026-Math.cos(t*.014+a.phase)*.012)*step;
    const wall=18+a.r;
    if(a.x<wall)a.vx+=.11*step;
    if(a.x>width-wall)a.vx-=.11*step;
    if(a.y<wall)a.vy+=.11*step;
    if(a.y>height-wall)a.vy-=.11*step;
    a.vx*=Math.pow(.993,step);a.vy*=Math.pow(.993,step);
    const speed=Math.hypot(a.vx,a.vy);
    if(speed>2.45){a.vx*=2.45/speed;a.vy*=2.45/speed;}
    a.squash*=Math.pow(.87,step);
    a.x+=a.vx*step;a.y+=a.vy*step;
    a.tilt=Math.atan2(a.vy,a.vx);
   }
   // Pairwise mass-aware collision with short-range attraction and impact spray.
   for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const a=bodies[i],b=bodies[j],dx=b.x-a.x,dy=b.y-a.y;
    const reach=a.r+b.r;
    if(Math.abs(dx)>reach*2.4||Math.abs(dy)>reach*2.4)continue;
    const dist=Math.max(1,Math.hypot(dx,dy)),nx=dx/dist,ny=dy/dist;
    const invA=1/a.mass,invB=1/b.mass,invSum=invA+invB;
    if(dist<reach*2.15&&dist>reach*.95){
     const pull=.013*(1-(dist-reach*.95)/(reach*1.2))*step;
     a.vx+=nx*pull*(invA/invSum);a.vy+=ny*pull*(invA/invSum);
     b.vx-=nx*pull*(invB/invSum);b.vy-=ny*pull*(invB/invSum);
    }
    const minDist=reach*.78; // permit small overlapping areas to visibly merge.
    if(dist>=minDist)continue;
    const overlap=minDist-dist,move=overlap*.32;
    a.x-=nx*move*(invA/invSum);a.y-=ny*move*(invA/invSum);
    b.x+=nx*move*(invB/invSum);b.y+=ny*move*(invB/invSum);
    const approaching=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
    if(approaching<0){
     const impulse=-(1.07)*approaching/invSum;
     a.vx-=impulse*invA*nx;a.vy-=impulse*invA*ny;
     b.vx+=impulse*invB*nx;b.vy+=impulse*invB*ny;
     a.squash=Math.min(.31,a.squash+.09+Math.abs(approaching)*.028);
     b.squash=Math.min(.31,b.squash+.09+Math.abs(approaching)*.028);
     const key=i*128+j;
     if(Math.abs(approaching)>.44&&t-(collisionClock.get(key)??-500)>32){
      burst(a,b,nx,ny,Math.abs(approaching));
      collisionClock.set(key,t);
     }
    }
   }
   for(let i=sprays.length-1;i>=0;i--){
    const q=sprays[i];q.life-=step;q.x+=q.vx*step;q.y+=q.vy*step;
    q.vx*=.985;q.vy=q.vy*.985+.008*step;
    if(q.life<=0||q.x<-25||q.x>width+25||q.y<-25||q.y>height+25)sprays.splice(i,1);
   }
  }
  function bridge(a:Blob,b:Blob,alpha:number){
   const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
   const nx=-dy/d,ny=dx/d;
   const neck=Math.min(a.r,b.r)*(.19+alpha*.39);
   const start=.22,end=.78;
   ctx!.save();ctx!.globalAlpha=alpha*.48;
   ctx!.fillStyle=color(p.bridge,mobile?.33:.45);
   ctx!.beginPath();
   ctx!.moveTo(a.x+dx*start+nx*neck,a.y+dy*start+ny*neck);
   ctx!.bezierCurveTo(a.x+dx*.43+nx*neck*.7,a.y+dy*.43+ny*neck*.7,b.x-dx*.43+nx*neck*.7,b.y-dy*.43+ny*neck*.7,b.x-dx*(1-end)+nx*neck,b.y-dy*(1-end)+ny*neck);
   ctx!.lineTo(b.x-dx*(1-end)-nx*neck,b.y-dy*(1-end)-ny*neck);
   ctx!.bezierCurveTo(b.x-dx*.43-nx*neck*.7,b.y-dy*.43-ny*neck*.7,a.x+dx*.43-nx*neck*.7,a.y+dy*.43-ny*neck*.7,a.x+dx*start-nx*neck,a.y+dy*start-ny*neck);
   ctx!.closePath();ctx!.fill();ctx!.restore();
  }
  function droplet(b:Blob){
   const {x,y,r}=b;
   const opacity=mobile?.25:.36;
   ctx!.save();ctx!.translate(x,y);ctx!.rotate(b.tilt*.27);
   const squish=Math.min(.33,b.squash);
   ctx!.scale(1+squish,1-squish*.69);
   const grad=ctx!.createRadialGradient(-r*.24,-r*.28,r*.06,0,0,r*1.04);
   grad.addColorStop(0,color(p.highlight,opacity*.68));
   grad.addColorStop(.28,color(p.warm,opacity*.58));
   grad.addColorStop(.62,color(p.cool,opacity*.57));
   grad.addColorStop(.85,color(p.warm,opacity*.34));
   grad.addColorStop(1,color(p.rim,opacity*.16));
   ctx!.fillStyle=grad;
   ctx!.beginPath();ctx!.ellipse(0,0,r,r*.93,0,0,Math.PI*2);ctx!.fill();
   ctx!.strokeStyle=color(p.rim,opacity*.54);ctx!.lineWidth=Math.max(.65,r*.017);ctx!.stroke();
   ctx!.beginPath();ctx!.ellipse(-r*.23,-r*.27,r*.25,r*.10,-.63,0,Math.PI*1.6);
   ctx!.strokeStyle=color(p.highlight,opacity*.75);ctx!.lineWidth=Math.max(1,r*.065);ctx!.lineCap="round";ctx!.stroke();
   ctx!.restore();
  }
  function draw(){
   ctx!.clearRect(0,0,width,height);
   // Nearby bodies are joined visually into gel-like soft masses.
   for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const a=bodies[i],b=bodies[j],d=Math.hypot(b.x-a.x,b.y-a.y),reach=a.r+b.r;
    if(d<reach*1.3&&d>reach*.32)bridge(a,b,1-d/(reach*1.55));
   }
   for(const b of bodies)droplet(b);
   for(const q of sprays){
    const fade=q.life/q.maxLife;
    ctx!.beginPath();ctx!.arc(q.x,q.y,q.r*fade,0,Math.PI*2);
    ctx!.fillStyle=color(p.spark,fade*(mobile?.24:.48));ctx!.fill();
   }
  }
  function tick(time:number){
   if(stopped||!visible)return;
   raf=requestAnimationFrame(tick);
   if(!last){last=time;draw();return;}
   const delta=Math.min(50,time-last);
   if(delta<1000/fillTarget())return;
   last=time;acc+=delta;
   const steps=Math.min(3,Math.floor(acc/16.67));
   if(steps>0){for(let i=0;i<steps;i++)update(1);acc-=steps*16.67;}
   else update(limit(delta/16.67,.3,1.9));
   draw();frames++;
   if(frames>300)frames=0;
  }
  function visibility(){
   visible=!document.hidden;
   if(!visible){cancelAnimationFrame(raf);raf=0;last=0;}
   else if(!stopped&&!raf){raf=requestAnimationFrame(tick);}
  }
  const themes=new MutationObserver(()=>{p=palette(document.documentElement.dataset.theme==="dark");});
  themes.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  let oldWidth=innerWidth,oldHeight=innerHeight;
  const onResize=()=>{
   if(innerWidth!==oldWidth||Math.abs(innerHeight-oldHeight)>80){
    oldWidth=innerWidth;oldHeight=innerHeight;resize();last=0;
   }
  };
  window.addEventListener("resize",onResize,{passive:true});
  document.addEventListener("visibilitychange",visibility);
  resize();raf=requestAnimationFrame(tick);
  return()=>{
   stopped=true;cancelAnimationFrame(raf);raf=0;
   window.removeEventListener("resize",onResize);
   document.removeEventListener("visibilitychange",visibility);
   themes.disconnect();bodies=[];sprays=[];collisionClock.clear();
   ctx.clearRect(0,0,canvas.width,canvas.height);
  };
 },[active]);
 if(!active)return null;
 return <div className="water-atmosphere liquid-atmosphere" aria-hidden="true" role="presentation"
  data-effect="liquid-collision-splash" data-renderer="canvas-physics">
  <canvas ref={ref} className="liquid-canvas" aria-hidden="true"/>
 </div>;
}

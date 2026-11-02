"use client";

import {useEffect,useRef} from "react";

type Shape="round"|"oval"|"tall"|"pear"|"organic"|"pillow";
type SizeTier="large"|"medium"|"small";
type Drop={r:number;sx:number;sy:number;tilt:number;shape:Shape;variation:number};
type Pair={x:number;y:number;angle:number;a:Drop;b:Drop;spread:number;period:number;offset:number;drift:number};
type Floater={x:number;y:number;drop:Drop;phase:number;speed:number};
type Palette={warm:string;cool:string;highlight:string;rim:string};
const TAU=Math.PI*2;
const ANCHORS=[
 [.16,.15],[.79,.16],[.37,.36],[.83,.53],[.19,.70],
 [.66,.75],[.48,.87],[.73,.35],[.19,.44],[.91,.85]
] as const;
const SHAPES:Shape[]=["pear","oval","organic","tall","pillow","round"];
const SIZE_PAIRS:[SizeTier,SizeTier][]=[
 ["large","small"],["medium","large"],["small","medium"],
 ["large","medium"],["medium","small"],["small","large"],
 ["medium","medium"],["large","small"],["small","medium"],["medium","large"]
];
function clamp(v:number,a:number,b:number){return Math.min(b,Math.max(a,v));}
function mix(a:number,b:number,t:number){return a+(b-a)*t;}
function smooth(t:number){return t*t*(3-2*t);}
function channel(rgb:string,alpha:number){return "rgba("+rgb+","+clamp(alpha,0,1).toFixed(3)+")";}
function palette(dark:boolean):Palette{return dark?
 {warm:"235,173,133",cool:"175,208,217",highlight:"255,240,226",rim:"224,168,139"}:
 {warm:"223,158,121",cool:"175,210,211",highlight:"255,255,249",rim:"203,153,121"};}
/** Polar outline: ovals, pear-shaped drops, soft organic ripples and rounded pillows.
 * The same outline function is used to find collision contact, so neighboring
 * droplets touch without artificially merging into one shape.
 */
function shapeRadius(d:Drop,theta:number):number{
 const c=Math.cos(theta),s=Math.sin(theta);
 const ellipse=1/Math.sqrt((c/d.sx)**2+(s/d.sy)**2);
 const phase=d.variation;
 let distortion=1;
 if(d.shape==="pear")distortion+=.23*s+.035*Math.sin(3*theta+phase);
 if(d.shape==="organic")distortion+=.075*Math.sin(3*theta+phase)+.035*Math.cos(5*theta-phase);
 if(d.shape==="pillow")distortion+=.043*Math.cos(4*theta+phase);
 if(d.shape==="oval")distortion+=.024*Math.sin(3*theta+phase);
 if(d.shape==="tall")distortion+=.045*Math.sin(2*theta+phase);
 return d.r*ellipse*clamp(distortion,.73,1.27);
}
function contactRadius(d:Drop,worldAngle:number,bodyAngle:number):number{
 return shapeRadius(d,worldAngle-bodyAngle);
}
/** Slow independent pairs: approach -> gentle contact -> separate.
 * No bridges, metaballs or connecting strokes are drawn.
 * Desktop: 10 pairs in deliberately varied size tiers. Mobile: 5 pairs,
 * lower canvas pixel density and ~20FPS.
 */
export function WaterAtmosphere({active}:{active:boolean}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(!active||!canvasRef.current||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const canvas=canvasRef.current,ctx=canvas.getContext("2d",{alpha:true,desynchronized:true});
  if(!ctx)return;
  let width=innerWidth,height=innerHeight,mobile=false,raf=0,lastFrame=0,start=performance.now(),hidden=document.hidden,stopped=false;
  let pairs:Pair[]=[],floaters:Floater[]=[];
  let shades=palette(document.documentElement.dataset.theme==="dark");
  let seed=87117;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function makeDrop(tier:SizeTier,shape:Shape):Drop{
   const bounds=mobile?{large:[37,57],medium:[20,34],small:[10,17]}:
                       {large:[61,89],medium:[31,51],small:[14,25]};
   const [lo,hi]=bounds[tier];
   let sx=.9+random()*.2,sy=.9+random()*.2;
   if(shape==="oval"){sx=1.19+random()*.25;sy=.72+random()*.19;}
   if(shape==="tall"){sx=.73+random()*.17;sy=1.26+random()*.31;}
   if(shape==="pear"){sx=.90+random()*.18;sy=1.12+random()*.20;}
   if(shape==="pillow"){sx=1.1+random()*.17;sy=.83+random()*.13;}
   if(shape==="organic"){sx=.88+random()*.25;sy=.86+random()*.27;}
   return {r:lo+random()*(hi-lo),sx,sy,tilt:(random()-.5)*1.55,
     shape,variation:random()*TAU};
  }
  function init(){
   mobile=matchMedia("(max-width:760px)").matches;
   width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
   const dpr=Math.min(devicePixelRatio||1,mobile?.85:1.2);
   canvas.width=Math.max(1,Math.round(width*dpr));
   canvas.height=Math.max(1,Math.round(height*dpr));
   ctx!.setTransform(dpr,0,0,dpr,0,0);
   pairs=ANCHORS.slice(0,mobile?5:10).map(([x,y],i)=>{
    const [tierA,tierB]=SIZE_PAIRS[i];
    return {x,y,angle:(i*2.12+random()*.6)%TAU,
      a:makeDrop(tierA,SHAPES[i%SHAPES.length]),
      b:makeDrop(tierB,SHAPES[(i*2+1)%SHAPES.length]),
      spread:(mobile?24:34)+random()*(mobile?24:36),
      period:(mobile?17:15)+random()*6,
      offset:i*.105+random()*.15,drift:5+random()*8};
   });
   floaters=Array.from({length:mobile?6:16},(_,i)=>({
    x:.06+random()*.88,y:.08+random()*.84,
    drop:makeDrop("small",SHAPES[(i+2)%SHAPES.length]),
    phase:random()*TAU,speed:.09+random()*.12
   }));
   // Decorative floaters are smaller than the colliding bodies.
   for(const f of floaters)f.drop.r*=.55;
  }
  const PHASES:[number,number][]=[
   [0,1],[.20,.90],[.42,.18],[.49,.012],[.52,0],
   [.58,.24],[.73,1.10],[.88,1.03],[1,1]
  ];
  function gap(u:number){
   for(let i=1;i<PHASES.length;i++){
    if(u<=PHASES[i][0]){
     const a=PHASES[i-1],b=PHASES[i];
     return mix(a[1],b[1],smooth((u-a[0])/(b[0]-a[0])));
    }
   }
   return 1;
  }
  function orb(x:number,y:number,d:Drop,angle:number,compression:number,alpha:number){
   const r=d.r;
   ctx!.save();ctx!.translate(x,y);ctx!.rotate(angle);
   ctx!.scale(1-compression*.035,1+compression*.045);
   const gradient=ctx!.createRadialGradient(-r*.28,-r*.30,r*.04,0,0,r*1.65);
   gradient.addColorStop(0,channel(shades.highlight,alpha*.72));
   gradient.addColorStop(.28,channel(shades.warm,alpha*.62));
   gradient.addColorStop(.68,channel(shades.cool,alpha*.45));
   gradient.addColorStop(1,channel(shades.rim,alpha*.12));
   ctx!.beginPath();
   for(let i=0;i<=42;i++){
    const theta=i*TAU/42,rad=shapeRadius(d,theta);
    const px=Math.cos(theta)*rad,py=Math.sin(theta)*rad;
    if(i===0)ctx!.moveTo(px,py);else ctx!.lineTo(px,py);
   }
   ctx!.closePath();ctx!.fillStyle=gradient;ctx!.fill();
   ctx!.strokeStyle=channel(shades.rim,alpha*.46);ctx!.lineWidth=.7;ctx!.stroke();
   ctx!.beginPath();ctx!.ellipse(-r*.20,-r*.28,r*.22,r*.07,-.5,0,Math.PI*1.4);
   ctx!.strokeStyle=channel(shades.highlight,alpha*.67);
   ctx!.lineWidth=Math.max(.8,r*.038);ctx!.lineCap="round";ctx!.stroke();
   ctx!.restore();
  }
  function draw(seconds:number){
   ctx!.clearRect(0,0,width,height);
   for(const pair of pairs){
    const u=((seconds/pair.period+pair.offset)%1+1)%1;
    const angleA=pair.angle+pair.a.tilt,angleB=pair.angle+Math.PI+pair.b.tilt;
    const touchA=contactRadius(pair.a,pair.angle,angleA);
    const touchB=contactRadius(pair.b,pair.angle+Math.PI,angleB);
    const distance=touchA+touchB+2+gap(u)*pair.spread;
    const rawX=pair.x*width+Math.sin(seconds*.21+pair.angle)*pair.drift;
    const rawY=pair.y*height+Math.cos(seconds*.16+pair.angle)*pair.drift;
    // Keep prominent large droplets within the viewport on 320px phones.
    const clearance=Math.max(pair.a.r*1.6,pair.b.r*1.6)+distance*.5+3;
    const marginX=Math.min(width*.5,clearance),marginY=Math.min(height*.5,clearance);
    const cx=clamp(rawX,marginX,width-marginX);
    const cy=clamp(rawY,marginY,height-marginY);
    const dx=Math.cos(pair.angle)*distance*.5,dy=Math.sin(pair.angle)*distance*.5;
    const contact=clamp(1-Math.abs(u-.52)/.075,0,1),alpha=mobile?.26:.35;
    orb(cx-dx,cy-dy,pair.a,angleA,contact,alpha);
    orb(cx+dx,cy+dy,pair.b,angleB,contact,alpha);
    // A few tiny free droplets after contact: never draw a connecting trail.
    if(u>.52&&u<.66){
     const progress=(u-.52)/.14,ux=-Math.sin(pair.angle),uy=Math.cos(pair.angle);
     for(let j=0;j<(mobile?1:2);j++){
      const sign=j===0?1:-1,travel=(5+progress*21)*sign;
      const micro:Drop={r:Math.max(1.5,(mobile?2.1:3.1)*(1-progress*.65)),
       sx:1.16,sy:.82,tilt:pair.angle,shape:"oval",variation:0};
      orb(cx+ux*travel,cy+uy*travel,micro,pair.angle,0,(mobile?.12:.19)*(1-progress));
     }
    }
   }
   for(const f of floaters){
    const x=f.x*width+Math.sin(seconds*f.speed+f.phase)*12;
    const y=f.y*height+Math.cos(seconds*f.speed*.8+f.phase)*10;
    orb(x,y,f.drop,f.phase+f.drop.tilt,0,mobile?.12:.18);
   }
  }
  function frame(now:number){
   if(stopped||hidden)return;
   raf=requestAnimationFrame(frame);
   if(now-lastFrame<(mobile?50:32))return;
   lastFrame=now;draw((now-start)/1000);
  }
  function visibility(){
   hidden=document.hidden;
   if(hidden){cancelAnimationFrame(raf);raf=0;lastFrame=0;}
   else if(!stopped&&!raf)raf=requestAnimationFrame(frame);
  }
  let oldWidth=innerWidth,oldHeight=innerHeight;
  function resize(){
   if(innerWidth===oldWidth&&Math.abs(innerHeight-oldHeight)<=80)return;
   oldWidth=innerWidth;oldHeight=innerHeight;init();draw((performance.now()-start)/1000);
  }
  const obs=new MutationObserver(()=>{shades=palette(document.documentElement.dataset.theme==="dark");});
  obs.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  window.addEventListener("resize",resize,{passive:true});
  document.addEventListener("visibilitychange",visibility);
  init();draw(0);raf=requestAnimationFrame(frame);
  return()=>{
   stopped=true;cancelAnimationFrame(raf);
   window.removeEventListener("resize",resize);
   document.removeEventListener("visibilitychange",visibility);
   obs.disconnect();ctx.clearRect(0,0,canvas.width,canvas.height);pairs=[];floaters=[];
  };
 },[active]);
 if(!active)return null;
 return <div className="water-atmosphere liquid-atmosphere" aria-hidden="true"
  data-effect="slow-bounce-droplets" data-renderer="canvas-soft-collisions"
  data-shapes="round-oval-tall-pear-organic-pillow" data-size-mix="large-medium-small">
  <canvas ref={canvasRef} className="liquid-canvas" aria-hidden="true"/>
 </div>;
}

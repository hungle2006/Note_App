"use client";

import {useEffect,useRef} from "react";

type Pair={x:number;y:number;angle:number;r1:number;r2:number;spread:number;period:number;offset:number;drift:number};
type Floater={x:number;y:number;r:number;phase:number;speed:number};
type Palette={warm:string;cool:string;highlight:string;rim:string};
const TAU=Math.PI*2;
const anchors=[
 [.13,.16],[.80,.15],[.36,.35],[.89,.51],[.12,.69],
 [.64,.75],[.44,.89],[.75,.37],[.20,.46],[.91,.85]
];
function clamp(v:number,a:number,b:number){return Math.min(b,Math.max(a,v));}
function mix(a:number,b:number,t:number){return a+(b-a)*t;}
function smooth(t:number){return t*t*(3-2*t);}
function channel(rgb:string,alpha:number){return "rgba("+rgb+","+clamp(alpha,0,1).toFixed(3)+")";}
function palette(dark:boolean):Palette{return dark?
 {warm:"235,173,133",cool:"175,208,217",highlight:"255,240,226",rim:"224,168,139"}:
 {warm:"223,158,121",cool:"175,210,211",highlight:"255,255,249",rim:"203,153,121"};}

/** Each pair independently approaches, lightly touches and rebounds.
 * No metaball bridge, liquid attachment or joining line is ever drawn.
 * Canvas is transparent, passive and fully unmounted by the 3D switch.
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
  function init(){
   mobile=matchMedia("(max-width:760px)").matches;
   width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
   const dpr=Math.min(devicePixelRatio||1,mobile?.85:1.2);
   canvas.width=Math.max(1,Math.round(width*dpr));
   canvas.height=Math.max(1,Math.round(height*dpr));
   ctx!.setTransform(dpr,0,0,dpr,0,0);
   const scale=mobile?.74:1;
   pairs=anchors.slice(0,mobile?5:10).map(([x,y],i)=>({
    x,y,angle:(i*2.12+random()*.6)%TAU,
    r1:(19+random()*27)*scale,r2:(13+random()*25)*scale,
    spread:(32+random()*35)*scale,
    period:(mobile?16:14)+random()*6,
    offset:i*.105+random()*.15,drift:6+random()*9
   }));
   floaters=Array.from({length:mobile?5:14},()=>({
    x:.07+random()*.86,y:.08+random()*.84,r:(4+random()*9)*scale,
    phase:random()*TAU,speed:.10+random()*.13
   }));
  }
  // The bounce occurs at phase .51. It has a short compress-and-release,
  // followed by a long slow-motion drift away from the contact point.
  const phases:[number,number][]=[
   [0,1],[.20,.90],[.42,.18],[.49,.012],[.52,0],
   [.58,.24],[.73,1.10],[.88,1.03],[1,1]
  ];
  function gap(u:number){
   for(let i=1;i<phases.length;i++){
    if(u<=phases[i][0]){
     const prev=phases[i-1],next=phases[i];
     return mix(prev[1],next[1],smooth((u-prev[0])/(next[0]-prev[0])));
    }
   }
   return 1;
  }
  function orb(x:number,y:number,r:number,angle:number,compression:number,alpha:number){
   ctx!.save();ctx!.translate(x,y);ctx!.rotate(angle);
   // The tiny temporary squash is contained inside each circle; shapes
   // never merge, even at the moment of contact.
   ctx!.scale(1-compression*.06,1+compression*.08);
   const gradient=ctx!.createRadialGradient(-r*.28,-r*.30,r*.06,0,0,r*1.02);
   gradient.addColorStop(0,channel(shades.highlight,alpha*.65));
   gradient.addColorStop(.32,channel(shades.warm,alpha*.60));
   gradient.addColorStop(.71,channel(shades.cool,alpha*.42));
   gradient.addColorStop(1,channel(shades.rim,alpha*.17));
   ctx!.beginPath();ctx!.arc(0,0,r,0,TAU);ctx!.fillStyle=gradient;ctx!.fill();
   ctx!.strokeStyle=channel(shades.rim,alpha*.49);
   ctx!.lineWidth=.7;ctx!.stroke();
   ctx!.beginPath();ctx!.ellipse(-r*.20,-r*.26,r*.21,r*.07,-.5,0,Math.PI*1.47);
   ctx!.strokeStyle=channel(shades.highlight,alpha*.67);
   ctx!.lineWidth=Math.max(.8,r*.04);ctx!.lineCap="round";ctx!.stroke();
   ctx!.restore();
  }
  function draw(seconds:number){
   ctx!.clearRect(0,0,width,height);
   for(const pair of pairs){
    const u=((seconds/pair.period+pair.offset)%1+1)%1;
    const minDistance=pair.r1+pair.r2+1.5;
    const distance=minDistance+gap(u)*pair.spread;
    const cx=pair.x*width+Math.sin(seconds*.21+pair.angle)*pair.drift;
    const cy=pair.y*height+Math.cos(seconds*.16+pair.angle)*pair.drift;
    const dx=Math.cos(pair.angle)*distance*.5,dy=Math.sin(pair.angle)*distance*.5;
    const contact=clamp(1-Math.abs(u-.52)/.075,0,1);
    const alpha=mobile?.25:.34;
    orb(cx-dx,cy-dy,pair.r1,pair.angle,contact,alpha);
    orb(cx+dx,cy+dy,pair.r2,pair.angle+Math.PI,contact,alpha);
    // Only isolated microdroplets appear briefly after a bounce,
    // without any trail, beam, web or other visual connection.
    if(u>.52&&u<.66){
     const progress=(u-.52)/.14;
     const ux=-Math.sin(pair.angle),uy=Math.cos(pair.angle);
     for(let j=0;j<(mobile?1:2);j++){
      const side=j===0?1:-1;
      const travel=(4+progress*20)*side;
      orb(cx+ux*travel,cy+uy*travel,Math.max(1.5,(mobile?2:3.2)*(1-progress*.7)),
       0,0,(mobile?.13:.20)*(1-progress));
     }
    }
   }
   for(const f of floaters){
    const x=f.x*width+Math.sin(seconds*f.speed+f.phase)*12;
    const y=f.y*height+Math.cos(seconds*f.speed*.8+f.phase)*10;
    orb(x,y,f.r,f.phase,0,mobile?.13:.20);
   }
  }
  function frame(now:number){
   if(stopped||hidden)return;
   raf=requestAnimationFrame(frame);
   if(now-lastFrame<(mobile?50:32))return; // 20fps phone, ~30fps desktop.
   lastFrame=now;draw((now-start)/1000);
  }
  function visibility(){
   hidden=document.hidden;
   if(hidden){cancelAnimationFrame(raf);raf=0;lastFrame=0;}
   else if(!stopped&&!raf){raf=requestAnimationFrame(frame);}
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
   obs.disconnect();
   ctx.clearRect(0,0,canvas.width,canvas.height);pairs=[];floaters=[];
  };
 },[active]);
 if(!active)return null;
 return <div className="water-atmosphere liquid-atmosphere" aria-hidden="true"
  data-effect="slow-bounce-droplets" data-renderer="canvas-soft-collisions">
  <canvas ref={canvasRef} className="liquid-canvas" aria-hidden="true"/>
 </div>;
}

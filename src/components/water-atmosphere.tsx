"use client";

import {useEffect,useRef,useState} from "react";
import {createWaterBodies,stepWater,type WaterBody} from "@/lib/water-physics";
import type * as THREE from "three";

// The Blender-authored surface remains a small, reusable mesh. Shape, optical
// shading and impact recovery run live; there are no video loops or metaballs.
const VERTEX=`
uniform float uTime;
uniform float uSeed;
uniform float uImpact;
uniform vec3 uAxis;
varying vec3 vNormal;
varying vec3 vPosition;
vec3 surface(vec3 p){
 float ripple=sin(p.y*3.8+uSeed+uTime*.38)*sin(p.x*3.1-uSeed+uTime*.27);
 float pear=sin(uSeed)*p.y*.095;
 vec3 q=p*(1.0+pear+.028*ripple);
 float along=dot(q,uAxis);
 q+=uAxis*along*(-uImpact);
 q+=(q-uAxis*along)*uImpact*.48;
 return q;
}
void main(){
 vec3 p=normalize(position);
 vec3 tangent=normalize(cross(p,abs(p.y)>.95?vec3(1,0,0):vec3(0,1,0)));
 vec3 bitangent=normalize(cross(p,tangent));
 vec3 q=surface(p);
 vec3 t=surface(normalize(p+tangent*.008))-q;
 vec3 b=surface(normalize(p+bitangent*.008))-q;
 vNormal=normalize(normalMatrix*normalize(cross(t,b)));
 vec4 view=modelViewMatrix*vec4(q,1.0);
 vPosition=view.xyz;
 gl_Position=projectionMatrix*view;
}`;
const FRAGMENT=`
uniform float uDark;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vPosition;
float softbox(vec3 reflected,vec3 direction,float focus){
 return pow(max(0.0,dot(reflected,normalize(direction))),focus);
}
void main(){
 vec3 n=normalize(vNormal);
 vec3 view=normalize(vec3(0.0,0.0,1.0));
 vec3 reflection=reflect(-view,n);
 float fresnel=pow(1.0-max(dot(n,view),0.0),3.2);
 float key=softbox(reflection,vec3(-.55,.85,1.3),19.0);
 float strip=softbox(reflection,vec3(.8,.2,.5),34.0);
 float lower=softbox(reflection,vec3(-.3,-.8,.6),12.0);
 // Two broad studio reflections give volume without opaque bubble outlines.
 vec3 body=mix(vec3(.71,.79,.79),vec3(.36,.49,.54),uDark);
 vec3 warm=mix(vec3(.92,.81,.70),vec3(.65,.55,.47),uDark);
 vec3 color=mix(body,warm,smoothstep(-.7,.7,n.x+n.y)*.45);
 color=mix(color,vec3(1.0,.98,.93),clamp(key*.88+strip*.58,0.0,.94));
 color+=vec3(.07,.09,.09)*lower;
 float alpha=(.055+fresnel*.24+key*.47+strip*.22+lower*.06)*uOpacity;
 // At the silhouette, fade rather than outlining every particle.
 alpha*=smoothstep(0.0,.12,abs(n.z));
 gl_FragColor=vec4(color,alpha);
}`;

export function WaterAtmosphere({active}:{active:boolean}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const [available,setAvailable]=useState(true);
 useEffect(()=>{
  if(!active||!canvasRef.current||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const canvas=canvasRef.current;
  let stopped=false,raf=0,cleanup:(()=>void)|undefined;
  setAvailable(true);
  // Keep Three out of the initial page bundle and load only when 3D is enabled.
  void import("three").then(async T=>{
   if(stopped)return;
   let renderer:THREE.WebGLRenderer;
   try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:"low-power"});}
   catch{if(!stopped)setAvailable(false);return;}
   renderer.setClearColor(0x000000,0);
   const scene=new T.Scene();
   const camera=new T.OrthographicCamera(-1,1,1,-1,1,2500);
   camera.position.z=1200;
   let width=innerWidth,height=innerHeight,mobile=false;
   let bodies:WaterBody[]=[],meshes:THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>[]=[];
   let geometry:THREE.BufferGeometry=new T.SphereGeometry(1,24,16);
   let dark=document.documentElement.dataset.theme==="dark";
   let lastFrame=0,lastTime=0,elapsed=0,accumulator=0,visible=!document.hidden;
   const abort=new AbortController();
   function disposeMeshes(){for(const m of meshes){scene.remove(m);m.material.dispose();}meshes=[];}
   function resize(){
    const nextWidth=innerWidth,nextHeight=innerHeight;
    // Ignore the small height-only resize caused by phone browser chrome.
    if(bodies.length&&nextWidth===width&&Math.abs(nextHeight-height)<90)return;
    width=nextWidth;height=nextHeight;mobile=width<=760;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1:1.4));
    renderer.setSize(width,height,false);
    camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
    disposeMeshes();bodies=createWaterBodies(width,height,mobile);
    meshes=bodies.map(body=>{
     const material=new T.ShaderMaterial({
      vertexShader:VERTEX,fragmentShader:FRAGMENT,transparent:true,depthWrite:false,
      uniforms:{uTime:{value:0},uSeed:{value:body.seed},uImpact:{value:0},
       uAxis:{value:new T.Vector3(1,0,0)},uDark:{value:dark?1:0},uOpacity:{value:mobile?.76:.92}},
     });
     const mesh=new T.Mesh(geometry,material);
     mesh.scale.set(body.r*body.sx,body.r*body.sy,body.r*.82);
     scene.add(mesh);return mesh;
    });
   }
   function render(){
    for(let i=0;i<bodies.length;i++){
     const body=bodies[i],mesh=meshes[i],u=mesh.material.uniforms;
     mesh.position.set(body.x,body.y,body.z);
     u.uTime.value=elapsed;u.uImpact.value=body.squash;
     u.uAxis.value.set(body.nx,body.ny,body.nz);u.uDark.value=dark?1:0;
    }
    renderer.render(scene,camera);
    // Small diagnostics also let QA confirm actual simulation, not CSS motion.
    canvas.dataset.contacts=String(bodies.reduce((n,b)=>n+b.contacts,0)/2);
    canvas.dataset.frames=String(Number(canvas.dataset.frames||0)+1);
   }
   function frame(now:number){
    if(stopped||!visible)return;
    raf=requestAnimationFrame(frame);
    if(now-lastFrame<1000/(mobile?24:30))return;
    const delta=lastTime?Math.min((now-lastTime)/1000,.1):0;
    lastFrame=now;lastTime=now;accumulator+=delta;
    // Fixed steps keep collision response consistent across frame rates.
    while(accumulator>=1/60){elapsed+=1/60;stepWater(bodies,1/60,width,height,elapsed);accumulator-=1/60;}
    render();
   }
   function visibility(){
    visible=!document.hidden;cancelAnimationFrame(raf);lastTime=0;lastFrame=0;
    if(visible&&!stopped)raf=requestAnimationFrame(frame);
   }
   function lost(event:Event){event.preventDefault();cancelAnimationFrame(raf);}
   function restored(){if(!stopped){lastTime=0;lastFrame=0;raf=requestAnimationFrame(frame);}}
   const observer=new MutationObserver(()=>{dark=document.documentElement.dataset.theme==="dark";});
   observer.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
   window.addEventListener("resize",resize,{passive:true});
   document.addEventListener("visibilitychange",visibility);
   canvas.addEventListener("webglcontextlost",lost);
   canvas.addEventListener("webglcontextrestored",restored);
   cleanup=()=>{
    abort.abort();cancelAnimationFrame(raf);observer.disconnect();
    window.removeEventListener("resize",resize);document.removeEventListener("visibilitychange",visibility);
    canvas.removeEventListener("webglcontextlost",lost);canvas.removeEventListener("webglcontextrestored",restored);
    disposeMeshes();geometry.dispose();renderer.dispose();
   };
   resize();render();if(visible)raf=requestAnimationFrame(frame);
   // Use Blender's triangulated surface. The lower-resolution sphere above is
   // a graceful offline fallback and is replaced/disposed once this arrives.
   try{
    const response=await fetch("/water/drop-surface.json",{signal:abort.signal});
    if(!response.ok)throw new Error("Surface unavailable");
    const data=await response.json() as {positions:number[];indices:number[]};
    if(stopped)return;
    const authored=new T.BufferGeometry();
    authored.setAttribute("position",new T.Float32BufferAttribute(data.positions,3));
    authored.setIndex(data.indices);authored.computeVertexNormals();
    for(const mesh of meshes)mesh.geometry=authored;
    geometry.dispose();geometry=authored;
    canvas.dataset.surface="blender";
   }catch{/* Rendering continues with the local fallback when offline. */}
  }).catch(()=>{if(!stopped)setAvailable(false);});
  return()=>{stopped=true;cancelAnimationFrame(raf);cleanup?.();};
 },[active]);
 if(!active)return null;
 return <div className="water-atmosphere liquid-atmosphere" aria-hidden="true" hidden={!available}
  data-effect="soft-body-water-3d" data-renderer="webgl-blender-surface"
  data-size-mix="large-medium-small">
  <canvas ref={canvasRef} className="liquid-canvas" aria-hidden="true"/>
 </div>;
}

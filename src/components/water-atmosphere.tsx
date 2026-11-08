"use client";

import {useEffect,useRef,useState,type CSSProperties} from "react";
import {createWaterBodies,stepWater,type WaterBody} from "@/lib/water-physics";
import type * as THREE from "three";

type Edge={x:number;y:number;r:number;sx:number;sy:number;rotation:number;phase:number;amber:number};
type Surface={positions:number[];indices:number[];morphs:number[][];edges:Edge[]};
const FALLBACK=[
 [4,12,24,-35,0],[103,30,49,-33,-7],[-3,60,24,14,-13],
 [9,108,48,63,-4],[98,109,38,-62,-11],[50,29,22,58,-17],
 [52,17,6.8,65,-2],[86,20,5.4,30,-9],[96,63,4.4,45,-5],
 [50,86,6.8,-42,-14],[3,29,2.4,-30,-6],[39,72,3.2,35,-12],
] as const;
type Drop=THREE.Mesh<THREE.BufferGeometry,THREE.MeshPhysicalMaterial>;

// The backdrop is rendered in the SAME scene as the transmissive water. A CSS
// gradient cannot be refracted by WebGL. White/amber studio cards live in the
// HDR environment, giving broad highlights rather than flat bubble outlines.
const BACKDROP=`
 uniform float uDark;
 varying vec2 vUv;
 void main(){
  vec2 p=vUv;
  vec3 ivory=vec3(1.,.928,.864),peach=vec3(1.,.71,.60);
  float glow=exp(-dot((p-vec2(.80,.76))*vec2(1.5,1.2),(p-vec2(.80,.76))*vec2(1.5,1.2))*3.2);
  vec3 day=mix(ivory,peach,glow*.68);
  day=mix(day,vec3(1.,.985,.955),exp(-length((p-vec2(.23,.65))*vec2(2.,1.))*4.)*.62);
  day=mix(day,vec3(.94,.76,.64),smoothstep(.30,0.,p.y)*.18);
  vec3 night=mix(vec3(.055,.036,.032),vec3(.20,.078,.042),glow*.72);
  gl_FragColor=vec4(mix(day,night,uDark),1.);
  #include <colorspace_fragment>
 }`;

export function WaterAtmosphere({active}:{active:boolean}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const [mode,setMode]=useState<"loading"|"webgl"|"fallback">("loading");
 useEffect(()=>{
  if(!active||!canvasRef.current||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const canvas=canvasRef.current;
  let stopped=false,raf=0,cleanup:(()=>void)|undefined;
  const abort=new AbortController();
  const pauseFallback=()=>canvas.parentElement?.setAttribute("data-paused",document.hidden?"true":"false");
  document.addEventListener("visibilitychange",pauseFallback);pauseFallback();
  setMode("loading");
  void import("three").then(async T=>{
   if(stopped)return;
   let renderer:THREE.WebGLRenderer;
   try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"low-power"});}
   catch{if(!stopped)setMode("fallback");return;}
   renderer.outputColorSpace=T.SRGBColorSpace;
   renderer.toneMapping=T.ACESFilmicToneMapping;
   renderer.toneMappingExposure=1.12;
   renderer.setClearColor(0x000000,0);
   renderer.transmissionResolutionScale=.65;
   const scene=new T.Scene();
   const camera=new T.OrthographicCamera(-1,1,1,-1,1,3000);camera.position.z=1600;
   let width=innerWidth,height=innerHeight,mobile=false;
   let bodies:WaterBody[]=[],drops:Drop[]=[],edgeDrops:Drop[]=[],edges:Edge[]=[];
   let geometry:THREE.BufferGeometry=new T.SphereGeometry(1,32,24);
   let dark=document.documentElement.dataset.theme==="dark";
   let lastFrame=0,lastTime=0,elapsed=0,accumulator=0,visible=!document.hidden;
   let pointerX=0,pointerY=0,parallaxX=0,parallaxY=0;

   // Linear HDR environment: curved photographic softboxes and amber bounce.
   const ew=512,eh=256,pixels=new Float32Array(ew*eh*4);
   for(let y=0;y<eh;y++)for(let x=0;x<ew;x++){
    const u=x/ew,v=y/eh,i=(y*ew+x)*4;
    const box=(cx:number,cy:number,sx:number,sy:number)=>Math.exp(-Math.pow(Math.abs(u-cx)/sx,8)-Math.pow(Math.abs(v-cy)/sy,8));
    const key=box(.26,.31,.13,.035)*5.0;
    const strip=box(.72,.45,.022,.21)*3.6;
    const fill=box(.47,.69,.19,.055)*1.2;
    const amber=box(.13,.74,.22,.085)*1.4;
    pixels[i]=.65+key+strip+fill+amber;
    pixels[i+1]=.47+key*.97+strip*.98+fill*.83+amber*.46;
    pixels[i+2]=.36+key*.93+strip*.95+fill*.57+amber*.13;pixels[i+3]=1;
   }
   const studio=new T.DataTexture(pixels,ew,eh,T.RGBAFormat,T.FloatType);
   studio.mapping=T.EquirectangularReflectionMapping;studio.needsUpdate=true;
   const pmrem=new T.PMREMGenerator(renderer);
   const environment=pmrem.fromEquirectangular(studio);scene.environment=environment.texture;
   studio.dispose();pmrem.dispose();
   const backdropMaterial=new T.ShaderMaterial({
    vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:BACKDROP,uniforms:{uDark:{value:dark?1:0}},depthWrite:false,
   });
   const backdropGeometry=new T.PlaneGeometry(1,1);
   const backdrop=new T.Mesh(backdropGeometry,backdropMaterial);backdrop.position.z=-400;scene.add(backdrop);
   scene.add(new T.HemisphereLight(0xfff5e8,0xf8a359,1.5));
   const keyLight=new T.DirectionalLight(0xfff8ec,2.1);keyLight.position.set(-400,650,900);scene.add(keyLight);

   function material(r:number,amber:number){
    return new T.MeshPhysicalMaterial({
     color:new T.Color().setRGB(1,1-amber*.10,1-amber*.24),
     roughness:.065,metalness:0,transmission:.985,thickness:r*.68,ior:1.333,
     clearcoat:.65,clearcoatRoughness:.045,envMapIntensity:dark?.72:1.05,
     attenuationColor:new T.Color("#ffcf9f"),attenuationDistance:r*5.5,
     specularIntensity:1,depthWrite:false,
    });
   }
   function disposeDrops(){for(const mesh of [...drops,...edgeDrops]){scene.remove(mesh);mesh.material.dispose();}drops=[];edgeDrops=[];}
   function resize(force=false){
    const nextWidth=innerWidth,nextHeight=innerHeight;
    if(!force&&bodies.length&&nextWidth===width&&Math.abs(nextHeight-height)<90)return;
    width=nextWidth;height=nextHeight;mobile=width<=760;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1:1.5));renderer.setSize(width,height,false);
    renderer.transmissionResolutionScale=mobile?.5:.65;
    camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
    backdrop.scale.set(width,height,1);
    disposeDrops();bodies=createWaterBodies(width,height,mobile);
    drops=bodies.map(body=>{
     const mesh=new T.Mesh(geometry,material(body.r,.04));
     mesh.scale.set(body.r*body.sx,body.r*body.sy,body.r*.82);scene.add(mesh);return mesh;
    });
    const unit=Math.min(width,height);
    edgeDrops=edges.filter((_,i)=>!mobile||i!==5).map(edge=>{
     const r=edge.r*unit*(mobile?1.12:1);
     const mesh=new T.Mesh(geometry,material(r,edge.amber));
     mesh.scale.set(r*edge.sx,r*edge.sy,r*.77);mesh.userData.edge=edge;scene.add(mesh);return mesh;
    });
    canvas.dataset.drops=String(drops.length);canvas.dataset.lenses=String(edgeDrops.length);
   }
   function morph(mesh:Drop,phase:number){
    if(mesh.morphTargetInfluences){
     mesh.morphTargetInfluences[0]=.5+.5*Math.sin(elapsed*.31+phase);
     mesh.morphTargetInfluences[1]=.5+.5*Math.sin(elapsed*.23+phase+1.7);
    }
   }
   function render(){
    parallaxX+=(pointerX-parallaxX)*.035;parallaxY+=(pointerY-parallaxY)*.035;
    for(let i=0;i<bodies.length;i++){
     const b=bodies[i],mesh=drops[i];
     mesh.position.set(b.x+parallaxX*.4,b.y+parallaxY*.4,b.z);
     mesh.rotation.set(Math.sin(elapsed*.13+b.seed)*.16,Math.cos(elapsed*.11+b.seed)*.18,b.seed+Math.sin(elapsed*.15+b.seed)*.16);
     mesh.scale.set(b.r*b.sx*(1+b.squash*.45),b.r*b.sy*(1-b.squash),b.r*.82*(1+b.squash*.45));
     morph(mesh,b.seed);mesh.material.envMapIntensity=dark?.72:1.05;
    }
    for(const mesh of edgeDrops){
     const e=mesh.userData.edge as Edge,phase=e.phase,t=elapsed*.19+phase;
     const amplitude=Math.min(width,height)*.015;
     mesh.position.set((e.x-.5)*width+Math.sin(t)*amplitude+parallaxX,(.5-e.y)*height+Math.cos(t*.86)*amplitude+parallaxY,-25);
     mesh.rotation.set(.08*Math.sin(t),.12*Math.cos(t),e.rotation+.07*Math.sin(t));
     morph(mesh,phase);mesh.material.envMapIntensity=dark?.72:1.05;
    }
    backdropMaterial.uniforms.uDark.value=dark?1:0;
    renderer.render(scene,camera);
    canvas.dataset.contacts=String(bodies.reduce((n,b)=>n+b.contacts,0)/2);
    canvas.dataset.frames=String(Number(canvas.dataset.frames||0)+1);
   }
   function frame(now:number){
    if(stopped||!visible)return;raf=requestAnimationFrame(frame);
    if(now-lastFrame<1000/(mobile?24:30))return;
    const delta=lastTime?Math.min((now-lastTime)/1000,.1):0;
    lastFrame=now;lastTime=now;accumulator+=delta;
    while(accumulator>=1/60){elapsed+=1/60;stepWater(bodies,1/60,width,height,elapsed);accumulator-=1/60;}
    render();
   }
   function visibility(){visible=!document.hidden;cancelAnimationFrame(raf);lastTime=0;lastFrame=0;if(visible&&!stopped)raf=requestAnimationFrame(frame);}
   function lost(event:Event){event.preventDefault();cancelAnimationFrame(raf);setMode("fallback");}
   function restored(){if(!stopped){setMode("webgl");lastTime=0;lastFrame=0;raf=requestAnimationFrame(frame);}}
   function move(event:PointerEvent){if(event.pointerType!=="mouse")return;pointerX=(event.clientX/width-.5)*10;pointerY=(.5-event.clientY/height)*10;}
   function leave(){pointerX=0;pointerY=0;}
   const observer=new MutationObserver(()=>{dark=document.documentElement.dataset.theme==="dark";});
   observer.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
   const onResize=()=>resize();
   window.addEventListener("resize",onResize,{passive:true});window.addEventListener("pointermove",move,{passive:true});
   document.addEventListener("pointerleave",leave);document.addEventListener("visibilitychange",visibility);
   canvas.addEventListener("webglcontextlost",lost);canvas.addEventListener("webglcontextrestored",restored);
   cleanup=()=>{
    abort.abort();cancelAnimationFrame(raf);observer.disconnect();
    window.removeEventListener("resize",onResize);window.removeEventListener("pointermove",move);
    document.removeEventListener("pointerleave",leave);document.removeEventListener("visibilitychange",visibility);
    canvas.removeEventListener("webglcontextlost",lost);canvas.removeEventListener("webglcontextrestored",restored);
    disposeDrops();geometry.dispose();backdropMaterial.dispose();backdropGeometry.dispose();environment.dispose();renderer.dispose();
   };
   resize();render();setMode("webgl");if(visible)raf=requestAnimationFrame(frame);
   try{
    const response=await fetch("/water/drop-surface.json",{signal:abort.signal});
    if(!response.ok)throw new Error("Surface unavailable");
    const data=await response.json() as Surface;if(stopped)return;
    const authored=new T.BufferGeometry();authored.setAttribute("position",new T.Float32BufferAttribute(data.positions,3));
    authored.setIndex(data.indices);authored.computeVertexNormals();
    authored.morphAttributes.position=[];authored.morphAttributes.normal=[];
    for(const positions of data.morphs){
     const target=new T.BufferGeometry();target.setAttribute("position",new T.Float32BufferAttribute(positions,3));target.setIndex(data.indices);target.computeVertexNormals();
     authored.morphAttributes.position.push(target.getAttribute("position"));authored.morphAttributes.normal.push(target.getAttribute("normal"));target.dispose();
    }
    geometry.dispose();geometry=authored;edges=data.edges;resize(true);render();canvas.dataset.surface="blender";
   }catch{/* Local geometry continues if the authoring asset is unavailable. */}
  }).catch(()=>{cleanup?.();if(!stopped)setMode("fallback");});
  return()=>{stopped=true;abort.abort();document.removeEventListener("visibilitychange",pauseFallback);cancelAnimationFrame(raf);cleanup?.();};
 },[active]);
 if(!active)return null;
 return <div className="water-atmosphere liquid-atmosphere" aria-hidden="true" data-mode={mode}
  data-effect="soft-body-water-3d" data-renderer="webgl-blender-surface" data-size-mix="large-medium-small"
  data-material="refractive-peach-water">
  <div className="water-fallback">
   {FALLBACK.map(([x,y,size,angle,delay],i)=><span key={i} className={"peach-water-sprite "+(i<6?"water-lens":"water-bead")}
    style={{left:x+"%",top:y+"%","--drop-size":size+"vmin","--drop-angle":angle+"deg","--drop-delay":delay+"s"} as CSSProperties}>
    <img src="/water/peach-drop.png" alt="" width={512} height={640} draggable={false}/>
   </span>)}
  </div>
  <canvas ref={canvasRef} className="liquid-canvas" aria-hidden="true"/>
 </div>;
}

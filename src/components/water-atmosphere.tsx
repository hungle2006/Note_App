"use client";

import {useEffect,useId,useRef,useState,type CSSProperties} from "react";
import composition from "@/lib/water-composition.json";
import optics from "@/lib/water-optics.json";
import type * as THREE from "three";

type Profile="bead"|"ribbon"|"lens"|"wave";
type Layer={id:string;profile:Profile;x:number;y:number;r:number;angle:number;phase:number;amber:number};
type MeshData={positions:number[];indices:number[];morphs:number[][]};
type Surface={profiles:Record<Profile,MeshData>};
type Drop=THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
const LAYERS=composition as Layer[];

// The live scene and the Blender optical renders share four sculpted profiles,
// one reference-traced composition and matching curved optical highlights.
const BACKDROP=`
 uniform float uDark;
 varying vec2 vUv;
 vec3 linearColor(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
 void main(){
  vec2 p=vUv;
  float warm=exp(-dot((p-vec2(.84,.74))*vec2(1.3,1.15),(p-vec2(.84,.74))*vec2(1.3,1.15))*3.0);
  float pale=exp(-dot((p-vec2(.22,.58))*vec2(2.1,1.3),(p-vec2(.22,.58))*vec2(2.1,1.3))*2.6);
  float floorGlow=1.-smoothstep(0.,.37,p.y);
  vec3 day=mix(vec3(1.,.91,.85),vec3(1.,.79,.70),warm*.66);
  day=mix(day,vec3(1.,.983,.962),pale*.82);
  day=mix(day,vec3(.78,.73,.68),floorGlow*.42);
  vec3 night=mix(vec3(.055,.058,.073),vec3(.23,.13,.09),warm*.72);
  night=mix(night,vec3(.09,.12,.15),floorGlow*.55);
  gl_FragColor=vec4(linearColor(mix(day,night,uDark)),1.);
  #include <colorspace_fragment>
 }`;

// Broad, continuous liquid deformation. Recompute the surface normal from the
// same field so highlights flow with the mesh rather than sliding a rigid drop.
const FLOW_VERTEX=`
 uniform float uTime;
 uniform float uPhase;
 vec3 flowingSurface(vec3 p){
  float t=uTime*.59+uPhase;
  float squeeze=.052*sin(t);
  vec3 q=p;
  q.x=p.x*(1.+squeeze)+.038*sin(t*.73+p.y*2.1)*(1.-clamp(p.x*p.x,0.,1.));
  q.y=p.y/(1.+squeeze)+.036*sin(t*.89+p.x*2.4)*(1.-clamp(p.y*p.y,0.,1.));
  q.z=p.z*(1.+.035*sin(t*.63+p.x*1.5));
  return q;
 }
 vec3 flowingNormal(vec3 p,vec3 baseNormal){
  vec3 n=normalize(baseNormal);
  vec3 tangent=normalize(cross(n,abs(n.y)>.95?vec3(1.,0.,0.):vec3(0.,1.,0.)));
  vec3 bitangent=cross(n,tangent),q=flowingSurface(p);
  return normalize(cross(flowingSurface(p+tangent*.004)-q,flowingSurface(p+bitangent*.004)-q));
 }
`;

// Palette data is shared with Blender. The night setup retains crisp silver
// reflections and amber bounce while reducing only the transparent body density.
const opticalColor=(name:keyof typeof optics.light)=>
 `mix(vec3(${optics.light[name].join(",")}),vec3(${optics.dark[name].join(",")}),uDark)`;
const LIQUID=`
 uniform float uAmber;
 uniform float uDark;
 varying vec3 vNormal;
 varying vec3 vViewPosition;
 float gaussian(float x,float center,float width){float t=(x-center)/width;return exp(-t*t);}
 void main(){
  vec3 n=normalize(vNormal),r=reflect(vec3(0.,0.,-1.),n);
  float facing=clamp(n.z,0.,1.),edge=1.-facing;
  float side=dot(n.xy,vec2(-.72,.69));
  float thin=gaussian(edge,.56,.032)*smoothstep(.05,.6,side);
  float shoulder=gaussian(edge,.50,.15)*smoothstep(-.15,.5,side);
  float rim=pow(edge,6.)*(.2+.8*clamp(side,0.,1.));
  float cap=gaussian(n.x,-.20,.25)*gaussian(n.y,.50,.14);
  float warm=gaussian(edge,.37,.13)*smoothstep(.05,.65,dot(n.xy,vec2(.50,-.866)));
  float cool=gaussian(edge,.52,.18)*smoothstep(.05,.65,dot(n.xy,vec2(-.62,-.78)));
  float inner=gaussian(edge,.71,.026)*smoothstep(.05,.65,dot(n.xy,vec2(.64,-.76)));
  float key=pow(max(dot(r,normalize(vec3(-.65,.65,-.35))),0.),32.);
  float absorption=min(1.,uAmber*1.6)*(.35+.65*pow(facing,1.6));
  vec3 body=mix(${opticalColor('clearBody')},${opticalColor('amberBody')},absorption);
  body=mix(body,${opticalColor('coolReflection')},cool*.34*(1.-uAmber*.7));
  body=mix(body,${opticalColor('warmReflection')},warm*.60);
  body=mix(body,${opticalColor('innerReflection')},inner*.35);
  float white=clamp(thin*.98+shoulder*.62+key*.65+cap*.70+rim*.60,0.,1.);
  vec3 color=mix(body,${opticalColor('whiteReflection')},white);
  float dayDensity=.025+uAmber*.88*pow(facing,1.35);
  float nightDensity=.012+uAmber*.25*facing*facing+cool*.03;
  float alpha=clamp(mix(dayDensity,nightDensity,uDark)+thin*.92+shoulder*.23+key*.42+cap*.55+rim*.55+warm*.30+cool*.18+inner*.13,0.,.98);
  gl_FragColor=vec4(color,alpha);
  #include <colorspace_fragment>
 }`;

function sprite(layer:Layer,night=false){return "/water/"+layer.profile+(layer.amber>.4?"-amber":"")+(night?"-night":"")+".webp";}

export function WaterAtmosphere({active}:{active:boolean}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const [mode,setMode]=useState<"loading"|"webgl"|"fallback">("loading");
 const opticsRef=useRef<SVGSVGElement>(null);
 const opticsId="water-flow-"+useId().replace(/[^a-zA-Z0-9_-]/g,"");
 useEffect(()=>{
  if(!active||!canvasRef.current||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const canvas=canvasRef.current,abort=new AbortController();
  let stopped=false,raf=0,cleanup:(()=>void)|undefined;
  const pauseFallback=()=>{
   canvas.parentElement?.setAttribute("data-paused",document.hidden?"true":"false");
   if(document.hidden)opticsRef.current?.pauseAnimations();else opticsRef.current?.unpauseAnimations();
  };
  document.addEventListener("visibilitychange",pauseFallback);pauseFallback();setMode("loading");
  void import("three").then(async T=>{
   if(stopped)return;
   let renderer:THREE.WebGLRenderer;
   try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"low-power"});}
   catch{if(!stopped)setMode("fallback");return;}
   renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
   renderer.toneMappingExposure=1.05;renderer.setClearColor(0x000000,0);
   const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,1,3000);camera.position.z=1600;
   let width=innerWidth,height=innerHeight,mobile=false,dark=document.documentElement.dataset.theme==="dark";
   let meshes:Drop[]=[],geometries:Partial<Record<Profile,THREE.BufferGeometry>>={};
   let lighting=dark?1:0;
   let last=0,lastTime=0,elapsed=0,visible=!document.hidden,pointerX=0,pointerY=0,px=0,py=0,authored=false;

   const backdropMaterial=new T.ShaderMaterial({vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:BACKDROP,uniforms:{uDark:{value:dark?1:0}},depthWrite:false});
   const backdropGeometry=new T.PlaneGeometry(1,1),backdrop=new T.Mesh(backdropGeometry,backdropMaterial);
   backdrop.position.z=-400;scene.add(backdrop);

   function disposeMeshes(){for(const m of meshes){scene.remove(m);m.material.dispose();}meshes=[];}
   function resize(force=false){
    if(!force&&meshes.length&&innerWidth===width&&Math.abs(innerHeight-height)<90)return;
    width=innerWidth;height=innerHeight;mobile=width<=760;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1:1.5));renderer.setSize(width,height,false);
    renderer.transmissionResolutionScale=mobile?.5:.7;
    camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
    backdrop.scale.set(width,height,1);disposeMeshes();if(!authored)return;
    for(const layer of LAYERS){
     if(mobile&&(layer.id==="middle-lens"||layer.id==="bottom-crest"))continue;
     const g=geometries[layer.profile];if(!g)continue;
     const r=layer.r*Math.min(width,height);
     const material=new T.ShaderMaterial({
      vertexShader:FLOW_VERTEX+T.ShaderLib.physical.vertexShader
       .replace("#include <morphnormal_vertex>","#include <morphnormal_vertex>\n objectNormal=flowingNormal(position,objectNormal);")
       .replace("#include <begin_vertex>","#include <begin_vertex>\n transformed=flowingSurface(transformed);"),fragmentShader:LIQUID,
      transparent:true,depthWrite:false,
      uniforms:{uAmber:{value:layer.amber},uDark:{value:dark?1:0},uTime:{value:0},uPhase:{value:layer.phase}},
     });
     const mesh=new T.Mesh(g,material);mesh.userData.layer=layer;mesh.scale.setScalar(r);scene.add(mesh);meshes.push(mesh);
    }
    canvas.dataset.lenses=String(meshes.filter(m=>(m.userData.layer as Layer).id.includes('bead')===false).length);
    canvas.dataset.drops=String(meshes.filter(m=>(m.userData.layer as Layer).id.includes('bead')).length);
   }
   function render(){
    px+=(pointerX-px)*.03;py+=(pointerY-py)*.03;
    lighting+=((dark?1:0)-lighting)*.065;
    for(const mesh of meshes){
     const layer=mesh.userData.layer as Layer,t=elapsed*Math.PI*2/(layer.profile==="bead"?13:17)+layer.phase;
     const amplitude=Math.min(width,height)*.022;
     mesh.position.set((layer.x-.5)*width+(Math.sin(t)+.22*Math.sin(t*.63+layer.phase))*amplitude+px,
      (.5-layer.y)*height+(Math.cos(t*.83)+.18*Math.sin(t*1.31))*amplitude+py,-10);
     mesh.rotation.set(.055*Math.sin(t*.71),.075*Math.cos(t*.67),layer.angle+.065*Math.sin(t*.89));
     if(mesh.morphTargetInfluences){mesh.morphTargetInfluences[0]=.5+.5*Math.sin(t);mesh.morphTargetInfluences[1]=.5+.5*Math.sin(t+1.7);}
     mesh.material.uniforms.uDark.value=lighting;
     mesh.material.uniforms.uTime.value=elapsed;
    }
    backdropMaterial.uniforms.uDark.value=lighting;renderer.render(scene,camera);
    canvas.dataset.frames=String(Number(canvas.dataset.frames||0)+1);
   }
   function frame(now:number){
    if(stopped||!visible)return;raf=requestAnimationFrame(frame);
    if(now-last<1000/(mobile?30:60))return;
    elapsed+=lastTime?Math.min((now-lastTime)/1000,.1):0;last=now;lastTime=now;render();
   }
   function visibility(){visible=!document.hidden;cancelAnimationFrame(raf);lastTime=0;last=0;if(visible&&!stopped&&authored)raf=requestAnimationFrame(frame);}
   function lost(event:Event){event.preventDefault();cancelAnimationFrame(raf);setMode("fallback");}
   function restored(){if(!stopped&&authored){setMode("webgl");lastTime=0;last=0;raf=requestAnimationFrame(frame);}}
   function move(event:PointerEvent){if(event.pointerType!=="mouse")return;pointerX=(event.clientX/width-.5)*5;pointerY=(.5-event.clientY/height)*5;}
   function leave(){pointerX=0;pointerY=0;}
   const observer=new MutationObserver(()=>{dark=document.documentElement.dataset.theme==="dark";});
   observer.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
   const onResize=()=>resize();
   window.addEventListener("resize",onResize,{passive:true});window.addEventListener("pointermove",move,{passive:true});
   document.addEventListener("pointerleave",leave);document.addEventListener("visibilitychange",visibility);
   canvas.addEventListener("webglcontextlost",lost);canvas.addEventListener("webglcontextrestored",restored);
   cleanup=()=>{
    abort.abort();cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener("resize",onResize);window.removeEventListener("pointermove",move);
    document.removeEventListener("pointerleave",leave);document.removeEventListener("visibilitychange",visibility);
    canvas.removeEventListener("webglcontextlost",lost);canvas.removeEventListener("webglcontextrestored",restored);
    disposeMeshes();for(const g of Object.values(geometries))g.dispose();backdropMaterial.dispose();backdropGeometry.dispose();renderer.dispose();
   };
   try{
    const response=await fetch("/water/drop-surface.json",{signal:abort.signal});if(!response.ok)throw Error("Surface unavailable");
    const data=await response.json() as Surface;if(stopped)return;
    for(const profile of Object.keys(data.profiles) as Profile[]){
     const d=data.profiles[profile],g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(d.positions,3));g.setIndex(d.indices);g.computeVertexNormals();
     g.morphAttributes.position=[];g.morphAttributes.normal=[];
     for(const positions of d.morphs){
      const target=new T.BufferGeometry();target.setAttribute("position",new T.Float32BufferAttribute(positions,3));target.setIndex(d.indices);target.computeVertexNormals();
      g.morphAttributes.position.push(target.getAttribute("position"));g.morphAttributes.normal.push(target.getAttribute("normal"));target.dispose();
     }
     geometries[profile]=g;
    }
    authored=true;resize(true);render();canvas.dataset.surface="blender";setMode("webgl");if(visible)raf=requestAnimationFrame(frame);
   }catch{if(!stopped)setMode("fallback");}
  }).catch(()=>{cleanup?.();if(!stopped)setMode("fallback");});
  return()=>{stopped=true;abort.abort();document.removeEventListener("visibilitychange",pauseFallback);cancelAnimationFrame(raf);cleanup?.();};
 },[active]);
 if(!active)return null;
 return <div className="water-atmosphere liquid-atmosphere" aria-hidden="true" data-mode={mode}
  data-effect="soft-body-water-3d" data-renderer="webgl-blender-surface" data-size-mix="large-medium-small" data-material="layered-liquid-light-night" data-motion-style="continuous-soft-flow">
  <svg ref={opticsRef} className="water-flow-defs" width="0" height="0" aria-hidden="true" focusable="false">
   <defs>{LAYERS.map((layer,i)=><filter key={layer.id} id={opticsId+"-"+i}
    x="-.16" y="-.16" width="1.32" height="1.32" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".008 .011" numOctaves="1" seed={i+3} stitchTiles="stitch" result="flow-noise"/>
    <feDisplacementMap in="SourceGraphic" in2="flow-noise" scale=".018" xChannelSelector="R" yChannelSelector="G">
     <animate attributeName="scale" values=".018;.075;.032;.018" keyTimes="0;.36;.72;1" calcMode="spline"
      keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1" dur={(layer.profile==="bead"?9:12)+i*.31+"s"}
      begin={-layer.phase*2+"s"} repeatCount="indefinite"/>
    </feDisplacementMap>
   </filter>)}</defs>
  </svg>
  <div className="water-fallback">
   {LAYERS.map(layer=><span key={layer.id} className={"peach-water-sprite water-"+layer.id} data-profile={layer.profile}
    style={{left:layer.x*100+"%",top:layer.y*100+"%","--drop-size":layer.r*240+"vmin","--drop-angle":(-layer.angle*180/Math.PI)+"deg","--drop-delay":(-layer.phase*2.6)+"s","--float-duration":(layer.profile==="bead"?13:17)+layer.phase*.4+"s","--flow-duration":(layer.profile==="bead"?8.5:11)+layer.phase*.2+"s"} as CSSProperties}>
    <span className="water-surface" style={{filter:"url(#"+opticsId+"-"+LAYERS.indexOf(layer)+")"}}>
     <img className="water-surface-light" src={sprite(layer)} alt="" width={512} height={512} draggable={false}/>
     <img className="water-surface-night" src={sprite(layer,true)} alt="" width={512} height={512} draggable={false}/>
    </span>
   </span>)}
  </div>
  <canvas ref={canvasRef} className="liquid-canvas" aria-hidden="true"/>
 </div>;
}

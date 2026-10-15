"use client";
import {useEffect,useRef,useState} from 'react';
import type {WebGLRenderer,Object3D,Mesh,Material} from 'three';
import {Sparkles,ScanText,Check} from 'lucide-react';import {useAppearance} from './appearance';
function disposeModel(root:Object3D){root.traverse(o=>{const mesh=o as Mesh;if(mesh.isMesh){mesh.geometry.dispose();const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];materials.forEach((m:Material)=>m.dispose());}});}
export function LearningScene({compact=false}:{compact?:boolean}){
 const root=useRef<HTMLDivElement>(null),mount=useRef<HTMLDivElement>(null),[ready,setReady]=useState(false);const {motion}=useAppearance();
 useEffect(()=>{
  setReady(false);if(!motion||document.documentElement.dataset.motion==='off'||!matchMedia('(min-width: 768px) and (pointer: fine)').matches)return;
  const hostElement=mount.current,containerElement=root.current;if(!hostElement||!containerElement)return;const host=hostElement,container=containerElement;
  let stopped=false,visible=false,started=false,frame=0,renderer:WebGLRenderer|undefined,model:Object3D|undefined;let resize:ResizeObserver|undefined;const abort=new AbortController();const pointer={x:0,y:0};
  const move=(e:PointerEvent)=>{if(e.pointerType!=='mouse')return;const b=container.getBoundingClientRect();pointer.x=(e.clientX-b.left)/b.width-.5;pointer.y=(e.clientY-b.top)/b.height-.5;};const reset=()=>{pointer.x=0;pointer.y=0;};
  container.addEventListener('pointermove',move);container.addEventListener('pointerleave',reset);
  async function start(){if(started||stopped)return;started=true;
   try{const [T,{GLTFLoader},file]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js'),fetch('/models/study-atlas.glb',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Scene unavailable');return r.arrayBuffer();})]);if(stopped)return;
    const gltf=await new GLTFLoader().parseAsync(file,'/models/');if(stopped){disposeModel(gltf.scene);return;}model=gltf.scene;
    renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);const scene=new T.Scene();scene.add(model);
    const hemi=new T.HemisphereLight(0xffffff,0x8d7fbb,3);scene.add(hemi);const key=new T.DirectionalLight(0xfffaf1,4);key.position.set(3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.normalBias=.03;scene.add(key);const fill=new T.DirectionalLight(0xb5e9db,2.2);fill.position.set(-4,3,-2);scene.add(fill);
    model.traverse(o=>{const mesh=o as Mesh;if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
    const camera=new T.OrthographicCamera(-3.4,3.4,3.4,-3.4,.1,40);camera.position.set(5,7,7);camera.lookAt(0,.45,0);
    const fit=()=>{if(!renderer)return;const b=host.getBoundingClientRect();renderer.setSize(b.width,b.height,false);const aspect=b.width/Math.max(1,b.height);camera.left=-3.4*aspect;camera.right=3.4*aspect;camera.updateProjectionMatrix();};resize=new ResizeObserver(fit);resize.observe(host);fit();
    const baseY=model.position.y;let last=0;const draw=(time:number)=>{if(stopped)return;frame=requestAnimationFrame(draw);if(!visible||document.hidden||time-last<32)return;last=time;if(!renderer||!model)return;model.rotation.y+=(pointer.x*.12+Math.sin(time*.00022)*.025-model.rotation.y)*.035;model.rotation.x+=(-pointer.y*.045-model.rotation.x)*.035;model.position.y=baseY+Math.sin(time*.0008)*.045;renderer.render(scene,camera);};
    renderer.render(scene,camera);setReady(true);frame=requestAnimationFrame(draw);
   }catch{if(!stopped){setReady(false);renderer?.dispose();host.replaceChildren();}}
  }
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)void start();},{rootMargin:'80px'});observer.observe(container);
  return()=>{stopped=true;abort.abort();observer.disconnect();resize?.disconnect();cancelAnimationFrame(frame);container.removeEventListener('pointermove',move);container.removeEventListener('pointerleave',reset);if(model)disposeModel(model);renderer?.dispose();renderer?.forceContextLoss();host.replaceChildren();};
 },[motion]);
 return <div ref={root} className={'learning-scene scene-blender '+(compact?'scene-compact':'')} aria-hidden="true" data-renderer={ready?'webgl':'poster'}><div className="atelier-aura"/><div className="atelier-orbit orbit-one"/><div className="atelier-orbit orbit-two"/><div className={'scene-book blender-poster '+(ready?'poster-hidden':'')}><img src="/images/study-atlas.webp" width={1200} height={1200} alt="" fetchPriority={compact?'auto':'high'}/></div><div ref={mount} className={'blender-canvas '+(ready?'canvas-ready':'')}/><div className="atelier-chip chip-top"><span><Sparkles size={18}/></span><div><strong>Một chút tò mò.</strong><small>Cả một thế giới để hiểu.</small></div></div><div className="atelier-chip chip-bottom"><span><ScanText size={18}/></span><div><strong>Chụp. Soát chữ. Hiểu sâu.</strong><small>Kiến thức bắt đầu từ điều em kiểm tra.</small></div><Check size={17}/></div><span className="atelier-small-star">✦</span></div>;
}

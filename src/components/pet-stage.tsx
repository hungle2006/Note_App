"use client";
import {useEffect,useRef,useState} from 'react';
import type * as THREE from 'three';
import {petModel,petPortrait,type Pet,type PetAction} from '@/lib/pets';
import {useAppearance} from './appearance';

/** One renderer for the equipped pet, one on demand for the preview dialog.
 * Store cards use Blender portraits instead of allocating ten WebGL contexts. */
export function PetStage({pet,action,onInteract,small=false}:{pet:Pet;action:{kind:PetAction;tick:number};onInteract:()=>void;small?:boolean}){
 const canvasRef=useRef<HTMLCanvasElement>(null),actionRef=useRef(action);
 const lookRef=useRef({x:0,y:0});
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 const {motion}=useAppearance();const motionRef=useRef(motion);
 useEffect(()=>{motionRef.current=motion;},[motion]);
 useEffect(()=>{actionRef.current=action;},[action]);
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  let disposed=false,dispose:(()=>void)|undefined;
  setReady(false);setFailed(false);
  void Promise.all([import('three'),import('three/examples/jsm/loaders/GLTFLoader.js'),import('@/lib/pet-rig')]).then(async([T,{GLTFLoader},{createPetRig}])=>{
   if(disposed)return;
   let renderer:THREE.WebGLRenderer;
   try{const context=canvas.getContext('webgl2',{alpha:true,antialias:!small,powerPreference:'low-power'});if(!context){setFailed(true);return;}renderer=new T.WebGLRenderer({canvas,context,alpha:true,antialias:!small,powerPreference:'low-power'});}
   catch{setFailed(true);return;}
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,small?1.3:1.6));
   renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
   renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,50);
   camera.position.set(1.8,2.5,6.7);camera.lookAt(0,1.40,0);
   scene.add(new T.HemisphereLight(0xfff5df,0xb4b6c4,2.6));
   const key=new T.DirectionalLight(0xfff0dd,3);key.position.set(-3,5,4);scene.add(key);
   const fill=new T.DirectionalLight(0xd8eaff,1.5);fill.position.set(4,2,-2);scene.add(fill);
   let model:THREE.Group|undefined,rig:ReturnType<typeof createPetRig>|undefined,raf=0,last=performance.now();
   let visible=!document.hidden,inView=true;
   const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
   function resize(){const rect=canvas!.getBoundingClientRect();renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);camera.aspect=rect.width/Math.max(1,rect.height);camera.updateProjectionMatrix();}
   const observer=new ResizeObserver(resize);observer.observe(canvas);
   function frame(now:number){
    if(disposed)return;
    raf=requestAnimationFrame(frame);
    if(!visible||!inView||now-last<(small?50:33))return;
    const dt=Math.min((now-last)/1000,.1);last=now;
    const animate=motionRef.current&&!reducedMotion.matches;
    rig?.update(dt,actionRef.current,animate,lookRef.current);
    canvas!.dataset.behavior=rig?.behavior||'loading';
    renderer.render(scene,camera);canvas!.dataset.frames=String(Number(canvas!.dataset.frames||0)+1);
   }
   function visibility(){visible=!document.hidden;last=performance.now();}
   const intersection=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??true;last=performance.now();});intersection.observe(canvas);
   document.addEventListener('visibilitychange',visibility);
   function release(root:THREE.Object3D){root.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.isMesh){mesh.geometry.dispose();const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const material of materials){for(const value of Object.values(material))if(value&&typeof value==='object'&&(value as THREE.Texture).isTexture)(value as THREE.Texture).dispose();material.dispose();}}});}
   dispose=()=>{cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);rig?.dispose();if(model)release(model);renderer.dispose();renderer.forceContextLoss();};
   resize();raf=requestAnimationFrame(frame);
   try{
    const gltf=await new GLTFLoader().loadAsync(petModel(pet.animal));
    if(disposed){release(gltf.scene);return;}
    model=gltf.scene;scene.add(model);
    rig=createPetRig(model,pet.animal,gltf.animations);
    setReady(true);
   }catch{if(!disposed)setFailed(true);}
  }).catch(()=>{if(!disposed)setFailed(true);});
  return()=>{disposed=true;dispose?.();};
 },[pet.animal,small]);
 return <button type="button" className={'pet-stage '+(small?'pet-stage-small':'')} data-animal={pet.animal} data-animate={motion?'on':'off'} onClick={onInteract}
  onPointerMove={e=>{const rect=e.currentTarget.getBoundingClientRect();lookRef.current={x:Math.max(-1,Math.min(1,(e.clientX-rect.left)/rect.width*2-1)),y:Math.max(-1,Math.min(1,(e.clientY-rect.top)/rect.height*2-1))};}}
  onPointerLeave={()=>{lookRef.current={x:0,y:0};}} onBlur={()=>{lookRef.current={x:0,y:0};}}
  aria-label={'Chạm để chơi với '+pet.name}>
  {(!ready||failed)&&<img key={action.tick} className={'pet-poster pet-poster-'+action.kind} src={petPortrait(pet.animal)} alt="" draggable={false}/>}
  <canvas ref={canvasRef} aria-hidden="true" style={{opacity:ready&&!failed?1:0}}/>
  {!small&&<span className="pet-touch-hint">{failed?'Chạm để tương tác':'Chạm vào bạn nhỏ nhé'}</span>}
 </button>;
}

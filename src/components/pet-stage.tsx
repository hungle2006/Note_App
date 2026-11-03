"use client";
import {useEffect,useRef,useState} from 'react';
import type * as THREE from 'three';
import type {Pet,PetAction} from '@/lib/pets';
import {useAppearance} from './appearance';

/** One renderer for the equipped pet, one on demand for the preview dialog.
 * Store cards use Blender portraits instead of allocating ten WebGL contexts. */
export function PetStage({pet,action,onInteract,small=false}:{pet:Pet;action:{kind:PetAction;tick:number};onInteract:()=>void;small?:boolean}){
 const canvasRef=useRef<HTMLCanvasElement>(null),actionRef=useRef(action);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 const {motion}=useAppearance();const motionRef=useRef(motion);
 useEffect(()=>{motionRef.current=motion;},[motion]);
 useEffect(()=>{actionRef.current=action;},[action]);
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  let disposed=false,dispose:(()=>void)|undefined;
  setReady(false);setFailed(false);
  void Promise.all([import('three'),import('three/examples/jsm/loaders/GLTFLoader.js')]).then(async([T,{GLTFLoader}])=>{
   if(disposed)return;
   let renderer:THREE.WebGLRenderer;
   try{const context=canvas.getContext('webgl2',{alpha:true,antialias:!small,powerPreference:'low-power'});if(!context){setFailed(true);return;}renderer=new T.WebGLRenderer({canvas,context,alpha:true,antialias:!small,powerPreference:'low-power'});}
   catch{setFailed(true);return;}
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,small?1.3:1.6));
   renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
   renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,50);
   camera.position.set(.6,2.3,6.7);camera.lookAt(0,1.45,0);
   scene.add(new T.HemisphereLight(0xfff5df,0xb4b6c4,2.6));
   const key=new T.DirectionalLight(0xfff0dd,3);key.position.set(-3,5,4);scene.add(key);
   const fill=new T.DirectionalLight(0xd8eaff,1.5);fill.position.set(4,2,-2);scene.add(fill);
   let model:THREE.Group|undefined,raf=0,last=0,time=0,lastAction=-1,reactionAt=-10;
   let visible=!document.hidden,inView=true;
   const animated:{node:THREE.Object3D;rotation:THREE.Euler;scale:THREE.Vector3}[]=[];
   function resize(){const rect=canvas!.getBoundingClientRect();renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);camera.aspect=rect.width/Math.max(1,rect.height);camera.updateProjectionMatrix();}
   const observer=new ResizeObserver(resize);observer.observe(canvas);
   function frame(now:number){
    if(disposed)return;
    raf=requestAnimationFrame(frame);
    if(!visible||!inView||now-last<(small?50:33))return;
    time+=Math.min((now-last)/1000,.06);last=now;
    const a=actionRef.current;
    if(a.tick!==lastAction){lastAction=a.tick;reactionAt=time;}
    const elapsed=time-reactionAt,react=elapsed<2.5?Math.sin(Math.min(1,elapsed/2.5)*Math.PI):0;
    const animate=motionRef.current&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(model){
     model.rotation.y=animate?Math.sin(time*.65)*.16+(a.kind==='play'?react*Math.PI*2:react*.28):0;
     model.position.y=animate?(Math.sin(time*2)*.025+Math.abs(Math.sin(elapsed*7))*react*(a.kind==='feed'?.06:.23)):0;
     model.scale.setScalar(1+(animate?Math.sin(time*2)*.008:0));
     for(const {node,rotation,scale} of animated){
      node.rotation.copy(rotation);node.scale.copy(scale);
      if(!animate)continue;
      if(node.name.startsWith('Head'))node.rotation.x+=Math.sin(time*1.4)*.025+(a.kind==='feed'?Math.sin(elapsed*9)*react*.12:react*.08);
      if(node.name.startsWith('Foot'))node.rotation.x+=Math.sin(time*5+(node.position.x>0?Math.PI:0))*.14;
      if(node.name.startsWith('Arm'))node.rotation.z+=Math.sin(time*3+(node.position.x>0?Math.PI:0))*(.05+react*.4);
      if(node.name.startsWith('Tail'))node.rotation.y+=Math.sin(time*5)*(.14+react*.35);
      if(node.name.startsWith('Ear'))node.rotation.z+=Math.sin(time*2.5)*(.03+react*.1);
      if(node.name.startsWith('Eye')&&!node.name.startsWith('EyePatch')&&!node.name.startsWith('EyeWhite')){
       const blink=Math.sin(time*1.2)> .996;node.scale.y*=blink?.1:1;
      }
     }
    }
    renderer.render(scene,camera);canvas!.dataset.frames=String(Number(canvas!.dataset.frames||0)+1);
   }
   function visibility(){visible=!document.hidden;last=performance.now();}
   const intersection=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??true;last=performance.now();});intersection.observe(canvas);
   document.addEventListener('visibilitychange',visibility);
   function release(root:THREE.Object3D){root.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.isMesh){mesh.geometry.dispose();const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const material of materials)material.dispose();}});}
   dispose=()=>{cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);if(model)release(model);renderer.dispose();renderer.forceContextLoss();};
   resize();raf=requestAnimationFrame(frame);
   try{
    const gltf=await new GLTFLoader().loadAsync('/pets/'+pet.animal+'.glb');
    if(disposed){release(gltf.scene);return;}
    model=gltf.scene;scene.add(model);
    model.traverse(node=>{if(/^(Head|Foot|Arm|Tail|Ear|Eye)/.test(node.name))animated.push({node,rotation:node.rotation.clone(),scale:node.scale.clone()});});
    setReady(true);
   }catch{if(!disposed)setFailed(true);}
  }).catch(()=>{if(!disposed)setFailed(true);});
  return()=>{disposed=true;dispose?.();};
 },[pet.animal,small]);
 return <button type="button" className={'pet-stage '+(small?'pet-stage-small':'')} data-animate={motion?'on':'off'} onClick={onInteract} aria-label={'Chạm để chơi với '+pet.name}>
  {(!ready||failed)&&<img key={action.tick} className={'pet-poster pet-poster-'+action.kind} src={'/pets/'+pet.animal+'.png'} alt="" draggable={false}/>}
  <canvas ref={canvasRef} aria-hidden="true" style={{opacity:ready&&!failed?1:0}}/>
  {!small&&<span className="pet-touch-hint">{failed?'Chạm để tương tác':'Chạm vào bạn nhỏ nhé'}</span>}
 </button>;
}

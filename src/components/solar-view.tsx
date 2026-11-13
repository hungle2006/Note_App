"use client";
import {useEffect,useRef,useState} from 'react';
import type {Group,Mesh,WebGLRenderer} from 'three';
import {Maximize,Pause,Play,RotateCcw,Orbit,Sparkles,Check,BookOpen} from 'lucide-react';
import {planets} from '@/lib/solar';import {useAppearance} from './appearance';import {Title} from './ui';
export function SolarView(){
 const host=useRef<HTMLDivElement>(null),[selected,setSelected]=useState('sun'),[running,setRunning]=useState(true),[speed,setSpeed]=useState(1),[status,setStatus]=useState('loading'),[answer,setAnswer]=useState<number|null>(null),[visited,setVisited]=useState<string[]>(['sun']);
 const controlsRef=useRef<{focus:(id:string)=>void;reset:()=>void}|undefined>(undefined),settings=useRef({running:true,speed:1,motion:true});const {motion}=useAppearance();settings.current={running,speed,motion};
 const planet=planets.find(p=>p.id===selected)||planets[0];
 function choose(id:string){setSelected(id);setAnswer(null);setVisited(v=>v.includes(id)?v:[...v,id]);controlsRef.current?.focus(id);}
 useEffect(()=>{
  const hostElement=host.current;if(!hostElement)return;const el=hostElement;let disposed=false,frame=0,renderer:WebGLRenderer|undefined,root:Group|undefined,resize:ResizeObserver|undefined,cleanup=()=>{};let sunTexture:import('three').Texture|undefined,haloTexture:import('three').Texture|undefined;const abort=new AbortController();
  async function start(){try{
   const [T,{GLTFLoader},{OrbitControls},buffer]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/controls/OrbitControls.js'),fetch('/models/solar-system.glb',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.arrayBuffer();})]);if(disposed)return;
   const gltf=await new GLTFLoader().parseAsync(buffer,'/models/');root=gltf.scene;if(disposed){root.traverse(o=>{const m=o as Mesh;if(m.isMesh){m.geometry.dispose();(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>x.dispose());}});return;}
   renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;el.append(renderer.domElement);
   const scene=new T.Scene();scene.background=new T.Color('#050d20');scene.add(root);scene.add(new T.AmbientLight(0xa7c7ff,1.6));
   // A spherical, Blender-baked photosphere is mapped to the original Sun mesh.
   // The atmosphere is transparent, GPU-cheap and independent of the imported GLB material.
   const sunSurface=root.getObjectByName('surface_sun') as Mesh|undefined;
   const sunBody=root.getObjectByName('body_sun');
   if(sunSurface&&sunBody){
    try{
     const baked=await new T.TextureLoader().loadAsync('/images/sun-photosphere.jpg');
     if(disposed){baked.dispose();return;}
     baked.colorSpace=T.SRGBColorSpace;baked.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
     sunTexture=baked;
     const old=sunSurface.material;
     sunSurface.material=new T.MeshBasicMaterial({map:baked,toneMapped:false});
     (Array.isArray(old)?old:[old]).forEach(m=>m.dispose());
    }catch{ /* Keep the original sun material when the texture is unavailable. */ }
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const context=canvas.getContext('2d');
    if(context){
     const pix=context.createImageData(256,256);
     for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const dx=(x-127.5)/256,dy=(y-127.5)/256,r=Math.hypot(dx,dy);
      const angle=Math.atan2(dy,dx);
      const rays=Math.pow(Math.max(0,(Math.sin(angle*47+Math.sin(angle*13)*3)+1)/2),7);
      const ring=Math.exp(-Math.pow((r-.24)/.12,2))*.36;
      const corona=Math.exp(-Math.max(0,r-.19)*11)*(.23+rays*.22);
      const alpha=r<.17?0:Math.min(.62,(ring+corona)*Math.min(1,(r-.17)*32));
      const n=(y*256+x)*4;pix.data[n]=255;pix.data[n+1]=r<.3?165:107;pix.data[n+2]=r<.3?55:24;pix.data[n+3]=Math.round(alpha*255);
     }
     context.putImageData(pix,0,0);
     haloTexture=new T.CanvasTexture(canvas);
     const glow=new T.Sprite(new T.SpriteMaterial({map:haloTexture,transparent:true,blending:T.AdditiveBlending,depthWrite:false,depthTest:false,toneMapped:false}));
     glow.name='Blender Sun · soft corona';glow.scale.set(8.8,8.8,1);sunBody.add(glow);
    }
   }
const sun=new T.PointLight(0xffe1a6,90,80,1.3);scene.add(sun);const fill=new T.DirectionalLight(0xffffff,2.5);fill.position.set(4,12,10);scene.add(fill);
   const geometry=new T.BufferGeometry(),points=new Float32Array(1800);let seed=41;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};for(let i=0;i<points.length;i++)points[i]=(random()-.5)*140;geometry.setAttribute('position',new T.BufferAttribute(points,3));const starMaterial=new T.PointsMaterial({color:0xb5c8ed,size:.075});scene.add(new T.Points(geometry,starMaterial));
   const camera=new T.PerspectiveCamera(43,1,.1,250);camera.position.set(17,20,25);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=1.5;controls.maxDistance=65;controls.maxPolarAngle=Math.PI*.94;
   let focusId='',last=0;const target=new T.Vector3();const reset=()=>{focusId='';controls.target.set(0,0,0);camera.position.set(17,20,25);controls.update();};
   controlsRef.current={focus:(id)=>{focusId=id;const body=root?.getObjectByName('body_'+id);if(body){body.getWorldPosition(target);const radius=id==='sun'?7:id==='jupiter'||id==='saturn'?5:3;camera.position.copy(target).add(new T.Vector3(radius,radius*.65,radius));controls.target.copy(target);controls.update();}},reset};
   const fit=()=>{const b=el.getBoundingClientRect();renderer?.setSize(b.width,b.height,false);camera.aspect=b.width/Math.max(b.height,1);camera.updateProjectionMatrix();};resize=new ResizeObserver(fit);resize.observe(el);fit();
   const ray=new T.Raycaster(),pointer=new T.Vector2();let down={x:0,y:0};const press=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};const pick=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const b=el.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);for(const hit of ray.intersectObject(root!,true)){let node=hit.object;while(node.parent&&!node.name.startsWith('body_'))node=node.parent;if(node.name.startsWith('body_')){const id=node.name.slice(5);choose(id);break;}}};el.addEventListener('pointerdown',press);el.addEventListener('pointerup',pick);
   cleanup=()=>{controls.dispose();geometry.dispose();starMaterial.dispose();el.removeEventListener('pointerdown',press);el.removeEventListener('pointerup',pick);};
   const rates=[0,4.15,1.62,1,.532,.084,.034,.012,.006];const draw=(time:number)=>{if(disposed)return;frame=requestAnimationFrame(draw);const dt=Math.min((time-last)/1000,.05);last=time;if(document.hidden)return;
    if(settings.current.running&&settings.current.motion&&sunSurface)sunSurface.rotation.y+=dt*.032*settings.current.speed;
    if(settings.current.running&&settings.current.motion)planets.forEach((p,i)=>{const orbit=root?.getObjectByName('orbit_'+p.id);if(orbit)orbit.rotation.y+=dt*.22*rates[i]*settings.current.speed;});
    if(focusId){const body=root?.getObjectByName('body_'+focusId);if(body){body.getWorldPosition(target);camera.position.add(target.clone().sub(controls.target));controls.target.copy(target);}}
    controls.update();renderer!.render(scene,camera);
   };setStatus('ready');frame=requestAnimationFrame(draw);
  }catch{if(!disposed)setStatus('fallback');}}
  void start();return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);resize?.disconnect();cleanup();controlsRef.current=undefined;root?.traverse(o=>{const m=o as Mesh;if(m.isMesh){m.geometry.dispose();(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>x.dispose());}});sunTexture?.dispose();haloTexture?.dispose();renderer?.dispose();renderer?.forceContextLoss();el.replaceChildren();};
 },[]);
 return <div className="new-task solar-task"><Title eyebrow="TỪ MỘT CÂU HỎI NHỎ ĐẾN BẦU TRỜI LỚN" title="Vũ trụ của em" description="Bắt đầu với hệ Mặt Trời: chạm để khám phá, quan sát để đặt câu hỏi."/>
 <div className="solar-layout"><section className="solar-stage"><div className="solar-stage-heading"><span><Orbit size={17}/> HỆ MẶT TRỜI</span><span>{visited.length}/9 điểm đã ghé</span></div><div ref={host} className="solar-canvas" role="img" aria-label="Mô hình 3D hệ Mặt Trời, kéo để xoay và cuộn để phóng to"/>{status!=='ready'&&<div className="solar-poster"><img src="/images/solar-system.png" alt="Hệ Mặt Trời được dựng bằng Blender"/><span role="status">{status==='loading'?'Đang mở mô hình 3D…':'Thiết bị chưa mở được 3D. Em vẫn có thể chọn hành tinh và học bên dưới.'}</span></div>}<div className="solar-toolbar"><button onClick={()=>setRunning(!running)} aria-label={running?'Tạm dừng quỹ đạo':'Tiếp tục quỹ đạo'}>{running?<Pause size={17}/>:<Play size={17}/>}<span>{running?'Tạm dừng':'Tiếp tục'}</span></button><label>Tốc độ<select aria-label="Tốc độ quỹ đạo" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={3}>3×</option></select></label><button onClick={()=>{controlsRef.current?.reset();setSelected('sun');setAnswer(null);}}><RotateCcw size={17}/><span>Toàn cảnh</span></button><button aria-label="Phóng to khu vũ trụ toàn màn hình" onClick={()=>{const stage=host.current?.parentElement;if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else void stage?.requestFullscreen?.().catch(()=>{});}}><Maximize size={17}/></button></div><p className="solar-caption">Kéo để xoay · Chụm/cuộn để thu phóng · Chọn hành tinh bên dưới<br/>Bề mặt Mặt Trời dựng bằng Blender; kích thước, khoảng cách và tốc độ mang tính minh họa.{!motion&&' Chuyển động đang tắt theo cài đặt của em.'}</p></section>
 <aside className="panel planet-detail"><span className="task-kicker"><Sparkles size={16}/> ĐIỂM DỪNG KHÁM PHÁ</span><div className="planet-detail-title"><i style={{background:planet.color}}/><div><small>{planet.kind}</small><h2>{planet.name}</h2></div></div><p>{planet.fact}</p><div className="planet-idea"><BookOpen size={19}/><div><strong>Thử nghĩ xem</strong><p>{planet.idea}</p></div></div><fieldset className="solar-quiz"><legend>{planet.question}</legend>{planet.choices.map((c,i)=><button key={c} className={answer===i?(i===planet.answer?'correct':'incorrect'):''} aria-pressed={answer===i} onClick={()=>setAnswer(i)}>{c}{answer===i&&i===planet.answer&&<Check size={17}/>}</button>)}</fieldset>{answer!==null&&<p className="quiz-feedback" role="status">{answer===planet.answer?'Chính xác! Em đã hiểu thêm một điều mới.':'Chưa đúng. Hãy đọc lại phần khám phá rồi thử nhé.'}</p>}<a href={'https://science.nasa.gov/'+(planet.id==='sun'?'sun/':planet.id+'/')} target="_blank" rel="noreferrer">Đọc thêm tại NASA ↗</a></aside></div>
 <nav className="planet-picker" aria-label="Chọn hành tinh">{planets.map(p=><button key={p.id} className={selected===p.id?'selected':''} onClick={()=>choose(p.id)} aria-pressed={selected===p.id}><i style={{background:p.color}}/><span>{p.name}</span>{visited.includes(p.id)&&<Check size={13}/>}</button>)}</nav>
 <section className="panel universe-idea"><span className="task-kicker">Ý TƯỞNG HỌC TẬP</span><h2>Em là người thám hiểm, mỗi câu hỏi là một chuyến đi.</h2><p>Hệ Mặt Trời là một phần nhỏ trong thiên hà Ngân Hà; Ngân Hà là một trong rất nhiều thiên hà của vũ trụ. Hành trình này bắt đầu từ ngôi nhà gần nhất của chúng ta: Mặt Trời và tám hành tinh.</p><div><span>01 · Quan sát mô hình</span><span>02 · Đọc và đặt câu hỏi</span><span>03 · Thử thách kiến thức</span></div><a href="https://science.nasa.gov/solar-system/" target="_blank" rel="noreferrer">Nguồn học tập: NASA Solar System ↗</a></section></div>;
}

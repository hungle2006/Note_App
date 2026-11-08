import * as T from 'three';
import type {Animal} from './pet-motion';
import {petBehaviors,samplePetPose,smooth} from './pet-motion';
import type {PetAction} from './pets';

type Joint={node:T.Object3D;position:T.Vector3;rotation:T.Euler;scale:T.Vector3;side:number};
type Eye={open:T.Group;closed:T.Object3D;gaze:T.Group};
const matches=(node:T.Object3D,name:string)=>node.name.replaceAll('_',' ').startsWith(name);
/** Add pivots around existing meshes, retaining every world transform and accessory. */
export function createPetRig(model:T.Group,animal:Animal,seed=Math.random()*0xffffffff){
 let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const all:T.Object3D[]=[];model.traverse(n=>all.push(n));
 const root=all.find(n=>typeof n.userData.animal==='string')||model;
 const head=all.find(n=>n.userData.petMotion==='head')!;
 const roles:Record<string,Joint[]>={};const eyes:Eye[]=[];
 model.updateMatrixWorld(true);
 function register(node:T.Object3D,role:string){const world=node.getWorldPosition(new T.Vector3());(roles[role]??=[]).push({node,position:node.position.clone(),rotation:node.rotation.clone(),scale:node.scale.clone(),side:world.x<0?-1:1});}
 function pivot(name:string,at:T.Vector3,nodes:T.Object3D[],parent:T.Object3D=root){
  const joint=new T.Group();joint.name=name;joint.position.copy(at);parent.add(joint);joint.updateMatrixWorld(true);
  for(const n of nodes)joint.attach(n);return joint;
 }
 const center=(node:T.Object3D)=>new T.Box3().setFromObject(node).getCenter(new T.Vector3());
 for(const n of all){const role=n.userData.petMotion;if(typeof role==='string'){
  if(role==='tail')register(pivot('Tail base pivot',new T.Vector3(animal==='cat'?-.52:.54,animal==='cat'?.46:.43,-.27),[n]),role);
  else register(n,role);
 }}
 // Upright holding arms and quadruped front legs previously had no motion tags.
 for(const n of all.filter(n=>matches(n,'ArmFront'))){register(n,'front');}
 for(const n of all.filter(n=>matches(n,'Back plush paw'))){const at=center(n);at.y+=.12;register(pivot('Hind leg pivot',root.worldToLocal(at),[n]),'hind');}
 for(const side of [-1,1]){
  const armMeshes=all.filter(n=>n.parent===root&&(matches(n,'Plush forearm')||matches(n,'Arm holding'))&&Math.sign(center(n).x)===side);
  if(armMeshes.length)register(pivot('Shoulder '+side,new T.Vector3(side*.57,1.06,.02),armMeshes),'holding');
 }
 // Quills must follow the skull; their old parent was the body root.
 if(head){const quills=all.filter(n=>matches(n,'Soft caramel quill'));if(quills.length)register(pivot('Quill mantle',new T.Vector3(0,0,0),quills,head),'quills');}
 for(const n of all.filter(n=>matches(n,'Cotton tail')||matches(n,'Deer white tail'))){const at=center(n);at.y-=.09;register(pivot('Short tail pivot',root.worldToLocal(at),[n]),'shortTail');}
 const torsoNodes=all.filter(n=>n.parent===root&&['Body plush','Cream chest','Panda belly','Cream knitted sweater','Penguin white tummy','Layered breast feather','Sweater hem rib','Ribbed sleeve cuff'].some(s=>matches(n,s)));
 if(torsoNodes.length)register(pivot('Breathing torso',new T.Vector3(0,.43,0),torsoNodes),'torso');
 if(head){
  const headAll:T.Object3D[]=[];head.traverse(n=>headAll.push(n));
  const dark=new T.MeshPhysicalMaterial({color:0x44251c,roughness:.17,clearcoat:1,clearcoatRoughness:.12});
  const iris=new T.MeshStandardMaterial({color:0x995327,roughness:.23});
  const glint=new T.MeshBasicMaterial({color:0xffffff});
  const sphere=new T.SphereGeometry(1,24,16);
  for(const side of [-1,1]){
   // Rebuild the eye expression together so pupils and highlights close with the lids.
   const original=headAll.filter(n=>/^(Eye|Iris)/.test(n.name)&&!matches(n,'EyePatch')&&!matches(n,'EyeWhite')&&Math.sign(center(n).x)===side);
   const oldOpen=original.find(n=>/^Eye(?:[_.]?\d+)?$/.test(n.name));
   const oldSmile=original.find(n=>matches(n,'EyeSmile'));
   const at=oldOpen?head.worldToLocal(center(oldOpen)):new T.Vector3(side*(animal==='owl'?.36:.34),.06,animal==='owl'||animal==='penguin'?.75:.65);
   const open=new T.Group();open.name='Living eye '+side;open.position.copy(at);head.add(open);
   const gaze=new T.Group();open.add(gaze);
   const mesh=(name:string,material:T.Material,position:number[],scale:number[],parent:T.Object3D)=>{const m=new T.Mesh(sphere,material);m.name=name;m.position.fromArray(position);m.scale.fromArray(scale);parent.add(m);return m;};
   mesh('Glossy eye',dark,[0,0,0],[.155,.185,.072],open);
   mesh('Honey iris',iris,[0,-.035,.062],[.092,.10,.019],gaze);
   mesh('Large eye glint',glint,[-.043,.058,.078],[.043,.043,.014],gaze);
   mesh('Small eye glint',glint,[.047,-.04,.077],[.016,.016,.01],gaze);
   let closed:T.Object3D;
   if(oldSmile){closed=oldSmile;}
   else{
    const points=Array.from({length:17},(_,i)=>{const x=i/8-1;return new T.Vector3(at.x+x*.16,at.y+.05*(1-x*x),at.z+.012);});
    closed=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.027,6,false),dark);closed.name='Soft closed eyelid '+side;head.add(closed);
   }
   for(const n of original)if(n!==closed)n.visible=false;
   closed.visible=false;eyes.push({open,closed,gaze});
  }
  // Materials are created once and shared by both eyes, released with the stage.
  register(headAll.find(n=>matches(n,'Nose'))||new T.Group(),'nose');
  for(const n of headAll.filter(n=>['Happy open mouth','Little pink tongue','Corgi hanging tongue','Open beak','Beak mouth','Beak tongue'].some(s=>matches(n,s))))register(n,'mouth');
 }
 const base={position:model.position.clone(),rotation:model.rotation.clone(),scale:model.scale.clone()};
 let time=random()*12,behavior=Math.floor(random()*3),behaviorAt=time-.4,nextBehavior=time+4.8+random()*3;
 let nextBlink=time+.6+random()*2,blinkAt=-100,doubleBlink=false,lastTick=-1,actionAt=-100,lookX=0,lookY=0;
 let behaviorName='rest';
 const blendedPose=samplePetPose(animal,0,0,-100,'hello',-100);
 function update(dt:number,action:{kind:PetAction;tick:number},animate:boolean,look:{x:number;y:number}){
  const delta=Math.max(0,Math.min(.1,dt));if(animate)time+=delta;
  if(action.tick!==lastTick){lastTick=action.tick;actionAt=time;behaviorAt=-100;nextBehavior=time+5.5+random()*3;}
  if(time>nextBehavior){behavior=(behavior+1+Math.floor(random()*2))%3;behaviorAt=time;nextBehavior=time+6+random()*4;}
  if(time>nextBlink){blinkAt=time;nextBlink=time+2.4+random()*4.2;doubleBlink=random()<.19;}
  const blinkPhase=time-blinkAt;
  const blink=(phase:number)=>phase<0||phase>.34?0:phase<.10?smooth(phase/.10):1-smooth((phase-.15)/.19);
  const closure=Math.max(blink(blinkPhase),doubleBlink?blink(blinkPhase-.43):0);
  const targetPose=samplePetPose(animal,time,behavior,time-behaviorAt,action.kind,time-actionAt);
  // Blend overlapping gestures and interrupted care actions without snapping the joints.
  const damping=1-Math.exp(-delta*14);
  for(const key of Object.keys(blendedPose) as (keyof typeof blendedPose)[])blendedPose[key]+=(targetPose[key]-blendedPose[key])*damping;
  const p={...blendedPose};
  const blend=1-Math.exp(-delta*6);lookX+=(look.x-lookX)*blend;lookY+=(look.y-lookY)*blend;
  p.headY+=lookX*.16;p.headX+=lookY*.09;
  for(const joints of Object.values(roles))for(const j of joints){j.node.position.copy(j.position);j.node.rotation.copy(j.rotation);j.node.scale.copy(j.scale);}
  model.position.copy(base.position);model.rotation.copy(base.rotation);model.scale.copy(base.scale);
  for(const e of eyes){e.open.visible=true;e.open.scale.y=1;e.closed.visible=false;e.gaze.position.set(0,0,0);}
  if(!animate){behaviorName='rest';return;}
  model.position.x+=p.x;model.position.y+=p.y;model.rotation.set(base.rotation.x+p.bodyX,base.rotation.y+p.bodyY,base.rotation.z+p.bodyZ);
  for(const j of roles.head||[]){j.node.rotation.x+=p.headX;j.node.rotation.y+=p.headY;j.node.rotation.z+=p.headZ;}
  for(const role of ['front','holding','wave','wing'])for(const j of roles[role]||[]){const left=j.side<0,amount=left?p.armL:p.armR,lift=left?p.armLiftL:p.armLiftR;
   if(role==='front'){j.node.rotation.x+=amount-lift*.45;j.node.position.y+=lift*.035;j.node.rotation.z+=lift*j.side*.15;}
   else{j.node.rotation.z+=amount*(role==='holding'?.6:1);j.node.rotation.x-=lift*.5;j.node.position.y+=lift*.12;}}
  for(const role of ['foot','hind'])for(const j of roles[role]||[]){j.node.rotation.x+=j.side<0?p.footL:p.footR;j.node.position.y+=j.side<0?p.liftL:p.liftR;}
  for(const role of ['tail','shortTail'])for(const j of roles[role]||[]){j.node.rotation.y+=p.tail*(role==='shortTail'?.4:1);j.node.rotation.z+=Math.sin(time*2.4)*.018;}
  for(const j of roles.ear||[]){j.node.rotation.z+=j.side<0?p.earL:p.earR;j.node.rotation.x+=Math.sin(time*1.1+j.side)*.018;}
  for(const j of roles.torso||[]){j.node.scale.y*=1+p.breath;j.node.scale.x*=1-p.breath*.35;}
  for(const j of roles.quills||[]){j.node.scale.multiplyScalar(1+p.quills);}
  for(const j of roles.nose||[]){j.node.position.y+=p.nose*.006;j.node.scale.x*=1+p.nose*.035;}
  for(const j of roles.mouth||[]){j.node.scale.y*=1+p.mouth*.17;j.node.position.y-=p.mouth*.012;}
  for(const e of eyes){const shut=Math.max(closure,p.squint);e.open.scale.y=Math.max(.035,1-shut*.96);e.open.visible=shut<.88;e.closed.visible=shut>=.88;e.gaze.position.set(lookX*.016,-lookY*.012,0);}
  behaviorName=time-actionAt<4.5?action.kind:time-behaviorAt<4.2?petBehaviors[animal][behavior]:'rest';
 }
 return {update,get behavior(){return behaviorName;},get joints(){return roles;},eyes};
}

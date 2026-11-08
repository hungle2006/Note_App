import * as T from 'three';
import type {Pet,PetAction} from './pets';

export type Animal=Pet['animal'];
const actionClip:Record<PetAction,string>={hello:'Hello',feed:'Feed',play:'Play',pet:'Pet'};
/** Play the authored Blender acting clips. Geometry, expressions and pivots are
 * never replaced in the browser; the GLB is the source of truth. */
export function createPetRig(model:T.Group,animal:Animal,clips:T.AnimationClip[],seed=Math.random()*0xffffffff){
 let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const mixer=new T.AnimationMixer(model),actions=new Map<string,T.AnimationAction>();
 const rest:{node:T.Object3D;position:T.Vector3;quaternion:T.Quaternion;scale:T.Vector3;morphs?:number[]}[]=[];
 const eyes:{node:T.Object3D;defaultVisible:boolean;kind:string;side:number}[]=[];
 let head:T.Object3D|undefined;
 model.traverse(node=>{
  const mesh=node as T.Mesh;
  rest.push({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone(),morphs:mesh.morphTargetInfluences?.slice()});
  if(node.userData.petMotion==='head')head=node;
  if(node.userData.petMotion==='eyeOpen'||node.userData.petMotion==='eyeClosed')eyes.push({node,defaultVisible:node.userData.eyeDefault===1,kind:node.userData.petMotion,side:node.userData.side});
 });
 for(const clip of clips){
  const action=mixer.clipAction(clip);action.enabled=true;
  if(clip.name!=='Idle'){action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;}
  actions.set(clip.name,action);
 }
 const foundIdle=actions.get('Idle');
 if(!foundIdle||!['Hello','Feed','Pet','Play','Blink'].every(name=>actions.has(name)))throw new Error('Incomplete Blender clips for '+animal);
 const idle:T.AnimationAction=foundIdle;
 idle.play();idle.time=random()*idle.getClip().duration;idle.timeScale=.96+random()*.08;
 let current:T.AnimationAction=idle,elapsed=0,nextBlink=.8+random()*3,clock=0,lastTick=-1,behavior='Idle',wasAnimating=false;
 let gazeX=0,gazeY=0;const previousHead=new T.Quaternion();let hadGaze=false;
 function restore(){for(const saved of rest){saved.node.position.copy(saved.position);saved.node.quaternion.copy(saved.quaternion);saved.node.scale.copy(saved.scale);const morphs=(saved.node as T.Mesh).morphTargetInfluences;if(morphs&&saved.morphs)for(let i=0;i<morphs.length;i++)morphs[i]=saved.morphs[i];}}
 function transition(next:T.AnimationAction){
  if(next===current)return;
  // Keep at most the outgoing and incoming actions active. This avoids old
  // clamped actions gradually diluting a later greeting or feeding sequence.
  for(const action of actions.values())if(action!==current&&action!==next&&action!==actions.get('Blink'))action.stop();
  next.reset().setEffectiveWeight(1).play();next.crossFadeFrom(current,.30,false);current=next;elapsed=0;
 }
 function update(dt:number,action:{kind:PetAction;tick:number},animate:boolean,look:{x:number;y:number}){
  const delta=Math.max(0,Math.min(.1,dt));
  if(!animate){
   if(wasAnimating)mixer.stopAllAction();restore();wasAnimating=false;hadGaze=false;gazeX=gazeY=0;behavior='Rest';return;
  }
  if(!wasAnimating){idle.reset().play();idle.time=random()*idle.getClip().duration;current=idle;elapsed=0;wasAnimating=true;}
  if(hadGaze&&head)head.quaternion.copy(previousHead);
  if(action.tick!==lastTick){lastTick=action.tick;const next=actions.get(actionClip[action.kind])!;
   if(next===current){next.reset().play();elapsed=0;}else transition(next);
   behavior=actionClip[action.kind];
  }
  clock+=delta;elapsed+=delta;
  if(current!==idle&&elapsed>current.getClip().duration-.32){transition(idle);behavior='Idle';}
  if(clock>nextBlink){const blink=actions.get('Blink')!;blink.reset().setEffectiveWeight(1).play();nextBlink=clock+2.6+random()*4.0;}
  mixer.update(delta);
  // A small damped look is layered on the neck after the authored pose.
  const damp=1-Math.exp(-delta*5);gazeX+=(look.x-gazeX)*damp;gazeY+=(look.y-gazeY)*damp;
  if(head){previousHead.copy(head.quaternion);const gaze=new T.Quaternion().setFromEuler(new T.Euler(gazeY*.025,gazeX*.045,0));head.quaternion.multiply(gaze);hadGaze=true;}
 }
 function dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);}
 return {update,dispose,eyes,get behavior(){return behavior;},clips:clips.map(c=>c.name)};
}

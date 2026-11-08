import type {Pet,PetAction} from './pets';

export type Animal=Pet['animal'];
export const petBehaviors:Record<Animal,readonly string[]>={
 cat:['groom','listen','stretch'],dog:['sniff','tail-wag','offer-paw'],rabbit:['nose-twitch','ear-listen','hop'],
 fox:['listen','tail-swish','pounce'],bear:['wave','sniff','stretch'],panda:['sway','wave','doze'],
 owl:['head-scan','wing-stretch','head-tilt'],penguin:['waddle','flipper-flap','preen'],
 deer:['ear-listen','graze','look-around'],hedgehog:['sniff','peek','tiny-steps'],
};
export type PetPose=ReturnType<typeof neutralPose>;
export function neutralPose(){return {headX:0,headY:0,headZ:0,bodyX:0,bodyY:0,bodyZ:0,x:0,y:0,
 armL:0,armR:0,armLiftL:0,armLiftR:0,footL:0,footR:0,liftL:0,liftR:0,
 tail:0,earL:0,earR:0,nose:0,mouth:0,squint:0,breath:0,quills:0};}
export function smooth(value:number){const x=Math.max(0,Math.min(1,value));return x*x*(3-2*x);}
/** A finite gesture has zero velocity at both ends; no looping spin or snap to rest. */
export function gesture(t:number,duration:number){return smooth(t/.4)*(1-smooth((t-duration+.65)/.65));}
export function samplePetPose(animal:Animal,t:number,behavior:number,behaviorTime:number,action:PetAction,actionTime:number):PetPose{
 const p=neutralPose(),s=Math.sin,profile=petBehaviors[animal],name=profile[behavior%profile.length];
 const pace={cat:1.7,dog:2.8,rabbit:2.5,fox:2.1,bear:1.25,panda:.9,owl:1.35,penguin:2.3,deer:1.6,hedgehog:2.0}[animal];
 const b=gesture(behaviorTime,4.2),r=gesture(actionTime,4.5),u=behaviorTime;
 p.breath=s(t*pace)*.004;p.headX=s(t*.7)*.012;p.headY=s(t*.43)*.035;
 p.tail=s(t*(animal==='dog'?7:1.9))*(animal==='dog'?.16:.055);
 p.earL=s(t*1.12)*.012;p.earR=s(t*.91+.8)*.012;
 const steps=(phase:number,amount:number)=>{const stride=s(phase)*amount;p.footL+=stride;p.footR-=stride;
  p.liftL+=Math.max(0,s(phase))*.055*amount/.2;p.liftR+=Math.max(0,-s(phase))*.055*amount/.2;};
 switch(animal){
  case 'cat':
   if(name==='groom'){p.armLiftL=.65*b;p.armL=-.85*b;p.headX=.13*b;p.headZ=-.12*b;p.mouth=(.5+.5*s(u*10))*b;p.squint=.55*b;}
   if(name==='listen'){p.headY=.28*s(u*1.5)*b;p.earL=.20*b;p.earR=-.10*b;p.tail+=s(u*3)*.17*b;}
   if(name==='stretch'){p.bodyX=.06*b;p.headX=-.09*b;p.armL=p.armR=-.22*b;p.squint=.65*b;}
   break;
  case 'dog':
   p.mouth=(.35+.2*s(t*7))*.4;
   if(name==='sniff'){p.headX=.18*b;p.headY=.12*s(u*2.5)*b;p.nose=s(u*12)*b;p.tail+=s(u*9)*.2*b;}
   if(name==='tail-wag'){p.tail+=s(u*11)*.45*b;p.bodyZ=s(u*5)*.025*b;p.headZ=.13*b;}
   if(name==='offer-paw'){p.armR=-.38*b;p.armLiftR=.27*b;p.headZ=-.18*b;}
   break;
  case 'rabbit':
   p.nose=s(t*11)*.2;
   if(name==='nose-twitch'){p.nose+=s(u*16)*b;p.headX=.055*b;p.earL=.08*b;p.earR=-.05*b;}
   if(name==='ear-listen'){p.earL=.32*b;p.earR=-.22*b;p.headY=.18*s(u*1.3)*b;}
   if(name==='hop'){const hop=Math.max(0,s(u*4.4))*b;p.y=hop*.16;p.bodyX=-hop*.04;p.footL=p.footR=-hop*.28;p.liftL=p.liftR=hop*.03;p.earL=-hop*.14;p.earR=hop*.14;}
   break;
  case 'fox':
   if(name==='listen'){p.headZ=.22*b;p.headY=.22*s(u*1.3)*b;p.earL=.18*b;p.earR=-.12*b;}
   if(name==='tail-swish'){p.tail+=s(u*3)*.38*b;p.headY=-.20*b;p.squint=.25*b;}
   if(name==='pounce'){const hop=Math.max(0,s(u*3.5))*b;p.y=hop*.11;p.armL=p.armR=-hop*.28;p.footL=p.footR=hop*.12;p.bodyX=hop*.055;p.tail+=hop*.26;}
   break;
  case 'bear':
   if(name==='wave'){p.armR=s(u*5)*.26*b;p.headZ=-.08*b;p.squint=.2*b;}
   if(name==='sniff'){p.nose=s(u*7)*b;p.headX=.10*b;p.headY=.12*s(u)*b;}
   if(name==='stretch'){p.armR=-.20*b;p.armL=.09*b;p.headX=-.12*b;p.squint=.75*b;}
   break;
  case 'panda':
   if(name==='sway'){p.bodyZ=s(u*1.9)*.055*b;p.headZ=-s(u*1.9-.3)*.06*b;}
   if(name==='wave'){p.armR=s(u*3)*.18*b;p.headZ=.09*b;}
   if(name==='doze'){p.headX=.14*b;p.headZ=.06*b;p.squint=.94*b;p.breath*=1.7;}
   break;
  case 'owl':
   if(name==='head-scan'){p.headY=.52*s(u*1.35)*b;p.headZ=.05*s(u*2)*b;}
   if(name==='wing-stretch'){p.armL=.36*b;p.armR=-.36*b;p.headX=-.07*b;}
   if(name==='head-tilt'){p.headZ=.28*s(u*1.7)*b;p.headY=.15*b;}
   break;
  case 'penguin':
   if(name==='waddle'){steps(u*5,.20*b);p.bodyZ=s(u*5)*.07*b;p.x=s(u*2.5)*.10*b;p.headZ=-s(u*5-.25)*.035*b;p.armL=.08*b;p.armR=-.08*b;}
   if(name==='flipper-flap'){p.armL=(.09+.10*s(u*7))*b;p.armR=-p.armL;p.headX=-.05*b;}
   if(name==='preen'){p.headX=.14*b;p.headY=.25*b;p.armL=.12*b;p.squint=.4*b;}
   break;
  case 'deer':
   if(name==='ear-listen'){p.earL=.26*s(u*2)*b;p.earR=-.21*s(u*2-.65)*b;p.headY=.21*b;}
   if(name==='graze'){p.headX=.17*b;p.nose=s(u*5)*b;p.mouth=(.5+.5*s(u*8))*b;}
   if(name==='look-around'){p.headY=.36*s(u*1.3)*b;p.headZ=.06*b;}
   break;
  case 'hedgehog':
   if(name==='sniff'){p.headX=.10*b;p.nose=s(u*13)*b;p.headY=.15*s(u*2)*b;}
   if(name==='peek'){p.headX=.09*b;p.headZ=.12*s(u*1.8)*b;p.quills=.018*b;p.squint=.25*b;}
   if(name==='tiny-steps'){steps(u*6,.11*b);p.x=s(u*2)*.055*b;p.bodyZ=s(u*6)*.025*b;}
   break;
 }
 if(r>0){
  if(action==='feed'){p.headX+=r*(animal==='owl'?.09:.14);p.mouth+=r*(.5+.5*s(actionTime*(animal==='rabbit'?13:8)));p.nose+=s(actionTime*10)*r*.5;p.tail*=.5;}
  if(action==='pet'){p.headZ+=r*.12;p.headX-=r*.035;p.squint=Math.max(p.squint,r*.82);p.earL-=r*.08;p.earR+=r*.08;p.tail+=s(t*2)*.12*r;}
  if(action==='hello'){p.headY+=s(actionTime*1.5)*.13*r;p.headZ+=.10*r;
   if(animal==='bear'||animal==='panda'){p.armR+=s(actionTime*5)*.30*r;}
   else if(animal==='owl'||animal==='penguin'){p.armL+=.14*r;p.armR-=.14*r;}
   else{p.earL+=.12*r;p.earR-=.10*r;p.tail+=s(t*7)*.22*r;}}
  if(action==='play'){
   if(animal==='rabbit'||animal==='fox'){const hop=Math.max(0,s(actionTime*5))*r;p.y+=hop*(animal==='rabbit'?.22:.15);p.footL-=hop*.24;p.footR-=hop*.24;p.armL-=hop*.12;p.armR-=hop*.12;p.earL-=hop*.15;p.earR+=hop*.15;}
   else if(animal==='owl'){p.armL+=s(actionTime*8)*.28*r;p.armR-=s(actionTime*8)*.28*r;p.headY+=s(actionTime*2)*.25*r;}
   else if(animal==='penguin'){steps(actionTime*6,.23*r);p.bodyZ+=s(actionTime*6)*.075*r;p.armL+=.10*r;p.armR-=.10*r;}
   else if(animal==='dog'){p.tail+=s(t*12)*.48*r;p.armLiftR+=.20*r;p.armR-=.35*r;p.headZ-=.15*r;}
   else if(animal==='cat'){p.armLiftL+=.33*r;p.armL-=.45*r;p.headY+=s(actionTime*2)*.15*r;p.tail+=s(t*4)*.18*r;}
   else if(animal==='bear'||animal==='panda'){p.bodyZ+=s(actionTime*2.5)*.055*r;p.armR+=s(actionTime*5)*.30*r;}
   else{steps(actionTime*5,.12*r);p.headZ+=s(actionTime*2)*.10*r;p.earL+=s(t*3)*.12*r;}
  }
 }
 return p;
}

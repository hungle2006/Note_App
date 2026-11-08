"use client";
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {PawPrint,Heart,Apple,Sparkles,X,Eye,Check,Loader2,Sun,Lock} from 'lucide-react';
import {petCatalog,petPortrait,findPet,ownsPet,normalizePetSelection,addCompanionPet,visibleCompanionPets,maxCompanionPets,type Pet,type PetAction} from '@/lib/pets';
import type {RewardWallet} from '@/lib/rewards';
import type {Learning} from '@/lib/use-learning';
import {useAppearance} from './appearance';
import {PetStage} from './pet-stage';

type PetReaction={kind:PetAction;tick:number};
type Companion={pet:Pet;previewing:boolean;action:PetReaction;bond:number};
type Habitat={pets:Companion[];message:{id:string;text:string}|null;select:(id:string)=>boolean;remove:(id:string)=>void;tryPet:(id:string)=>boolean;care:(id:string,kind:PetAction)=>void};
const Context=createContext<Habitat|null>(null);
function useHabitat(){const value=useContext(Context);if(!value)throw new Error('Missing pet habitat');return value;}
const idleAction:PetReaction={kind:'hello',tick:0};
export function PetProvider({children,wallet,demo,account}:{children:ReactNode;wallet:RewardWallet;demo:boolean;account:string}){
 const [selection,setSelection]=useState<{selected:string[];previews:string[]}>({selected:[],previews:[]});
 const selectionRef=useRef(selection);
 const [bonds,setBonds]=useState<Record<string,number>>({}),[hydrated,setHydrated]=useState(false);
 const [actions,setActions]=useState<Record<string,PetReaction>>({});
 const [message,setMessage]=useState<{id:string;text:string}|null>(null);
 const storage='notelab-pet-v1:'+account;
 function updateSelection(next:typeof selection){selectionRef.current=next;setSelection(next);}
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(storage)||'null');const next={selected:normalizePetSelection(saved?.selected),previews:[]};selectionRef.current=next;setSelection(next);setBonds(saved?.bonds&&typeof saved.bonds==='object'?saved.bonds:{});}catch{}setHydrated(true);},[storage]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem(storage,JSON.stringify({selected:selection.selected,bonds}));}catch{}},[selection.selected,bonds,storage,hydrated]);
 const pets=visibleCompanionPets(selection.selected,selection.previews,wallet.redeemed,demo).map(id=>({pet:findPet(id)!,previewing:!selection.selected.includes(id),action:actions[id]||idleAction,bond:Number(bonds[id])||0}));
 useEffect(()=>{if(!selection.previews.length)return;const timer=setTimeout(()=>{const current=selectionRef.current;const next={...current,previews:[]};selectionRef.current=next;setSelection(next);},90000);return()=>clearTimeout(timer);},[selection.previews]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(null),3500);return()=>clearTimeout(timer);},[message]);
 function react(id:string,kind:PetAction){setActions(old=>({...old,[id]:{kind,tick:(old[id]?.tick||0)+1}}));}
 function select(id:string){
  // Selecting an owned pet replaces its trial slot without disturbing others.
  const current=selectionRef.current;
  const next=addCompanionPet(current.selected,current.previews.filter(x=>x!==id),id);
  if(!next)return false;
  updateSelection(next);setMessage({id,text:'Bạn nhỏ đã sẵn sàng đồng hành!'});react(id,'hello');return true;
 }
 function remove(id:string){const current=selectionRef.current;updateSelection({selected:current.selected.filter(x=>x!==id),previews:current.previews.filter(x=>x!==id)});setMessage(null);}
 function tryPet(id:string){if(!demo)return false;const current=selectionRef.current;const next=addCompanionPet(current.selected,current.previews,id,true);if(!next)return false;updateSelection(next);setMessage({id,text:'Đang xem thử · không trừ điểm'});react(id,'hello');return true;}
 function care(id:string,kind:PetAction){const companion=pets.find(p=>p.pet.id===id);if(!companion)return;react(id,kind);setMessage({id,text:kind==='feed'?'Măm măm! Cảm ơn em nhé ♡':kind==='pet'?'Thích quá! Thêm một cái vuốt ve nào ♡':kind==='play'?'Chơi cùng em vui thật đó!':'Chào em! Cùng học nhé ♡'});if(!companion.previewing)setBonds(old=>({...old,[id]:Math.min(99,Math.max(0,Number(old[id])||0)+1)}));}
 return <Context.Provider value={{pets,message,select,remove,tryPet,care}}>{children}</Context.Provider>;
}
export function PetCompanion({onShop}:{onShop:()=>void}){
 const h=useHabitat();const {motion}=useAppearance();
 if(!h.pets.length)return null;
 return <section className={'pet-lane pet-lane-group '+(!motion?'pet-lane-still':'')} aria-label="Bạn pet đồng hành" style={{gridTemplateColumns:`repeat(${h.pets.length},minmax(0,1fr))`}}>
  {h.pets.map(({pet,previewing,action,bond})=><div className="pet-companion" key={pet.id}>
   <div className="pet-lane-label"><PawPrint size={14}/><button onClick={onShop} title={pet.name}>{pet.name}</button>{previewing?<span>Xem thử</span>:<span title="Mức gắn bó khi chăm sóc · Lưu trên thiết bị" aria-label={"Mức gắn bó: "+bond}><Heart size={11}/> {bond}</span>}</div>
   <div className="pet-walk-track"><div className="pet-walker"><PetStage pet={pet} action={action} onInteract={()=>h.care(pet.id,'pet')} small/></div></div>
   <div className="pet-lane-actions"><button onClick={()=>h.care(pet.id,'feed')} aria-label={'Cho '+pet.name+' ăn'} title="Cho ăn"><Apple size={16}/></button><button onClick={()=>h.care(pet.id,'play')} aria-label={'Chơi cùng '+pet.name} title="Chơi cùng"><Sparkles size={16}/></button><button onClick={()=>h.remove(pet.id)} aria-label={'Cất '+pet.name} title="Cất pet"><X size={15}/></button></div>
   {h.message?.id===pet.id&&<span className="pet-speech" role="status">{h.message.text}</span>}
  </div>)}
 </section>;
}
function PetDialog({pet,onClose,demo}:{pet:Pet;onClose:()=>void;demo:boolean}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [action,setAction]=useState<{kind:PetAction;tick:number}>({kind:'hello',tick:0}),[mood,setMood]=useState('Chạm vào pet để làm quen nhé!');
 const h=useHabitat();
 useEffect(()=>{const node=dialog.current;node?.showModal();return()=>node?.close();},[]);
 function play(kind:PetAction){setAction(a=>({kind,tick:a.tick+1}));setMood(kind==='feed'?'Măm măm! Ngon quá ♡':kind==='pet'?'Tớ thích được vuốt ve! ♡':'Yay! Chơi cùng nhau nào!');}
 return <dialog className="pet-dialog" ref={dialog} onClose={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-labelledby="pet-dialog-title">
  <button className="pet-dialog-close" onClick={onClose} aria-label="Đóng xem trước pet"><X size={20}/></button>
  <span className="pet-eyebrow">LÀM QUEN VỚI BẠN NHỎ</span><h2 id="pet-dialog-title">{pet.name}</h2><p>{pet.description}</p>
  <div className="pet-preview-world" style={{background:`radial-gradient(ellipse at 50% 80%,${pet.color},transparent 70%)`}}><PetStage pet={pet} action={action} onInteract={()=>play('pet')}/></div>
  <p className="pet-dialog-mood" role="status">{mood}</p>
  <div className="pet-care-buttons"><button onClick={()=>play('pet')}><Heart size={17}/>Vuốt ve</button><button onClick={()=>play('feed')}><Apple size={17}/>Cho ăn</button><button onClick={()=>play('play')}><Sparkles size={17}/>Chơi cùng</button></div>
  <p className="pet-dialog-note">Chăm sóc miễn phí, không trừ hay cộng Điểm Nắng. {demo?"Đóng cửa sổ và bấm “Thử trên đầu trang” để thử pet trong Không gian mẫu.":"Chọn “Chọn đồng hành” trong bộ sưu tập để đưa pet đã mở khóa lên đầu trang."}</p>
  {h.pets.some(p=>p.pet.id===pet.id&&p.previewing)&&<p className="notice">Đang xem thử trên đầu trang.</p>}
 </dialog>;
}
export function PetShop({learning,demo}:{learning:Learning;demo:boolean}){
 const h=useHabitat();const [preview,setPreview]=useState<Pet|null>(null),[filter,setFilter]=useState('all'),[busy,setBusy]=useState(''),[status,setStatus]=useState(''),[error,setError]=useState('');
 function equip(p:Pet){setError('');if(!h.select(p.id))setError('Chỉ hiển thị tối đa 3 pet. Hãy cất một bạn trước khi thêm pet mới.');}
 function tryOnTop(p:Pet){setError('');if(!h.tryPet(p.id)){setError('Đang có đủ 3 pet trên đầu trang. Cất một bạn để thử pet khác nhé.');return;}setStatus('Đang xem thử '+p.name+' ở đầu trang trong 90 giây.');window.scrollTo({top:0,behavior:'smooth'});}
 const owned=petCatalog.filter(p=>ownsPet(learning.wallet.redeemed,p.id));
 const companionCount=h.pets.length;
 const canPreview=(p:Pet)=>demo||ownsPet(learning.wallet.redeemed,p.id);
 const list=petCatalog.filter(p=>filter==='all'||(filter==='owned'?ownsPet(learning.wallet.redeemed,p.id):!ownsPet(learning.wallet.redeemed,p.id)&&learning.wallet.balance>=p.cost));
 function openPreview(p:Pet){if(demo||ownsPet(learning.wallet.redeemed,p.id))setPreview(p);}
 async function buy(p:Pet){if(busy)return;setBusy(p.id);setError('');setStatus('');try{await learning.claimReward(p.id);const equipped=h.select(p.id);setStatus(equipped?'Đã mở khóa '+p.name+'! Bạn nhỏ đang ở phía trên trang.':'Đã mở khóa '+p.name+'. Em đang hiển thị đủ 3 pet; cất một bạn để thêm bạn mới.');}catch(e){setError(e instanceof Error?e.message:'Chưa mở khóa được pet.');}finally{setBusy('');}}
 return <section className="pet-shop" id="pet-shop" aria-label="Cửa hàng pet">
  <div className="pet-shop-intro"><div><span className="pet-eyebrow"><PawPrint size={15}/> NHỮNG NGƯỜI BẠN BÉ NHỎ</span><h2>Đón bạn nhỏ bằng Điểm Nắng</h2><p>Chọn một trong 10 pet em thích, dùng điểm mở khóa một lần và giữ trong bộ sưu tập. Em đã đón <strong>{owned.length}/10</strong> bạn nhỏ.</p></div><span className="pet-shop-note">{demo?"10 pet 3D · Chạm để tương tác":"Mở khóa để chơi cùng pet"}</span></div>
  {demo&&<div className="pet-demo-note"><Eye size={18}/><span><strong>Khám phá trong bản demo.</strong> Xem trước cả 10 pet và thử tối đa 3 bạn trên đầu trang trong 90 giây. Lượt thử không trừ điểm; điểm và pet trong Không gian mẫu không chuyển sang tài khoản thật.</span></div>}
  <p className="pet-team-count">Đang hiển thị: <strong>{companionCount}/{maxCompanionPets}</strong> · {demo?"Có thể thử pet trong Không gian mẫu; tài khoản thật cần mở khóa trước.":"Mở khóa bằng điểm, sau đó bấm “Chọn đồng hành” để đưa pet lên đầu trang."} Cất một pet chỉ ẩn bạn ấy, không mất quyền sở hữu.</p>
  <p className="pet-care-note">Chạm pet để vuốt ve, dùng nút táo để cho ăn hoặc ngôi sao để chơi cùng. Chăm sóc miễn phí, không cộng Điểm Nắng; pet không mất đi khi em nghỉ học.</p>
  <div className="sun-filters pet-filters" role="group" aria-label="Lọc pet"><button aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Tất cả (10)</button><button aria-pressed={filter==='available'} onClick={()=>setFilter('available')}>Đủ điểm</button><button aria-pressed={filter==='owned'} onClick={()=>setFilter('owned')}>Đã nuôi ({owned.length})</button></div>
  {error&&<p role="alert" className="form-error">{error}</p>}{status&&<p role="status" className="notice">{status}</p>}
  <div className="pet-grid">{list.map(p=>{const has=ownsPet(learning.wallet.redeemed,p.id),active=h.pets.some(item=>item.pet.id===p.id&&!item.previewing),canBuy=learning.wallet.balance>=p.cost;return <article className={'pet-card '+(active?'pet-card-active':'')} key={p.id}>
   <div className="pet-card-art" style={{background:`radial-gradient(ellipse at 50% 75%,${p.color},transparent 75%)`}}><button disabled={!canPreview(p)} onClick={()=>openPreview(p)} aria-label={canPreview(p)?'Xem trước '+p.name:p.name+' · Chưa mở khóa'}><img src={petPortrait(p.animal)} alt={p.species+' 3D '+p.name} loading="lazy" width={240} height={240}/><span>{canPreview(p)?<><Eye size={13}/> Xem 3D</>:<><Lock size={13}/> Chưa mở khóa</>}</span></button>{has&&<b className="pet-owned"><Check size={12}/>{active?'Đồng hành':'Đã mở khóa'}</b>}</div>
   <div className="pet-card-info"><span className="pet-species">{p.species}</span><h3>{p.name}</h3><p>{p.description}</p><div className="pet-price"><strong><Sun size={14}/>{p.cost} điểm</strong><small>{has?'Nuôi lâu dài':canBuy?'Sẵn sàng đón về':'Còn '+(p.cost-learning.wallet.balance)+' điểm'}</small></div>
   {has?<button className={'button '+(active?'secondary':'primary')} onClick={()=>active?h.remove(p.id):equip(p)}>{active?'Cất pet':'Chọn đồng hành'}</button>:<button className="button primary" disabled={!canBuy||Boolean(busy)||learning.loading||Boolean(learning.walletError)} onClick={()=>buy(p)}>{busy===p.id?<Loader2 size={15} className="spin"/>:<PawPrint size={15}/>} {canBuy?'Mở khóa · '+p.cost+' điểm':'Chưa đủ điểm'}</button>}
   {demo&&<button className="pet-try" onClick={()=>tryOnTop(p)}>Thử trên đầu trang <span>↗</span></button>}</div>
  </article>;})}</div>
  {!list.length&&<p className="sun-empty">Chưa có pet ở bộ lọc này. Chọn “Tất cả” để gặp các bạn nhỏ nhé.</p>}
  {preview&&canPreview(preview)&&<PetDialog key={preview.id} pet={preview} demo={demo} onClose={()=>setPreview(null)}/>}
 </section>;
}

"use client";
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {PawPrint,Heart,Apple,Sparkles,X,Eye,Check,Loader2,Sun,Lock} from 'lucide-react';
import {petCatalog,findPet,ownsPet,type Pet,type PetAction} from '@/lib/pets';
import type {RewardWallet} from '@/lib/rewards';
import type {Learning} from '@/lib/use-learning';
import {useAppearance} from './appearance';
import {PetStage} from './pet-stage';

type Habitat={selected:string|null;pet:Pet|undefined;previewing:boolean;action:{kind:PetAction;tick:number};message:string;bond:number;select:(id:string|null)=>void;tryPet:(id:string)=>void;care:(kind:PetAction)=>void};
const Context=createContext<Habitat|null>(null);
function useHabitat(){const value=useContext(Context);if(!value)throw new Error('Missing pet habitat');return value;}
export function PetProvider({children,wallet,demo,account}:{children:ReactNode;wallet:RewardWallet;demo:boolean;account:string}){
 const [selected,setSelected]=useState<string|null>(null),[preview,setPreview]=useState<string|null>(null);
 const [bonds,setBonds]=useState<Record<string,number>>({}),[hydrated,setHydrated]=useState(false);
 const [action,setAction]=useState<{kind:PetAction;tick:number}>({kind:'hello',tick:0});
 const [message,setMessage]=useState('');
 const storage='notelab-pet-v1:'+account;
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(storage)||'null');setSelected(findPet(saved?.selected)?.id||null);setBonds(saved?.bonds&&typeof saved.bonds==='object'?saved.bonds:{});}catch{}setHydrated(true);},[storage]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem(storage,JSON.stringify({selected,bonds}));}catch{}},[selected,bonds,storage,hydrated]);
 const owned=selected&&ownsPet(wallet.redeemed,selected)?findPet(selected):undefined;
 const pet=demo&&preview?findPet(preview):owned;
 useEffect(()=>{if(!preview)return;const timer=setTimeout(()=>setPreview(null),90000);return()=>clearTimeout(timer);},[preview,action.tick]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),3500);return()=>clearTimeout(timer);},[message,action.tick]);
 function select(id:string|null){if(id&&!findPet(id))return;setSelected(id);setPreview(null);setMessage(id?'Bạn nhỏ đã sẵn sàng đồng hành!':'');setAction(a=>({kind:'hello',tick:a.tick+1}));}
 function tryPet(id:string){if(!demo||!findPet(id))return;setPreview(id);setMessage('Đang xem thử · không trừ điểm');setAction(a=>({kind:'hello',tick:a.tick+1}));}
 function care(kind:PetAction){if(!pet)return;setAction(a=>({kind,tick:a.tick+1}));setMessage(kind==='feed'?'Măm măm! Cảm ơn em nhé ♡':kind==='pet'?'Thích quá! Thêm một cái vuốt ve nào ♡':kind==='play'?'Chơi cùng em vui thật đó!':'Chào em! Cùng học nhé ♡');if(!preview)setBonds(old=>({...old,[pet.id]:Math.min(99,Math.max(0,Number(old[pet.id])||0)+1)}));}
 return <Context.Provider value={{selected,pet,previewing:Boolean(preview),action,message,bond:pet?Number(bonds[pet.id])||0:0,select,tryPet,care}}>{children}</Context.Provider>;
}
export function PetCompanion({onShop}:{onShop:()=>void}){
 const h=useHabitat();const {motion}=useAppearance();
 if(!h.pet)return null;
 return <section className={'pet-lane '+(!motion?'pet-lane-still':'')} aria-label="Bạn pet đồng hành">
  <div className="pet-lane-label"><PawPrint size={14}/><button onClick={onShop}>{h.pet.name}</button>{h.previewing?<span>Xem thử</span>:<span><Heart size={11}/> {h.bond}</span>}</div>
  <div className="pet-walk-track"><div className="pet-walker">
   <PetStage pet={h.pet} action={h.action} onInteract={()=>h.care('pet')} small/>
  </div></div>
  <div className="pet-lane-actions"><button onClick={()=>h.care('feed')} aria-label="Cho pet ăn" title="Cho ăn"><Apple size={16}/></button><button onClick={()=>h.care('play')} aria-label="Chơi cùng pet" title="Chơi cùng"><Sparkles size={16}/></button><button onClick={()=>h.select(null)} aria-label={h.previewing?'Dừng xem thử pet':'Cất pet'} title="Cất pet"><X size={15}/></button></div>
  <span className="pet-speech" role="status">{h.message}</span>
 </section>;
}
function PetDialog({pet,onClose}:{pet:Pet;onClose:()=>void}){
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
  <p className="pet-dialog-note">Cho ăn và chơi cùng miễn phí. Bạn nhỏ không mất đi khi em nghỉ học.</p>
  {h.previewing&&h.pet?.id===pet.id&&<p className="notice">Đang xem thử trên đầu trang.</p>}
 </dialog>;
}
export function PetShop({learning,demo}:{learning:Learning;demo:boolean}){
 const h=useHabitat();const [preview,setPreview]=useState<Pet|null>(null),[filter,setFilter]=useState('all'),[busy,setBusy]=useState(''),[status,setStatus]=useState(''),[error,setError]=useState('');
 const owned=petCatalog.filter(p=>ownsPet(learning.wallet.redeemed,p.id));
 const canPreview=(p:Pet)=>demo||ownsPet(learning.wallet.redeemed,p.id);
 const list=petCatalog.filter(p=>filter==='all'||(filter==='owned'?ownsPet(learning.wallet.redeemed,p.id):!ownsPet(learning.wallet.redeemed,p.id)&&learning.wallet.balance>=p.cost));
 function openPreview(p:Pet){if(demo||ownsPet(learning.wallet.redeemed,p.id))setPreview(p);}
 async function buy(p:Pet){if(busy)return;setBusy(p.id);setError('');setStatus('');try{await learning.claimReward(p.id);h.select(p.id);setStatus('Đã mở khóa '+p.name+'! Bạn nhỏ đang ở phía trên trang.');}catch(e){setError(e instanceof Error?e.message:'Chưa mở khóa được pet.');}finally{setBusy('');}}
 return <section className="pet-shop" id="pet-shop" aria-label="Cửa hàng pet">
  <div className="pet-shop-intro"><div><span className="pet-eyebrow"><PawPrint size={15}/> NHỮNG NGƯỜI BẠN BÉ NHỎ</span><h2>Một người bạn, thêm niềm vui.</h2><p>Tích Điểm Nắng, đón pet về và cùng nhau khám phá mỗi ngày. Đã có <strong>{owned.length}/10</strong> bạn nhỏ trong bộ sưu tập.</p></div><span className="pet-shop-note">{demo?"10 pet 3D · Chạm để tương tác":"Mở khóa để chơi cùng pet"}</span></div>
  {demo&&<div className="pet-demo-note"><Eye size={18}/><span><strong>Khám phá trong bản demo.</strong> Xem trước cả 10 pet hoặc bấm “Thử trên đầu trang”. Xem thử không trừ điểm và không mở khóa pet thật.</span></div>}
  <div className="sun-filters pet-filters" role="group" aria-label="Lọc pet"><button aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Tất cả (10)</button><button aria-pressed={filter==='available'} onClick={()=>setFilter('available')}>Đủ điểm</button><button aria-pressed={filter==='owned'} onClick={()=>setFilter('owned')}>Đã nuôi ({owned.length})</button></div>
  {error&&<p role="alert" className="form-error">{error}</p>}{status&&<p role="status" className="notice">{status}</p>}
  <div className="pet-grid">{list.map(p=>{const has=ownsPet(learning.wallet.redeemed,p.id),active=h.pet?.id===p.id&&!h.previewing,canBuy=learning.wallet.balance>=p.cost;return <article className={'pet-card '+(active?'pet-card-active':'')} key={p.id}>
   <div className="pet-card-art" style={{background:`radial-gradient(ellipse at 50% 75%,${p.color},transparent 75%)`}}><button disabled={!canPreview(p)} onClick={()=>openPreview(p)} aria-label={canPreview(p)?'Xem trước '+p.name:p.name+' · Chưa mở khóa'}><img src={'/pets/'+p.animal+'.png'} alt={p.species+' 3D '+p.name} loading="lazy" width={240} height={240}/><span>{canPreview(p)?<><Eye size={13}/> Xem 3D</>:<><Lock size={13}/> Chưa mở khóa</>}</span></button>{has&&<b className="pet-owned"><Check size={12}/>{active?'Đồng hành':'Đã mở khóa'}</b>}</div>
   <div className="pet-card-info"><span className="pet-species">{p.species}</span><h3>{p.name}</h3><p>{p.description}</p><div className="pet-price"><strong><Sun size={14}/>{p.cost} điểm</strong><small>{has?'Nuôi lâu dài':canBuy?'Sẵn sàng đón về':'Còn '+(p.cost-learning.wallet.balance)+' điểm'}</small></div>
   {has?<button className={'button '+(active?'secondary':'primary')} onClick={()=>h.select(active?null:p.id)}>{active?'Cất pet':'Chọn đồng hành'}</button>:<button className="button primary" disabled={!canBuy||Boolean(busy)||learning.loading||Boolean(learning.walletError)} onClick={()=>buy(p)}>{busy===p.id?<Loader2 size={15} className="spin"/>:<PawPrint size={15}/>} {canBuy?'Mở khóa · '+p.cost+' điểm':'Chưa đủ điểm'}</button>}
   {demo&&<button className="pet-try" onClick={()=>{h.tryPet(p.id);setStatus('Đang xem thử '+p.name+' ở đầu trang trong 90 giây.');window.scrollTo({top:0,behavior:'smooth'});}}>Thử trên đầu trang <span>↗</span></button>}</div>
  </article>;})}</div>
  {!list.length&&<p className="sun-empty">Chưa có pet ở bộ lọc này. Chọn “Tất cả” để gặp các bạn nhỏ nhé.</p>}
  {preview&&canPreview(preview)&&<PetDialog key={preview.id} pet={preview} onClose={()=>setPreview(null)}/>}
 </section>;
}

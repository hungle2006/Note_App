"use client";
import {useEffect,useId,useRef,useState,type ReactNode} from "react";
import {Check,ChevronDown,X} from "lucide-react";
import {createPortal} from "react-dom";

export type SmartOption={value:string;label:string;description?:string};
type SmartSelectProps={
 id?:string;label:string;value:string;options:SmartOption[];
 onChange:(value:string)=>void;disabled?:boolean;icon?:ReactNode;
 placeholder?:string;className?:string;description?:string;showLabel?:boolean;
};
export function SmartSelect({id,label,value,options,onChange,disabled=false,icon,placeholder="Chọn một mục",className="",description,showLabel=true}:SmartSelectProps){
 const listId=useId(),trigger=useRef<HTMLButtonElement>(null),list=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false);
 const [active,setActive]=useState(0);
 const [box,setBox]=useState({top:0,left:0,width:280,maxHeight:320});
 const [mobile,setMobile]=useState(false);
 const selected=options.find(o=>o.value===value);
 function geometry(){
  if(!trigger.current)return;
  const m=window.matchMedia("(max-width:760px)").matches;
  setMobile(m);
  const r=trigger.current.getBoundingClientRect();
  const width=Math.min(Math.max(r.width,240),Math.min(380,window.innerWidth-20));
  const left=Math.min(Math.max(10,r.left),window.innerWidth-width-10);
  const availableBelow=window.innerHeight-r.bottom-20;
  const height=Math.min(330,Math.max(160,m?window.innerHeight*.6:availableBelow));
  const top=availableBelow>=Math.min(220,options.length*48+12)?r.bottom+7:Math.max(8,r.top-height-7);
  setBox({left,top,width,maxHeight:Math.min(height,window.innerHeight-24)});
 }
 function show(){
  if(disabled)return;
  geometry();
  setActive(Math.max(0,options.findIndex(o=>o.value===value)));
  setOpen(true);
 }
 function hide(refocus=true){setOpen(false);if(refocus)requestAnimationFrame(()=>trigger.current?.focus());}
 function choose(v:string){onChange(v);hide();}
 useEffect(()=>{
  if(!open)return;
  const onResize=()=>geometry();
  const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();hide();}};
  window.addEventListener("resize",onResize);
  window.addEventListener("keydown",onKey);
  const before=document.body.style.overflow;
  if(window.matchMedia("(max-width:760px)").matches)document.body.style.overflow="hidden";
  requestAnimationFrame(()=>list.current?.focus());
  return()=>{window.removeEventListener("resize",onResize);window.removeEventListener("keydown",onKey);document.body.style.overflow=before;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const node=list.current?.querySelector<HTMLElement>('[data-index="'+active+'"]');
  node?.scrollIntoView({block:"nearest"});
 },[active,open]);
 return <div className={"smart-select "+className}>
  {showLabel&&<label className="smart-select-label" htmlFor={id??listId}>{label}</label>}
  <button id={id??listId} ref={trigger} className="smart-select-trigger" type="button" aria-label={label}
   aria-haspopup="listbox" aria-controls={open?listId+"-list":undefined} aria-expanded={open} disabled={disabled} onClick={()=>open?hide():show()}
   onKeyDown={e=>{if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();show();}}}>
   {icon&&<span className="smart-select-leading" aria-hidden="true">{icon}</span>}
   <span className="smart-select-current">{selected?.label??placeholder}</span>
   <ChevronDown size={17} strokeWidth={2.3} aria-hidden="true" className={"smart-select-chevron"+(open?" opened":"")}/>
  </button>
  {description&&<span className="smart-select-description">{description}</span>}
  {open&&typeof document!=="undefined"&&createPortal(<div className={"smart-select-layer"+(mobile?" mobile":"")} data-smart-select-root>
    <button type="button" className="smart-select-backdrop" tabIndex={-1} aria-label="Đóng danh sách" onClick={()=>hide(false)}/>
    <div className="smart-select-menu" style={mobile?undefined:{top:box.top,left:box.left,width:box.width,maxHeight:box.maxHeight}} role="presentation">
     <header className="smart-select-menu-header"><span>{label}</span><button type="button" aria-label="Đóng danh sách" onClick={()=>hide()}><X size={18}/></button></header>
     <div id={listId+"-list"} ref={list} className="smart-select-options" role="listbox" tabIndex={0} aria-label={label}
      aria-activedescendant={listId+"-option-"+active}
      onKeyDown={e=>{
       if(e.key==="ArrowDown"){e.preventDefault();setActive(i=>Math.min(options.length-1,i+1));}
       if(e.key==="ArrowUp"){e.preventDefault();setActive(i=>Math.max(0,i-1));}
       if(e.key==="Home"){e.preventDefault();setActive(0);}
       if(e.key==="End"){e.preventDefault();setActive(Math.max(0,options.length-1));}
       if(e.key==="Enter"||e.key===" "){e.preventDefault();if(options[active])choose(options[active].value);}
      }}>
      {options.map((o,i)=><button type="button" key={o.value} id={listId+"-option-"+i} data-index={i}
       role="option" aria-selected={value===o.value} className={"smart-select-option"+(value===o.value?" is-selected":"")+(i===active?" is-active":"")}
       onMouseMove={()=>setActive(i)} onClick={()=>choose(o.value)}>
        <span className="smart-select-option-main"><strong>{o.label}</strong>{o.description&&<small>{o.description}</small>}</span>
        {value===o.value&&<span className="smart-select-check"><Check size={16}/></span>}
       </button>)}
     </div>
    </div>
   </div>,document.body)}
 </div>;
}

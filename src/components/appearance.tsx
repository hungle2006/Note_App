"use client";

import {createContext, useContext, useEffect, useState} from "react";
import {Moon, Sun, Pause, Play} from "lucide-react";
import {WaterAtmosphere} from "./water-atmosphere";

type Appearance={dark:boolean; motion:boolean; toggleTheme:()=>void; toggleMotion:()=>void};
const Context=createContext<Appearance>({dark:false,motion:true,toggleTheme:()=>{},toggleMotion:()=>{}});
export const appearanceScript=`(()=>{try{const d=document.documentElement;const t=localStorage.getItem('notelab-theme');d.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');const m=localStorage.getItem('notelab-motion');d.dataset.motion=matchMedia('(prefers-reduced-motion: reduce)').matches||m==='off'?'off':'on';}catch{}})()`;

export function AppearanceProvider({children}:{children:React.ReactNode}){
  const [dark,setDark]=useState(false);
  const [motion,setMotion]=useState(true);
  useEffect(()=>{
    const root=document.documentElement;
    // Hydration also initializes these attributes if the early inline script
    // could not run. This keeps the water behind the content on a fresh load.
    let savedTheme:string|null=null,savedMotion:string|null=null;
    try{savedTheme=localStorage.getItem('notelab-theme');savedMotion=localStorage.getItem('notelab-motion');}catch{}
    root.dataset.theme??=savedTheme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
    root.dataset.motion??=matchMedia('(prefers-reduced-motion: reduce)').matches||savedMotion==='off'?'off':'on';
    setDark(root.dataset.theme==='dark');
    setMotion(root.dataset.motion!=='off');
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{if(media.matches){document.documentElement.dataset.motion='off';setMotion(false);}};
    media.addEventListener('change',update);return()=>media.removeEventListener('change',update);
  },[]);
  function toggleTheme(){const next=!dark;setDark(next);document.documentElement.dataset.theme=next?'dark':'light';try{localStorage.setItem('notelab-theme',next?'dark':'light');}catch{}}
  function toggleMotion(){const next=!motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;setMotion(next);document.documentElement.dataset.motion=next?'on':'off';try{localStorage.setItem('notelab-motion',next?'on':'off');}catch{}}
  return <Context.Provider value={{dark,motion,toggleTheme,toggleMotion}}><WaterAtmosphere active={motion}/>{children}</Context.Provider>;
}
export function AppearanceControls({compact=false}:{compact?:boolean}){
  const a=useContext(Context);
  return <div className="appearance-controls">
    <button type="button" className="appearance-button" onClick={a.toggleTheme} aria-label={a.dark?'Chuyển sang giao diện sáng':'Chuyển sang giao diện tối'} title={a.dark?'Giao diện sáng':'Giao diện tối'}><span className="appearance-glyph" aria-hidden="true"><Moon size={19} className={!a.dark?'glyph-visible':''}/><Sun size={19} className={a.dark?'glyph-visible':''}/></span></button>
    {!compact&&<button type="button" className="appearance-button motion-control" onClick={a.toggleMotion} aria-label={a.motion?'Tắt chuyển động 3D':'Bật chuyển động 3D'} aria-pressed={a.motion} title={a.motion?'Tắt chuyển động':'Bật chuyển động'}><span className="appearance-glyph motion-glyph" aria-hidden="true"><Pause size={16} className={a.motion?'glyph-visible':''}/><Play size={16} className={!a.motion?'glyph-visible':''}/></span><span>3D</span></button>}
  </div>;
}
export function useAppearance(){return useContext(Context);}

"use client";

import {useRef} from "react";
import {Sparkles, Check, BookOpen, Atom, Zap} from "lucide-react";
import {useAppearance} from "./appearance";

export function LearningScene({compact=false}:{compact?:boolean}){
  const ref=useRef<HTMLDivElement>(null);
  const {motion}=useAppearance();
  function move(e:React.PointerEvent<HTMLDivElement>){
    if(!motion||e.pointerType!=='mouse')return;
    const r=e.currentTarget.getBoundingClientRect();
    ref.current?.style.setProperty('--scene-x',`${(e.clientY-r.top-r.height/2)/r.height*-8}deg`);
    ref.current?.style.setProperty('--scene-y',`${(e.clientX-r.left-r.width/2)/r.width*10}deg`);
  }
  function reset(){ref.current?.style.setProperty('--scene-x','0deg');ref.current?.style.setProperty('--scene-y','0deg');}
  return <div className={'learning-scene '+(compact?'scene-compact':'')} onPointerMove={move} onPointerLeave={reset} aria-hidden="true">
    <div className="scene-glow"/><div className="scene-grid"/>
    <div className="scene-stage" ref={ref}>
      <div className="planet planet-teal"><div className="planet-ring"/><div className="planet-core"/></div>
      <div className="planet planet-peach"><div className="planet-core"/></div>
      <div className="scene-book"><div className="book-shadow"/><div className="book-model">
        <div className="book-back"/><div className="book-pages"/><div className="book-spine"/>
        <div className="book-cover"><span className="book-cover-top">MY LITTLE UNIVERSE</span><BookOpen size={36}/><strong>Mỗi ngày,<br/>một điều<br/><em>mới.</em></strong><span className="book-cover-bottom">NOTELAB · LỚP 6—9</span><span className="cover-stars">✧ · ✦</span></div>
      </div></div>
      <div className="scene-card scene-formula"><span><Atom size={16}/> KHOA HỌC TỰ NHIÊN</span><strong>v = s / t</strong><small>Hiểu công thức. Khám phá thế giới.</small></div>
      <div className="scene-card scene-question"><span><Zap size={15}/> MỘT CÂU HỎI NHỎ</span><p>3/4 + 1/4 = ?</p><div><span>1/2</span><b>1 <Check size={12}/></b><span>2</span></div></div>
      <div className="scene-ai"><Sparkles size={20}/><div><strong>À, mình hiểu rồi!</strong><span>Học theo nhịp của em.</span></div></div>
      <i className="scene-spark spark-one">✦</i><i className="scene-spark spark-two">✧</i><i className="scene-dot"/>
    </div>
  </div>;
}

"use client";
import {useMemo,useState} from "react";
import {Activity,Check,ChevronDown,Clock,Dumbbell,Flower2,Footprints,HeartPulse,Move,Scale,ScanLine,Search,SlidersHorizontal,Sparkles,Sun,Target,Wind} from "lucide-react";
import type {LucideIcon} from "lucide-react";
import {FITNESS_CATEGORIES,FITNESS_LIBRARY,searchFitnessLibrary,type FitnessCategory,type FitnessLevel} from "@/lib/fitness-catalog";
import styles from "./fitness.module.css";
const CATEGORY_ICONS:Record<FitnessCategory,LucideIcon>={all:Sparkles,ai:ScanLine,warmup:Sun,cardio:HeartPulse,legs:Footprints,upper:Dumbbell,core:Activity,mobility:Move,balance:Scale,stretch:Flower2,recovery:Wind};
const PAGE_SIZE=6;
export function FitnessLibraryPicker({selectedId,onSelect}:{selectedId:string;onSelect:(id:string)=>void}){
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState<FitnessCategory>("all");
 const [level,setLevel]=useState<"all"|FitnessLevel>("all");
 const [show,setShow]=useState(PAGE_SIZE);
 const filtered=useMemo(()=>searchFitnessLibrary(query,category,level),[query,category,level]);
 const shown=filtered.slice(0,show);
 function pickCategory(id:FitnessCategory){setCategory(id);setShow(PAGE_SIZE);}
 function search(value:string){setQuery(value);setShow(PAGE_SIZE);}
 return <section className={styles.panel+" "+styles.libraryPanel} aria-label="Thư viện bài tập">
  <div className={styles.panelPad}>
   <div className={styles.libraryHeading}>
    <div><span className={styles.kicker}><Sparkles size={14}/> KHÁM PHÁ VẬN ĐỘNG</span><h2>100 bài tập cho từng ngày</h2><p>Chọn bài phù hợp · xem hướng dẫn · tập vừa sức</p></div>
    <div className={styles.libraryCount}><strong>{FITNESS_LIBRARY.length}</strong><span>bài tập</span></div>
   </div>
   <div className={styles.catalogTools}>
    <label className={styles.catalogSearch}><Search size={19} strokeWidth={2.1} aria-hidden="true"/><input type="search" value={query} onChange={e=>search(e.target.value)} aria-label="Tìm bài tập" placeholder="Tên bài tập hoặc nhóm vận động…"/></label>
    <label className={styles.levelFilter}><SlidersHorizontal size={17} strokeWidth={2} aria-hidden="true"/><select aria-label="Lọc độ khó" value={level} onChange={e=>{setLevel(e.target.value as "all"|FitnessLevel);setShow(PAGE_SIZE);}}>
      <option value="all">Mọi độ khó</option><option value="Dễ">Dễ</option><option value="Vừa">Vừa</option><option value="Nâng cao">Nâng cao</option>
    </select><ChevronDown size={16} aria-hidden="true" className={styles.filterChevron}/></label>
   </div>
   <div className={styles.categoryRail} role="group" aria-label="Nhóm bài tập">
    {FITNESS_CATEGORIES.map(c=>{const Icon=CATEGORY_ICONS[c.id];return <button type="button" key={c.id} aria-pressed={category===c.id} onClick={()=>pickCategory(c.id)}><Icon size={16} strokeWidth={2} aria-hidden="true"/><span>{c.label}</span>{c.id==="ai"&&<span className={styles.categoryNumber}>7</span>}</button>;})}
   </div>
   <div className={styles.catalogSummary}><span><Target size={15}/>{filtered.length} bài phù hợp</span><span>AI đếm: 7 bài · Hướng dẫn: 93 bài</span></div>
   {shown.length>0?<div className={styles.catalogGrid}>
    {shown.map(ex=>{const Icon=CATEGORY_ICONS[ex.category];return <button type="button" key={ex.id} className={styles.catalogCard} aria-pressed={selectedId===ex.id} onClick={()=>onSelect(ex.id)}>
      <span className={styles.catalogIcon} aria-hidden="true"><Icon size={22} strokeWidth={1.9}/></span>
      <span className={styles.catalogCardCopy}><strong>{ex.name}</strong><small>{ex.short}</small><span className={styles.catalogMeta}><span className={ex.kind==="ai"?styles.kindAI:styles.kindTimer}>{ex.kind==="ai"?<><ScanLine size={12}/> AI đếm</>:<><Clock size={12}/> Hẹn giờ</>}</span><span>{ex.level}</span>{ex.kind==="guided"&&<span>{ex.seconds}s</span>}</span></span>
      {selectedId===ex.id?<span className={styles.catalogSelected} aria-label="Đang chọn"><Check size={15}/></span>:null}
    </button>;})}
   </div>:<div className={styles.catalogEmpty}><Search size={23}/><strong>Chưa có bài phù hợp</strong><p>Hãy thử tên khác hoặc đổi bộ lọc.</p><button type="button" className={styles.control} onClick={()=>{setQuery("");setCategory("all");setLevel("all");setShow(PAGE_SIZE);}}>Xóa bộ lọc</button></div>}
   {show<filtered.length&&<button type="button" className={styles.loadMore} onClick={()=>setShow(n=>n+PAGE_SIZE)}>Xem thêm {Math.min(PAGE_SIZE,filtered.length-show)} bài <ChevronDown size={17}/></button>}
   <p className={styles.catalogDisclaimer}><Clock size={15}/> 7 bài có bộ đếm tự động theo Pose. 93 bài còn lại có hướng dẫn và đồng hồ tập, <strong>không tự nhận xét hoặc đếm động tác bằng AI</strong>. Em có thể nghỉ bất cứ khi nào cần.</p>
  </div>
 </section>;
}

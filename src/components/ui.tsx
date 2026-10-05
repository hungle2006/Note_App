"use client";
import Link from "next/link";import {BookOpen,Loader2} from "lucide-react";import ReactMarkdown from "react-markdown";import remarkGfm from "remark-gfm";import remarkMath from "remark-math";import rehypeKatex from "rehype-katex";
export function Logo(){return <Link href="/" className="brand" aria-label="NoteLab — Trang chủ"><span className="brand-icon"><BookOpen size={24}/></span>note<span>lab.</span></Link>;}
export function Markdown({content}:{content:string}){return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm,remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown></div>;}
export function Spinner({label="Đang tải…"}:{label?:string}){return <div className="loading"><Loader2 size={22} className="spin"/>{label}</div>;}
export function Tag({children,color="purple"}:{children:React.ReactNode;color?:string}){return <span className={"tag "+color}>{children}</span>;}
export function Title({eyebrow,title,description,children}:{eyebrow:string;title:string;description?:string;children?:React.ReactNode}){return <div className="section-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>{children}</div>;}
export function Empty({title,text,children}:{title:string;text:string;children?:React.ReactNode}){return <div className="empty"><BookOpen size={32}/><h3>{title}</h3><p>{text}</p>{children}</div>;}
export const formatDate=(d:string)=>new Date(d).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit"});

import type {Metadata} from "next";
import {AuthProvider} from "@/components/auth-provider";
import {AppearanceProvider,appearanceScript} from "@/components/appearance";
import "katex/dist/katex.min.css";
import "./globals.css";
export const metadata:Metadata={title:{default:"NoteLab · Vũ trụ học tập THCS",template:"%s · NoteLab"},description:"Không gian học tập lớp 6–9. Chụp vở với Gemini, hỏi gia sư Mistral và ôn bằng trò chơi.",icons:{icon:"/icon.svg"}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="vi" suppressHydrationWarning><head><script id="notelab-appearance" dangerouslySetInnerHTML={{__html:appearanceScript}}/></head><body><AppearanceProvider><AuthProvider>{children}</AuthProvider></AppearanceProvider></body></html>;}

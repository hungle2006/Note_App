import type {Metadata} from "next";
import {AuthProvider} from "@/components/auth-provider";
import {AppearanceProvider,appearanceScript} from "@/components/appearance";
import "@fontsource-variable/nunito-sans/wght.css";
import "@fontsource-variable/nunito-sans/wght-italic.css";
import "@fontsource-variable/lora/wght-italic.css";
import "katex/dist/katex.min.css";
import "./globals.css";
const siteTitle="SmartNote AI · Vũ trụ học tập THCS";
const siteDescription="Không gian học tập lớp 6–9. Chụp vở với Gemini, ghi chép bằng giọng nói, hỏi gia sư Groq và ôn bằng trò chơi.";
export const metadata:Metadata={
 title:{default:siteTitle,template:"%s · SmartNote AI"},description:siteDescription,
 applicationName:"SmartNote AI",icons:{icon:"/icon.svg"},
 openGraph:{title:siteTitle,description:siteDescription,siteName:"SmartNote AI",locale:"vi_VN",type:"website"},
 twitter:{card:"summary",title:siteTitle,description:siteDescription}
};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="vi" suppressHydrationWarning><head><script id="notelab-appearance" dangerouslySetInnerHTML={{__html:appearanceScript}}/></head><body><AppearanceProvider><AuthProvider>{children}</AuthProvider></AppearanceProvider></body></html>;}

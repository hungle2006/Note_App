import type {Metadata} from "next";import {AuthProvider} from "@/components/auth-provider";import "katex/dist/katex.min.css";import "./globals.css";
export const metadata:Metadata={title:{default:"NoteLab · Biến trang vở thành hành trình học tập",template:"%s · NoteLab"},description:"Chụp vở, sắp xếp kiến thức, gia sư AI và trò chơi ôn tập.",icons:{icon:"/icon.svg"}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="vi"><body><AuthProvider>{children}</AuthProvider></body></html>;}

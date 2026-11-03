import {AuthForm} from "@/components/auth-form";
export default async function Page({searchParams}:{searchParams:Promise<{source?:string}>}){
 const params=await searchParams;
 return <AuthForm mode="register" quickStart={params.source==="qr"}/>;
}

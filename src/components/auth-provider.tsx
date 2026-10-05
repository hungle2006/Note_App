"use client";
import {createContext,useContext,useEffect,useState} from "react";import {onAuthStateChanged,signOut,type User} from "firebase/auth";import {firebaseAuth,firebaseConfigured} from "@/lib/firebase";
const Context=createContext<{user:User|null;loading:boolean;refresh:()=>Promise<void>;logout:()=>Promise<void>}>({user:null,loading:true,refresh:async()=>{},logout:async()=>{}});
export function AuthProvider({children}:{children:React.ReactNode}){const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);const [,redraw]=useState(0);
useEffect(()=>{if(!firebaseConfigured){setLoading(false);return;}return onAuthStateChanged(firebaseAuth(),u=>{setUser(u);setLoading(false);},()=>setLoading(false));},[]);
async function refresh(){const u=firebaseAuth().currentUser;if(u){await u.reload();await u.getIdToken(true);setUser(u);redraw(x=>x+1);}}
return <Context.Provider value={{user,loading,refresh,logout:async()=>{await signOut(firebaseAuth());setUser(null);}}}>{children}</Context.Provider>;}
export const useAuth=()=>useContext(Context);

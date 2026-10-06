import {firebaseAuth} from "./firebase";
import {requestWithSession} from "./session-request";
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{return requestWithSession<T>("/api"+path,options,{currentUser:()=>firebaseAuth().currentUser,fetch});}
export async function prepareImage(file:File){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error("Chọn JPG, PNG hoặc WebP. HEIC cần chuyển sang JPG.");
 if(file.size>20000000)throw new Error("Ảnh vượt 20 MB.");const url=URL.createObjectURL(file);
 try{const image=new Image();image.src=url;await image.decode();const scale=Math.min(1,1800/Math.max(image.width,image.height));const canvas=document.createElement("canvas");canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Trình duyệt không xử lý được ảnh.");ctx.fillStyle="white";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
 let quality=.88;let dataUrl=canvas.toDataURL("image/jpeg",quality);while(dataUrl.length>780000&&quality>.35){quality-=.1;dataUrl=canvas.toDataURL("image/jpeg",quality);}if(dataUrl.length>780000)throw new Error("Hãy cắt ảnh nhỏ hơn.");return {name:file.name,dataUrl};
 }finally{URL.revokeObjectURL(url);}
}

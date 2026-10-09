export const AUDIO_MAX_BYTES=4_000_000;
export const AUDIO_MAX_SECONDS=180;
export const AUDIO_ACCEPT=".wav,.mp3,.m4a,.ogg,.webm,.flac,audio/*";
export function audioFileError(file:{size:number;name:string;type:string}){
 if(!file.size)return "File âm thanh trống.";
 if(file.size>AUDIO_MAX_BYTES)return "File vượt 4 MB. Hãy chọn một đoạn ngắn hoặc file nén MP3/M4A.";
 if(!/\.(wav|mp3|m4a|ogg|webm|flac)$/i.test(file.name)||file.type&&!(file.type.startsWith("audio/")||file.type==="video/webm"||file.type==="application/octet-stream"))return "Chọn file WAV, MP3, M4A, OGG, WebM hoặc FLAC.";
 return "";
}

import {createClient} from '@libsql/client/http';
export function connect() {
 for(const key of ['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN'])if(!process.env[key]?.trim())throw new Error('Thiếu '+key);
 const url=process.env.TURSO_DATABASE_URL.trim();
 if(!/^(libsql|https):\/\//.test(url))throw new Error('Dùng Database URL libsql:// hoặc https://, không dùng URL dashboard.');
 return createClient({url,authToken:process.env.TURSO_AUTH_TOKEN.trim(),fetch:(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)})});
}

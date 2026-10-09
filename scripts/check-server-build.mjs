import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {generateKeyPairSync} from 'node:crypto';
const require=createRequire(import.meta.url);

// Exercise the compiled handlers directly, as a function adapter does. A local
// next start server can hide an asynchronous userland loading incompatibility.
for(const [path,method] of [['notes','GET'],['notes/[id]','GET'],['chat','GET'],['attempts','GET'],['scan','POST'],['transcribe','POST'],['study','POST']]) {
 const {routeModule}=require('../.next/server/app/api/'+path+'/route.js');
 const handler=routeModule.userland[method];
 assert.equal(typeof handler,'function','Compiled handler '+path);
 const response=await handler(new Request('https://notelab.invalid/api/'+path,{method}),{params:Promise.resolve({id:'00000000-0000-4000-8000-000000000000'})});
 assert.equal(response.status,401,'Anonymous request '+path);
 assert.equal((await response.json()).code,'UNAUTHENTICATED');
 console.log('Compiled '+method+' /api/'+path+': 401 JSON');
}

// Exercise the lazy Firebase SDK path, not only the anonymous early return.
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,
 privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
Object.assign(process.env,{FIREBASE_PROJECT_ID:'test-project',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'test-project',
 FIREBASE_CLIENT_EMAIL:'test@test-project.iam.gserviceaccount.com',FIREBASE_PRIVATE_KEY:privateKey});
const {routeModule}=require('../.next/server/app/api/notes/route.js');
const response=await routeModule.userland.GET(new Request('https://notelab.invalid/api/notes',{
 headers:{Authorization:'Bearer notelab-diagnostic-invalid-token'}}));
assert.equal(response.status,401,'Configured SDK initialization must reach token verification');
assert.equal((await response.json()).code,'INVALID_TOKEN');
console.log('Compiled configured Firebase: SDK loads, malformed token returns 401');

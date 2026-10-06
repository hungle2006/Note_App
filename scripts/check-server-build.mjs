import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

// Exercise the compiled handlers directly, as a function adapter does. A local
// next start server can hide an asynchronous userland loading incompatibility.
for(const [path,method] of [['notes','GET'],['notes/[id]','GET'],['chat','GET'],['attempts','GET'],['scan','POST'],['study','POST']]) {
 const {routeModule}=require('../.next/server/app/api/'+path+'/route.js');
 const handler=routeModule.userland[method];
 assert.equal(typeof handler,'function','Compiled handler '+path);
 const response=await handler(new Request('https://notelab.invalid/api/'+path,{method}),{params:Promise.resolve({id:'00000000-0000-4000-8000-000000000000'})});
 assert.equal(response.status,401,'Anonymous request '+path);
 assert.equal((await response.json()).code,'UNAUTHENTICATED');
 console.log('Compiled '+method+' /api/'+path+': 401 JSON');
}

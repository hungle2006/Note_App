import {readFile} from 'node:fs/promises';import {connect} from './oracle-config.mjs';
const c=await connect();try{
 try{await c.execute('CREATE TABLE app_migrations(version VARCHAR2(20) PRIMARY KEY,applied_at TIMESTAMP DEFAULT SYSTIMESTAMP)');}catch(e){if(e.errorNum!==955)throw e;}
 const r=await c.execute("SELECT version FROM app_migrations WHERE version='001'");
 if(r.rows.length)console.log('Migration 001 đã áp dụng.');
 else{const sql=await readFile(new URL('../database/001_initial.sql',import.meta.url),'utf8');for(const s of sql.replace(/^--.*$/gm,'').split(';').map(x=>x.trim()).filter(Boolean)){try{await c.execute(s);}catch(e){if(e.errorNum!==955)throw e;}}
 await c.execute("INSERT INTO app_migrations(version) VALUES('001')",{},{autoCommit:true});console.log('Schema NoteLab sẵn sàng.');}
}finally{await c.close();}

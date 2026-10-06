import {connect} from './turso-config.mjs';
import schemaModule from '../src/lib/server/turso-schema.ts';
const {schemaVersion}=schemaModule;
const client=connect();
try {
 const tables=await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('app_notes','app_attempts','app_chats','app_ai_usage')");
 const columns=await client.execute('PRAGMA table_info(app_notes)');
 const migration=await client.execute({sql:'SELECT version FROM app_migrations WHERE version=?',args:[schemaVersion]});
 const valid=tables.rows.length===4&&['grade','search_text'].every(name=>columns.rows.some(c=>c.name===name))&&migration.rows.length===1;
 console.log('Turso: '+tables.rows.length+'/4 bảng; migration '+schemaVersion+' '+(migration.rows.length?'đã áp dụng':'chưa áp dụng'));
 if(valid){const counts=await client.execute('SELECT (SELECT count(*) FROM app_notes) AS notes,(SELECT count(*) FROM app_attempts) AS attempts,(SELECT count(*) FROM app_chats) AS chats');console.log('Số bản ghi:',JSON.stringify(counts.rows[0]));}else process.exitCode=1;
}catch{console.error('Kiểm tra thất bại. Kiểm tra URL, token database và chạy db:migrate nếu schema chưa có.');process.exitCode=1;}
finally{client.close();}

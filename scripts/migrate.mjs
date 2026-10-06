import {connect} from './turso-config.mjs';
import schemaModule from '../src/lib/server/turso-schema.ts';
const {initializeSchema,schemaVersion}=schemaModule;
const client=connect();
try{await initializeSchema(client);console.log('Turso: migration '+schemaVersion+' hoàn tất. Dữ liệu có sẵn được giữ lại.');}
catch{console.error('Không áp dụng được migration. Kiểm tra URL database, quyền ghi và thời hạn token.');process.exitCode=1;}
finally{client.close();}

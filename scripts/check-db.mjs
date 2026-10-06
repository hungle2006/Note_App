import {connect} from "./oracle-config.mjs";
const c=await connect();try{
 await c.execute("SELECT 1 FROM dual");
 const r=await c.execute("SELECT table_name FROM user_tables WHERE table_name IN ('APP_NOTES','APP_ATTEMPTS','APP_CHATS','APP_AI_USAGE')");
 const columns=await c.execute("SELECT column_name FROM user_tab_columns WHERE table_name='APP_NOTES' AND column_name IN ('GRADE','SEARCH_TEXT')");
 const migration=await c.execute("SELECT version FROM app_migrations WHERE version='002'");
 console.log("Oracle: "+r.rows.length+"/4 bảng; "+columns.rows.length+"/2 cột THCS; migration 002 "+(migration.rows.length?"đã áp dụng":"chưa áp dụng"));
 if(r.rows.length!==4||columns.rows.length!==2||!migration.rows.length)process.exitCode=1;
}finally{await c.close();}

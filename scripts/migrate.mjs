import {readFile} from "node:fs/promises";
import oracledb from "oracledb";
import {connect} from "./oracle-config.mjs";
const c=await connect();
const fold=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
try{
 try{await c.execute("CREATE TABLE app_migrations(version VARCHAR2(20) PRIMARY KEY,applied_at TIMESTAMP DEFAULT SYSTIMESTAMP)");}catch(e){if(e.errorNum!==955)throw e;}
 for(const [version,file] of [["001","001_initial.sql"],["002","002_thcs_retrieval.sql"]]){
  const done=await c.execute("SELECT version FROM app_migrations WHERE version=:version",{version});
  if(done.rows.length){console.log("Migration "+version+" đã áp dụng.");continue;}
  const sql=await readFile(new URL("../database/"+file,import.meta.url),"utf8");
  for(const statement of sql.replace(/^--.*$/gm,"").split(";").map(x=>x.trim()).filter(Boolean)){
   try{await c.execute(statement);}catch(e){if(![955,1430].includes(e.errorNum))throw e;}
  }
  if(version==="002"){
   const cursor=await c.execute("SELECT note_id,content_json FROM app_notes WHERE search_text IS NULL",{},{resultSet:true,outFormat:oracledb.OUT_FORMAT_OBJECT,fetchInfo:{CONTENT_JSON:{type:oracledb.STRING}}});
   try{let row;while((row=await cursor.resultSet.getRow())){
    const n=JSON.parse(row.CONTENT_JSON);
    const search=fold([n.title,n.subject,n.chapter,n.summary,...(n.tags||[]),n.content].join("\n"));
    const grade=[6,7,8,9].includes(n.grade)?n.grade:6;
    await c.execute("UPDATE app_notes SET search_text=:search,grade=:grade WHERE note_id=:id",{search:{val:search,type:oracledb.CLOB},grade,id:row.NOTE_ID});
   }}finally{await cursor.resultSet.close();}
   await c.commit();
  }
  await c.execute("INSERT INTO app_migrations(version) VALUES(:version)",{version},{autoCommit:true});
  console.log("Migration "+version+" hoàn tất.");
 }
}finally{await c.close();}

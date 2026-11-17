import {test} from "node:test";
import assert from "node:assert/strict";
import {createClient} from "@libsql/client";
import {initializeSchema} from "../src/lib/server/turso-schema";
import {forumRepository} from "../src/lib/server/forum";

async function setup(t:{after:(fn:()=>void)=>void}){
 const db=createClient({url:":memory:"});t.after(()=>db.close());
 await db.execute("PRAGMA foreign_keys=ON");
 await initializeSchema(db);await initializeSchema(db);
 return {db,forum:forumRepository(db)};
}
const post=(title="Vì sao hai phân số này bằng nhau?")=>({
 nickname:"Mây Nhỏ",subject:"Toán",title,body:"Mình đã thử quy đồng mẫu số nhưng chưa rõ bước này."
});
const rejectsCode=(code:string)=>(e:unknown)=>Boolean(e&&typeof e==="object"&&"code" in e&&e.code===code);

test("forum posts appear in recent and today's hot feed without exposing account IDs",async t=>{
 const {forum}=await setup(t);
 const a=await forum.create("uid-one",post());
 const b=await forum.create("uid-two",{...post(),nickname:"Ánh Sao",subject:"Khoa học",title:"Tại sao chúng ta thấy cầu vồng?"});
 const hot=await forum.list("reader");
 assert.equal(hot.posts.length,2);assert.equal(hot.today,2);
 assert.deepEqual(new Set(hot.posts.map(x=>x.id)),new Set([a.id,b.id]));
 assert.ok(hot.posts.every(x=>!x.mine));
 assert.equal(hot.posts[0].nickname,"Ánh Sao");
 assert.doesNotMatch(JSON.stringify(hot),/uid-one|uid-two/);
 assert.equal((await forum.list("uid-one",{sort:"mine"})).posts.length,1);
 assert.equal((await forum.list("reader",{sort:"new",subject:"Toán",q:"phân số"})).posts.length,1);
});

test("verified members can comment and like once; user can remove their own content",async t=>{
 const {forum}=await setup(t);
 const {id}=await forum.create("author",post());
 const response=await forum.action("helper",{type:"comment",postId:id,body:"Thử nhân cả tử và mẫu với cùng một số nhé.",nickname:"Hoa Nhỏ"});
 assert.ok("comment" in response);
 const thread=await forum.comments("author",id);
 assert.equal(thread.comments.length,1);assert.equal(thread.comments[0].mine,false);
 await forum.action("helper",{type:"like",postId:id,active:true});
 await forum.action("helper",{type:"like",postId:id,active:true});
 let feed=await forum.list("helper",{sort:"new"});
 assert.equal(feed.posts[0].likes,1);
 assert.equal(feed.posts[0].comments,1);
 assert.equal(feed.posts[0].liked,true);
 const commentId=thread.comments[0].id;
 await assert.rejects(forum.action("other",{type:"delete-comment",commentId}),rejectsCode("COMMENT_NOT_FOUND"));
 await forum.action("helper",{type:"delete-comment",commentId});
 assert.equal((await forum.comments("author",id)).comments.length,0);
 await assert.rejects(forum.action("helper",{type:"delete-post",postId:id}),rejectsCode("POST_NOT_FOUND"));
 await forum.action("author",{type:"delete-post",postId:id});
 assert.equal((await forum.list("author",{sort:"new"})).posts.length,0);
 await assert.rejects(forum.comments("helper",id),rejectsCode("POST_NOT_FOUND"));
});

test("unsafe public contact information and malformed nicknames are rejected",async t=>{
 const {forum}=await setup(t);
 await assert.rejects(forum.create("alice",{...post(),nickname:"alice@example.com"}),rejectsCode("INVALID_NICKNAME"));
 await assert.rejects(forum.create("alice",{...post(),body:"Mình không hiểu. Nhắn 0912345678 nhé."}),rejectsCode("PERSONAL_INFO"));
 await assert.rejects(forum.create("alice",{...post(),title:"http://example.org hướng dẫn"}),rejectsCode("PERSONAL_INFO"));
 await assert.rejects(forum.create("alice",{...post(),subject:"Ngoài chương trình"}),rejectsCode("INVALID_SUBJECT"));
});

test("reports from separate users hide a post; self-reports are rejected",async t=>{
 const {forum}=await setup(t);
 const {id}=await forum.create("author",post());
 await assert.rejects(forum.action("author",{type:"report",postId:id,reason:"other"}),rejectsCode("REPORT_SELF"));
 for(const who of ["first","second"]){
  await forum.action(who,{type:"report",postId:id,reason:"spam"});
  await forum.action(who,{type:"report",postId:id,reason:"spam"});
 }
 assert.equal((await forum.list("reader",{sort:"new"})).posts.length,1);
 await forum.action("third",{type:"report",postId:id,reason:"personal-info"});
 assert.equal((await forum.list("reader",{sort:"new"})).posts.length,0);
});

test("comment reports hide only the reported comment",async t=>{
 const {forum}=await setup(t);
 const {id}=await forum.create("author",post());
 const result=await forum.action("commenter",{type:"comment",postId:id,body:"Cách này làm theo từng bước sẽ dễ hiểu.",nickname:"Bạn Gió"});
 if(!("comment" in result)||!result.comment)throw new Error("Expected comment result");
 const commentId=result.comment.id;
 for(const reporter of ["one","two","three"])
  await forum.action(reporter,{type:"report",postId:id,commentId,reason:"other"});
 assert.equal((await forum.comments("author",id)).comments.length,0);
 const feed=await forum.list("author",{sort:"new"});
 assert.equal(feed.posts[0].comments,0);assert.equal(feed.posts.length,1);
});

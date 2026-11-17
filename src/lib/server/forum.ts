import type {Client} from "@libsql/client";
import {ApiError} from "./http";

export const forumSubjects=["Toán","Ngữ văn","Tiếng Anh","Khoa học","Lịch sử - Địa lí","Kỹ năng học tập","Khác"] as const;
export type ForumSubject=(typeof forumSubjects)[number];
export type ForumPost={
 id:string; nickname:string; subject:string; title:string; body:string; createdAt:string;
 comments:number; likes:number; liked:boolean; mine:boolean;
};
export type ForumComment={id:string;nickname:string;body:string;createdAt:string;mine:boolean};
type Action=
 | {type:"comment";postId:string;body:string;nickname:string}
 | {type:"like";postId:string;active:boolean}
 | {type:"delete-post";postId:string}
 | {type:"delete-comment";commentId:string}
 | {type:"report";postId:string;commentId?:string;reason:"spam"|"bullying"|"personal-info"|"other"};

function publicNickname(value:string){
 const name=value.trim().replace(/\s+/g," ");
 if(name.length<2||name.length>24||!(/^[\p{L}\p{N} ._-]+$/u.test(name))||
   /\d{7,}/.test(name)||/^\W+$/u.test(name))throw new ApiError(400,"INVALID_NICKNAME","Dùng biệt danh 2–24 ký tự, không dùng email hoặc số điện thoại.");
 return name;
}
function safeText(value:string,min:number,max:number,field:string){
 const text=value.trim().replace(/\r\n?/g,"\n");
 if(text.length<min||text.length>max)throw new ApiError(400,"INVALID_TEXT",field+" cần từ "+min+" đến "+max+" ký tự.");
 // The forum serves children. Keep contact details and outbound links off public posts.
 if(/(?:https?:\/\/|www\.)|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?84|0)[\s.-]?(?:\d[\s.-]?){9,10}/i.test(text))
  throw new ApiError(400,"PERSONAL_INFO","Không đăng đường dẫn, email hoặc số điện thoại lên diễn đàn.");
 return text;
}
function n(value:unknown){return Number(value||0);}
function s(value:unknown){return String(value??"");}

export function forumRepository(db:Client){
 async function activePost(postId:string){
  const r=await db.execute({sql:"SELECT id,author_id FROM app_forum_posts WHERE id=? AND deleted_at IS NULL AND hidden=0",args:[postId]});
  if(!r.rows.length)throw new ApiError(404,"POST_NOT_FOUND","Câu hỏi không còn hiển thị.");
  return r.rows[0];
 }
 async function throttle(table:"app_forum_posts"|"app_forum_comments",uid:string,limit:number){
  const r=await db.execute({sql:"SELECT COUNT(*) AS n FROM "+table+" WHERE author_id=? AND created_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-10 minutes')",args:[uid]});
  if(n(r.rows[0].n)>=limit)throw new ApiError(429,"SLOW_DOWN","Em đăng hơi nhanh. Hãy quay lại sau ít phút.");
 }
 return {
  async list(uid:string,{sort="hot",subject="",q="",offset=0}:{sort?:"hot"|"new"|"mine";subject?:string;q?:string;offset?:number}={}){
   const filters=["p.deleted_at IS NULL","p.hidden=0"],args:(string|number)[]=[];
   if(sort==="hot")filters.push("date(p.created_at,'+7 hours')=date('now','+7 hours')");
   if(sort==="mine"){filters.push("p.author_id=?");args.push(uid);}
   if(subject){filters.push("p.subject=?");args.push(subject);}
   if(q.trim()){filters.push("(p.title LIKE ? OR p.body LIKE ?)");args.push("%"+q.trim()+"%","%"+q.trim()+"%");}
   const scoring="(SELECT COUNT(*) FROM app_forum_comments c WHERE c.post_id=p.id AND c.deleted_at IS NULL AND c.hidden=0)*3+(SELECT COUNT(*) FROM app_forum_likes l WHERE l.post_id=p.id)*2";
   const order=sort==="hot"?scoring+" DESC,p.created_at DESC,p.id DESC":"p.created_at DESC,p.id DESC";
   const sql="SELECT p.id,p.nickname,p.subject,p.title,p.body,p.created_at,p.author_id,"+
    "(SELECT COUNT(*) FROM app_forum_comments c WHERE c.post_id=p.id AND c.deleted_at IS NULL AND c.hidden=0) AS comments,"+
    "(SELECT COUNT(*) FROM app_forum_likes l WHERE l.post_id=p.id) AS likes,"+
    "EXISTS(SELECT 1 FROM app_forum_likes l WHERE l.post_id=p.id AND l.user_id=?) AS liked "+
    "FROM app_forum_posts p WHERE "+filters.join(" AND ")+" ORDER BY "+order+" LIMIT 21 OFFSET ?";
   const result=await db.execute({sql,args:[uid,...args,offset]});
   const rows=result.rows.slice(0,20);
   const posts:ForumPost[]=rows.map(row=>({
    id:s(row.id),nickname:s(row.nickname),subject:s(row.subject),title:s(row.title),body:s(row.body),
    createdAt:s(row.created_at),comments:n(row.comments),likes:n(row.likes),
    liked:Boolean(row.liked),mine:s(row.author_id)===uid,
   }));
   const totals=await db.execute({sql:"SELECT COUNT(*) AS total, SUM(CASE WHEN date(created_at,'+7 hours')=date('now','+7 hours') THEN 1 ELSE 0 END) AS today FROM app_forum_posts WHERE deleted_at IS NULL AND hidden=0"});
   return {posts,nextOffset:result.rows.length>20?offset+20:null,total:n(totals.rows[0].total),today:n(totals.rows[0].today)};
  },
  async create(uid:string,{nickname,subject,title,body}:{nickname:string;subject:string;title:string;body:string}){
   const name=publicNickname(nickname),heading=safeText(title,8,160,"Tiêu đề"),detail=safeText(body,15,3000,"Nội dung");
   if(!forumSubjects.some(x=>x===subject))throw new ApiError(400,"INVALID_SUBJECT","Chọn môn học phù hợp.");
   await throttle("app_forum_posts",uid,5);
   const id=crypto.randomUUID();
   await db.execute({sql:"INSERT INTO app_forum_posts(id,author_id,nickname,subject,title,body) VALUES(?,?,?,?,?,?)",args:[id,uid,name,subject,heading,detail]});
   return {id};
  },
  async comments(uid:string,postId:string,offset=0){
   await activePost(postId);
   const result=await db.execute({sql:"SELECT id,nickname,body,created_at,author_id FROM app_forum_comments WHERE post_id=? AND deleted_at IS NULL AND hidden=0 ORDER BY created_at ASC,id ASC LIMIT 51 OFFSET ?",args:[postId,offset]});
   const comments:ForumComment[]=result.rows.slice(0,50).map(row=>({
    id:s(row.id),nickname:s(row.nickname),body:s(row.body),createdAt:s(row.created_at),mine:s(row.author_id)===uid,
   }));
   return {comments,nextOffset:result.rows.length>50?offset+50:null};
  },
  async action(uid:string,action:Action){
   if(action.type==="comment"){
    const name=publicNickname(action.nickname),body=safeText(action.body,2,1500,"Bình luận");
    await activePost(action.postId);await throttle("app_forum_comments",uid,30);
    const id=crypto.randomUUID();
    await db.execute({sql:"INSERT INTO app_forum_comments(id,post_id,author_id,nickname,body) VALUES(?,?,?,?,?)",args:[id,action.postId,uid,name,body]});
    const r=await db.execute({sql:"SELECT created_at FROM app_forum_comments WHERE id=?",args:[id]});
    return {comment:{id,nickname:name,body,createdAt:s(r.rows[0]?.created_at),mine:true}};
   }
   if(action.type==="like"){
    await activePost(action.postId);
    if(action.active)await db.execute({sql:"INSERT INTO app_forum_likes(post_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING",args:[action.postId,uid]});
    else await db.execute({sql:"DELETE FROM app_forum_likes WHERE post_id=? AND user_id=?",args:[action.postId,uid]});
    const r=await db.execute({sql:"SELECT COUNT(*) AS n FROM app_forum_likes WHERE post_id=?",args:[action.postId]});
    return {likes:n(r.rows[0].n),liked:action.active};
   }
   if(action.type==="delete-post"){
    const r=await db.execute({sql:"UPDATE app_forum_posts SET deleted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND author_id=? AND deleted_at IS NULL",args:[action.postId,uid]});
    if(!r.rowsAffected)throw new ApiError(404,"POST_NOT_FOUND","Không thể xóa câu hỏi này.");
    return {deleted:true};
   }
   if(action.type==="delete-comment"){
    const r=await db.execute({sql:"UPDATE app_forum_comments SET deleted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND author_id=? AND deleted_at IS NULL",args:[action.commentId,uid]});
    if(!r.rowsAffected)throw new ApiError(404,"COMMENT_NOT_FOUND","Không thể xóa bình luận này.");
    return {deleted:true};
   }
   const post=await activePost(action.postId);
   const commentId=action.commentId||"";
   if(!commentId&&s(post.author_id)===uid)throw new ApiError(400,"REPORT_SELF","Em có thể xóa bài của mình.");
   if(commentId){
    const c=await db.execute({sql:"SELECT author_id FROM app_forum_comments WHERE id=? AND post_id=? AND deleted_at IS NULL AND hidden=0",args:[commentId,action.postId]});
    if(!c.rows.length)throw new ApiError(404,"COMMENT_NOT_FOUND","Không tìm thấy bình luận.");
    if(s(c.rows[0].author_id)===uid)throw new ApiError(400,"REPORT_SELF","Em có thể xóa bình luận của mình.");
   }
   await db.execute({sql:"INSERT INTO app_forum_reports(post_id,comment_id,reporter_id,reason) VALUES(?,?,?,?) ON CONFLICT DO NOTHING",args:[action.postId,commentId,uid,action.reason]});
   const reports=await db.execute({sql:"SELECT COUNT(*) AS n FROM app_forum_reports WHERE post_id=? AND comment_id=?",args:[action.postId,commentId]});
   if(n(reports.rows[0].n)>=3){
    if(commentId)await db.execute({sql:"UPDATE app_forum_comments SET hidden=1 WHERE id=? AND post_id=?",args:[commentId,action.postId]});
    else await db.execute({sql:"UPDATE app_forum_posts SET hidden=1 WHERE id=?",args:[action.postId]});
   }
   return {reported:true};
  },
 };
}

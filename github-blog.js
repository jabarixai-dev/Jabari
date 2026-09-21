// Shared GitHub Blog helpers are intentionally kept in this file so the
// public site can read blog/posts.json directly from GitHub while only admin
// writes use a Netlify Function.
const https = require('https');

function cfg(){
  return {
    owner: process.env.GITHUB_OWNER || 'jabarixai-dev',
    repo: process.env.GITHUB_REPO || 'Jabari',
    branch: process.env.GITHUB_BRANCH || 'main',
    token: process.env.GITHUB_TOKEN || ''
  };
}

function request(path, method, token, body){
  return new Promise((resolve,reject)=>{
    const raw = body ? JSON.stringify(body) : '';
    const req = https.request({
      hostname:'api.github.com', path, method,
      headers:{
        Authorization:`Bearer ${token}`,
        Accept:'application/vnd.github+json',
        'User-Agent':'Jabari-Website',
        'X-GitHub-Api-Version':'2022-11-28',
        'Content-Type':'application/json',
        'Content-Length':Buffer.byteLength(raw)
      }
    },res=>{
      let data='';
      res.on('data',c=>data+=c);
      res.on('end',()=>resolve({status:res.statusCode,body:data}));
    });
    req.on('error',reject);
    if(raw) req.write(raw);
    req.end();
  });
}

async function getPosts(){
  const c=cfg();
  if(!c.token) throw new Error('GitHub blog storage is not configured yet');
  const path=`/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/blog/posts.json?ref=${encodeURIComponent(c.branch)}`;
  const r=await request(path,'GET',c.token);
  if(r.status===404) return {posts:[],sha:null};
  if(r.status!==200) throw new Error('Could not read the blog file from GitHub');
  const j=JSON.parse(r.body||'{}');
  const text=Buffer.from(String(j.content||'').replace(/\n/g,''),'base64').toString('utf8');
  let posts=[];
  try { posts=JSON.parse(text||'[]'); } catch(_){ throw new Error('The GitHub blog file contains invalid JSON'); }
  if(!Array.isArray(posts)) throw new Error('The GitHub blog file must contain an array');
  return {posts,sha:j.sha||null};
}

async function savePosts(posts,sha,message){
  const c=cfg();
  const path=`/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/blog/posts.json`;
  const body={message,content:Buffer.from(JSON.stringify(posts,null,2)+'\n','utf8').toString('base64'),branch:c.branch};
  if(sha) body.sha=sha;
  const r=await request(path,'PUT',c.token,body);
  if(r.status<200||r.status>=300){
    let detail=''; try{detail=(JSON.parse(r.body||'{}').message||'').trim();}catch(_){ }
    throw new Error(detail||'GitHub could not save the blog');
  }
  return JSON.parse(r.body||'{}');
}

module.exports={cfg,getPosts,savePosts};

// GitHub-backed Reviews API.
// Public reviews are stored in reviews/reviews.json. Admin actions use BLOG_PASSCODE.
const https = require('https');

const OWNER = process.env.GITHUB_OWNER || 'jabarixai-dev';
const REPO = process.env.GITHUB_REPO || 'Jabari';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const REVIEWS_PATH = 'reviews/reviews.json';

function json(statusCode, body){
  return {statusCode, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body:JSON.stringify(body)};
}
function request(hostname, method, path, token, body){
  return new Promise((resolve,reject)=>{
    const payload = body == null ? null : JSON.stringify(body);
    const req=https.request({hostname,path,method,headers:{'User-Agent':'Jabari-Reviews','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:`Bearer ${token}`} : {}),...(payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{})}},res=>{
      let data=''; res.on('data',c=>data+=c); res.on('end',()=>{let parsed={}; try{parsed=data?JSON.parse(data):{};}catch(_){parsed={};} resolve({status:res.statusCode,body:parsed});});
    });
    req.on('error',reject); if(payload) req.write(payload); req.end();
  });
}
async function github(method,path,token,body){
  const r=await request('api.github.com',method,path,token,body);
  if(r.status<200||r.status>=300) throw new Error(r.body?.message||`GitHub returned HTTP ${r.status}`);
  return r.body;
}
async function readReviews(token){
  try{
    const r=await github('GET',`/repos/${OWNER}/${REPO}/contents/${REVIEWS_PATH}?ref=${encodeURIComponent(BRANCH)}`,token);
    const raw=Buffer.from(String(r.content||'').replace(/\n/g,''),'base64').toString('utf8');
    const reviews=JSON.parse(raw||'[]');
    return {reviews:Array.isArray(reviews)?reviews:[],sha:r.sha};
  }catch(err){
    if(String(err.message||'').includes('Not Found')) return {reviews:[],sha:null};
    throw err;
  }
}
async function saveReviews(reviews,sha,token,message){
  const body={message,content:Buffer.from(JSON.stringify(reviews,null,2)+'\n','utf8').toString('base64'),branch:BRANCH};
  if(sha) body.sha=sha;
  return github('PUT',`/repos/${OWNER}/${REPO}/contents/${REVIEWS_PATH}`,token,body);
}
function cleanText(v,max){ return String(v??'').trim().slice(0,max); }

exports.handler=async event=>{
  const body=event.body?(()=>{try{return JSON.parse(event.body);}catch(_){return {};}})():{};
  const token=process.env.GITHUB_TOKEN;
  if(!token) return json(500,{error:'GitHub is not configured.'});
  try{
    const current=await readReviews(token);

    // Public: submit a new review. No admin passcode is needed.
    if(event.httpMethod==='POST' && body.action==='create'){
      if(body.botField) return json(200,{ok:true});
      const name=cleanText(body.name,100);
      const message=cleanText(body.message,2000);
      const rating=Number(body.rating);
      if(!name||!message||![1,2,3,4,5].includes(rating)) return json(400,{error:'Please provide a name, rating and review.'});
      const review={
        id:'review-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
        name,rating,message,status:'approved',reply:'',replyAuthor:'Jabari',replyUpdatedAt:'',
        createdAt:new Date().toISOString()
      };
      current.reviews.unshift(review);
      await saveReviews(current.reviews,current.sha,token,`Add review ${review.id}`);
      return json(200,{ok:true,review});
    }

    const passcode=body.passcode||event.queryStringParameters?.passcode||'';
    const expected=process.env.BLOG_PASSCODE;
    if(!expected||passcode!==expected) return json(401,{error:'Incorrect passcode.'});

    if(event.httpMethod==='GET') return json(200,{items:current.reviews});
    if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed.'});

    const action=body.action; const id=String(body.id||'').trim();
    if(!id) return json(400,{error:'Missing review ID.'});
    const idx=current.reviews.findIndex(x=>x.id===id);
    if(idx<0) return json(404,{error:'Review not found.'});

    if(action==='delete') current.reviews.splice(idx,1);
    else if(action==='hide') current.reviews[idx].status='hidden';
    else if(action==='approve') current.reviews[idx].status='approved';
    else if(action==='reply'){
      const text=cleanText(body.reply,2000); if(!text) return json(400,{error:'Reply cannot be empty.'});
      current.reviews[idx].reply=text; current.reviews[idx].replyAuthor='Jabari'; current.reviews[idx].replyUpdatedAt=new Date().toISOString();
    } else if(action==='delete-reply'){
      current.reviews[idx].reply=''; current.reviews[idx].replyUpdatedAt='';
    } else return json(400,{error:'Unknown action.'});

    await saveReviews(current.reviews,current.sha,token,`Reviews: ${action} ${id}`);
    return json(200,{ok:true,items:current.reviews});
  }catch(err){ return json(500,{error:err.message||'Could not manage reviews.'}); }
};

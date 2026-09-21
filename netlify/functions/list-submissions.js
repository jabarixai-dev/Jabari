// Reviews remain on Netlify Forms. Blog posts are now stored in GitHub so
// normal visitors do not need a Netlify Function just to read the Blog.
const https=require('https');
const {getPosts}=require('../lib/github-blog');

function apiGet(path,token){return new Promise((resolve,reject)=>{
  const req=https.request({hostname:'api.netlify.com',path,method:'GET',headers:{Authorization:`Bearer ${token}`}},res=>{
    let data='';res.on('data',c=>data+=c);res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(data||'[]')});}catch(_){reject(new Error('Could not parse Netlify API response'));}});
  });req.on('error',reject);req.end();
});}

exports.handler=async event=>{
  const form=(event.queryStringParameters||{}).form;
  if(form==='blog-posts'){
    try{
      const {posts}=await getPosts();
      const items=posts.map(p=>({id:p.id,data:{title:p.title||'',content:p.content||'',image:p.image||'',video:p.video||'','post-date':p.date||''},created_at:p.updatedAt||p.date||''}));
      return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({items})};
    }catch(err){return {statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:err.message||'Could not load blog posts'})};}
  }
  if(form!=='reviews') return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Invalid or missing form parameter'})};
  const token=process.env.NETLIFY_ACCESS_TOKEN,siteId=process.env.NETLIFY_SITE_ID;
  if(!token||!siteId) return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({items:[],notConfigured:true})};
  try{
    const formsRes=await apiGet(`/api/v1/sites/${siteId}/forms`,token);
    if(formsRes.status!==200) return {statusCode:502,body:JSON.stringify({error:'Could not list forms'})};
    const f=(formsRes.body||[]).find(x=>x.name==='reviews');
    if(!f) return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({items:[]})};
    const subs=await apiGet(`/api/v1/forms/${f.id}/submissions`,token);
    if(subs.status!==200) return {statusCode:502,body:JSON.stringify({error:'Could not fetch submissions'})};
    const items=(subs.body||[]).map(s=>({id:s.id,data:s.data||{},created_at:s.created_at})).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({items})};
  }catch(_){return {statusCode:500,body:JSON.stringify({error:'Unexpected error'})};}
};

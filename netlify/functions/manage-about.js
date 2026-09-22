const https = require('https');

const OWNER = process.env.GITHUB_OWNER || 'jabarixai-dev';
const REPO = process.env.GITHUB_REPO || 'Jabari';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const PATH = 'about/content.json';

function githubRequest(method, path, body, token){
  return new Promise((resolve,reject)=>{
    const req=https.request({hostname:'api.github.com',path,method,headers:{
      'User-Agent':'Jabari-About-Manager','Accept':'application/vnd.github+json','Authorization':`Bearer ${token}`,
      'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'
    }},res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>{let json;try{json=JSON.parse(data)}catch(e){json={raw:data}};resolve({status:res.statusCode,data:json})})});
    req.on('error',reject); if(body) req.write(JSON.stringify(body)); req.end();
  });
}

function response(status, body){return {statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)}}

exports.handler=async(event)=>{
  const pass=(event.queryStringParameters||{}).passcode || (()=>{try{return JSON.parse(event.body||'{}').passcode||''}catch(e){return ''}})();
  if(!pass || pass !== process.env.BLOG_PASSCODE) return response(401,{error:'Incorrect passcode.'});
  const token=process.env.GITHUB_TOKEN;
  if(!token) return response(500,{error:'GITHUB_TOKEN is not configured.'});
  const apiPath=`/repos/${OWNER}/${REPO}/contents/${PATH}?ref=${encodeURIComponent(BRANCH)}`;
  try{
    const current=await githubRequest('GET',apiPath,null,token);
    if(event.httpMethod==='GET'){
      if(current.status===404) return response(200,{bio:"I'm Jabari. I create professional digital experiences through website design, graphics design and technology, helping businesses, organizations and individuals present their work clearly and professionally.",services:[
        {title:'Website Design',description:'Professional, responsive websites for businesses, schools, organizations, portfolios and personal brands.'},
        {title:'Graphics Design',description:'Visual identities, promotional materials, social media graphics and product designs that help brands communicate clearly.'},
        {title:'Computer Scientist',description:'Technology-driven solutions, software concepts and AI-assisted digital projects.'}
      ]});
      if(current.status!==200) return response(502,{error:'Could not read About content from GitHub.'});
      const decoded=Buffer.from(current.data.content,'base64').toString('utf8');
      return response(200,JSON.parse(decoded));
    }
    if(event.httpMethod!=='POST') return response(405,{error:'Method not allowed.'});
    const body=JSON.parse(event.body||'{}');
    if(body.action!=='save' || !body.data) return response(400,{error:'Invalid save request.'});
    const data={bio:String(body.data.bio||''),services:Array.isArray(body.data.services)?body.data.services.slice(0,3).map(x=>({title:String(x.title||''),description:String(x.description||'')})):[]};
    if(!data.bio || data.services.length!==3 || data.services.some(x=>!x.title||!x.description)) return response(400,{error:'Bio and all three services are required.'});
    const content=Buffer.from(JSON.stringify(data,null,2)+'\n').toString('base64');
    const payload={message:'Update About content',content,branch:BRANCH};
    if(current.status===200 && current.data.sha) payload.sha=current.data.sha;
    const result=await githubRequest('PUT',`/repos/${OWNER}/${REPO}/contents/${PATH}`,payload,token);
    if(result.status<200 || result.status>=300) return response(result.status===409?409:502,{error:'Could not save About content to GitHub.'});
    return response(200,{ok:true});
  }catch(err){return response(500,{error:'About manager failed.'})}
};

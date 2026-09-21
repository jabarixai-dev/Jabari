// netlify/functions/list-submissions.js
// Public read endpoint for Reviews and GitHub-backed Blog posts.

const https = require('https');
const { getPosts } = require('./lib/github-blog');

function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.netlify.com',
      path,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data || '[]') }); }
        catch (_) { reject(new Error('Could not parse Netlify API response')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function rawGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else if (res.statusCode === 404) resolve('{}');
        else reject(new Error(`GitHub returned HTTP ${res.statusCode}`));
      });
    }).on('error', reject);
  });
}

exports.handler = async event => {
  const form = (event.queryStringParameters || {}).form;

  if(form === 'blog-posts'){
    try{
      const { posts } = await getPosts();
      const items = posts.map(p => ({
        id: p.id,
        data: {
          title: p.title || '',
          content: p.content || '',
          image: p.image || '',
          video: p.video || '',
          'post-date': p.date || ''
        },
        created_at: p.updatedAt || p.date || ''
      }));
      return {
        statusCode: 200,
        headers: {'Content-Type':'application/json','Cache-Control':'no-store'},
        body: JSON.stringify({items})
      };
    }catch(err){
      return {statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:err.message||'Could not load blog posts'})};
    }
  }

  if(form !== 'reviews'){
    return {statusCode:400,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Invalid or missing form parameter'})};
  }

  const token = process.env.NETLIFY_ACCESS_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  if(!token || !siteId){
    return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({items:[],notConfigured:true})};
  }

  try{
    const formsRes = await apiGet(`/api/v1/sites/${siteId}/forms`, token);
    if(formsRes.status !== 200) return {statusCode:502,body:JSON.stringify({error:'Could not list forms'})};

    const formInfo = (formsRes.body || []).find(x => x.name === 'reviews');
    if(!formInfo) return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({items:[]})};

    const subs = await apiGet(`/api/v1/forms/${formInfo.id}/submissions`, token);
    if(subs.status !== 200) return {statusCode:502,body:JSON.stringify({error:'Could not fetch submissions'})};

    const owner = process.env.GITHUB_OWNER || 'jabarixai-dev';
    const repo = process.env.GITHUB_REPO || 'Jabari';
    const branch = process.env.GITHUB_BRANCH || 'main';
    let replies = {};
    try{
      const raw = await rawGet(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/reviews/replies.json?v=${Date.now()}`);
      const parsed = JSON.parse(raw || '{}');
      if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)) replies = parsed;
    }catch(_){ /* Replies are optional. */ }

    const items = (subs.body || [])
      .map(s => ({
        id: s.id,
        data: s.data || {},
        created_at: s.created_at,
        reply: replies[s.id]?.text || '',
        replyAuthor: replies[s.id]?.author || 'Jabari'
      }))
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({items})};
  }catch(_){
    return {statusCode:500,body:JSON.stringify({error:'Unexpected error'})};
  }
};

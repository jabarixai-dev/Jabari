// Deletes a normal Blog post from GitHub: blog/posts.json.
// Required: BLOG_PASSCODE, GITHUB_TOKEN.
const {getPosts,savePosts}=require('./lib/github-blog');

exports.handler=async event=>{
  if(event.httpMethod!=='POST') return {statusCode:405,body:'Method not allowed'};
  let p; try{p=JSON.parse(event.body||'{}');}catch(_){return {statusCode:400,body:'Invalid JSON'};}
  if(!process.env.BLOG_PASSCODE) return {statusCode:500,body:'Blog passcode is not configured on the server yet'};
  if(!p.passcode||p.passcode!==process.env.BLOG_PASSCODE) return {statusCode:401,body:'Incorrect passcode'};
  const id=String(p.postId||p.submissionId||'').trim();
  if(!id) return {statusCode:400,body:'Post ID is required'};
  try{
    const current=await getPosts();
    const found=current.posts.find(x=>String(x.id)===id);
    if(!found) return {statusCode:404,body:'Post not found'};
    const posts=current.posts.filter(x=>String(x.id)!==id);
    await savePosts(posts,current.sha,'Delete blog post: '+String(found.title||id));
    return {statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({ok:true})};
  }catch(err){return {statusCode:500,body:err.message||'Unexpected error deleting post'};}
};

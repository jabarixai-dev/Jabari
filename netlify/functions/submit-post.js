// Creates or edits a normal Blog post in GitHub: blog/posts.json.
// Required: BLOG_PASSCODE, GITHUB_TOKEN. Optional: GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH.
const {getPosts,savePosts}=require('./lib/github-blog');

exports.handler=async event=>{
  if(event.httpMethod!=='POST') return {statusCode:405,body:'Method not allowed'};
  let p;
  try{p=JSON.parse(event.body||'{}');}catch(_){return {statusCode:400,body:'Invalid JSON'};}
  if(!process.env.BLOG_PASSCODE) return {statusCode:500,body:'Blog passcode is not configured on the server yet'};
  if(!p.passcode||p.passcode!==process.env.BLOG_PASSCODE) return {statusCode:401,body:'Incorrect passcode'};
  if(!p.title||!p.content) return {statusCode:400,body:'Title and content are required'};

  try{
    const current=await getPosts();
    const posts=current.posts;
    const id=String(p.postId||p.submissionId||'').trim();
    const index=posts.findIndex(x=>String(x.id)===id);
    const now=new Date();
    let publishedAt=new Date(now);

    if(index>=0){
      const existing=posts[index]||{};
      const supplied=String(p.date||'').trim();

      // Preserve an existing real publish timestamp when editing.
      if(existing.date && /T|\\d{2}:\\d{2}/.test(String(existing.date))){
        publishedAt=new Date(existing.date);
      }else if(existing.updatedAt){
        publishedAt=new Date(existing.updatedAt);
      }

      // If the calendar date is changed, preserve the existing WAT clock time.
      if(supplied && /^\\d{4}-\\d{2}-\\d{2}$/.test(supplied)){
        const base=new Date(existing.date||existing.updatedAt||now);
        const parts=new Intl.DateTimeFormat('en-CA',{
          timeZone:'Africa/Lagos',
          hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'
        }).formatToParts(base).reduce((o,x)=>(o[x.type]=x.value,o),{});
        const hh=Number(parts.hour)||0, mm=Number(parts.minute)||0, ss=Number(parts.second)||0;
        publishedAt=new Date(Date.parse(
          `${supplied}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}+01:00`
        ));
      }
    }

    const post={
      id:id||`post-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      title:String(p.title).trim(),
      content:String(p.content),
      image:String(p.imageUrl||''),
      video:String(p.videoUrl||''),
      date:publishedAt.toISOString(),
      updatedAt:now.toISOString(),
      articleType:String(p.articleType||'news').trim().toLowerCase()
    };
    if(index>=0) posts[index]=post; else posts.unshift(post);
    posts.sort((a,b)=>new Date(b.updatedAt||b.date||0)-new Date(a.updatedAt||a.date||0));
    await savePosts(posts,current.sha,index>=0?'Update blog post: '+post.title:'Publish blog post: '+post.title);
    return {statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({ok:true,id:post.id})};
  }catch(err){
    return {statusCode:500,body:err.message||'Unexpected error saving post'};
  }
};

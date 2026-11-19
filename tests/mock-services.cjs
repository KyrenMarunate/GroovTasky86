// Test-only fetch interceptor. Never load in production.
const originalFetch=global.fetch;
let workspace=null;
let geminiCount=0;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
global.fetch=async function(input,init={}){
 const url=new URL(typeof input==='string'?input:input.url);
 if(url.hostname==='mock.supabase.co'){
  const headers=new Headers(init.headers||{});const token=headers.get('authorization');
  if(token!=='Bearer test-user-token')return json({message:'Invalid JWT'},401);
  if(url.pathname==='/auth/v1/user')return json({id:'12345678-1234-1234-1234-123456789abc',email:'tester@example.com',aud:'authenticated',role:'authenticated'});
  if(url.pathname==='/rest/v1/groov_workspaces'){
   const method=init.method||'GET';
   if(method==='GET')return json(workspace?[workspace]:[]);
   const data=JSON.parse(init.body||'{}');
   if(method==='POST'){if(workspace)return json({code:'23505',message:'duplicate'},409);workspace=data;return json({revision:workspace.revision},201)}
   if(method==='PATCH'){const rev=Number((url.searchParams.get('revision')||'').replace('eq.',''));if(!workspace||workspace.revision!==rev)return json({code:'PGRST116',details:'The result contains 0 rows',message:'JSON object requested, multiple (or no) rows returned'},406);workspace={...workspace,...data};return json({revision:workspace.revision})}
  }
  return json({message:'Unknown mock request'},404);
 }
 if(url.hostname==='generativelanguage.googleapis.com'){
  const body=JSON.parse(init.body||'{}');const prompt=body.contents[0].parts[0].text;if(prompt.includes('__force_404__'))return json({error:{code:404,message:'Model unavailable'}},404);if(prompt.includes('__force_503_all__')||(prompt.includes('__force_503_primary__')&&url.pathname.includes('gemini-3.8-flash')))return json({error:{code:503,message:'Model overloaded'}},503);let answer;
  if(prompt.startsWith('Parse '))answer={tasks:[{title:prompt.includes('__count_prompt__')?`Gemini invocation ${++geminiCount}`:'Gemini parsed task',duration:90,priority:'High'}]};
  else if(prompt.startsWith('You are a scheduling'))answer={order:['b','a']};
  else answer={reply:'Your saved task is ready to review.',suggestReplan:true};
  return json({candidates:[{content:{parts:[{text:JSON.stringify(answer)}]}}]});
 }
 return originalFetch(input,init);
};

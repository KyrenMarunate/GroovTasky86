import { NextResponse } from 'next/server';
import { authenticatedClient } from '@/lib/server-supabase';
import { workspaceSchema } from '@/lib/workspace';
import { z } from 'zod';
const bodySchema=z.object({revision:z.number().int().min(0),payload:workspaceSchema});
export async function GET(req:Request){
  const auth=await authenticatedClient(req); if(!auth)return NextResponse.json({error:'Please sign in to access cloud storage.'},{status:401});
  const {data,error}=await auth.client.from('groov_workspaces').select('revision,payload,updated_at').eq('user_id',auth.user.id).maybeSingle();
  if(error){console.error('Supabase workspace read failed',error.message);return NextResponse.json({error:'Could not load your workspace. Check your Supabase table and RLS setup.'},{status:503});}
  if(data){const parsed=workspaceSchema.safeParse(data.payload);if(!parsed.success)return NextResponse.json({error:'Saved workspace has invalid data. It was not overwritten.'},{status:422});return NextResponse.json({...data,payload:parsed.data},{headers:{'Cache-Control':'no-store'}})}
  return NextResponse.json(null,{headers:{'Cache-Control':'no-store'}});
}
export async function PUT(req:Request){
  const auth=await authenticatedClient(req); if(!auth)return NextResponse.json({error:'Please sign in to access cloud storage.'},{status:401});
  try{
    const {revision,payload}=bodySchema.parse(await req.json());
    if(JSON.stringify(payload).length>1_000_000)return NextResponse.json({error:'Workspace is too large.'},{status:413});
    if(revision===0){
      const {data,error}=await auth.client.from('groov_workspaces').insert({user_id:auth.user.id,revision:1,payload,updated_at:new Date().toISOString()}).select('revision').single();
      if(error?.code==='23505')return NextResponse.json({error:'This workspace changed on another device. Reload before saving.'},{status:409});
      if(error)throw error;
      return NextResponse.json(data);
    }
    const {data,error}=await auth.client.from('groov_workspaces').update({revision:revision+1,payload,updated_at:new Date().toISOString()}).eq('user_id',auth.user.id).eq('revision',revision).select('revision').maybeSingle();
    if(error)throw error;
    if(!data)return NextResponse.json({error:'This workspace changed on another device. Reload before saving.'},{status:409});
    return NextResponse.json(data);
  }catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:'Invalid workspace data.'},{status:400}); console.error('Supabase workspace save failed',error);return NextResponse.json({error:'Could not save to Supabase. Check your table and RLS setup.'},{status:503});}
}

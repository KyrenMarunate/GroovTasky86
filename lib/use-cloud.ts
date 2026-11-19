'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { browserSupabase } from './supabase';
import type { Task, Prefs, Plan } from './types';
export type Snapshot={tasks:Task[];prefs:Prefs;plans:Plan[];current:Plan|null;sound:boolean};
type Status='demo'|'loading'|'synced'|'saving'|'unsaved'|'conflict'|'error';
export function useCloud(snapshot:Snapshot, initialReady:boolean, onLoad:(s:Snapshot)=>void, onGuest:()=>void){
 const [userEmail,setUserEmail]=useState(''); const [status,setStatus]=useState<Status>('demo');const [error,setError]=useState(''); const [cloudReady,setCloudReady]=useState(false);
 const sessionRef=useRef<Session|null>(null);const snapshotRef=useRef(snapshot);snapshotRef.current=snapshot;const loadRef=useRef(onLoad);loadRef.current=onLoad;const guestRef=useRef(onGuest);guestRef.current=onGuest;
 const revision=useRef(0);const saved=useRef('');const pending=useRef<Promise<boolean>|null>(null);const blocked=useRef(false);const generation=useRef(0);const readyRef=useRef(false);
 const accessToken=()=>sessionRef.current?.access_token||'';
 const loadSession=useCallback(async(session:Session|null,force=false)=>{
  const old=sessionRef.current?.user.id;sessionRef.current=session;
  if(!session){generation.current++;readyRef.current=false;setCloudReady(false);setUserEmail('');setStatus('demo');setError('');blocked.current=false;if(old)guestRef.current();return;}
  setUserEmail(session.user.email||'Signed in');if(old===session.user.id&&!force)return;
  const generationId=++generation.current;readyRef.current=false;setCloudReady(false);setStatus('loading');setError('');blocked.current=false;
  try{const r=await fetch('/api/storage',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not load cloud workspace');if(generationId!==generation.current)return;
    if(d){revision.current=d.revision;saved.current=JSON.stringify(d.payload);loadRef.current(d.payload);setStatus('synced')}
    else{revision.current=0;saved.current='';setStatus('unsaved')}
    readyRef.current=true;setCloudReady(true);
  }catch(e){if(generationId!==generation.current)return;setStatus('error');setError(e instanceof Error?e.message:'Cloud unavailable');}
 },[]);
 useEffect(()=>{if(!initialReady)return;const client=browserSupabase();if(!client)return;let alive=true;
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(alive)setTimeout(()=>{if(alive)void loadSession(session)},0)});
  return()=>{alive=false;subscription.unsubscribe()};
 },[initialReady,loadSession]);
 const flush=useCallback(async():Promise<boolean>=>{
  if(!readyRef.current||!sessionRef.current||blocked.current)return false;
  if(pending.current){const ok=await pending.current;if(!ok)return false;if(JSON.stringify(snapshotRef.current)===saved.current)return true;return flush()}
  const value=snapshotRef.current;const signature=JSON.stringify(value);if(signature===saved.current){setStatus('synced');return true}
  const activeUser=sessionRef.current.user.id;const rev=revision.current;const token=sessionRef.current.access_token;setStatus('saving');setError('');
  const work=(async()=>{try{const r=await fetch('/api/storage',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({revision:rev,payload:value})});const d=await r.json();if(!r.ok){if(r.status===409){blocked.current=true;setStatus('conflict')}else setStatus('error');setError(d.error||'Could not save');return false}if(sessionRef.current?.user.id!==activeUser)return false;revision.current=d.revision;saved.current=signature;setStatus('synced');return true}catch{setStatus('error');setError('Could not reach cloud storage. Your changes remain in this tab.');return false}})();pending.current=work;const ok=await work;pending.current=null;if(ok&&JSON.stringify(snapshotRef.current)!==saved.current)return flush();return ok;
 },[]);
 const signature=JSON.stringify(snapshot);
 useEffect(()=>{if(!cloudReady||!userEmail||blocked.current)return;if(signature===saved.current)return;setStatus('unsaved');const timer=setTimeout(()=>void flush(),700);return()=>clearTimeout(timer)},[signature,cloudReady,userEmail,flush]);
 const reload=useCallback(async()=>{if(sessionRef.current)await loadSession(sessionRef.current,true)},[loadSession]);
 const signOut=async()=>{const client=browserSupabase();if(client)await client.auth.signOut()};
 return {configured:!!browserSupabase(),userEmail,status,error,accessToken,flush,reload,signOut,cloudReady};
}

/* KITTO v4: small, local-only cross-page preferences. No file content is stored. */
(function(root){
  'use strict';
  const KEY='kitto-preferences-v4';
  const defaults=Object.freeze({ concurrency:'auto', quality:85, zipMode:'auto', reduceMotion:false, preserveSettings:true });
  const listeners=new Set();
  function sanitize(source){
    const input=source&&typeof source==='object'?source:{};
    return {
      concurrency:['auto','1','2','3'].includes(String(input.concurrency))?String(input.concurrency):'auto',
      quality:[60,70,75,80,85,90,95,100].includes(Number(input.quality))?Number(input.quality):85,
      zipMode:['auto','zip','individual'].includes(String(input.zipMode))?String(input.zipMode):'auto',
      reduceMotion:input.reduceMotion===true,
      preserveSettings:input.preserveSettings!==false
    };
  }
  let values={...defaults};
  try{values=sanitize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){values={...defaults};}
  function applyMotion(){
    const el=root.document?.documentElement;
    if(el)el.classList.toggle('kitto-reduced-motion',values.reduceMotion);
  }
  function emit(){applyMotion();for(const callback of [...listeners]){try{callback({...values});}catch(error){console.warn('[KITTO] Settings listener failed',error);}}}
  function save(partial){values=sanitize({...values,...partial});try{localStorage.setItem(KEY,JSON.stringify(values));}catch(_){ /* Private browsing: in-memory settings still work. */ }emit();return {...values};}
  const api={KEY,defaults,get:()=>({...values}),set:save,onChange(callback){listeners.add(callback);return ()=>listeners.delete(callback);},reset(){return save({...defaults});},
    effectiveConcurrency(deviceMemory,width){
      if(values.concurrency!=='auto')return Number(values.concurrency);
      return (Number(deviceMemory)>0&&deviceMemory<4)||Number(width)<700?1:2;
    }};
  root.KittoSettings=api;
  if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',applyMotion,{once:true});else applyMotion();}
})(typeof window!=='undefined'?window:globalThis);

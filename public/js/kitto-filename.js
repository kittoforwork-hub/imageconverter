/* Deterministic and safe output naming, shared with Workflow UI and regression tests. */
(function(root){
  'use strict';
  function clean(value){
    const out=String(value??'').normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,'_')
      .replace(/[. ]+$/g,'').trim().slice(0,100);
    return out && !/^\.{1,2}$/.test(out)?out:'kitto';
  }
  function basename(filename){return clean(String(filename).replace(/\.[^.]+$/,''));}
  function render(template,source,index,options={}){
    const digits=Math.max(1,Math.min(6,Number(options.digits)||3));
    const first = Number(options.start ?? 1);
    const start = Number.isFinite(first) && options.start !== '' ? Math.max(0, Math.min(999999, Math.trunc(first))) : 1;
    const today=options.date||new Date();
    const date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('');
    const tokens={name:basename(source),n:String(start+index).padStart(digits,'0'),date};
    const pattern=String(template||'{name}-kitto').slice(0,120);
    const raw=pattern.replace(/\{(name|n|date)\}/g,(_,key)=>tokens[key]);
    return clean(raw);
  }
  function uniqueNames(items, ext){
    const used=new Set();
    return items.map(({template,source,index,options})=>{
      const base=render(template,source,index,options);let candidate=base+'.'+ext;let n=2;
      while(used.has(candidate.toLocaleLowerCase()))candidate=`${base} (${n++}).${ext}`;
      used.add(candidate.toLocaleLowerCase());return candidate;
    });
  }
  root.KittoFileName={clean,basename,render,uniqueNames};
})(typeof window!=='undefined'?window:globalThis);

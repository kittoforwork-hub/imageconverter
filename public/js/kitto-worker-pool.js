/* v4: reuse image workers across multiple files; abort only kills the affected worker. */
(function(root){
  'use strict';
  class KittoWorkerPool {
    constructor(url,maxWorkers=2){this.url=url;this.maxWorkers=Math.max(1,Math.min(3,maxWorkers));this.idle=[];this.workers=new Set();this.disposed=false;}
    async transform(blob,options,signal){
      if(this.disposed)throw new Error('Worker pool is closed');
      if(signal?.aborted)throw new DOMException('Canceled','AbortError');
      const worker=this.idle.pop() || this.create();
      return new Promise((resolve,reject)=>{
        let settled=false;
        const cleanup=(reuse)=>{
          signal?.removeEventListener('abort',abort);
          worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;
          if(reuse&&!this.disposed)this.idle.push(worker);else{worker.terminate();this.workers.delete(worker);}
        };
        const finish=(result,reuse,error)=>{if(settled)return;settled=true;cleanup(reuse);error?reject(result):resolve(result);};
        const abort=()=>finish(new DOMException('Canceled','AbortError'),false,true);
        signal?.addEventListener('abort',abort,{once:true});
        worker.onmessage=event=>event.data?.ok?finish(event.data,true,false):finish(new Error(event.data?.error||'Image conversion failed'),true,true);
        worker.onerror=event=>finish(new Error(event.message||'Image worker error'),false,true);
        worker.onmessageerror=()=>finish(new Error('Image worker response failed'),false,true);
        try {worker.postMessage({blob,options});}catch(error){finish(error,false,true);}
        if(signal?.aborted)abort();
      });
    }
    create(){const worker=new Worker(this.url);this.workers.add(worker);return worker;}
    setMax(n){this.maxWorkers=Math.max(1,Math.min(3,Number(n)||1));while(this.idle.length>this.maxWorkers){const worker=this.idle.pop();worker.terminate();this.workers.delete(worker);}}
    dispose(){this.disposed=true;for(const worker of this.workers)worker.terminate();this.workers.clear();this.idle.length=0;}
  }
  root.KittoWorkerPool=KittoWorkerPool;
})(typeof window!=='undefined'?window:globalThis);

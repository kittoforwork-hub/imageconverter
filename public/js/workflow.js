/* KITTO Workflow Studio — batch image processing with cancellation and local preview. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const selected = [];
  const preferences=window.KittoSettings;
  const filename=window.KittoFileName;
  const storedRecoveryKey='kitto-workflow-recovery-v4';
  const workerPool=(typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined') ? new window.KittoWorkerPool('./js/workflow-worker.js',3) : null;
  let namingIndex=0;
  let history=[];let historyPosition=-1;let restoring=false;
  let renderHandle=0;
  const sourceUrls = new Map();
  let previousPreview = null;
  let installedCustom = false;
  const extension = {jpeg:'jpg', webp:'webp', png:'png'};
  const tr = (th,en) => window.I18n?.getLanguage?.() === 'th' ? th : en;
  const formatter = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 });
  const humanSize = bytes => bytes > 1024*1024 ? `${formatter.format(bytes/1024/1024)} MB` : `${formatter.format(bytes/1024)} KB`;
  const savedKey = 'kitto-workflow-preset-v1';
  const presetOptions = {
    product: { mode:'square', maxDimension:1000, format:'jpeg',quality:.85,background:'white',targetKB:0,removeBg:false },
    web: { mode:'fit', maxDimension:1600, format:'webp',quality:.80,background:'transparent',targetKB:0,removeBg:false },
    transparent: { mode:'square', maxDimension:1000, format:'png',quality:1,background:'transparent',targetKB:0,removeBg:false },
    original: { mode:'fit', maxDimension:2048, format:'jpeg',quality:.90,background:'white',targetKB:0,removeBg:false }
  };
  const controlKeys = ['mode','size','format','quality','bg','target'];
  function currentConfig() {
    return {
      mode: $('wf-mode').value, maxDimension:Number($('wf-size').value), format:$('wf-format').value,
      quality:Number($('wf-quality').value)/100,background:$('wf-bg').value,
      targetKB:$('wf-format').value==='png'?0:Math.max(0,Math.min(15000,Number($('wf-target').value)||0)), removeBg:$('wf-remove-bg').checked,
      alphaTrim:$('wf-remove-bg').checked ? Number($('wf-alpha-trim').value) : 0,
      alphaSoftness:$('wf-remove-bg').checked ? Number($('wf-alpha-softness').value) : 0,
      nameTemplate:$('wf-name-template').value || '{name}-kitto',
      nameStart:Number($('wf-name-start').value??1), nameDigits:Number($('wf-name-digits').value)||3
    };
  }
  function applyConfig(conf) {
    $('wf-mode').value=conf.mode; $('wf-size').value=String(conf.maxDimension);
    $('wf-format').value=conf.format; $('wf-quality').value=String(Math.round(conf.quality*100));
    $('wf-bg').value=conf.background; $('wf-target').value=String(conf.targetKB||0);
    $('wf-remove-bg').checked=Boolean(conf.removeBg);
    $('wf-alpha-trim').value=String(conf.alphaTrim||0);
    $('wf-alpha-softness').value=String(conf.alphaSoftness||0);
    $('wf-name-template').value=conf.nameTemplate||'{name}-kitto';
    $('wf-name-start').value=String(conf.nameStart??1);
    $('wf-name-digits').value=String(conf.nameDigits||3);
    $('wf-quality-value').textContent=$('wf-quality').value+'%';
    ensureFormat();updateNamePreview();
  }
  function ensureFormat() {
    const isPng=$('wf-format').value==='png';
    $('wf-quality').disabled=isPng;
    $('wf-target').disabled=isPng;
    $('wf-quality').title=isPng?'PNG ใช้การบีบอัดแบบไม่สูญเสียข้อมูล':'';
    if ($('wf-format').value==='jpeg' && $('wf-bg').value==='transparent') $('wf-bg').value='white';
    $('wf-alpha-trim').disabled=!$('wf-remove-bg').checked;
    $('wf-alpha-softness').disabled=!$('wf-remove-bg').checked;
  }
  function announce(text) {$('wf-upload-message').textContent=text;}
  function tempObject(file) { return URL.createObjectURL(file); }
  const queue = new window.KittoQueue(processItem, scheduleRender,preferences?.effectiveConcurrency(navigator.deviceMemory,window.innerWidth)||2);
  function scheduleRender(){if(renderHandle)return;renderHandle=requestAnimationFrame(()=>{renderHandle=0;render(queue.items);});}
  preferences?.onChange(()=>{
    queue.concurrency=preferences.effectiveConcurrency(navigator.deviceMemory,window.innerWidth);
    workerPool?.setMax(queue.concurrency);queue.pump();
    if(!preferences.get().preserveSettings){try{localStorage.removeItem(storedRecoveryKey);}catch(_){}}
  });
  function updateNamePreview(){
    $('wf-name-preview').textContent=tr('ตัวอย่าง: ','Example: ')+filename.render($('wf-name-template').value,'product-photo.png',0,{start:$('wf-name-start').value,digits:$('wf-name-digits').value})+'.'+extension[$('wf-format').value];
  }
  function commitHistory(){
    if(restoring)return;
    const snapshot=JSON.stringify(currentConfig());
    if(history[historyPosition]===snapshot)return;
    history=history.slice(0,historyPosition+1);history.push(snapshot);
    if(history.length>30)history.shift();
    historyPosition=history.length-1;
    updateHistoryButtons();
    if(preferences?.get().preserveSettings){try{localStorage.setItem(storedRecoveryKey,snapshot);}catch(_){}}
  }
  function updateHistoryButtons(){$('wf-undo').disabled=historyPosition<=0;$('wf-redo').disabled=historyPosition>=history.length-1;}
  function travelHistory(delta){const next=historyPosition+delta;if(next<0||next>=history.length)return;
    historyPosition=next;restoring=true;try{applyConfig(JSON.parse(history[next]));}finally{restoring=false;}updateHistoryButtons();
  }
  $('wf-undo').addEventListener('click',()=>travelHistory(-1));
  $('wf-redo').addEventListener('click',()=>travelHistory(1));
  function mimeForFile(file){
    if(/^(image\/jpeg|image\/png|image\/webp)$/.test(file.type))return file.type;
    if(file.type)return '';
    const ext=file.name.toLowerCase().split('.').pop();
    return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'})[ext]||'';
  }
  function validFile(file) {
    return Boolean(mimeForFile(file))&&file.size>0&&file.size<=20*1024*1024;
  }
  function stageFiles(files) {
    let duplicates=0, bad=0; const keys=new Set([...selected,...queue.items.map(i=>i.file)].map(i=>[i.name,i.size,i.lastModified].join('|')));
    for(const file of [...files]) {
      const key=[file.name,file.size,file.lastModified].join('|');
      if(keys.has(key)){duplicates++;continue;}
      if(!validFile(file) || selected.length+queue.items.length>=60 || [...selected].reduce((n,f)=>n+f.size,0)+queue.items.reduce((n,i)=>n+i.file.size,0)+file.size >180*1024*1024){bad++;continue;}
      keys.add(key);selected.push(file);
    }
    $('wf-start').disabled=!selected.length;
    announce(tr(`เลือกไว้ ${selected.length} ไฟล์${duplicates ? ` · ซ้ำ ${duplicates}`:''}${bad ? ` · ข้ามไฟล์ที่ไม่รองรับ/เกินขนาด ${bad}`:''}`,`${selected.length} images selected${duplicates ? ` · ${duplicates} duplicate(s)` : ''}${bad ? ` · ${bad} invalid/oversized` : ''}`));
    $('wf-files').value='';
  }
  function sourceUrl(item){if(!sourceUrls.has(item.id))sourceUrls.set(item.id,tempObject(item.file));return sourceUrls.get(item.id);}
  function downloadBlob(blob,filename) {
    const a=document.createElement('a');const url=URL.createObjectURL(blob);
    a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  function removeBlobLinks() {
    for(const url of sourceUrls.values())URL.revokeObjectURL(url);
    sourceUrls.clear();previousPreview=null;$('wf-compare-panel').hidden=true;
  }
  async function transformWithWorker(blob,options,signal) {
    if(signal.aborted)throw new DOMException('Canceled','AbortError');
    if(workerPool){
      try {return await workerPool.transform(blob,options,signal);}
      catch(error){
        if(signal.aborted||(!/worker/i.test(error?.message||'')&&error?.name!=='SecurityError'))throw error;
        // Some browsers block Worker creation under local previews or security policies.
        // Decode on the main thread instead of making the whole queue fail.
        console.warn('[KITTO] Worker unavailable, using local fallback');
      }
    }
    // Non-OffscreenCanvas browsers fall back to the same transformation locally.
    return window.KittoTransformImage(blob,options,window);
  }
  async function processItem(item,signal,progress) {
    let input=item.file;
    if(item.config.removeBg){
      progress(.08,'กำลังลบพื้นหลัง');
      const response=await fetch('/api/remove-background',{method:'POST',headers:{'Content-Type':mimeForFile(item.file)},body:input,signal,cache:'no-store'});
      if(!response.ok){
        let detail='';try{detail=(await response.json()).code||'';}catch(_){}
        throw new Error(`ลบพื้นหลังไม่สำเร็จ (${response.status}${detail?' · '+detail:''})`);
      }
      input=await response.blob();
      if(signal.aborted)throw new DOMException('Canceled','AbortError');
    }
    progress(item.config.removeBg?.55:.2,'กำลังปรับภาพ');
    const result=await transformWithWorker(input,item.config,signal);
    if(signal.aborted)throw new DOMException('Canceled','AbortError');
    if(!result.blob||!result.blob.size)throw new Error('ไฟล์ผลลัพธ์ว่างเปล่า');
    progress(.95,'กำลังจัดไฟล์');
    return { blob:result.blob, name:item.targetName||`${filename.basename(item.name)}-kitto.${extension[item.config.format]}` };
  }
  function preview(item) {
    if(item.status!=='done')return;
    if(!item.resultUrl)item.resultUrl=URL.createObjectURL(item.result);
    const before=sourceUrl(item);
    $('wf-before').src=before;$('wf-after').src=item.resultUrl;
    $('wf-preview-name').textContent=item.name;
    $('wf-preview-info').textContent=`ต้นฉบับ ${humanSize(item.file.size)} → ผลลัพธ์ ${humanSize(item.result.size)} · ${item.config.format.toUpperCase()}${item.config.targetKB && item.result.size > item.config.targetKB*1024 ? ' · ไม่ถึงขนาดไฟล์เป้าหมาย' : ''}`;
    $('wf-compare-panel').hidden=false;previousPreview=item.id;$('wf-compare-slider').value='50';adjustComparison();
  }
  function adjustComparison() {const p=Number($('wf-compare-slider').value);$('wf-before').style.clipPath=`inset(0 ${100-p}% 0 0)`;$('wf-compare').querySelector('.wf-divider').style.left=p+'%';}
  function jobView(item) {
    const row=document.createElement('div');row.className=`wf-job status-${item.status}`;row.dataset.id=item.id;
    const img=document.createElement('img');img.className='wf-job-thumb';img.alt='';img.src=sourceUrl(item);img.loading='lazy';
    const info=document.createElement('div');info.style.minWidth='0';
    const title=document.createElement('div');title.className='wf-job-title';title.textContent=item.name;title.title=item.name;
    const meta=document.createElement('div');meta.className='wf-job-meta';
    const phasesEn={'รอคิว':'Queued','กำลังลบพื้นหลัง':'Removing background','กำลังปรับภาพ':'Converting image','กำลังจัดไฟล์':'Finalizing','เสร็จแล้ว':'Done','ยกเลิก':'Canceled','ผิดพลาด':'Failed'};
    const text=document.createElement('span');text.textContent=item.status==='done'
      ? `${humanSize(item.file.size)} → ${humanSize(item.result.size)}`
      : `${tr(item.phase,phasesEn[item.phase]||item.phase)} · ${Math.round(item.progress*100)}%`;
    meta.append(text);
    if(item.error){const error=document.createElement('span');error.textContent=item.error;error.title=item.error;meta.append(error);}
    const track=document.createElement('div');track.className='wf-job-track';const fill=document.createElement('div');fill.style.width=Math.round(item.progress*100)+'%';track.append(fill);
    info.append(title,meta,track);
    const actions=document.createElement('div');actions.className='wf-job-actions';
    const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.className='wf-btn';b.textContent=label;b.addEventListener('click',action);actions.append(b);};
    if(item.status==='done'){
      button(tr('ดูภาพ','Preview'),()=>preview(item));
      button(tr('↓ บันทึก','↓ Save'),()=>downloadBlob(item.result,item.outputName));
    }else if(['queued','processing'].includes(item.status))button(tr('ยกเลิก','Cancel'),()=>queue.cancel(item.id));
    else if(['failed','canceled'].includes(item.status))button(tr('ลองใหม่','Retry'),()=>queue.retry(item.id));
    row.append(img,info,actions);return row;
  }
  function render(items) {
    const list=$('wf-list');const previouslyScrolled=list.scrollTop;
    list.replaceChildren();
    if(!items.length){const p=document.createElement('p');p.className='wf-empty';p.textContent=tr('ยังไม่มีรายการ เลือกรูปภาพเพื่อเริ่มงานได้เลย ✿','No jobs yet. Choose images to get started ✿');list.append(p);}
    else items.forEach(i=>list.append(jobView(i)));
    list.scrollTop=previouslyScrolled;
    const done=items.filter(i=>i.status==='done');const active=items.filter(i=>i.status==='processing');const errors=items.filter(i=>i.status==='failed');
    $('wf-total').textContent=items.length;
    $('wf-done').textContent=done.length;$('wf-active').textContent=active.length;$('wf-error').textContent=errors.length;
    const total=items.length?items.reduce((s,i)=>s+i.progress,0)/items.length*100:0;
    $('wf-overall').setAttribute('aria-valuenow',Math.round(total));$('wf-overall-fill').style.width=total+'%';
    $('wf-clear').disabled=!items.some(i=>['done','failed','canceled'].includes(i.status));
    $('wf-cancel-all').disabled=!items.some(i=>['queued','processing'].includes(i.status));
    $('wf-download-zip').disabled=!done.length;
    if(previousPreview&&!items.find(i=>i.id===previousPreview)){$('wf-compare-panel').hidden=true;previousPreview=null;}
  }
  function filesClick(){$('wf-files').click();}
  $('wf-drop').addEventListener('click',event=>{if(event.target?.tagName!=='INPUT')filesClick();});
  $('wf-drop').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();filesClick();}});
  $('wf-files').addEventListener('change',event=>stageFiles(event.target.files));
  $('wf-drop').addEventListener('dragover',event=>{event.preventDefault();event.currentTarget.classList.add('is-dragging');});
  $('wf-drop').addEventListener('dragleave',event=>{event.currentTarget.classList.remove('is-dragging');});
  $('wf-drop').addEventListener('drop',event=>{event.preventDefault();event.currentTarget.classList.remove('is-dragging');stageFiles(event.dataTransfer.files);});
  $('wf-start').addEventListener('click',()=>{
    if(!selected.length)return;
    const config=currentConfig();const pending=selected.splice(0);
    const added=queue.add(pending,config);
    // Reserve output names before any asynchronous job can complete.
    const reserved=new Set(queue.items.filter(item=>!added.includes(item)).map(item=>String(item.targetName||'').toLocaleLowerCase()));
    for(const item of added){
      const name=filename.render(config.nameTemplate,item.name,namingIndex++,{start:config.nameStart,digits:config.nameDigits});
      let candidate=`${name}.${extension[config.format]}`;let attempt=2;
      while(reserved.has(candidate.toLocaleLowerCase()))candidate=`${name} (${attempt++}).${extension[config.format]}`;
      reserved.add(candidate.toLocaleLowerCase());item.targetName=candidate;
    }
    $('wf-start').disabled=true;
    announce(tr(`เพิ่ม ${pending.length} ไฟล์ในคิวแล้ว · ประมวลผลพร้อมกันสูงสุด ${queue.concurrency} ไฟล์`,`${pending.length} images queued · up to ${queue.concurrency} jobs at a time`));
    if(config.removeBg) $('wf-export-message').textContent='ขั้นตอน AI ส่งภาพที่เลือกไปยัง Cloudflare เพื่อประมวลผล ไม่เก็บไฟล์ถาวร';
  });
  $('wf-clear').addEventListener('click',()=>{queue.clearSettled();for(const [id,url] of sourceUrls){if(!queue.items.some(i=>i.id===id)){URL.revokeObjectURL(url);sourceUrls.delete(id);}};});
  $('wf-cancel-all').addEventListener('click',()=>queue.stopAll());
  $('wf-compare-slider').addEventListener('input',adjustComparison);
  $('wf-download-zip').addEventListener('click',async()=>{
    const done=queue.items.filter(i=>i.status==='done');if(!done.length)return;
    const btn=$('wf-download-zip');btn.disabled=true;
    try {
      const mode=preferences?.get().zipMode||'auto';
      if((done.length===1&&mode==='auto')||(mode==='individual'&&done.length<=10)){
        for(const item of done)downloadBlob(item.result,item.outputName);
        $('wf-export-message').textContent=tr(`เริ่มดาวน์โหลด ${done.length} ไฟล์แล้ว (เบราว์เซอร์อาจขออนุญาตดาวน์โหลดหลายไฟล์)`,`Started ${done.length} download(s). Your browser may request permission for multiple files.`);return;
      }
      $('wf-export-message').textContent='กำลังเตรียม ZIP...';
      const zip=await window.KittoZipStore.makeZip(done.map(i=>({name:i.outputName,blob:i.result})),p=>{$('wf-export-message').textContent=`กำลังเตรียม ZIP ${Math.round(p*100)}%`;});
      downloadBlob(zip,'KITTO-workflow-results.zip');$('wf-export-message').textContent=`เตรียม ZIP เสร็จ ${done.length} ไฟล์ · ${humanSize(zip.size)}`;
    }catch(error){$('wf-export-message').textContent=error.message||'สร้าง ZIP ไม่สำเร็จ';}
    finally{btn.disabled=false;}
  });
  $('wf-quality').addEventListener('input',()=>{$('wf-quality-value').textContent=$('wf-quality').value+'%';});
  $('wf-format').addEventListener('change',()=>{ensureFormat();updateNamePreview();});
  $('wf-bg').addEventListener('change',ensureFormat);
  $('wf-remove-bg').addEventListener('change',ensureFormat);
  $('wf-compare-bg').addEventListener('change',()=>{$('wf-compare').classList.remove('bg-checker','bg-white','bg-dark');$('wf-compare').classList.add('bg-'+$('wf-compare-bg').value);});
  for(const id of ['wf-mode','wf-size','wf-format','wf-quality','wf-bg','wf-target','wf-remove-bg','wf-alpha-trim','wf-alpha-softness','wf-name-template','wf-name-start','wf-name-digits']){
    $(id).addEventListener('change',()=>{ensureFormat();updateNamePreview();commitHistory();});
  }
  for(const id of ['wf-name-template','wf-name-start','wf-name-digits'])$(id).addEventListener('input',updateNamePreview);
  $('wf-preset').addEventListener('change',()=>{if($('wf-preset').value==='custom'){
    try {applyConfig(JSON.parse(localStorage.getItem(savedKey)));}catch(_){} }
    else applyConfig(presetOptions[$('wf-preset').value]);commitHistory();});
  $('wf-save-preset').addEventListener('click',()=>{try{localStorage.setItem(savedKey,JSON.stringify(currentConfig()));
    if(!$('wf-preset').querySelector('[value=custom]')){const o=document.createElement('option');o.value='custom';o.textContent=window.I18n?.getLanguage?.()==='th'?'✦ ค่าที่ฉันบันทึก':'✦ My saved preset';$('wf-preset').append(o);}
    $('wf-preset').value='custom';announce(tr('บันทึกค่า Workflow ในเบราว์เซอร์แล้ว','Workflow settings saved in this browser'));
  }catch(_){announce(tr('ไม่สามารถบันทึกค่าในเบราว์เซอร์ได้','Could not save settings in this browser'));}});
  $('wf-reset').addEventListener('click',()=>{$('wf-preset').value='product';applyConfig({...presetOptions.product,quality:(preferences?.get().quality||85)/100});commitHistory();});
  try{if(localStorage.getItem(savedKey)){const o=document.createElement('option');o.value='custom';o.textContent=window.I18n?.getLanguage?.()==='th'?'✦ ค่าที่ฉันบันทึก':'✦ My saved preset';$('wf-preset').append(o);}}
  catch(_){};
  let initial={...presetOptions.product,quality:(preferences?.get().quality||85)/100};
  if(preferences?.get().preserveSettings){try{const saved=JSON.parse(localStorage.getItem(storedRecoveryKey)||'null');if(saved&&typeof saved==='object'&&['fit','square'].includes(saved.mode))initial={...initial,...saved};}catch(_){}}
  applyConfig(initial);commitHistory();
  render([]);
  window.addEventListener('pagehide',()=>{removeBlobLinks();queue.stopAll();workerPool?.dispose();});
})();

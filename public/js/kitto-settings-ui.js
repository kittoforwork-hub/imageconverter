/* Shared preferences + browser diagnostics. No analytics, account or uploads. */
(()=>{
  'use strict';
  const api=window.KittoSettings;
  if(!api)return;
  const nav=document.querySelector('.app-nav-tools');if(!nav)return;
  const $=selector=>document.querySelector(selector);
  const language=()=>window.I18n?.getLanguage?.()==='th'?'th':'en';
  const words={
    th:{button:'ตั้งค่า',heading:'ตั้งค่า KITTO',sub:'ปรับเว็บไซต์ให้เข้ากับวิธีทำงานของคุณ',concurrency:'ประมวลผลพร้อมกัน',auto:'อัตโนมัติตามอุปกรณ์',files:'ไฟล์',quality:'คุณภาพภาพเริ่มต้น',zipMode:'การดาวน์โหลด Workflow',zipAuto:'อัตโนมัติ',zip:'ZIP เสมอ',individual:'แยกดาวน์โหลด (สูงสุด 10 ไฟล์)',motion:'ลดการเคลื่อนไหว',preserve:'จำการตั้งค่า Workflow',save:'บันทึก',reset:'คืนค่าเริ่มต้น',close:'ปิดหน้าต่าง',diagnostics:'ตรวจสอบสภาพการทำงาน',report:'คัดลอกรายงาน',clear:'รีเฟรชแคชเว็บ',saved:'บันทึกการตั้งค่าแล้ว',cleared:'ล้างแคช KITTO แล้ว กรุณารีเฟรชหน้า (ไม่ลบโน้ต)',failed:'ดำเนินการไม่สำเร็จ',note:'บันทึกค่าบนอุปกรณ์นี้เท่านั้น ไม่เก็บไฟล์ภาพหรือข้อมูลส่วนบุคคล',storage:'พื้นที่จัดเก็บ',connection:'อินเทอร์เน็ต',workers:'Web Workers',canvas:'OffscreenCanvas',sw:'Offline cache',online:'ออนไลน์',offline:'ออฟไลน์',yes:'รองรับ',no:'ไม่รองรับ',ready:'พร้อม',missing:'ยังไม่เปิดใช้งาน',copy:'คัดลอกแล้ว'},
    en:{button:'Settings',heading:'KITTO settings',sub:'Choose how your workspace behaves',concurrency:'Concurrent jobs',auto:'Automatic for this device',files:'jobs',quality:'Default image quality',zipMode:'Workflow downloads',zipAuto:'Auto',zip:'Always ZIP',individual:'Separate downloads (up to 10)',motion:'Reduce animations',preserve:'Remember Workflow settings',save:'Save',reset:'Reset defaults',close:'Close settings',diagnostics:'Browser diagnostics',report:'Copy report',clear:'Refresh app cache',saved:'Settings saved',cleared:'KITTO cache cleared. Refresh this page (notes preserved)',failed:'Operation failed',note:'Stored only on this device. No image files or personal content are stored',storage:'Storage',connection:'Connection',workers:'Web Workers',canvas:'OffscreenCanvas',sw:'Offline cache',online:'Online',offline:'Offline',yes:'Supported',no:'Unavailable',ready:'Ready',missing:'Not registered',copy:'Copied'}
  };
  const tr=key=>words[language()][key];
  const trigger=document.createElement('button');trigger.type='button';trigger.className='kitto-settings-trigger';trigger.setAttribute('aria-haspopup','dialog');
  const modal=document.createElement('div');modal.className='kitto-v4-dialog';modal.hidden=true;
  modal.innerHTML=`<section class="kitto-v4-modal" role="dialog" aria-modal="true" aria-labelledby="kitto-v4-title">
    <header class="kitto-v4-modal-header"><div><span class="kitto-v4-eyebrow">✿ KITTO / PREFERENCES</span><h2 id="kitto-v4-title"></h2><p id="kitto-v4-sub" class="kitto-v4-small"></p></div><button id="kitto-v4-close" type="button" class="kitto-v4-close" aria-label="Close">×</button></header>
    <form id="kitto-v4-form" class="kitto-v4-fields">
      <label class="kitto-v4-field"><span data-pref="concurrency"></span><select name="concurrency"><option value="auto"></option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
      <label class="kitto-v4-field"><span data-pref="quality"></span><select name="quality"><option value="60">60%</option><option value="70">70%</option><option value="75">75%</option><option value="80">80%</option><option value="85">85%</option><option value="90">90%</option><option value="95">95%</option><option value="100">100%</option></select></label>
      <label class="kitto-v4-field"><span data-pref="zipMode"></span><select name="zipMode"><option value="auto"></option><option value="zip"></option><option value="individual"></option></select></label>
      <label class="kitto-v4-field"><span data-pref="motion"></span><input type="checkbox" name="reduceMotion"></label>
      <label class="kitto-v4-field"><span data-pref="preserve"></span><input type="checkbox" name="preserveSettings"></label>
    </form><p id="kitto-v4-note" class="kitto-v4-small"></p><div class="kitto-v4-actions"><button type="button" id="kitto-v4-save"></button><button type="button" id="kitto-v4-reset"></button></div>
    <div class="kitto-v4-diagnostics"><h3 id="kitto-v4-diag-head"></h3><ul id="kitto-v4-diagnostics-list"></ul><div class="kitto-v4-actions"><button type="button" id="kitto-v4-copy"></button><button type="button" id="kitto-v4-clear"></button></div></div>
    <p id="kitto-v4-status" role="status" aria-live="polite" class="kitto-v4-status"></p>
  </section>`;
  const form=modal.querySelector('form');const field=name=>form.elements.namedItem(name);
  let priorFocus=null,report='';
  function applyText(){
    trigger.replaceChildren();
    const glyph=document.createElement('span');glyph.textContent='⚙';glyph.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.className='kitto-settings-caption';label.textContent=tr('button');
    trigger.append(glyph,label);trigger.setAttribute('aria-label',tr('heading'));
    modal.querySelector('#kitto-v4-title').textContent=tr('heading');modal.querySelector('#kitto-v4-sub').textContent=tr('sub');
    for(const [key,label] of [['concurrency','concurrency'],['quality','quality'],['zipMode','zipMode'],['motion','motion'],['preserve','preserve']])modal.querySelector(`[data-pref=${key}]`).textContent=tr(label);
    const opts=field('concurrency').options;opts[0].textContent=tr('auto');
    const modes=field('zipMode').options;modes[0].textContent=tr('zipAuto');modes[1].textContent=tr('zip');modes[2].textContent=tr('individual');
    for(const [id,key] of [['note','note'],['save','save'],['reset','reset'],['diag-head','diagnostics'],['copy','report'],['clear','clear']])modal.querySelector('#kitto-v4-'+id).textContent=tr(key);
    modal.querySelector('#kitto-v4-close').setAttribute('aria-label',tr('close'));
  }
  function populate(){const values=api.get();for(const [key,value] of Object.entries(values)){const control=field(key);if(!control)continue;if(control.type==='checkbox')control.checked=value;else control.value=String(value);}}
  async function diagnostics(){
    let stored=false;
    try{const key='kitto-storage-check';localStorage.setItem(key,'1');stored=localStorage.getItem(key)==='1';localStorage.removeItem(key);}catch(_){}
    let swReady=false;
    try{swReady=Boolean(await navigator.serviceWorker?.getRegistration?.());}catch(_){}
    const statuses=[['storage',stored],['connection',navigator.onLine],['workers',typeof Worker==='function'],['canvas',typeof OffscreenCanvas!=='undefined'],['sw',swReady]];
    const list=modal.querySelector('#kitto-v4-diagnostics-list');list.replaceChildren();
    const wordsValue={storage:['yes','no'],connection:['online','offline'],workers:['yes','no'],canvas:['yes','no'],sw:['ready','missing']};
    for(const [name,ok] of statuses){const li=document.createElement('li');if(!ok)li.className='is-warning';const label=document.createElement('span');label.textContent=tr(name);const value=document.createElement('strong');value.textContent=tr(wordsValue[name][ok?0:1]);li.append(label,value);list.append(li);}
    report=`KITTO v4 diagnostics\n${statuses.map(([name,ok])=>`${name}: ${ok?'yes':'no'}`).join('\n')}\nBrowser: ${navigator.userAgent.slice(0,250)}`;
  }
  const status=message=>{modal.querySelector('#kitto-v4-status').textContent=message;};
  function close(){modal.hidden=true;document.body.classList.remove('kitto-dialog-open');priorFocus?.focus?.();}
  async function open(){priorFocus=document.activeElement;applyText();populate();status('');modal.hidden=false;document.body.classList.add('kitto-dialog-open');modal.querySelector('#kitto-v4-close').focus();await diagnostics();}
  trigger.addEventListener('click',open);
  modal.querySelector('#kitto-v4-close').addEventListener('click',close);
  modal.addEventListener('click',event=>{if(event.target===modal)close();});
  modal.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key==='Tab'){
      const nodes=[...modal.querySelectorAll('button,select,input')].filter(n=>!n.disabled);
      const index=nodes.indexOf(document.activeElement);
      if(event.shiftKey&&index===0){event.preventDefault();nodes.at(-1)?.focus();}
      if(!event.shiftKey&&index===nodes.length-1){event.preventDefault();nodes[0]?.focus();}
    }
  });
  modal.querySelector('#kitto-v4-save').addEventListener('click',()=>{
    api.set({concurrency:field('concurrency').value,quality:Number(field('quality').value),zipMode:field('zipMode').value,reduceMotion:field('reduceMotion').checked,preserveSettings:field('preserveSettings').checked});status(tr('saved'));
  });
  modal.querySelector('#kitto-v4-reset').addEventListener('click',()=>{api.reset();populate();status(tr('saved'));});
  modal.querySelector('#kitto-v4-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(report);status(tr('copy'));}catch(_){status(tr('failed'));}});
  modal.querySelector('#kitto-v4-clear').addEventListener('click',async()=>{try{
    const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('kitto-app-v')).map(key=>caches.delete(key)));status(tr('cleared'));await diagnostics();
  }catch(_){status(tr('failed'));}});
  applyText();
  nav.insertBefore(trigger,nav.querySelector('.app-nav-language'));
  document.body.append(modal);
  document.addEventListener('languagechange',()=>{applyText();if(!modal.hidden)diagnostics();});
})();

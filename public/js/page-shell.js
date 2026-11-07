/* KITTO — shared application experience. Processing tools are not modified here. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const page = $('.wf-sheet') ? 'workflow' : $('.notepad-page') ? 'notepad' : $('.fc-sheet') ? 'converter' : 'workspace';
  const root = $('.sheet, .fc-sheet, .notepad-page, .wf-sheet');
  if (!root || $('.app-nav')) return;

  const icons = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"/>',
    convert: '<path d="m4 7 3-3 3 3M7 4v12a4 4 0 0 0 4 4h6m3-3-3 3-3-3M17 20V8a4 4 0 0 0-4-4h-2"/>',
    note: '<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-6-6H8Z"/><path d="M14 3v6h6M7 14h10M7 17h7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    close: '<path d="M5 5 19 19M19 5 5 19"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 16-5-5-9 9"/>',
    pdf: '<path d="M6 3h9l5 5v12a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v6h6M8 14h8M8 18h6"/>',
    spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
    arrow: '<path d="M4 12h16m-7-7 7 7-7 7"/>',
    crop: '<path d="M6 3v15h15M3 6h15v15"/>',
    wand: '<path d="m4 20 12-12 4 4L8 24M13 4l1-2m6 5 2-1M18 2v3"/>',
    compress: '<path d="m8 3 0 5H3m13 13v-5h5m-5-8 5-5m-5 5V3h5M8 16l-5 5m5-5v5H3"/>',
    merge: '<path d="M8 3H4v17h13v-4M9 7h10v14H9zM12 2h9v11"/>',
    numbers: '<path d="M6 4h12M6 9h12M6 14h12M6 19h12"/>',
    lock: '<rect x="5" y="10" width="14" height="12" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
  };
  const svg = name => `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
  const dict = {
    th: {launch:'ค้นหาเครื่องมือ',hint:'ค้นหาเครื่องมือทั้งหมด',placeholder:'พิมพ์ชื่อเครื่องมือ เช่น PDF, แปลงรูป...',none:'ไม่พบเครื่องมือที่ตรงกับคำค้น',group:'เครื่องมือทั้งหมด',tools:'เครื่องมือ',workspace:'พื้นที่ทำงาน',short:'ทางลัด',privacy:'ใช้งานได้สะดวก • ไม่ต้องสมัครสมาชิก',close:'ปิดหน้าต่างค้นหา'},
    en: {launch:'Quick launch',hint:'Search all tools',placeholder:'Search tools, e.g. PDF, image, notepad...',none:'No matching tools found',group:'All tools',tools:'Tools',workspace:'Workspace',short:'Shortcut',privacy:'Easy to use • No sign-up required',close:'Close quick search'},
    de: {launch:'Schnellsuche',hint:'Alle Werkzeuge durchsuchen',placeholder:'Werkzeuge suchen, z. B. PDF, Bild...',none:'Keine Werkzeuge gefunden',group:'Alle Werkzeuge',tools:'Werkzeuge',workspace:'Arbeitsbereich',short:'Tastenkürzel',privacy:'Einfach • Ohne Anmeldung',close:'Suche schließen'},
    ja: {launch:'ツールを検索',hint:'ツールを検索',placeholder:'PDF、画像、メモなどを検索...',none:'ツールが見つかりません',group:'すべてのツール',tools:'ツール',workspace:'ワークスペース',short:'ショートカット',privacy:'登録不要で使いやすい',close:'検索を閉じる'},
    ko: {launch:'도구 검색',hint:'모든 도구 검색',placeholder:'PDF, 이미지, 메모 검색...',none:'검색 결과가 없습니다',group:'모든 도구',tools:'도구',workspace:'작업 공간',short:'단축키',privacy:'가입 없이 간편하게',close:'검색 닫기'},
    'zh-CN': {launch:'快速查找',hint:'搜索所有工具',placeholder:'搜索 PDF、图片、笔记...',none:'未找到匹配工具',group:'所有工具',tools:'工具',workspace:'工作区',short:'快捷键',privacy:'简单易用 • 无需注册',close:'关闭搜索'},
    'zh-TW': {launch:'快速搜尋',hint:'搜尋所有工具',placeholder:'搜尋 PDF、圖片、筆記...',none:'找不到符合的工具',group:'所有工具',tools:'工具',workspace:'工作區',short:'快捷鍵',privacy:'簡單好用 • 無需註冊',close:'關閉搜尋'}
  };
  const language = () => window.I18n?.getLanguage?.() || document.documentElement.lang || 'th';
  const text = key => (dict[language()] || dict.th)[key] || dict.en[key];
  const el = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  };

  function languageSelect() {
    const existing = $('#language-select');
    if (existing) {
      const wrapper=existing.closest('.language-switcher') || existing;
      wrapper.classList.add('app-nav-language');
      return wrapper;
    }
    const wrapper = el('div','language-switcher app-nav-language');
    const label = el('label','language-label');
    label.htmlFor = 'language-select';
    label.innerHTML = '<span aria-hidden="true">🌐</span>';
    const select = el('select','mono-select');
    select.id = 'language-select';
    select.setAttribute('aria-label','Language');
    select.setAttribute('data-i18n-aria-label','common.language');
    for (const [code, key, name] of [
      ['th','language.th','ไทย'],['en','language.en','English'],['de','language.de','Deutsch'],
      ['ja','language.ja','日本語'],['ko','language.ko','한국어'],
      ['zh-CN','language.zhCN','简体中文'],['zh-TW','language.zhTW','繁體中文']
    ]) { const o=el('option','',name); o.value=code; o.dataset.i18n=key; select.append(o); }
    wrapper.append(label,select);
    return wrapper;
  }

  const nav = el('header','app-nav');
  nav.setAttribute('aria-label','Main navigation');
  const brand = el('a','app-nav-brand');
  brand.href = './index.html';
  brand.setAttribute('aria-label','KITTO Workshop Utility home');
  brand.innerHTML = '<span class="app-nav-mascot" aria-hidden="true">🐱</span><span class="app-nav-brand-copy"><strong>KITTO<span class="brand-dot">.</span></strong><small>CREATIVE WORKSPACE</small></span>';
  const links = el('nav','app-nav-links');
  links.setAttribute('aria-label','Application pages');
  for (const [id, href, key, fallback, glyph] of [
    ['workspace','./index.html','common.home','Workspace','home'],
    ['converter','./file-converter.html','page.fileConverter','File Converter','convert'],
    ['workflow','./workflow.html',null,'Workflow Studio','spark'],
    ['notepad','./notepad.html','common.notepad','Notepad','note']
  ]) {
    const link=el('a','app-nav-link'); link.href=href; link.dataset.page=id;
    link.innerHTML = `<span class="app-nav-link-icon">${svg(glyph)}</span><span ${key ? `data-i18n="${key}"` : ""}>${fallback}</span>`;
    if (id===page) { link.classList.add('is-current');link.setAttribute('aria-current','page'); }
    links.append(link);
  }
  const navTools = el('div','app-nav-tools');
  const launch=el('button','app-launch'); launch.type='button'; launch.setAttribute('aria-haspopup','dialog');
  launch.innerHTML=`${svg('search')}<span data-kit-text="launch"></span><kbd>Ctrl K</kbd>`;
  navTools.append(launch,languageSelect());
  nav.append(brand,links,navTools);
  document.body.insertBefore(nav,root);
  const langSel=$('#language-select');
  if (langSel) {
    const sync=()=> {if (window.I18n?.getLanguage?.() && langSel.value !== language()) langSel.value=language();};
    sync();langSel.addEventListener('change',()=>window.I18n?.setLanguage?.(langSel.value));
    document.addEventListener('languagechange',sync);
  }

  // Friendly, SVG-based character artwork is decorative, never blocks interactions.
  const hero = page==='workspace' ? $('.topbar') : page==='converter' ? $('.fc-hero') : page==='notepad' ? $('.notepad-header') : null;
  if (hero) {
    hero.classList.add('kitto-hero','kitto-hero-'+page);
    const art=el('div','kitto-hero-art');
    art.setAttribute('aria-hidden','true');
    art.innerHTML = '<span class="kitto-art-star star-one">✦</span><span class="kitto-art-star star-two">✳</span><img src="./assets/illustrations/kitto-cat.svg" alt="" loading="eager"><span class="kitto-art-label">✦ KITTO CREATIVE</span>';
    hero.append(art);
    const badge=el('div','kitto-hero-tag');badge.innerHTML='<span aria-hidden="true">✦</span> <span>KITTO / HAPPY LITTLE TOOLS</span>';
    hero.prepend(badge);
    if (page==='workspace') {
      const foot=el('div','kitto-hero-micro');
      foot.innerHTML=`<span class="kitto-pulse"></span><span data-kit-text="privacy"></span>`;
      hero.append(foot);
    }
  }

  const toolIcons={
    'img-convert':'image','img-crop':'crop','img-bgremove':'wand','img-compress':'compress',
    'pdf-from-images':'image','pdf-to-images':'convert','pdf-pages':'pdf',
    'pdf-merge':'merge','pdf-watermark':'spark','pdf-pagenumbers':'numbers'
  };
  if (page==='workspace') {
    $$('.cat-btn[data-cat]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.classList.contains('is-active')));
    });
    $$('.tool-chip[data-tool]').forEach(btn => {
      const icon=el('span','kitto-chip-icon');icon.innerHTML=svg(toolIcons[btn.dataset.tool] || 'spark');
      btn.prepend(icon);
      btn.append(el('span','kitto-chip-chevron','›'));
    });
    const sidebarTitle=el('div','kitto-sidebar-title');
    sidebarTitle.innerHTML='<span data-kit-text="tools"></span><span class="kitto-sidebar-paw" aria-hidden="true">✿</span>';
    const firstChip=$('.tool-chips');if (firstChip) firstChip.before(sidebarTitle);
    const panels=$('.panels');
    if (panels) {
      const sectionHead=el('div','kitto-panel-heading');
      sectionHead.innerHTML=`<div class="kitto-panel-title"><span class="kitto-panel-icon">${svg('spark')}</span><div><small data-kit-text="workspace"></small><h2 id="kitto-panel-name"></h2></div></div><span class="kitto-panel-ornament" aria-hidden="true">✧　✦</span>`;
      panels.prepend(sectionHead);
      const syncActive=() => {
        const active=$('.tool-chips:not(.hidden) .tool-chip.is-active');
        const target=$('#kitto-panel-name');
        if (active && target) target.textContent=active.innerText.replace('›','').trim();
        $$('.tool-chip').forEach(b=>b.setAttribute('aria-pressed',String(b.classList.contains('is-active'))));
        $$('.cat-btn[data-cat]').forEach(b=>b.setAttribute('aria-pressed',String(b.classList.contains('is-active'))));
      };
      $$('.cat-btn, .tool-chip').forEach(b=>b.addEventListener('click',syncActive));
      document.addEventListener('languagechange',syncActive);
      syncActive();
    }
    // Tool links from other pages navigate directly to the correct active panel.
    const deepTool=new URLSearchParams(location.search).get('tool');
    if (deepTool && /^[a-z-]{1,40}$/.test(deepTool)) {
      const button=$$('.tool-chip[data-tool]').find(b=>b.dataset.tool===deepTool);
      if(button){ const group=button.closest('[data-cat-group]');
        const category=$(`.cat-btn[data-cat="${group?.dataset.catGroup}"]`);
        category?.click();button.click(); }
    }
  }

  const registry=[
    ['workspace','home','./index.html','Workspace / หน้าแรก','home main dashboard'],
    ['converter','convert','./file-converter.html','File Converter','convert files formats all'],
    ['workflow','spark','./workflow.html','Workflow Studio / ทำรูปหลายไฟล์','batch image pipeline product images background resize compress'],
    ['notepad','note','./notepad.html','Notepad / สมุดโน้ต','notes text editor'],
    ...[['img-convert','image','แปลงรูปภาพ / Image Convert'],['img-crop','crop','ครอบตัดรูปภาพ / Crop'],
      ['img-bgremove','wand','ลบพื้นหลัง / Remove Background'],['img-compress','compress','บีบอัดรูปภาพ / Compress'],
      ['pdf-from-images','image','รวมรูปเป็น PDF / Images to PDF'],['pdf-to-images','pdf','PDF เป็นรูปภาพ / PDF to Images'],
      ['pdf-pages','pdf','จัดการหน้า PDF / Organize Pages'],['pdf-merge','merge','รวมไฟล์ PDF / Merge PDF'],
      ['pdf-watermark','spark','ใส่ลายน้ำ PDF / Watermark'],['pdf-pagenumbers','numbers','ใส่เลขหน้า PDF / Page Numbers']]
      .map(([id,glyph,label])=>[id,glyph,`./index.html?tool=${id}`,label,`tool ${id.replace(/-/g,' ')} ${label}`])
  ];
  const palette=el('div','kitto-command');palette.hidden=true;
  palette.innerHTML=`<div class="kitto-command-backdrop" data-palette-close></div><section class="kitto-command-dialog" role="dialog" aria-modal="true" aria-labelledby="kitto-command-title"><div class="kitto-command-search">${svg('search')}<label class="sr-only" id="kitto-command-title" for="kitto-command-input" data-kit-text="hint"></label><input id="kitto-command-input" type="search" autocomplete="off" spellcheck="false" data-kit-placeholder="placeholder"/><button type="button" class="kitto-command-close" data-palette-close aria-label="Close">${svg('close')}</button></div><div class="kitto-command-caption"><span data-kit-text="group"></span><span class="kitto-key-help">↑ ↓ Enter</span></div><div class="kitto-command-results" role="listbox" id="kitto-command-results"></div><div class="kitto-command-footer"><span>✦ KITTO TOOL FINDER</span><span>ESC <span data-kit-text="close"></span></span></div></section>`;
  document.body.append(palette);
  const results=$('#kitto-command-results');
  const input=$('#kitto-command-input');
  let matches=[];let selected=0;let previouslyFocused=null;
  const normalized=s => s.toLocaleLowerCase().trim();
  function renderResults(){
    const q=normalized(input.value);
    matches=registry.filter(item=>normalized(item[3]+' '+item[4]).includes(q));
    selected=0; results.replaceChildren();
    if (!matches.length){results.append(el('p','kitto-command-empty',text('none')));return;}
    matches.forEach(([id,glyph,href,label],i)=>{
      const a=el('a','kitto-command-result');a.href=href;a.setAttribute('role','option');
      a.dataset.index=String(i); a.setAttribute('aria-selected',String(i===selected));
      a.innerHTML=`<span class="kitto-command-result-icon">${svg(glyph)}</span><span class="kitto-result-text"></span><span class="kitto-result-arrow">${svg('arrow')}</span>`;
      $('.kitto-result-text',a).textContent=label;
      a.addEventListener('pointerenter',()=>select(i));
      results.append(a);
    });
  }
  function select(i){ selected=i; $$('.kitto-command-result',results).forEach((a,n)=>a.setAttribute('aria-selected',String(n===i))); }
  function openPalette(){ if(!palette.hidden)return;previouslyFocused=document.activeElement;palette.hidden=false;document.body.classList.add('kitto-dialog-open');input.value='';renderResults();input.focus(); }
  function closePalette(){if(palette.hidden)return;palette.hidden=true;document.body.classList.remove('kitto-dialog-open');previouslyFocused?.focus?.();}
  launch.addEventListener('click',openPalette);
  $$('[data-palette-close]',palette).forEach(b=>b.addEventListener('click',closePalette));
  input.addEventListener('input',renderResults);
  palette.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();closePalette();}
    if(event.key==='ArrowDown' && matches.length){event.preventDefault();select((selected+1)%matches.length);}
    if(event.key==='ArrowUp' && matches.length){event.preventDefault();select((selected-1+matches.length)%matches.length);}
    if(event.key==='Enter' && matches.length){event.preventDefault();location.href=matches[selected][2];}
    if(event.key==='Tab'){
      const focusables=[input,...$$('a,button',palette).filter(item=>item.offsetParent!==null)];
      const index=focusables.indexOf(document.activeElement);
      if(event.shiftKey && index<=0){event.preventDefault();focusables.at(-1)?.focus();}
      else if(!event.shiftKey && index===focusables.length-1){event.preventDefault();focusables[0]?.focus();}
    }
  });
  document.addEventListener('keydown',event=>{
    const target=event.target;
    if(event.key==='Escape' && !palette.hidden){closePalette();return;}
    if((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==='k'){
      event.preventDefault();palette.hidden ? openPalette() : closePalette();
    }
    if(event.key==='/' && palette.hidden && !event.ctrlKey && !event.metaKey && !event.altKey &&
      !target?.closest?.('input,textarea,select,[contenteditable="true"]')){
      event.preventDefault();openPalette();
    }
  });
  function syncText(){
    $$('[data-kit-text]').forEach(node=>{node.textContent=text(node.dataset.kitText);});
    $$('[data-kit-placeholder]').forEach(node=>{node.placeholder=text(node.dataset.kitPlaceholder);});
    $('.kitto-command-close')?.setAttribute('aria-label',text('close'));
    if(!palette.hidden) renderResults();
  }
  syncText(); document.addEventListener('languagechange',syncText);
  // Offline caching remains available without app installation or an install prompt.
  if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')) {
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('[KITTO] Offline cache unavailable:',error);
    }));
  }
  const back=document.getElementById('btn-back-home');if(back)back.addEventListener('click',()=>{location.href='./index.html';});
})();

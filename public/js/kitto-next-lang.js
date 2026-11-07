/* Bilingual labels for the new v3 surfaces. Existing 7-language catalog remains untouched. */
(() => {
  'use strict';
  const translations = {
    workflow: [
      ['.wf-hero p','Batch-finish product photos in one workflow: optional AI background removal, resize, frame, convert and compress.'],
      ['.wf-hero-pills span:nth-child(1)','✿ Batch processing'],
      ['.wf-hero-pills span:nth-child(2)','✦ Preview before export'],
      ['.wf-hero-pills span:nth-child(3)','♡ No account needed'],
      ['#wf-steps-title','Build your workflow'],
      ['.wf-upload-panel .wf-section-head h2','Upload images'],
      ['.wf-queue-panel .wf-section-head .wf-kicker','03 / PROCESSING'],
      ['#wf-queue-title','Job queue'],
      ['.wf-compare-panel .wf-section-head .wf-kicker','04 / REVIEW'],
      ['.wf-compare-panel .wf-section-head h2','Before / After'],
      ['.wf-settings .wf-section-head .wf-kicker','01 / SETUP'],
      ['.wf-upload-panel .wf-section-head .wf-kicker','02 / FILES'],
      ['.wf-preset-row label','Quick preset'],
      ['#wf-preset option[value="product"]','Square product photos · JPG'],
      ['#wf-preset option[value="web"]','Website ready · WEBP'],
      ['#wf-preset option[value="transparent"]','Transparent background · PNG'],
      ['#wf-preset option[value="original"]','Keep aspect ratio · JPG'],
      ['#wf-preset option[value="custom"]','✦ My saved preset'],
      ['.wf-fieldset:nth-of-type(1) legend','Step 1 · Background removal (AI)'],
      ['.wf-fieldset:nth-of-type(1) .wf-toggle span:nth-child(2)','Automatically remove background'],
      ['.wf-fieldset:nth-of-type(1) .wf-helper','Optional: selected images are sent to Cloudflare for processing through the job queue.'],
      ['.wf-fieldset:nth-of-type(2) legend','Step 2 · Size and framing'],
      ['label[for="wf-mode"]','Image layout'],
      ['#wf-mode option[value="square"]','Square with padding (no cropping)'],
      ['#wf-mode option[value="fit"]','Keep original aspect ratio'],
      ['label[for="wf-size"]','Maximum longest side'],
      ['label[for="wf-bg"]','Canvas background (for added margins)'],
      ['#wf-bg option[value="white"]','White'],
      ['#wf-bg option[value="transparent"]','Transparent (PNG/WEBP)'],
      ['#wf-bg option[value="pink"]','Pastel pink'],
      ['.wf-fieldset:nth-of-type(3) legend','Step 3 · Format and quality'],
      ['label[for="wf-format"]','Output format'],
      ['#wf-format option[value="jpeg"]','JPG · Small and compatible'],
      ['#wf-format option[value="webp"]','WEBP · Optimized for web'],
      ['#wf-format option[value="png"]','PNG · Retains transparency'],
      ['#wf-quality-label','Quality'],
      ['#wf-done-label','Done'],
      ['#wf-active-label','Running'],
      ['#wf-error-label','Failed'],
      ['label[for="wf-target"]','Target file size (KB) · optional'],
      ['.wf-fieldset:nth-of-type(3) .wf-helper','For JPG/WEBP this is a best-effort quality target. PNG uses lossless encoding.'],
      ['#wf-save-preset','✧ Save my settings'],
      ['#wf-reset','Reset'],
      ['.wf-drop strong','Drop your images here'],
      ['.wf-drop p','or click to select JPG, PNG, WEBP'],
      ['.wf-drop small','Up to 60 images · 20 MB each · 180 MB total'],
      ['#wf-upload-message','Processed in your browser (unless AI is enabled)'],
      ['#wf-start','✦ Start processing'],
      ['#wf-clear','Clear completed'],
      ['#wf-cancel-all','Cancel queued / running'],
      ['#wf-download-zip','↓ Download results ZIP'],
      ['.wf-footer span','Making your workflow easier'],
      ['#wf-v4-refine-title','✧ Optional · AI edge cleanup'],
      ['label[for="wf-alpha-trim"] span','Trim faint transparent edges'],
      ['label[for="wf-alpha-softness"] span','Edge softness'],
      ['#wf-alpha-softness option[value="0"]','Off'],
      ['#wf-alpha-softness option[value="1"]','Slightly soft'],
      ['#wf-alpha-softness option[value="2"]','Very soft'],
      ['.wf-v4-stack[aria-labelledby="wf-v4-refine-title"] small','Off by default · Applied locally after AI processing. High values can shrink fine details.'],
      ['#wf-v4-naming-title','✿ Output file naming'],
      ['label[for="wf-name-template"] span','Name template'],
      ['label[for="wf-name-start"] span','Starting number'],
      ['label[for="wf-name-digits"] span','Number of digits'],
      ['#wf-name-digits option[value="2"]','2 digits'],
      ['#wf-name-digits option[value="3"]','3 digits'],
      ['#wf-name-digits option[value="4"]','4 digits'],
      ['#wf-name-digits option[value="5"]','5 digits'],
      ['.wf-v4-stack[aria-labelledby="wf-v4-naming-title"] small:not([id])','Tokens: {name} original name · {n} counter · {date} date. Example: PRODUCT-{n}'],
      ['.wf-v4-stack:not([aria-labelledby]) h3','↶ Undo workflow settings'],
      ['#wf-undo','↶ Undo'],
      ['#wf-redo','↷ Redo'],
      ['.wf-v4-stack:not([aria-labelledby]) small','Only workflow configuration can be undone. Completed outputs cannot be reversed.'],
      ['.wf-v4-compare-bg span','Preview background'],
      ['#wf-compare-bg option[value="checker"]','Transparency checker'],
      ['#wf-compare-bg option[value="white"]','White'],
      ['#wf-compare-bg option[value="dark"]','Dark'],
      ['.wf-queue-actions ~ .wf-helper','']
    ],
    notepad: [
      ['.nb-header strong','✿ My notebook'],
      ['#nb-create','＋ New note'],
      ['#nb-delete','Delete note'],
      ['#nb-export','↓ Backup JSON'],
      ['#nb-import','↑ Import'],
      ['.nb-panel>small','Notes are saved only in this browser · Export JSON before clearing browser data']
    ]
  };
  const placeholders = {
    notepad:[['#nb-filter','Search all notes...'],['#nb-title','Note title']]
  };
  const original = new WeakMap();
  function translate(){
    const code=window.I18n?.getLanguage?.()||'th';
    const english=code!=='th';
    const page=document.querySelector('.wf-sheet')?'workflow':document.querySelector('.notepad-page')?'notepad':null;
    if(!page)return;
    for(const [selector,en] of translations[page]){
      const node=document.querySelector(selector);
      if(!node)continue;
      if(!original.has(node))original.set(node,node.textContent);
      if(en)node.textContent=english?en:original.get(node);
    }
    for(const [selector,en] of placeholders[page]||[]){
      const node=document.querySelector(selector);
      if(!node)continue;
      if(!original.has(node))original.set(node,node.placeholder);
      node.placeholder=english?en:original.get(node);
    }
  }
  translate();
  document.addEventListener('languagechange',translate);
})();

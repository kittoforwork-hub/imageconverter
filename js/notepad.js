/* ============================================================
   ONLINE NOTEPAD
   notepad.js
   ============================================================ */

(() => {
  'use strict';

  /* ==========================================================
     CONFIG
  ========================================================== */

  const STORAGE_KEY =
    'online-notepad-content-v1';

  const AUTO_SAVE_DELAY =
    450;

  const MAX_HISTORY =
    100;


  /* ==========================================================
     ELEMENTS
  ========================================================== */

  const textarea =
    document.getElementById(
      'notepad-textarea'
    );

  const saveStatus =
    document.getElementById(
      'notepad-save-status'
    );

  const saveStatusWrapper =
    document.querySelector(
      '.notepad-status'
    );

  const characterCount =
    document.getElementById(
      'notepad-character-count'
    );

  const wordCount =
    document.getElementById(
      'notepad-word-count'
    );

  const lineCount =
    document.getElementById(
      'notepad-line-count'
    );

  const newNoteBtn =
    document.getElementById(
      'btn-new-note'
    );

  const copyBtn =
    document.getElementById(
      'btn-copy-note'
    );

  const saveTxtBtn =
    document.getElementById(
      'btn-save-txt'
    );

  const clearBtn =
    document.getElementById(
      'btn-clear-note'
    );

  const undoBtn =
    document.getElementById(
      'btn-undo'
    );

  const redoBtn =
    document.getElementById(
      'btn-redo'
    );

  const searchInput =
    document.getElementById(
      'notepad-search'
    );

  const searchClearBtn =
    document.getElementById(
      'btn-search-clear'
    );

  const confirmModal =
    document.getElementById(
      'notepad-confirm-modal'
    );

  const modalCancelBtn =
    document.getElementById(
      'btn-modal-cancel'
    );

  const modalConfirmBtn =
    document.getElementById(
      'btn-modal-confirm'
    );


  /* ==========================================================
     VALIDATION
  ========================================================== */

  if (!textarea) {

    console.warn(
      '[Online Notepad] textarea not found.'
    );

    return;
  }


  /* ==========================================================
     STATE
  ========================================================== */

  let saveTimer = null;

  let isSaving = false;

  let history = [];

  let historyIndex = -1;

  let historyTimer = null;

  let suppressHistory = false;


  /* ==========================================================
     STORAGE
  ========================================================== */

  function loadNote() {

    try {

      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );


      if (saved !== null) {

        textarea.value =
          saved;
      }

    } catch (error) {

      console.warn(
        '[Online Notepad] ไม่สามารถอ่าน localStorage ได้',
        error
      );


      setStatus(
        'ไม่สามารถโหลดข้อมูล',
        'error'
      );
    }
  }


  function saveNote() {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        textarea.value
      );


      setStatus(
        'บันทึกแล้ว',
        'saved'
      );


      isSaving =
        false;

    } catch (error) {

      console.error(
        '[Online Notepad] Save failed:',
        error
      );


      isSaving =
        false;


      setStatus(
        'บันทึกไม่สำเร็จ',
        'error'
      );
    }
  }


  function scheduleSave() {

    clearTimeout(
      saveTimer
    );


    setStatus(
      'กำลังบันทึก...',
      'saving'
    );


    isSaving =
      true;


    saveTimer =
      setTimeout(() => {

        saveNote();

      }, AUTO_SAVE_DELAY);
  }


  /* ==========================================================
     STATUS
  ========================================================== */

  function setStatus(
    text,
    type = ''
  ) {

    if (saveStatus) {

      saveStatus.textContent =
        text;
    }


    if (!saveStatusWrapper) {
      return;
    }


    saveStatusWrapper.classList.remove(
      'is-saving',
      'is-saved',
      'is-error'
    );


    if (type === 'saving') {

      saveStatusWrapper.classList.add(
        'is-saving'
      );
    }


    if (type === 'saved') {

      saveStatusWrapper.classList.add(
        'is-saved'
      );
    }


    if (type === 'error') {

      saveStatusWrapper.classList.add(
        'is-error'
      );
    }
  }


  /* ==========================================================
     DOWNLOAD TXT
  ========================================================== */

  function downloadTxt() {

    const text =
      textarea.value;


    /*
     * ไม่ให้ดาวน์โหลดถ้าไม่มีข้อความ
     * หรือมีเพียงช่องว่าง
     */

    if (
      !text ||
      text.trim().length === 0
    ) {

      setStatus(
        'ยังไม่มีข้อความให้บันทึก',
        'error'
      );


      focusTextarea();


      return false;
    }


    /*
     * UTF-8 BOM
     *
     * ช่วยให้ภาษาไทยเปิดใน
     * Windows Notepad ได้ถูกต้อง
     */

    const BOM =
      '\uFEFF';


    const blob =
      new Blob(
        [
          BOM,
          text
        ],
        {
          type:
            'text/plain;charset=utf-8'
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        'a'
      );


    link.href =
      url;


    /*
     * ไฟล์ที่จะดาวน์โหลด
     */

    link.download =
      'notepad.txt';


    link.style.display =
      'none';


    document.body.appendChild(
      link
    );


    link.click();


    link.remove();


    /*
     * คืนหน่วยความจำ
     */

    setTimeout(() => {

      URL.revokeObjectURL(
        url
      );

    }, 1000);


    /*
     * แสดงสถานะ
     */

    setStatus(
      'บันทึกเป็น .txt แล้ว',
      'saved'
    );


    /*
     * Animation ปุ่ม
     */

    showTemporaryButtonText(
      saveTxtBtn,
      '✓ บันทึกแล้ว'
    );


    return true;
  }


  /* ==========================================================
     COUNTERS
  ========================================================== */

  function updateCounters() {

    const text =
      textarea.value;


    /* --------------------------------------------------------
       Characters
    -------------------------------------------------------- */

    if (characterCount) {

      characterCount.textContent =
        text.length.toLocaleString(
          'th-TH'
        );
    }


    /* --------------------------------------------------------
       Words
    -------------------------------------------------------- */

    if (wordCount) {

      const trimmed =
        text.trim();


      let words =
        0;


      if (trimmed) {

        const englishWords =
          trimmed.match(
            /[A-Za-z0-9À-ÿ]+/g
          );


        const thaiBlocks =
          trimmed
            .split(/\s+/)
            .filter(Boolean);


        words =
          englishWords
            ? Math.max(
                englishWords.length,
                thaiBlocks.length
              )
            : thaiBlocks.length;
      }


      wordCount.textContent =
        words.toLocaleString(
          'th-TH'
        );
    }


    /* --------------------------------------------------------
       Lines
    -------------------------------------------------------- */

    if (lineCount) {

      const lines =
        text === ''
          ? 0
          : text.split(
              /\r\n|\r|\n/
            ).length;


      lineCount.textContent =
        lines.toLocaleString(
          'th-TH'
        );
    }
  }


  /* ==========================================================
     HISTORY
  ========================================================== */

  function resetHistory() {

    history = [
      textarea.value
    ];


    historyIndex =
      0;


    updateHistoryButtons();
  }


  function pushHistory(
    value
  ) {

    if (suppressHistory) {
      return;
    }


    if (
      historyIndex >= 0 &&
      history[historyIndex] === value
    ) {

      return;
    }


    /*
     * ถ้า Undo แล้วพิมพ์ใหม่
     * ให้ตัด history ด้านหน้าออก
     */

    if (
      historyIndex <
      history.length - 1
    ) {

      history =
        history.slice(
          0,
          historyIndex + 1
        );
    }


    history.push(
      value
    );


    historyIndex =
      history.length - 1;


    /*
     * จำกัดจำนวน history
     */

    if (
      history.length >
      MAX_HISTORY
    ) {

      const removeCount =
        history.length -
        MAX_HISTORY;


      history.splice(
        0,
        removeCount
      );


      historyIndex -=
        removeCount;


      if (
        historyIndex < 0
      ) {

        historyIndex =
          0;
      }
    }


    updateHistoryButtons();
  }


  function delayedHistoryPush() {

    clearTimeout(
      historyTimer
    );


    historyTimer =
      setTimeout(() => {

        pushHistory(
          textarea.value
        );

      }, 350);
  }


  function undo() {

    if (
      historyIndex <= 0
    ) {

      return;
    }


    historyIndex--;


    applyHistoryValue(
      history[historyIndex]
    );
  }


  function redo() {

    if (
      historyIndex >=
      history.length - 1
    ) {

      return;
    }


    historyIndex++;


    applyHistoryValue(
      history[historyIndex]
    );
  }


  function applyHistoryValue(
    value
  ) {

    suppressHistory =
      true;


    textarea.value =
      value;


    suppressHistory =
      false;


    updateCounters();

    scheduleSave();

    updateHistoryButtons();

    focusTextarea();
  }


  function updateHistoryButtons() {

    if (undoBtn) {

      undoBtn.disabled =
        historyIndex <= 0;
    }


    if (redoBtn) {

      redoBtn.disabled =
        historyIndex >=
        history.length - 1;
    }
  }


  /* ==========================================================
     FOCUS
  ========================================================== */

  function focusTextarea() {

    try {

      textarea.focus();

    } catch (error) {

      /* Ignore focus errors */

    }
  }


  /* ==========================================================
     COPY
  ========================================================== */

  async function copyNote() {

    const text =
      textarea.value;


    if (!text) {

      showTemporaryButtonText(
        copyBtn,
        'ไม่มีข้อความ'
      );


      return;
    }


    try {

      /*
       * Modern Clipboard API
       */

      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
          'function'
      ) {

        await navigator.clipboard.writeText(
          text
        );


        showTemporaryButtonText(
          copyBtn,
          '✓ คัดลอกแล้ว'
        );


        return;
      }


      /*
       * Fallback
       */

      fallbackCopy(
        text
      );


      showTemporaryButtonText(
        copyBtn,
        '✓ คัดลอกแล้ว'
      );

    } catch (error) {

      console.warn(
        '[Online Notepad] Clipboard API failed:',
        error
      );


      try {

        fallbackCopy(
          text
        );


        showTemporaryButtonText(
          copyBtn,
          '✓ คัดลอกแล้ว'
        );

      } catch (fallbackError) {

        console.error(
          '[Online Notepad] Copy failed:',
          fallbackError
        );


        showTemporaryButtonText(
          copyBtn,
          'คัดลอกไม่ได้'
        );
      }
    }
  }


  function fallbackCopy(
    text
  ) {

    const temp =
      document.createElement(
        'textarea'
      );


    temp.value =
      text;


    temp.setAttribute(
      'readonly',
      ''
    );


    temp.style.position =
      'fixed';


    temp.style.opacity =
      '0';


    temp.style.pointerEvents =
      'none';


    temp.style.left =
      '-9999px';


    document.body.appendChild(
      temp
    );


    temp.focus();

    temp.select();


    temp.setSelectionRange(
      0,
      temp.value.length
    );


    const successful =
      document.execCommand(
        'copy'
      );


    document.body.removeChild(
      temp
    );


    if (!successful) {

      throw new Error(
        'Copy command failed'
      );
    }
  }


  function showTemporaryButtonText(
    button,
    text
  ) {

    if (!button) {
      return;
    }


    const originalHTML =
      button.innerHTML;


    button.innerHTML =
      `<span>${text}</span>`;


    button.disabled =
      true;


    setTimeout(() => {

      button.innerHTML =
        originalHTML;


      button.disabled =
        false;

    }, 1200);
  }


  /* ==========================================================
     CLEAR
  ========================================================== */

  function clearNote() {

    if (!textarea.value) {
      return;
    }


    textarea.value =
      '';


    pushHistory(
      ''
    );


    updateCounters();

    scheduleSave();

    focusTextarea();
  }


  /* ==========================================================
     NEW NOTE MODAL
  ========================================================== */

  function openConfirmModal() {

    if (!confirmModal) {

      clearNote();

      return;
    }


    confirmModal.hidden =
      false;


    document.body.style.overflow =
      'hidden';


    setTimeout(() => {

      if (modalCancelBtn) {

        modalCancelBtn.focus();
      }

    }, 0);
  }


  function closeConfirmModal() {

    if (!confirmModal) {
      return;
    }


    confirmModal.hidden =
      true;


    document.body.style.overflow =
      '';
  }


  function createNewNote() {

    textarea.value =
      '';


    resetHistory();

    updateCounters();

    scheduleSave();

    closeConfirmModal();

    focusTextarea();
  }


  /* ==========================================================
     SEARCH
  ========================================================== */

  function updateSearchUI() {

    if (!searchInput) {
      return;
    }


    const searchBox =
      searchInput.closest(
        '.search-box'
      );


    if (!searchBox) {
      return;
    }


    const hasValue =
      searchInput.value.length >
      0;


    searchBox.classList.toggle(
      'has-value',
      hasValue
    );
  }


  function searchText() {

    if (!searchInput) {
      return;
    }


    const query =
      searchInput.value;


    updateSearchUI();


    if (!query) {
      return;
    }


    const text =
      textarea.value;


    if (!text) {
      return;
    }


    const lowerText =
      text.toLocaleLowerCase();


    const lowerQuery =
      query.toLocaleLowerCase();


    const index =
      lowerText.indexOf(
        lowerQuery
      );


    if (index === -1) {

      searchInput.setAttribute(
        'aria-label',
        'ไม่พบข้อความ'
      );


      return;
    }


    focusTextarea();


    textarea.setSelectionRange(
      index,
      index + query.length
    );
  }


  function clearSearch() {

    if (!searchInput) {
      return;
    }


    searchInput.value =
      '';


    updateSearchUI();


    searchInput.removeAttribute(
      'aria-label'
    );


    focusTextarea();
  }


  /* ==========================================================
     TEXT CHANGE
  ========================================================== */

  function handleTextInput() {

    updateCounters();

    delayedHistoryPush();

    scheduleSave();
  }


  /* ==========================================================
     KEYBOARD SHORTCUTS
  ========================================================== */

  function handleKeyboard(
    event
  ) {

    const key =
      String(
        event.key || ''
      ).toLowerCase();


    /* --------------------------------------------------------
       Ctrl + Z
    -------------------------------------------------------- */

    if (
      (event.ctrlKey ||
        event.metaKey) &&
      key === 'z' &&
      !event.shiftKey
    ) {

      event.preventDefault();

      event.stopPropagation();

      undo();

      return;
    }


    /* --------------------------------------------------------
       Ctrl + Y
    -------------------------------------------------------- */

    if (
      event.ctrlKey &&
      key === 'y'
    ) {

      event.preventDefault();

      event.stopPropagation();

      redo();

      return;
    }


    /* --------------------------------------------------------
       Cmd + Shift + Z
    -------------------------------------------------------- */

    if (
      event.metaKey &&
      event.shiftKey &&
      key === 'z'
    ) {

      event.preventDefault();

      event.stopPropagation();

      redo();

      return;
    }


    /* --------------------------------------------------------
       Escape
    -------------------------------------------------------- */

    if (
      key === 'escape' &&
      confirmModal &&
      !confirmModal.hidden
    ) {

      closeConfirmModal();

      focusTextarea();
    }
  }


  /* ==========================================================
     BEFORE UNLOAD
  ========================================================== */

  function handleBeforeUnload() {

    if (!isSaving) {
      return;
    }


    clearTimeout(
      saveTimer
    );


    saveNote();
  }


  /* ==========================================================
     EVENT LISTENERS
  ========================================================== */

  textarea.addEventListener(
    'input',
    handleTextInput
  );


  textarea.addEventListener(
    'keydown',
    handleKeyboard
  );


  if (newNoteBtn) {

    newNoteBtn.addEventListener(
      'click',
      openConfirmModal
    );
  }


  if (copyBtn) {

    copyBtn.addEventListener(
      'click',
      copyNote
    );
  }


  if (saveTxtBtn) {

    saveTxtBtn.addEventListener(
      'click',
      () => {

        /*
         * Save localStorage ก่อน
         * เพื่อให้ข้อมูลล่าสุดถูกเก็บไว้
         */

        clearTimeout(
          saveTimer
        );


        if (
          textarea.value.trim().length > 0
        ) {

          saveNote();

        }


        /*
         * Export TXT
         */

        downloadTxt();

      }
    );
  }


  if (clearBtn) {

    clearBtn.addEventListener(
      'click',
      clearNote
    );
  }


  if (undoBtn) {

    undoBtn.addEventListener(
      'click',
      undo
    );
  }


  if (redoBtn) {

    redoBtn.addEventListener(
      'click',
      redo
    );
  }


  if (searchInput) {

    searchInput.addEventListener(
      'input',
      searchText
    );


    searchInput.addEventListener(
      'keydown',
      (event) => {

        if (
          event.key === 'Enter'
        ) {

          event.preventDefault();

          searchText();
        }


        if (
          event.key === 'Escape'
        ) {

          event.preventDefault();

          clearSearch();
        }

      }
    );
  }


  if (searchClearBtn) {

    searchClearBtn.addEventListener(
      'click',
      clearSearch
    );
  }


  if (modalCancelBtn) {

    modalCancelBtn.addEventListener(
      'click',
      closeConfirmModal
    );
  }


  if (modalConfirmBtn) {

    modalConfirmBtn.addEventListener(
      'click',
      createNewNote
    );
  }


  if (confirmModal) {

    const backdrop =
      confirmModal.querySelector(
        '.notepad-modal-backdrop'
      );


    if (backdrop) {

      backdrop.addEventListener(
        'click',
        closeConfirmModal
      );
    }
  }


  window.addEventListener(
    'beforeunload',
    handleBeforeUnload
  );


  /* ==========================================================
     INITIALIZE
  ========================================================== */

  loadNote();

  updateCounters();

  resetHistory();

  updateSearchUI();


  setStatus(
    'บันทึกแล้ว',
    'saved'
  );


  /*
   * ให้ textarea พร้อมพิมพ์ทันที
   */

  setTimeout(() => {

    focusTextarea();

  }, 100);


  /* ==========================================================
     PUBLIC API
  ========================================================== */

  window.OnlineNotepad = {

    getText() {

      return textarea.value;
    },


    setText(
      text = ''
    ) {

      textarea.value =
        String(text);


      pushHistory(
        textarea.value
      );


      updateCounters();

      scheduleSave();
    },


    clear() {

      clearNote();
    },


    save() {

      clearTimeout(
        saveTimer
      );


      saveNote();
    },


    downloadTxt() {

      return downloadTxt();
    },


    copy() {

      return copyNote();
    },


    undo() {

      undo();
    },


    redo() {

      redo();
    }

  };

})();

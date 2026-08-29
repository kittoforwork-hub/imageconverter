/* global window, document, localStorage */
window.I18n = (() => {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================

  const STORAGE_KEY = 'utilitytools-language';

  const DEFAULT_LANGUAGE = 'en';

  /*
   * ภาษาไม่ต้องสร้างไฟล์แยก
   * เพิ่มภาษาใหม่ตรงนี้ได้เลย
   */
  const LANGUAGES = {
    th: {
      name: 'ไทย',
      nativeName: 'ไทย',
      dir: 'ltr',

      common: {
        upload: 'อัปโหลด',
        chooseFile: 'เลือกไฟล์',
        download: 'ดาวน์โหลด',
        downloadAll: 'ดาวน์โหลดทั้งหมด',
        clear: 'ล้างทั้งหมด',
        cancel: 'ยกเลิก',
        delete: 'ลบ',
        remove: 'นำออก',
        process: 'เริ่มประมวลผล',
        processing: 'กำลังประมวลผล...',
        completed: 'เสร็จสิ้น',
        failed: 'ไม่สำเร็จ',
        loading: 'กำลังโหลด...',
        ready: 'พร้อมใช้งาน',
        retry: 'ลองอีกครั้ง',
        close: 'ปิด',
        save: 'บันทึก',
        reset: 'รีเซ็ต',
        continue: 'ดำเนินการต่อ',
        confirm: 'ยืนยัน',
        yes: 'ใช่',
        no: 'ไม่',
        files: 'ไฟล์',
        file: 'ไฟล์',
        items: 'รายการ',
        pages: 'หน้า',
        page: 'หน้า'
      },

      errors: {
        downloadDataNotFound:
          'ไม่พบข้อมูลสำหรับดาวน์โหลด',

        fileNotFound:
          'ไม่พบไฟล์',

        fileReadFailed:
          'อ่านไฟล์ไม่สำเร็จ',

        fileReadAborted:
          'การอ่านไฟล์ถูกยกเลิก',

        imageLoadFailed:
          'โหลดรูปภาพไม่สำเร็จ',

        unsupportedFile:
          'ไม่รองรับไฟล์ประเภทนี้',

        processingFailed:
          'ประมวลผลไฟล์ไม่สำเร็จ',

        somethingWentWrong:
          'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง'
      },

      file: {
        size:
          'ขนาดไฟล์: {size}',

        largeWarning:
          'ไฟล์ขนาดนี้อาจใช้เวลานานและกินหน่วยความจำมาก',

        continueQuestion:
          'ต้องการดำเนินการต่อหรือไม่?'
      },

      accessibility: {
        dropzone:
          'ลากและวางไฟล์ที่นี่ หรือกดเพื่อเลือกไฟล์'
      },

      utils: {
        cacheHandlerFailed:
          'ตัวจัดการ clearCache ทำงานไม่สำเร็จ'
      }
    },

    en: {
      name: 'English',
      nativeName: 'English',
      dir: 'ltr',

      common: {
        upload: 'Upload',
        chooseFile: 'Choose File',
        download: 'Download',
        downloadAll: 'Download All',
        clear: 'Clear All',
        cancel: 'Cancel',
        delete: 'Delete',
        remove: 'Remove',
        process: 'Process',
        processing: 'Processing...',
        completed: 'Completed',
        failed: 'Failed',
        loading: 'Loading...',
        ready: 'Ready',
        retry: 'Try Again',
        close: 'Close',
        save: 'Save',
        reset: 'Reset',
        continue: 'Continue',
        confirm: 'Confirm',
        yes: 'Yes',
        no: 'No',
        files: 'files',
        file: 'file',
        items: 'items',
        pages: 'pages',
        page: 'page'
      },

      errors: {
        downloadDataNotFound:
          'No data was found for download.',

        fileNotFound:
          'File not found.',

        fileReadFailed:
          'Failed to read the file.',

        fileReadAborted:
          'File reading was aborted.',

        imageLoadFailed:
          'Failed to load the image.',

        unsupportedFile:
          'This file type is not supported.',

        processingFailed:
          'Failed to process the file.',

        somethingWentWrong:
          'Something went wrong. Please try again.'
      },

      file: {
        size:
          'File size: {size}',

        largeWarning:
          'A file this large may take longer to process and use a significant amount of memory.',

        continueQuestion:
          'Do you want to continue?'
      },

      accessibility: {
        dropzone:
          'Drag and drop files here, or click to choose files'
      },

      utils: {
        cacheHandlerFailed:
          'clearCache handler failed'
      }
    },

    ja: {
      name: 'Japanese',
      nativeName: '日本語',
      dir: 'ltr',

      common: {
        upload: 'アップロード',
        chooseFile: 'ファイルを選択',
        download: 'ダウンロード',
        downloadAll: 'すべてダウンロード',
        clear: 'すべてクリア',
        cancel: 'キャンセル',
        delete: '削除',
        remove: '取り除く',
        process: '処理する',
        processing: '処理中...',
        completed: '完了',
        failed: '失敗しました',
        loading: '読み込み中...',
        ready: '準備完了',
        retry: 'もう一度試す',
        close: '閉じる',
        save: '保存',
        reset: 'リセット',
        continue: '続行',
        confirm: '確認',
        yes: 'はい',
        no: 'いいえ',
        files: 'ファイル',
        file: 'ファイル',
        items: '項目',
        pages: 'ページ',
        page: 'ページ'
      },

      errors: {
        downloadDataNotFound:
          'ダウンロードするデータが見つかりません。',

        fileNotFound:
          'ファイルが見つかりません。',

        fileReadFailed:
          'ファイルの読み込みに失敗しました。',

        fileReadAborted:
          'ファイルの読み込みが中止されました。',

        imageLoadFailed:
          '画像の読み込みに失敗しました。',

        unsupportedFile:
          'このファイル形式には対応していません。',

        processingFailed:
          'ファイルの処理に失敗しました。',

        somethingWentWrong:
          'エラーが発生しました。もう一度お試しください。'
      },

      file: {
        size:
          'ファイルサイズ: {size}',

        largeWarning:
          'このサイズのファイルは処理に時間がかかり、メモリを多く使用する可能性があります。',

        continueQuestion:
          '続行しますか？'
      },

      accessibility: {
        dropzone:
          'ここにファイルをドラッグ＆ドロップするか、クリックしてファイルを選択してください'
      },

      utils: {
        cacheHandlerFailed:
          'clearCache ハンドラーの実行に失敗しました'
      }
    },

    ko: {
      name: 'Korean',
      nativeName: '한국어',
      dir: 'ltr',

      common: {
        upload: '업로드',
        chooseFile: '파일 선택',
        download: '다운로드',
        downloadAll: '모두 다운로드',
        clear: '모두 지우기',
        cancel: '취소',
        delete: '삭제',
        remove: '제거',
        process: '처리',
        processing: '처리 중...',
        completed: '완료',
        failed: '실패',
        loading: '불러오는 중...',
        ready: '준비 완료',
        retry: '다시 시도',
        close: '닫기',
        save: '저장',
        reset: '초기화',
        continue: '계속',
        confirm: '확인',
        yes: '예',
        no: '아니요',
        files: '파일',
        file: '파일',
        items: '항목',
        pages: '페이지',
        page: '페이지'
      },

      errors: {
        downloadDataNotFound:
          '다운로드할 데이터를 찾을 수 없습니다.',

        fileNotFound:
          '파일을 찾을 수 없습니다.',

        fileReadFailed:
          '파일을 읽지 못했습니다.',

        fileReadAborted:
          '파일 읽기가 중단되었습니다.',

        imageLoadFailed:
          '이미지를 불러오지 못했습니다.',

        unsupportedFile:
          '지원되지 않는 파일 형식입니다.',

        processingFailed:
          '파일 처리에 실패했습니다.',

        somethingWentWrong:
          '오류가 발생했습니다. 다시 시도해 주세요.'
      },

      file: {
        size:
          '파일 크기: {size}',

        largeWarning:
          '이 정도 크기의 파일은 처리 시간이 길어지고 메모리를 많이 사용할 수 있습니다.',

        continueQuestion:
          '계속하시겠습니까?'
      },

      accessibility: {
        dropzone:
          '여기에 파일을 드래그 앤 드롭하거나 클릭하여 파일을 선택하세요'
      },

      utils: {
        cacheHandlerFailed:
          'clearCache 핸들러 실행에 실패했습니다'
      }
    },

    'zh-CN': {
      name: 'Chinese Simplified',
      nativeName: '简体中文',
      dir: 'ltr',

      common: {
        upload: '上传',
        chooseFile: '选择文件',
        download: '下载',
        downloadAll: '全部下载',
        clear: '全部清除',
        cancel: '取消',
        delete: '删除',
        remove: '移除',
        process: '开始处理',
        processing: '处理中...',
        completed: '完成',
        failed: '失败',
        loading: '加载中...',
        ready: '准备就绪',
        retry: '重试',
        close: '关闭',
        save: '保存',
        reset: '重置',
        continue: '继续',
        confirm: '确认',
        yes: '是',
        no: '否',
        files: '个文件',
        file: '文件',
        items: '项',
        pages: '页',
        page: '页'
      },

      errors: {
        downloadDataNotFound:
          '未找到可下载的数据。',

        fileNotFound:
          '未找到文件。',

        fileReadFailed:
          '读取文件失败。',

        fileReadAborted:
          '文件读取已中止。',

        imageLoadFailed:
          '加载图片失败。',

        unsupportedFile:
          '不支持此文件类型。',

        processingFailed:
          '文件处理失败。',

        somethingWentWrong:
          '发生错误，请重试。'
      },

      file: {
        size:
          '文件大小：{size}',

        largeWarning:
          '此大小的文件可能需要更长的处理时间，并占用较多内存。',

        continueQuestion:
          '是否继续？'
      },

      accessibility: {
        dropzone:
          '将文件拖放到这里，或点击选择文件'
      },

      utils: {
        cacheHandlerFailed:
          'clearCache 处理程序执行失败'
      }
    },

    'zh-TW': {
      name: 'Chinese Traditional',
      nativeName: '繁體中文',
      dir: 'ltr',

      common: {
        upload: '上傳',
        chooseFile: '選擇檔案',
        download: '下載',
        downloadAll: '全部下載',
        clear: '全部清除',
        cancel: '取消',
        delete: '刪除',
        remove: '移除',
        process: '開始處理',
        processing: '處理中...',
        completed: '完成',
        failed: '失敗',
        loading: '載入中...',
        ready: '準備完成',
        retry: '重試',
        close: '關閉',
        save: '儲存',
        reset: '重設',
        continue: '繼續',
        confirm: '確認',
        yes: '是',
        no: '否',
        files: '個檔案',
        file: '檔案',
        items: '項目',
        pages: '頁',
        page: '頁'
      },

      errors: {
        downloadDataNotFound:
          '找不到可下載的資料。',

        fileNotFound:
          '找不到檔案。',

        fileReadFailed:
          '讀取檔案失敗。',

        fileReadAborted:
          '檔案讀取已中止。',

        imageLoadFailed:
          '載入圖片失敗。',

        unsupportedFile:
          '不支援此檔案類型。',

        processingFailed:
          '檔案處理失敗。',

        somethingWentWrong:
          '發生錯誤，請再試一次。'
      },

      file: {
        size:
          '檔案大小：{size}',

        largeWarning:
          '此大小的檔案可能需要較長的處理時間，並使用較多記憶體。',

        continueQuestion:
          '是否要繼續？'
      },

      accessibility: {
        dropzone:
          '將檔案拖曳到這裡，或點擊選擇檔案'
      },

      utils: {
        cacheHandlerFailed:
          'clearCache 處理程序執行失敗'
      }
    }
  };


  // ============================================================
  // LANGUAGE HELPERS
  // ============================================================

  function hasLanguage(lang) {
    return Object.prototype.hasOwnProperty.call(
      LANGUAGES,
      lang
    );
  }


  function normalizeLanguage(lang) {
    if (!lang) {
      return '';
    }

    return String(lang)
      .trim()
      .replace('_', '-');
  }


  function findBestLanguage(list) {
    if (!Array.isArray(list)) {
      return null;
    }

    for (const raw of list) {
      const lang = normalizeLanguage(raw);

      if (!lang) {
        continue;
      }

      // exact
      if (hasLanguage(lang)) {
        return lang;
      }

      // base language เช่น en-US -> en
      const base = lang.split('-')[0];

      if (hasLanguage(base)) {
        return base;
      }

      /*
       * รองรับกรณี zh-Hant / zh-TW
       */
      if (
        base === 'zh' &&
        (
          lang.toLowerCase().includes('tw') ||
          lang.toLowerCase().includes('hk') ||
          lang.toLowerCase().includes('hant')
        )
      ) {
        if (hasLanguage('zh-TW')) {
          return 'zh-TW';
        }
      }

      if (
        base === 'zh' &&
        (
          lang.toLowerCase().includes('cn') ||
          lang.toLowerCase().includes('sg') ||
          lang.toLowerCase().includes('hans')
        )
      ) {
        if (hasLanguage('zh-CN')) {
          return 'zh-CN';
        }
      }
    }

    return null;
  }


  function getBrowserLanguages() {
    const result = [];

    if (
      typeof navigator !== 'undefined' &&
      Array.isArray(navigator.languages)
    ) {
      result.push(
        ...navigator.languages
      );
    }

    if (
      typeof navigator !== 'undefined' &&
      navigator.language
    ) {
      result.push(
        navigator.language
      );
    }

    return result;
  }


  function detectLanguage() {
    // ----------------------------------------------------------
    // 1. ภาษาที่ผู้ใช้เลือกเอง
    // ----------------------------------------------------------

    let saved = null;

    try {
      saved =
        localStorage.getItem(
          STORAGE_KEY
        );
    } catch (_) {
      saved = null;
    }

    if (
      saved &&
      hasLanguage(saved)
    ) {
      return saved;
    }


    // ----------------------------------------------------------
    // 2. ภาษาของ Browser
    // ----------------------------------------------------------

    const browserLanguages =
      getBrowserLanguages();

    const detected =
      findBestLanguage(
        browserLanguages
      );

    if (detected) {
      return detected;
    }


    // ----------------------------------------------------------
    // 3. fallback
    // ----------------------------------------------------------

    return DEFAULT_LANGUAGE;
  }


  // ============================================================
  // CURRENT LANGUAGE
  // ============================================================

  let currentLanguage =
    detectLanguage();


  // ============================================================
  // GET TRANSLATION
  // ============================================================

  function getNestedValue(
    source,
    path
  ) {
    if (
      !source ||
      !path
    ) {
      return undefined;
    }

    const parts =
      String(path).split('.');

    let current =
      source;

    for (
      let i = 0;
      i < parts.length;
      i++
    ) {
      const key =
        parts[i];

      if (
        current === null ||
        current === undefined ||
        !Object.prototype.hasOwnProperty.call(
          current,
          key
        )
      ) {
        return undefined;
      }

      current =
        current[key];
    }

    return current;
  }


  function interpolate(
    text,
    values
  ) {
    if (
      !values ||
      typeof values !== 'object'
    ) {
      return text;
    }

    return String(text).replace(
      /\{([^}]+)\}/g,
      (
        match,
        key
      ) => {
        if (
          Object.prototype.hasOwnProperty.call(
            values,
            key
          )
        ) {
          return String(
            values[key]
          );
        }

        return match;
      }
    );
  }


  function t(
    key,
    values
  ) {
    const lang =
      LANGUAGES[currentLanguage];

    const fallback =
      LANGUAGES[DEFAULT_LANGUAGE];

    let value =
      getNestedValue(
        lang,
        key
      );

    if (
      value === undefined
    ) {
      value =
        getNestedValue(
          fallback,
          key
        );
    }

    if (
      value === undefined
    ) {
      return String(key);
    }

    if (
      typeof value !== 'string'
    ) {
      return value;
    }

    return interpolate(
      value,
      values
    );
  }


  // ============================================================
  // SET LANGUAGE
  // ============================================================

  function setLanguage(lang) {
    const normalized =
      normalizeLanguage(lang);

    if (
      !hasLanguage(normalized)
    ) {
      return false;
    }

    currentLanguage =
      normalized;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        currentLanguage
      );
    } catch (_) {
      // ignore storage failure
    }

    applyDocumentLanguage();

    /*
     * ให้ Tool อื่น ๆ รู้ว่าภาษาเปลี่ยนแล้ว
     */
    try {
      document.dispatchEvent(
        new CustomEvent(
          'languagechange',
          {
            detail: {
              language:
                currentLanguage
            }
          }
        )
      );
    } catch (_) {}

    return true;
  }


  // ============================================================
  // DOCUMENT LANGUAGE / RTL
  // ============================================================

  function applyDocumentLanguage() {
    if (
      typeof document === 'undefined'
    ) {
      return;
    }

    const langData =
      LANGUAGES[currentLanguage];

    if (!langData) {
      return;
    }

    document.documentElement.lang =
      currentLanguage;

    document.documentElement.dir =
      langData.dir || 'ltr';

    document.documentElement.dataset.language =
      currentLanguage;

    /*
     * อัปเดต element ที่มี data-i18n
     */
    applyTranslations();
  }


  // ============================================================
  // HTML AUTO TRANSLATION
  // ============================================================

  function applyTranslations(
    root
  ) {
    if (
      typeof document === 'undefined'
    ) {
      return;
    }

    const container =
      root || document;

    // ----------------------------------------------------------
    // textContent
    // ----------------------------------------------------------

    const textNodes =
      container.querySelectorAll
        ? container.querySelectorAll(
            '[data-i18n]'
          )
        : [];

    textNodes.forEach(
      element => {
        const key =
          element.getAttribute(
            'data-i18n'
          );

        if (!key) {
          return;
        }

        element.textContent =
          t(key);
      }
    );


    // ----------------------------------------------------------
    // placeholder
    // ----------------------------------------------------------

    const placeholders =
      container.querySelectorAll
        ? container.querySelectorAll(
            '[data-i18n-placeholder]'
          )
        : [];

    placeholders.forEach(
      element => {
        const key =
          element.getAttribute(
            'data-i18n-placeholder'
          );

        if (!key) {
          return;
        }

        element.setAttribute(
          'placeholder',
          t(key)
        );
      }
    );


    // ----------------------------------------------------------
    // title
    // ----------------------------------------------------------

    const titles =
      container.querySelectorAll
        ? container.querySelectorAll(
            '[data-i18n-title]'
          )
        : [];

    titles.forEach(
      element => {
        const key =
          element.getAttribute(
            'data-i18n-title'
          );

        if (!key) {
          return;
        }

        element.setAttribute(
          'title',
          t(key)
        );
      }
    );


    // ----------------------------------------------------------
    // aria-label
    // ----------------------------------------------------------

    const ariaLabels =
      container.querySelectorAll
        ? container.querySelectorAll(
            '[data-i18n-aria-label]'
          )
        : [];

    ariaLabels.forEach(
      element => {
        const key =
          element.getAttribute(
            'data-i18n-aria-label'
          );

        if (!key) {
          return;
        }

        element.setAttribute(
          'aria-label',
          t(key)
        );
      }
    );
  }


  // ============================================================
  // LANGUAGE SELECTOR
  // ============================================================

  function getLanguageInfo(
    lang
  ) {
    return LANGUAGES[lang]
      ? {
          code: lang,
          name:
            LANGUAGES[lang].name,
          nativeName:
            LANGUAGES[lang].nativeName,
          dir:
            LANGUAGES[lang].dir
        }
      : null;
  }


  function getLanguages() {
    return Object.keys(
      LANGUAGES
    ).map(
      code => ({
        code,
        name:
          LANGUAGES[code].name,
        nativeName:
          LANGUAGES[code].nativeName,
        dir:
          LANGUAGES[code].dir
      })
    );
  }


  // ============================================================
  // AUTO INIT
  // ============================================================

  if (
    typeof document !== 'undefined'
  ) {
    if (
      document.readyState ===
      'loading'
    ) {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          applyDocumentLanguage();
        },
        {
          once: true
        }
      );
    } else {
      applyDocumentLanguage();
    }
  }


  // ============================================================
  // PUBLIC API
  // ============================================================

  return {
    t,

    setLanguage,

    getLanguage: () =>
      currentLanguage,

    detectLanguage,

    getLanguages,

    getLanguageInfo,

    applyTranslations
  };
})();

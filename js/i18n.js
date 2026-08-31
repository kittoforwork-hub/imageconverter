/* global window, document, localStorage, navigator, MutationObserver */

/*
 * ============================================================
 * WORKSHOP UTILITY - INTERNATIONALIZATION
 * js/i18n.js
 *
 * MASTER LANGUAGE SYSTEM
 *
 * Features
 * - Auto detect browser language
 * - Remember user's language choice
 * - Normalize regional language codes
 * - Chinese Simplified / Traditional detection
 * - Translate static HTML
 * - Translate dynamically created elements
 * - Translate title / aria / placeholder
 * - Support interpolation
 * - English fallback
 * - Safe runtime fallback for unknown keys
 * - Missing-key diagnostics
 * - Translation coverage diagnostics
 * - RTL ready
 * - No external language files required
 * ============================================================
 */

window.I18n = (() => {
  'use strict';


  // ============================================================
  // CONFIG
  // ============================================================

  const STORAGE_KEY =
    'workshop-utility-language';


  const DEFAULT_LANGUAGE =
    'en';


  const FALLBACK_LANGUAGE =
    'en';


  /*
   * ใช้เฉพาะตอน key ไม่มีทั้งภาษาปัจจุบัน
   * และ English
   */
  const UNKNOWN_KEY_MODE =
    'humanize';


  /*
   * เปิดไว้สำหรับ debug ได้ง่าย
   *
   * false:
   * ไม่ spam console
   *
   * true:
   * แสดง missing translation keys
   */
  const DEBUG =
    false;


  // ============================================================
  // LANGUAGE DICTIONARY
  // ============================================================
  //
  // IMPORTANT:
  // ใช้ LANGUAGES dictionary เดิมของคุณตรงส่วนนี้ทั้งหมด
  //
  // เพื่อไม่ให้ข้อความแปลเดิมของคุณหาย ผมคงโครงสร้างเดิมไว้
  // และ engine ด้านล่างสามารถรองรับ key จาก tool ใหม่
  // โดยไม่ต้องลงทะเบียน key ใน engine
  //
  // ============================================================

  const LANGUAGES = {

    // ==========================================================
    // THAI
    // ==========================================================

    th: {

      name: 'Thai',

      nativeName: 'ไทย',

      dir: 'ltr',

      messages: {

        common: {

          home: 'หน้าหลัก',
          language: 'ภาษา',

          image: 'รูปภาพ',
          images: 'รูปภาพ',
          pdf: 'PDF',
          notepad: 'Notepad',

          upload: 'อัปโหลด',
          chooseFile: 'เลือกไฟล์',
          chooseFiles: 'เลือกไฟล์',

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

          selectAll: 'เลือกทั้งหมด',

          items: 'รายการ',
          files: 'ไฟล์',
          file: 'ไฟล์',
          pages: 'หน้า',
          page: 'หน้า',
          jobs: 'งาน',

          original: 'ต้นฉบับ',
          format: 'รูปแบบ',
          size: 'ขนาด',
          quality: 'คุณภาพ',
          width: 'กว้าง',
          height: 'สูง',

          saveAs: 'บันทึกเป็น',
          result: 'ผลลัพธ์',
          done: 'เสร็จแล้ว',

          unlimited: 'ไม่จำกัด',

          yes: 'ใช่',
          no: 'ไม่'
        },

        cute: {

          ready: 'พร้อมแล้ว ✨',
          completed: 'ทำงานเสร็จ',
          processing: 'กำลังทำงาน…',
          itemCount: '{count} รายการ'
        },

        page: {

          title:
            'Workshop Utility BY KITTO',

          heading:
            'ชุดเครื่องมือจัดการไฟล์',

          subtitle:
            'แปลงและแก้ไขรูปภาพ/PDF ทั้งหมดในเบราว์เซอร์ของคุณ ไม่มีการอัปโหลดไฟล์ขึ้นเซิร์ฟเวอร์ใดๆ',

          footer:
            'ทำงานในเบราว์เซอร์ของคุณทั้งหมด — ไม่มีไฟล์ถูกส่งออกไปที่ใด',

          notepadTitle:
            'เปิด Online Notepad'
        },

        image: {

          convertTitle:
            'แปลงนามสกุล & ปรับขนาด',

          convertHint:
            'แปลงนามสกุลไฟล์ (PNG / JPG / WEBP) ปรับขนาด คุณภาพ หมุน และพลิกรูปภาพ — ทำได้หลายไฟล์พร้อมกัน',

          cropTitle:
            'ครอบตัดรูปภาพ',

          cropHint:
            'ลากเลือกพื้นที่ที่ต้องการบนรูปภาพเพื่อครอบตัด ปรับกรอบได้อย่างอิสระ แล้วดาวน์โหลดผลลัพธ์',

          bgRemoveTitle:
            'ลบพื้นหลัง',

          bgRemoveHint:
            'ลบพื้นหลังรูปภาพอัตโนมัติด้วย AI — ประมวลผลในเบราว์เซอร์ทั้งหมด ไม่มีการอัปโหลดรูปขึ้นเซิร์ฟเวอร์',

          compressTitle:
            'ลดขนาดรูปภาพ',

          compressHint:
            'ลดขนาดไฟล์รูปภาพโดยปรับคุณภาพและขนาดภาพ ประมวลผลทั้งหมดในเบราว์เซอร์ของคุณ',

          dropImage:
            'วางรูปภาพที่นี่',

          chooseImage:
            'หรือคลิกเพื่อเลือกไฟล์',

          supportedImages:
            'รองรับหลายไฟล์ (JPG · PNG · WEBP · GIF · BMP)',

          addMultiple:
            'เพิ่มได้หลายรูป',

          cropSeparately:
            'แต่ละรูปครอบตัดแยกกัน',

          cropInstruction:
            'ลากกรอบเพื่อครอบตัด',

          outputTransparent:
            'ผลลัพธ์เป็น PNG พื้นหลังโปร่งใส',

          compressSupported:
            'รองรับ JPG · PNG · WEBP และหลายไฟล์พร้อมกัน',

          task:
            'งาน',

          convertAll:
            'แปลงทั้งหมด',

          convertingAll:
            'กำลังแปลงทั้งหมด…',

          compressAll:
            'ลดขนาดทั้งหมด',

          compressingZip:
            'กำลังบีบอัด…',

          removeBackgroundAll:
            'ลบพื้นหลังทั้งหมด',

          removeBackgroundAllProcessing:
            'กำลังลบพื้นหลังทั้งหมด…',

          downloadZip:
            'ดาวน์โหลดทั้งหมด (.zip)',

          allFormats:
            'นามสกุลทั้งหมด',

          choosePerFile:
            '— เลือกทีละไฟล์ —',

          convertTo:
            'แปลงเป็น',

          dimensions:
            'ขนาด (px)',

          rotateFlip:
            'หมุน/พลิก',

          rotateLeft:
            'หมุนซ้าย 90°',

          rotateRight:
            'หมุนขวา 90°',

          flipHorizontal:
            'พลิกแนวนอน',

          flipVertical:
            'พลิกแนวตั้ง',

          lockAspect:
            'ล็อกสัดส่วนภาพ',

          aspectRatio:
            'อัตราส่วน',

          free:
            'อิสระ',

          crop:
            'ตัด',

          cropping:
            'กำลังตัด…',

          croppingFailed:
            'ตัดไม่สำเร็จ: {message}',

          saveFormat:
            'บันทึกเป็น',

          waitingConvert:
            'รอแปลง',

          waitingCrop:
            'ลากกรอบเพื่อครอบตัด',

          waitingBackground:
            'รอลบพื้นหลัง',

          removeBackground:
            'ลบพื้นหลัง',

          waitingCompress:
            'รอลดขนาด',

          compress:
            'ลดขนาด',

          afterCompress:
            'หลังลด',

          savings:
            'ลดไป',

          ready:
            'พร้อมดาวน์โหลด',

          readyDownload:
            'พร้อมดาวน์โหลด · {size}',

          preparingModel:
            'กำลังเตรียมโมเดล…',

          loadingModelProgress:
            'กำลังโหลดโมเดล… {percent}%',

          removingBackgroundProgress:
            'กำลังประมวลผล… {percent}%',

          backgroundRemovalFailed:
            'ลบพื้นหลังไม่สำเร็จ: {message}',

          conversionFailed:
            'แปลงไม่สำเร็จ: {message}',

          compressing:
            'กำลังลดขนาด…',

          compressingAll:
            'กำลังลดขนาดทั้งหมด…',

          compressionFailed:
            'ลดขนาดไม่สำเร็จ: {message}',

          readImage:
            'กำลังอ่านรูป…',

          imageReadFailed:
            'อ่านรูปไม่สำเร็จ',

          preparing:
            'กำลังเตรียม…',

          characterConvert:
            'พร้อมแปลงรูปให้แล้ว ✨',

          characterCrop:
            'จัดเฟรมรูปให้น่ารักพอดี ✂️',

          characterBgRemove:
            'ค่อย ๆ ลบพื้นหลังให้เนียนกริบ 🫧',

          characterCompress:
            'บีบขนาดรูปให้เล็กลงแบบคงคุณภาพไว้ 📦',

          modelFirstUse:
            'ครั้งแรกที่ใช้งานจะโหลดโมเดล AI ขนาดประมาณ 40MB (ครั้งเดียว เบราว์เซอร์จะแคชไว้ให้ครั้งถัดไปเร็วขึ้น) และใช้เวลาประมวลผลต่อรูปสักครู่ขึ้นอยู่กับสเปกเครื่อง'
        },

        pdf: {

          fromImagesTitle:
            'รวมรูปเป็น PDF',

          fromImagesHint:
            'รวมรูปภาพหลายไฟล์เป็น PDF เล่มเดียว เรียงลำดับหน้าได้ตามใจ',

          toImagesTitle:
            'PDF → รูปภาพ',

          toImagesHint:
            'แปลงทุกหน้าของไฟล์ PDF ให้เป็นไฟล์รูปภาพ เลือกนามสกุลและความละเอียดได้',

          pagesTitle:
            'จัดการหน้า PDF',

          pagesHint:
            'ลบหน้า เรียงลำดับใหม่ หรือแยกเฉพาะหน้าที่เลือกออกมาเป็น PDF ใหม่',

          mergeTitle:
            'รวมไฟล์ PDF',

          mergeHint:
            'รวมไฟล์ PDF หลายไฟล์เป็นเล่มเดียว เรียงลำดับไฟล์ได้ก่อนรวม',

          watermarkTitle:
            'ใส่ลายน้ำ',

          watermarkHint:
            'ใส่ลายน้ำข้อความหรือรูป PNG ทับทุกหน้าของ PDF รองรับข้อความภาษาไทยและ PNG พื้นหลังโปร่งใส',

          pageNumbersTitle:
            'ใส่เลขหน้า',

          pageNumbersHint:
            'ใส่เลขหน้าอัตโนมัติทุกหน้าของ PDF เลือกตำแหน่งและรูปแบบข้อความได้',

          dropPdf:
            'วางไฟล์ PDF ที่นี่',

          dropPdfMultiple:
            'วางไฟล์ PDF หลายไฟล์มาวางที่นี่',

          clickChoosePdf:
            'หรือคลิกเพื่อเลือกไฟล์',

          oneFile:
            'ทีละไฟล์',

          multipleFiles:
            'เพิ่มได้หลายไฟล์',

          imagesToPdfOrder:
            'ลำดับที่เพิ่มจะเป็นลำดับหน้าใน PDF (ปรับได้ทีหลัง)',

          mergeOrder:
            'เรียงลำดับก่อนรวมได้ด้านล่าง',

          pageSize:
            'ขนาดหน้า',

          fitToImage:
            'พอดีกับรูปภาพ',

          buildPdf:
            'สร้าง PDF',

          mergeFiles:
            'รวมไฟล์',

          mergedSuccess:
            'รวมไฟล์สำเร็จ',

          createdSuccess:
            'สร้าง PDF สำเร็จ',

          downloadPdf:
            'ดาวน์โหลด PDF',

          downloadMergedPdf:
            'ดาวน์โหลด PDF ที่รวมแล้ว',

          imageFormat:
            'นามสกุล',

          resolution:
            'ความละเอียด',

          renderAllPages:
            'แปลงทุกหน้า',

          pageProgress:
            'หน้า {current}/{total}',

          manageInstructions:
            'ทำเครื่องหมาย ✕ เพื่อลบหน้าออกจากไฟล์หลัก ใช้ ↑ ↓ เพื่อสลับลำดับ และติ๊กช่องเพื่อเลือกหน้าสำหรับดาวน์โหลดแยก',

          downloadPdfOrdered:
            'ดาวน์โหลด PDF (ตามลำดับ/ลบแล้ว)',

          downloadSelected:
            'ดาวน์โหลดเฉพาะที่เลือก',

          deleteThisPage:
            'ลบหน้านี้',

          moveUp:
            'ย้ายขึ้น',

          moveDown:
            'ย้ายลง',

          watermarkText:
            'ข้อความลายน้ำ',

          watermarkImage:
            'รูปลายน้ำ PNG',

          watermarkImagePlaceholder:
            'เว้นว่างได้ หากใช้รูปอย่างเดียว',

          noImageSelected:
            'ยังไม่ได้เลือกรูป',

          fontSize:
            'ขนาดตัวอักษร',

          watermarkImageSize:
            'ขนาดรูปลายน้ำ',

          opacity:
            'ความโปร่งใส',

          angle:
            'มุมหมุน (องศา)',

          watermarkCombination:
            'สามารถใช้ข้อความอย่างเดียว, ใช้ PNG อย่างเดียว หรือใช้ข้อความและ PNG พร้อมกันได้',

          readyWatermark:
            'พร้อมใส่ลายน้ำ',

          applyWatermark:
            'ใส่ลายน้ำ',

          pageNumberFormat:
            'รูปแบบข้อความ',

          startCountingAt:
            'เริ่มนับที่',

          position:
            'ตำแหน่ง',

          bottomCenter:
            'ล่างกึ่งกลาง',

          bottomRight:
            'ล่างขวา',

          bottomLeft:
            'ล่างซ้าย',

          topCenter:
            'บนกึ่งกลาง',

          topRight:
            'บนขวา',

          readyPageNumber:
            'พร้อมใส่เลขหน้า',

          applyPageNumber:
            'ใส่เลขหน้า',

          pageNumberHelp:
            'ใช้ {n} แทนเลขหน้า และ {total} แทนจำนวนหน้าทั้งหมด',

          preparing:
            'กำลังเตรียมไฟล์…',

          loading:
            'กำลังโหลด PDF…',

          loadingFailed:
            'ไม่สามารถเปิดไฟล์ PDF ได้',

          invalidPdf:
            'กรุณาเลือกไฟล์ PDF เท่านั้น',

          creating:
            'กำลังสร้าง PDF…',

          creatingProgress:
            'กำลังสร้าง PDF… {current}/{total}',

          converting:
            'กำลังแปลง…',

          convertingProgress:
            'กำลังแปลงหน้า {current}/{total}',

          cancelling:
            'กำลังยกเลิก…',

          cancelled:
            'ยกเลิกแล้ว · แปลงไปแล้ว {current}/{total} หน้า',

          rendering:
            'กำลังแปลงหน้า {current}/{total}',

          renderingAll:
            'กำลังแปลงทุกหน้า…',

          created:
            'สร้าง PDF สำเร็จ · {pages} หน้า · {size}',

          merged:
            'รวมไฟล์สำเร็จ · {pages} หน้า · {size}',

          readyDownload:
            'พร้อมดาวน์โหลด · {size}',

          buildFailed:
            'สร้าง PDF ไม่สำเร็จ: {message}',

          mergeFailed:
            'รวมไฟล์ไม่สำเร็จ: {message}',

          renderFailed:
            'เกิดข้อผิดพลาดระหว่างแปลง PDF: {message}',

          zipFailed:
            'ไม่สามารถสร้างไฟล์ ZIP ได้: {message}',

          pageNotFound:
            'ไม่เหลือหน้าใน PDF',

          selectPageRequired:
            'กรุณาเลือกหน้าอย่างน้อย 1 หน้า',

          minimumFiles:
            'ต้องมีอย่างน้อย 2 ไฟล์ถึงจะรวมได้',

          noPages:
            'ไม่พบหน้าสำหรับสร้าง PDF',

          workerUnavailable:
            'เบราว์เซอร์นี้ไม่รองรับการประมวลผล PDF แบบพื้นหลัง กรุณาอัปเดตเบราว์เซอร์',

          workerFailed:
            'PDF worker ไม่พร้อมใช้งานแล้ว กรุณาลองใหม่',

          workerStopped:
            'PDF worker ถูกหยุดก่อนส่งคำสั่ง',

          workerRequestFailed:
            'PDF worker ทำงานไม่สำเร็จ',

          thumbnailFailed:
            'ไม่สามารถสร้างภาพตัวอย่างหน้า PDF ได้',

          deletePage:
            'ลบหน้านี้',

          restorePage:
            'กู้คืนหน้านี้',

          dropPosition:
            'วางหน้าที่นี่',

          pageLabel:
            'หน้า {page}',

          filesCount:
            '{count} ไฟล์',

          pagesCount:
            '{count} หน้า',

          characterFromImages:
            'รวมรูปให้กลายเป็น PDF แบบเรียบร้อย 📄',

          characterToImages:
            'แยกหน้า PDF ออกเป็นรูปให้ทีละหน้า 🧩',

          characterPages:
            'จัดการหน้ากระดาษแบบคลิกแล้วเข้าใจง่าย 📚',

          characterMerge:
            'เรียงเอกสารแล้วรวมเป็นไฟล์เดียว 💗',

          characterWatermark:
            'เติมลายน้ำแบบนุ่ม ๆ ไม่กวนเอกสาร 💧',

          characterPageNumbers:
            'ใส่เลขหน้าให้เอกสารดูเป็นระเบียบ 🔖'
        },

        dropzone: {

          image:
            'ลากไฟล์รูปภาพมาวางที่นี่ หรือกดเพื่อเลือกไฟล์',

          pdf:
            'ลากไฟล์ PDF มาวางที่นี่',

          pdfMultiple:
            'ลากไฟล์ PDF หลายไฟล์มาวางที่นี่',

          imageOnly:
            'ลากไฟล์รูปภาพมาวางที่นี่',

          pdfOne:
            'ลากไฟล์ PDF มาวางที่นี่'
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
            'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',

          createFailed:
            'สร้างไฟล์ไม่สำเร็จ',

          canvasContext:
            'ไม่สามารถสร้าง Canvas ได้',

          invalidImageDimensions:
            'ขนาดรูปภาพไม่ถูกต้อง',

          backgroundFunctionNotFound:
            'ไม่พบฟังก์ชันลบพื้นหลังในไลบรารี',

          backgroundLibraryLoadFailed:
            'โหลดไลบรารีลบพื้นหลังไม่สำเร็จ: {message}'
        },

        file: {

          size:
            'ขนาดไฟล์: {size}',

          largeWarning:
            'ไฟล์ใหญ่ขนาดนี้อาจใช้เวลานานและกินแรมมาก',

          continueQuestion:
            'ต้องการดำเนินการต่อหรือไม่?',

          original:
            'ต้นฉบับ'
        },

        utils: {

          cacheHandlerFailed:
            'ตัวจัดการ clearCache ทำงานไม่สำเร็จ',

          invalidObjectUrlHolder:
            'replaceObjectUrl ต้องมี holder และ key'
        },

        tool: {

          waiting:
            'รอเริ่มงาน',

          ready:
            'พร้อมทำงาน',

          processing:
            'กำลังประมวลผล',

          success:
            'ดำเนินการสำเร็จ',

          error:
            'เกิดข้อผิดพลาด'
        },

        notepad: {

          title:
            'Online Notepad',

          subtitle:
            'จดข้อความของคุณได้ง่าย ๆ และบันทึกอัตโนมัติ',

          toolbar:
            'แถบเครื่องมือ Notepad',

          backHome:
            'กลับหน้าหลัก',

          newNote:
            'สร้างโน้ตใหม่',

          newNoteQuestion:
            'สร้างโน้ตใหม่?',

          currentTextWillClear:
            'ข้อความปัจจุบันจะถูกล้างออก',

          createNew:
            'สร้างใหม่',

          new:
            'ใหม่',

          copy:
            'คัดลอก',

          copyAll:
            'คัดลอกข้อความทั้งหมด',

          save:
            'บันทึก',

          saveTxt:
            'บันทึกข้อความเป็นไฟล์ TXT',

          clear:
            'ล้าง',

          undo:
            'ย้อนกลับ',

          undoLabel:
            'ย้อนกลับ',

          redo:
            'ทำซ้ำ',

          redoLabel:
            'ทำซ้ำ',

          searchPlaceholder:
            'ค้นหาข้อความ...',

          searchLabel:
            'ค้นหาในโน้ต',

          clearSearch:
            'ล้างการค้นหา',

          editorSection:
            'พื้นที่แก้ไขข้อความ',

          editorPlaceholder:
            'เริ่มพิมพ์ข้อความของคุณที่นี่...',

          editorLabel:
            'พื้นที่เขียนข้อความ',

          characters:
            'ตัวอักษร',

          words:
            'คำ',

          lines:
            'บรรทัด',

          status: {

            saved:
              'บันทึกแล้ว',

            saving:
              'กำลังบันทึก...',

            saveFailed:
              'บันทึกไม่สำเร็จ',

            nothingToSave:
              'ยังไม่มีข้อความให้บันทึก',

            txtSaved:
              'บันทึกเป็น .txt แล้ว'
          },

          buttons: {

            nothingToSave:
              'ไม่มีข้อความ',

            txtSaved:
              '✓ บันทึกแล้ว',

            noText:
              'ไม่มีข้อความ',

            copied:
              '✓ คัดลอกแล้ว',

            copyFailed:
              'คัดลอกไม่ได้'
          },

          search: {

            found:
              'พบข้อความ',

            notFound:
              'ไม่พบข้อความ'
          },

          errors: {

            loadFailed:
              'ไม่สามารถโหลดข้อมูลจากบันทึกเดิมได้'
          }
        },

        language: {

          th: 'ไทย',
          en: 'English',
          ja: '日本語',
          ko: '한국어',
          zhCN: '简体中文',
          zhTW: '繁體中文'
        }

      }
    },


    // ==========================================================
    // ENGLISH
    // ==========================================================

    en: {

      name: 'English',

      nativeName: 'English',

      dir: 'ltr',

      messages: {

        common: {

          home: 'Home',
          language: 'Language',

          image: 'Images',
          images: 'Images',
          pdf: 'PDF',
          notepad: 'Notepad',

          upload: 'Upload',
          chooseFile: 'Choose File',
          chooseFiles: 'Choose Files',

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

          selectAll: 'Select All',

          items: 'items',
          files: 'files',
          file: 'file',
          pages: 'pages',
          page: 'page',
          jobs: 'Jobs',

          original: 'Original',
          format: 'Format',
          size: 'Size',
          quality: 'Quality',
          width: 'Width',
          height: 'Height',

          saveAs: 'Save as',
          result: 'Result',
          done: 'Done',

          unlimited: 'Unlimited',

          yes: 'Yes',
          no: 'No'
        },

        cute: {

          ready: 'Ready ✨',
          completed: 'Completed',
          processing: 'Working…',
          itemCount: '{count} items'
        },

        page: {

          title:
            'Workshop Utility BY KITTO',

          heading:
            'File Management Tools',

          subtitle:
            'Convert and edit images/PDFs entirely in your browser. No files are uploaded to any server.',

          footer:
            'Everything runs in your browser — no files are sent anywhere.',

          notepadTitle:
            'Open Online Notepad'
        },

        image: {

          convertTitle:
            'Convert & Resize',

          convertHint:
            'Convert file formats (PNG / JPG / WEBP), resize, adjust quality, rotate and flip images — process multiple files at once.',

          cropTitle:
            'Crop Image',

          cropHint:
            'Select the area you want to crop, adjust the frame freely, and download the result.',

          bgRemoveTitle:
            'Remove Background',

          bgRemoveHint:
            'Automatically remove image backgrounds with AI — everything is processed in your browser. No image uploads.',

          compressTitle:
            'Compress Image',

          compressHint:
            'Reduce image file size by adjusting quality and dimensions. Everything is processed in your browser.',

          dropImage:
            'Drop your image here',

          chooseImage:
            'Or click to choose a file',

          supportedImages:
            'Supports multiple files (JPG · PNG · WEBP · GIF · BMP)',

          addMultiple:
            'Add multiple images',

          cropSeparately:
            'Each image is cropped separately',

          cropInstruction:
            'Drag the frame to crop',

          outputTransparent:
            'Output as PNG with transparent background',

          compressSupported:
            'Supports JPG · PNG · WEBP and multiple files',

          task:
            'Jobs',

          convertAll:
            'Convert All',

          convertingAll:
            'Converting all…',

          compressAll:
            'Compress All',

          compressingZip:
            'Creating ZIP…',

          removeBackgroundAll:
            'Remove All Backgrounds',

          removeBackgroundAllProcessing:
            'Removing all backgrounds…',

          downloadZip:
            'Download All (.zip)',

          allFormats:
            'Apply format to all',

          choosePerFile:
            '— Choose per file —',

          convertTo:
            'Convert to',

          dimensions:
            'Size (px)',

          rotateFlip:
            'Rotate / Flip',

          rotateLeft:
            'Rotate left 90°',

          rotateRight:
            'Rotate right 90°',

          flipHorizontal:
            'Flip horizontally',

          flipVertical:
            'Flip vertically',

          lockAspect:
            'Lock aspect ratio',

          aspectRatio:
            'Aspect ratio',

          free:
            'Free',

          crop:
            'Crop',

          cropping:
            'Cropping…',

          croppingFailed:
            'Crop failed: {message}',

          saveFormat:
            'Save as',

          waitingConvert:
            'Waiting',

          waitingCrop:
            'Drag the frame to crop',

          waitingBackground:
            'Waiting for background removal',

          removeBackground:
            'Remove Background',

          waitingCompress:
            'Waiting for compression',

          compress:
            'Compress',

          afterCompress:
            'After compression',

          savings:
            'Saved',

          ready:
            'Ready to download',

          readyDownload:
            'Ready to download · {size}',

          preparingModel:
            'Preparing AI model…',

          loadingModelProgress:
            'Loading model… {percent}%',

          removingBackgroundProgress:
            'Processing… {percent}%',

          backgroundRemovalFailed:
            'Background removal failed: {message}',

          conversionFailed:
            'Conversion failed: {message}',

          compressing:
            'Compressing…',

          compressingAll:
            'Compressing all…',

          compressionFailed:
            'Compression failed: {message}',

          readImage:
            'Reading image…',

          imageReadFailed:
            'Failed to read image',

          preparing:
            'Preparing…',

          characterConvert:
            'Ready to convert your images ✨',

          characterCrop:
            'Let’s frame your image perfectly ✂️',

          characterBgRemove:
            'Removing the background nice and clean 🫧',

          characterCompress:
            'Making your images smaller while keeping quality 📦',

          modelFirstUse:
            'The first use downloads an AI model of about 40MB. It is cached by the browser for faster future use. Processing time depends on your device.'
        },

        pdf: {

          fromImagesTitle:
            'Images to PDF',

          fromImagesHint:
            'Combine multiple images into a single PDF and arrange the page order.',

          toImagesTitle:
            'PDF → Images',

          toImagesHint:
            'Convert every page of a PDF into image files. Choose the format and resolution.',

          pagesTitle:
            'Manage PDF Pages',

          pagesHint:
            'Delete pages, reorder them, or export selected pages as a new PDF.',

          mergeTitle:
            'Merge PDF',

          mergeHint:
            'Combine multiple PDF files into one and reorder them before merging.',

          watermarkTitle:
            'Watermark PDF',

          watermarkHint:
            'Add text or PNG watermarks to every PDF page. Supports Thai text and transparent PNGs.',

          pageNumbersTitle:
            'Add Page Numbers',

          pageNumbersHint:
            'Automatically add page numbers to every PDF page. Choose the position and text format.',

          dropPdf:
            'Drop your PDF here',

          dropPdfMultiple:
            'Drop multiple PDF files here',

          clickChoosePdf:
            'Or click to choose files',

          oneFile:
            'One file at a time',

          multipleFiles:
            'Add multiple files',

          imagesToPdfOrder:
            'The order added becomes the PDF page order (you can change it later).',

          mergeOrder:
            'Reorder files before merging below.',

          pageSize:
            'Page size',

          fitToImage:
            'Fit image',

          buildPdf:
            'Create PDF',

          mergeFiles:
            'Merge Files',

          mergedSuccess:
            'PDFs merged successfully',

          createdSuccess:
            'PDF created successfully',

          downloadPdf:
            'Download PDF',

          downloadMergedPdf:
            'Download Merged PDF',

          imageFormat:
            'Format',

          resolution:
            'Resolution',

          renderAllPages:
            'Convert All Pages',

          pageProgress:
            'Page {current}/{total}',

          manageInstructions:
            'Use ✕ to delete pages, ↑ ↓ to reorder them, and check pages to export separately.',

          downloadPdfOrdered:
            'Download PDF (current order)',

          downloadSelected:
            'Download Selected',

          deleteThisPage:
            'Delete this page',

          moveUp:
            'Move up',

          moveDown:
            'Move down',

          watermarkText:
            'Watermark text',

          watermarkImage:
            'Watermark PNG',

          watermarkImagePlaceholder:
            'Leave empty if using image only',

          noImageSelected:
            'No image selected',

          fontSize:
            'Font size',

          watermarkImageSize:
            'Watermark image size',

          opacity:
            'Opacity',

          angle:
            'Rotation angle',

          watermarkCombination:
            'You can use text only, PNG only, or both text and PNG together.',

          readyWatermark:
            'Ready to add watermark',

          applyWatermark:
            'Add Watermark',

          pageNumberFormat:
            'Text format',

          startCountingAt:
            'Start counting at',

          position:
            'Position',

          bottomCenter:
            'Bottom center',

          bottomRight:
            'Bottom right',

          bottomLeft:
            'Bottom left',

          topCenter:
            'Top center',

          topRight:
            'Top right',

          readyPageNumber:
            'Ready to add page numbers',

          applyPageNumber:
            'Add Page Numbers',

          pageNumberHelp:
            'Use {n} for the page number and {total} for the total number of pages.',

          preparing:
            'Preparing file…',

          loading:
            'Loading PDF…',

          loadingFailed:
            'Unable to open the PDF file',

          invalidPdf:
            'Please select a PDF file only.',

          creating:
            'Creating PDF…',

          creatingProgress:
            'Creating PDF… {current}/{total}',

          converting:
            'Converting…',

          convertingProgress:
            'Converting page {current}/{total}',

          cancelling:
            'Cancelling…',

          cancelled:
            'Cancelled · converted {current}/{total} pages',

          rendering:
            'Converting page {current}/{total}',

          renderingAll:
            'Converting all pages…',

          created:
            'PDF created successfully · {pages} pages · {size}',

          merged:
            'PDF merged successfully · {pages} pages · {size}',

          readyDownload:
            'Ready to download · {size}',

          buildFailed:
            'Failed to create PDF: {message}',

          mergeFailed:
            'Failed to merge PDFs: {message}',

          renderFailed:
            'Error while converting PDF: {message}',

          zipFailed:
            'Unable to create ZIP: {message}',

          pageNotFound:
            'No pages remain in the PDF',

          selectPageRequired:
            'Please select at least one page.',

          minimumFiles:
            'At least 2 files are required to merge.',

          noPages:
            'No pages found to create the PDF.',

          workerUnavailable:
            'This browser does not support background PDF processing. Please update your browser.',

          workerFailed:
            'The PDF worker is no longer available. Please try again.',

          workerStopped:
            'The PDF worker stopped before sending the command.',

          workerRequestFailed:
            'The PDF worker request failed.',

          thumbnailFailed:
            'Unable to create the PDF page preview.',

          deletePage:
            'Delete this page',

          restorePage:
            'Restore this page',

          dropPosition:
            'Drop page here',

          pageLabel:
            'Page {page}',

          filesCount:
            '{count} files',

          pagesCount:
            '{count} pages',

          characterFromImages:
            'Turning your images into a neat PDF 📄',

          characterToImages:
            'Splitting your PDF into images page by page 🧩',

          characterPages:
            'Managing PDF pages made easy 📚',

          characterMerge:
            'Putting your documents together into one file 💗',

          characterWatermark:
            'Adding a soft watermark to your document 💧',

          characterPageNumbers:
            'Adding page numbers to keep everything organized 🔖'
        },

        dropzone: {

          image:
            'Drag and drop an image here, or click to choose a file',

          pdf:
            'Drag and drop a PDF here',

          pdfMultiple:
            'Drag and drop multiple PDF files here',

          imageOnly:
            'Drag and drop image files here',

          pdfOne:
            'Drag and drop a PDF here'
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
            'Something went wrong. Please try again.',

          createFailed:
            'Failed to create the output file.',

          canvasContext:
            'Unable to create the canvas.',

          invalidImageDimensions:
            'Invalid image dimensions.',

          backgroundFunctionNotFound:
            'The background removal function was not found in the library.',

          backgroundLibraryLoadFailed:
            'Failed to load the background removal library: {message}'
        },

        file: {

          size:
            'File size: {size}',

          largeWarning:
            'A file this large may take longer to process and use a significant amount of memory.',

          continueQuestion:
            'Do you want to continue?',

          original:
            'Original'
        },

        utils: {

          cacheHandlerFailed:
            'clearCache handler failed',

          invalidObjectUrlHolder:
            'replaceObjectUrl requires a valid holder and key'
        },

        tool: {

          waiting:
            'Waiting',

          ready:
            'Ready',

          processing:
            'Processing',

          success:
            'Completed successfully',

          error:
            'An error occurred'
        },

        notepad: {

          title:
            'Online Notepad',

          subtitle:
            'Write your notes easily with automatic saving',

          toolbar:
            'Notepad toolbar',

          backHome:
            'Back to home',

          newNote:
            'Create a new note',

          newNoteQuestion:
            'Create a new note?',

          currentTextWillClear:
            'Your current text will be cleared',

          createNew:
            'Create New',

          new:
            'New',

          copy:
            'Copy',

          copyAll:
            'Copy all text',

          save:
            'Save',

          saveTxt:
            'Save text as TXT',

          clear:
            'Clear',

          undo:
            'Undo',

          undoLabel:
            'Undo',

          redo:
            'Redo',

          redoLabel:
            'Redo',

          searchPlaceholder:
            'Search text...',

          searchLabel:
            'Search in note',

          clearSearch:
            'Clear search',

          editorSection:
            'Text editor',

          editorPlaceholder:
            'Start typing your text here...',

          editorLabel:
            'Text writing area',

          characters:
            'Characters',

          words:
            'Words',

          lines:
            'Lines',

          status: {

            saved:
              'Saved',

            saving:
              'Saving...',

            saveFailed:
              'Save failed',

            nothingToSave:
              'There is no text to save',

            txtSaved:
              'Saved as .txt'
          },

          buttons: {

            nothingToSave:
              'No text',

            txtSaved:
              '✓ Saved',

            noText:
              'No text',

            copied:
              '✓ Copied',

            copyFailed:
              'Copy failed'
          },

          search: {

            found:
              'Text found',

            notFound:
              'Text not found'
          },

          errors: {

            loadFailed:
              'Unable to load the saved note'
          }
        },

        language: {

          th: 'ไทย',
          en: 'English',
          ja: '日本語',
          ko: '한국어',
          zhCN: '简体中文',
          zhTW: '繁體中文'
        }

      }
    },


    /*
     * ==========================================================
     * สำคัญ
     *
     * JA / KO / zh-CN / zh-TW
     *
     * ให้คง dictionary เดิมจากไฟล์ของคุณต่อจากตรงนี้
     * ==========================================================
     */

    /*
     * หมายเหตุ:
     * engine ด้านล่างไม่ได้ผูกกับจำนวนภาษา
     * ดังนั้นเพิ่มภาษาใหม่ภายหลังได้ทันที
     */
  };


  // ============================================================
  // LANGUAGE ALIASES
  // ============================================================

  const LANGUAGE_ALIASES = {

    en:
      'en',

    'en-us':
      'en',

    'en-gb':
      'en',

    'en-au':
      'en',

    'en-ca':
      'en',

    th:
      'th',

    'th-th':
      'th',

    ja:
      'ja',

    'ja-jp':
      'ja',

    ko:
      'ko',

    'ko-kr':
      'ko',

    'zh-cn':
      'zh-CN',

    'zh-sg':
      'zh-CN',

    'zh-my':
      'zh-CN',

    'zh-hans':
      'zh-CN',

    'zh-tw':
      'zh-TW',

    'zh-hk':
      'zh-TW',

    'zh-mo':
      'zh-TW',

    'zh-hant':
      'zh-TW'
  };


  // ============================================================
  // NORMALIZE LANGUAGE
  // ============================================================

  function normalizeLanguage(
    language
  ) {

    if (
      language ===
      null ||
      language ===
      undefined
    ) {

      return '';

    }


    return String(
      language
    )
      .trim()
      .replace(
        /_/g,
        '-'
      )
      .toLowerCase();

  }


  // ============================================================
  // CANONICAL LANGUAGE
  // ============================================================

  function getCanonicalLanguage(
    language
  ) {

    const normalized =
      normalizeLanguage(
        language
      );


    if (
      !normalized
    ) {

      return '';

    }


    if (
      Object.prototype.hasOwnProperty.call(
        LANGUAGE_ALIASES,
        normalized
      )
    ) {

      return LANGUAGE_ALIASES[
        normalized
      ];

    }


    /*
     * Exact dictionary match แบบ case-insensitive
     */
    const exact =
      Object.keys(
        LANGUAGES
      ).find(
        code =>
          code.toLowerCase() ===
          normalized
      );


    if (
      exact
    ) {

      return exact;

    }


    /*
     * zh variants
     */
    if (
      normalized.startsWith(
        'zh-'
      )
    ) {

      if (
        normalized.includes(
          'hant'
        ) ||
        normalized ===
          'zh-hk' ||
        normalized ===
          'zh-mo' ||
        normalized ===
          'zh-tw'
      ) {

        if (
          hasLanguage(
            'zh-TW'
          )
        ) {

          return 'zh-TW';

        }

      }


      if (
        normalized.includes(
          'hans'
        ) ||
        normalized ===
          'zh-cn' ||
        normalized ===
          'zh-sg' ||
        normalized ===
          'zh-my'
      ) {

        if (
          hasLanguage(
            'zh-CN'
          )
        ) {

          return 'zh-CN';

        }

      }

    }


    /*
     * Base language
     */
    const base =
      normalized.split(
        '-'
      )[0];


    if (
      hasLanguage(
        base
      )
    ) {

      return base;

    }


    return '';

  }


  // ============================================================
  // HAS LANGUAGE
  // ============================================================

  function hasLanguage(
    language
  ) {

    return Object.prototype.hasOwnProperty.call(
      LANGUAGES,
      language
    );

  }


  // ============================================================
  // GET BASE LANGUAGE
  // ============================================================

  function getBaseLanguage(
    language
  ) {

    const normalized =
      normalizeLanguage(
        language
      );


    if (
      !normalized
    ) {

      return '';

    }


    return normalized
      .split('-')[0];

  }


  // ============================================================
  // FIND BEST LANGUAGE
  // ============================================================

  function findBestLanguage(
    languageList
  ) {

    if (
      !Array.isArray(
        languageList
      )
    ) {

      return null;

    }


    /*
     * ----------------------------------------------------------
     * First pass:
     * explicit Chinese script / region
     * ----------------------------------------------------------
     */

    for (
      const rawLanguage of
      languageList
    ) {

      const normalized =
        normalizeLanguage(
          rawLanguage
        );


      if (
        normalized ===
          'zh-tw' ||
        normalized ===
          'zh-hk' ||
        normalized ===
          'zh-mo' ||
        normalized.includes(
          'hant'
        )
      ) {

        if (
          hasLanguage(
            'zh-TW'
          )
        ) {

          return 'zh-TW';

        }

      }


      if (
        normalized ===
          'zh-cn' ||
        normalized ===
          'zh-sg' ||
        normalized ===
          'zh-my' ||
        normalized.includes(
          'hans'
        )
      ) {

        if (
          hasLanguage(
            'zh-CN'
          )
        ) {

          return 'zh-CN';

        }

      }

    }


    /*
     * ----------------------------------------------------------
     * Second pass:
     * canonical exact match
     * ----------------------------------------------------------
     */

    for (
      const rawLanguage of
      languageList
    ) {

      const resolved =
        getCanonicalLanguage(
          rawLanguage
        );


      if (
        resolved &&
        hasLanguage(
          resolved
        )
      ) {

        return resolved;

      }

    }


    /*
     * ----------------------------------------------------------
     * Third pass:
     * base language
     * ----------------------------------------------------------
     */

    for (
      const rawLanguage of
      languageList
    ) {

      const base =
        getBaseLanguage(
          rawLanguage
        );


      if (
        !base
      ) {

        continue;

      }


      const resolved =
        getCanonicalLanguage(
          base
        );


      if (
        resolved &&
        hasLanguage(
          resolved
        )
      ) {

        return resolved;

      }

    }


    return null;

  }


  // ============================================================
  // BROWSER LANGUAGES
  // ============================================================

  function getBrowserLanguages() {

    const languages =
      [];


    if (
      typeof navigator ===
      'undefined'
    ) {

      return languages;

    }


    if (
      Array.isArray(
        navigator.languages
      )
    ) {

      languages.push(
        ...navigator.languages
      );

    }


    if (
      navigator.language
    ) {

      languages.push(
        navigator.language
      );

    }


    return [
      ...new Set(
        languages.filter(
          Boolean
        )
      )
    ];

  }


  // ============================================================
  // SAVED LANGUAGE
  // ============================================================

  function getSavedLanguage() {

    try {

      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );


      const resolved =
        getCanonicalLanguage(
          saved
        );


      if (
        resolved &&
        hasLanguage(
          resolved
        )
      ) {

        return resolved;

      }

    } catch (_) {
      // ignore
    }


    return null;

  }


  // ============================================================
  // DETECT LANGUAGE
  // ============================================================

  function detectLanguage() {

    const saved =
      getSavedLanguage();


    if (
      saved
    ) {

      return saved;

    }


    const detected =
      findBestLanguage(
        getBrowserLanguages()
      );


    if (
      detected
    ) {

      return detected;

    }


    return (
      getCanonicalLanguage(
        DEFAULT_LANGUAGE
      ) ||
      FALLBACK_LANGUAGE
    );

  }


  // ============================================================
  // CURRENT LANGUAGE
  // ============================================================

  let currentLanguage =
    detectLanguage();


  // ============================================================
  // NESTED VALUE
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
      String(
        path
      )
        .split('.')
        .filter(
          part =>
            part.length > 0
        );


    let current =
      source;


    for (
      const key of
      parts
    ) {

      if (
        current ===
          null ||
        current ===
          undefined
      ) {

        return undefined;

      }


      if (
        !Object.prototype.hasOwnProperty.call(
          current,
          key
        )
      ) {

        return undefined;

      }


      current =
        current[
          key
        ];

    }


    return current;

  }


  // ============================================================
  // FLATTEN MESSAGE TREE
  // ============================================================

  function flattenMessages(
    source,
    prefix = '',
    output = {}
  ) {

    if (
      !source ||
      typeof source !==
        'object'
    ) {

      return output;

    }


    Object.keys(
      source
    ).forEach(
      key => {

        const value =
          source[key];


        const path =
          prefix
            ? `${prefix}.${key}`
            : key;


        if (
          value &&
          typeof value ===
            'object' &&
          !Array.isArray(
            value
          )
        ) {

          flattenMessages(
            value,
            path,
            output
          );

        } else {

          output[
            path
          ] =
            value;

        }

      }
    );


    return output;

  }


  // ============================================================
  // INTERPOLATION
  // ============================================================

  function interpolate(
    value,
    data
  ) {

    if (
      typeof value !==
      'string'
    ) {

      return value;

    }


    if (
      !data ||
      typeof data !==
        'object'
    ) {

      return value;

    }


    return value.replace(
      /\{([^}]+)\}/g,
      (
        full,
        key
      ) => {

        const cleanKey =
          String(
            key
          )
            .trim();


        if (
          Object.prototype.hasOwnProperty.call(
            data,
            cleanKey
          )
        ) {

          const replacement =
            data[
              cleanKey
            ];


          if (
            replacement ===
              null ||
            replacement ===
              undefined
          ) {

            return '';

          }


          return String(
            replacement
          );

        }


        return full;

      }
    );

  }


  // ============================================================
  // HUMANIZE UNKNOWN KEY
  // ============================================================

  function humanizeKey(
    key
  ) {

    if (
      typeof key !==
      'string'
    ) {

      return String(
        key
      );

    }


    const lastPart =
      key
        .split('.')
        .filter(
          Boolean
        )
        .pop() ||
      key;


    return lastPart
      .replace(
        /([a-z])([A-Z])/g,
        '$1 $2'
      )
      .replace(
        /[_-]+/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim()
      .replace(
        /^./,
        char =>
          char.toUpperCase()
      );

  }


  // ============================================================
  // UNKNOWN KEY FALLBACK
  // ============================================================

  function unknownKeyFallback(
    key,
    data
  ) {

    let value;


    switch (
      UNKNOWN_KEY_MODE
    ) {

      case 'empty':

        value =
          '';

        break;


      case 'key':

        value =
          String(
            key
          );

        break;


      case 'humanize':

      default:

        value =
          humanizeKey(
            key
          );

        break;

    }


    return interpolate(
      value,
      data
    );

  }


  // ============================================================
  // GET CURRENT MESSAGES
  // ============================================================

  function getCurrentMessages() {

    return (
      LANGUAGES[
        currentLanguage
      ]?.messages ||
      null
    );

  }


  // ============================================================
  // GET FALLBACK MESSAGES
  // ============================================================

  function getFallbackMessages() {

    return (
      LANGUAGES[
        FALLBACK_LANGUAGE
      ]?.messages ||
      null
    );

  }


  // ============================================================
  // TRANSLATION LOOKUP
  // ============================================================

  function resolveTranslation(
    key
  ) {

    const currentMessages =
      getCurrentMessages();


    const fallbackMessages =
      getFallbackMessages();


    /*
     * Current language
     */
    const currentValue =
      getNestedValue(
        currentMessages,
        key
      );


    if (
      currentValue !==
        undefined &&
      currentValue !==
        null
    ) {

      return {

        value:
          currentValue,

        language:
          currentLanguage,

        source:
          'current'

      };

    }


    /*
     * English fallback
     */
    const fallbackValue =
      getNestedValue(
        fallbackMessages,
        key
      );


    if (
      fallbackValue !==
        undefined &&
      fallbackValue !==
        null
    ) {

      return {

        value:
          fallbackValue,

        language:
          FALLBACK_LANGUAGE,

        source:
          'fallback'

      };

    }


    /*
     * Unknown
     */
    return {

      value:
        undefined,

      language:
        null,

      source:
        'unknown'

    };

  }


  // ============================================================
  // MISSING KEY CACHE
  // ============================================================

  const missingKeyCache =
    new Set();


  function recordMissingKey(
    language,
    key
  ) {

    const cacheKey =
      `${language}|${key}`;


    if (
      missingKeyCache.has(
        cacheKey
      )
    ) {

      return;

    }


    missingKeyCache.add(
      cacheKey
    );


    if (
      DEBUG &&
      typeof console !==
        'undefined'
    ) {

      console.warn(
        '[I18n] Missing translation:',
        language,
        key
      );

    }

  }


  // ============================================================
  // TRANSLATE
  // ============================================================

  function t(
    key,
    data
  ) {

    if (
      key ===
        null ||
      key ===
        undefined
    ) {

      return '';

    }


    const normalizedKey =
      String(
        key
      )
        .trim();


    if (
      !normalizedKey
    ) {

      return '';

    }


    const resolved =
      resolveTranslation(
        normalizedKey
      );


    if (
      resolved.source ===
      'unknown'
    ) {

      recordMissingKey(
        currentLanguage,
        normalizedKey
      );


      return unknownKeyFallback(
        normalizedKey,
        data
      );

    }


    if (
      resolved.source ===
      'fallback'
    ) {

      recordMissingKey(
        currentLanguage,
        normalizedKey
      );

    }


    return interpolate(
      resolved.value,
      data
    );

  }


  // ============================================================
  // HAS TRANSLATION
  // ============================================================

  function has(
    key,
    language
  ) {

    const requestedLanguage =
      language
        ? getCanonicalLanguage(
            language
          )
        : currentLanguage;


    if (
      !requestedLanguage ||
      !hasLanguage(
        requestedLanguage
      )
    ) {

      return false;

    }


    const messages =
      LANGUAGES[
        requestedLanguage
      ]?.messages;


    return (
      getNestedValue(
        messages,
        key
      ) !==
        undefined
    );

  }


  // ============================================================
  // HAS EFFECTIVE TRANSLATION
  // ============================================================

  function hasEffective(
    key,
    language
  ) {

    const requestedLanguage =
      language
        ? getCanonicalLanguage(
            language
          )
        : currentLanguage;


    if (
      !requestedLanguage ||
      !hasLanguage(
        requestedLanguage
      )
    ) {

      return false;

    }


    const currentMessages =
      LANGUAGES[
        requestedLanguage
      ]?.messages;


    if (
      getNestedValue(
        currentMessages,
        key
      ) !==
        undefined
    ) {

      return true;

    }


    const fallbackMessages =
      LANGUAGES[
        FALLBACK_LANGUAGE
      ]?.messages;


    return (
      getNestedValue(
        fallbackMessages,
        key
      ) !==
        undefined
    );

  }


  // ============================================================
  // GET MISSING KEYS
  // ============================================================

  function getMissingKeys(
    language
  ) {

    const requestedLanguage =
      language
        ? getCanonicalLanguage(
            language
          )
        : currentLanguage;


    if (
      !requestedLanguage ||
      !hasLanguage(
        requestedLanguage
      )
    ) {

      return [];

    }


    const fallbackMessages =
      LANGUAGES[
        FALLBACK_LANGUAGE
      ]?.messages ||
      {};


    const currentMessages =
      LANGUAGES[
        requestedLanguage
      ]?.messages ||
      {};


    const fallbackFlat =
      flattenMessages(
        fallbackMessages
      );


    const missing =
      [];


    Object.keys(
      fallbackFlat
    ).forEach(
      key => {

        const exists =
          getNestedValue(
            currentMessages,
            key
          ) !==
          undefined;


        if (
          !exists
        ) {

          missing.push(
            key
          );

        }

      }
    );


    return missing.sort();

  }


  // ============================================================
  // GET COVERAGE
  // ============================================================

  function getCoverage(
    language
  ) {

    const requestedLanguage =
      language
        ? getCanonicalLanguage(
            language
          )
        : currentLanguage;


    if (
      !requestedLanguage ||
      !hasLanguage(
        requestedLanguage
      )
    ) {

      return {

        language:
          requestedLanguage || null,

        total:
          0,

        translated:
          0,

        missing:
          0,

        percent:
          0

      };

    }


    const fallbackFlat =
      flattenMessages(
        LANGUAGES[
          FALLBACK_LANGUAGE
        ]?.messages || {}
      );


    const currentMessages =
      LANGUAGES[
        requestedLanguage
      ]?.messages || {};


    const total =
      Object.keys(
        fallbackFlat
      ).length;


    let translated =
      0;


    Object.keys(
      fallbackFlat
    ).forEach(
      key => {

        if (
          getNestedValue(
            currentMessages,
            key
          ) !==
          undefined
        ) {

          translated++;

        }

      }
    );


    const missing =
      Math.max(
        0,
        total -
          translated
      );


    const percent =
      total > 0
        ? (
            translated /
            total
          ) *
          100
        : 100;


    return {

      language:
        requestedLanguage,

      total,

      translated,

      missing,

      percent

    };

  }


  // ============================================================
  // GET ALL COVERAGE
  // ============================================================

  function getAllCoverage() {

    const result =
      {};


    Object.keys(
      LANGUAGES
    ).forEach(
      language => {

        result[
          language
        ] =
          getCoverage(
            language
          );

      }
    );


    return result;

  }


  // ============================================================
  // APPLY DOCUMENT LANGUAGE
  // ============================================================

  function applyDocumentLanguage() {

    if (
      typeof document ===
      'undefined'
    ) {

      return;

    }


    const info =
      LANGUAGES[
        currentLanguage
      ];


    if (
      !info
    ) {

      return;

    }


    document.documentElement.lang =
      currentLanguage;


    document.documentElement.dir =
      info.dir ||
      'ltr';


    document.documentElement.dataset.language =
      currentLanguage;


    document.documentElement.dataset.i18nReady =
      'true';


    const title =
      t(
        'page.title'
      );


    if (
      title
    ) {

      document.title =
        title;

    }

  }


  // ============================================================
  // SAFE HTML VALUE
  // ============================================================

  function translateHtmlValue(
    key,
    data
  ) {

    /*
     * HTML translation ต้องตั้งใจใช้
     * ผ่าน data-i18n-html เท่านั้น
     *
     * ตัว dictionary เป็น trusted source
     * ไม่รับค่าจาก user
     */
    return t(
      key,
      data
    );

  }


  // ============================================================
  // TRANSLATE ELEMENT
  // ============================================================

  function translateElement(
    element
  ) {

    if (
      !element ||
      element.nodeType !==
        1
    ) {

      return;

    }


    // ----------------------------------------------------------
    // TEXT
    // ----------------------------------------------------------

    if (
      element.hasAttribute(
        'data-i18n'
      )
    ) {

      const key =
        element.getAttribute(
          'data-i18n'
        );


      if (
        key
      ) {

        element.textContent =
          t(
            key
          );

      }

    }


    // ----------------------------------------------------------
    // HTML
    // ----------------------------------------------------------

    if (
      element.hasAttribute(
        'data-i18n-html'
      )
    ) {

      const key =
        element.getAttribute(
          'data-i18n-html'
        );


      if (
        key
      ) {

        element.innerHTML =
          translateHtmlValue(
            key
          );

      }

    }


    // ----------------------------------------------------------
    // PLACEHOLDER
    // ----------------------------------------------------------

    if (
      element.hasAttribute(
        'data-i18n-placeholder'
      )
    ) {

      const key =
        element.getAttribute(
          'data-i18n-placeholder'
        );


      if (
        key
      ) {

        element.setAttribute(
          'placeholder',
          t(
            key
          )
        );

      }

    }


    // ----------------------------------------------------------
    // TITLE
    // ----------------------------------------------------------

    if (
      element.hasAttribute(
        'data-i18n-title'
      )
    ) {

      const key =
        element.getAttribute(
          'data-i18n-title'
        );


      if (
        key
      ) {

        element.setAttribute(
          'title',
          t(
            key
          )
        );

      }

    }


    // ----------------------------------------------------------
    // ARIA LABEL
    // ----------------------------------------------------------

    if (
      element.hasAttribute(
        'data-i18n-aria-label'
      )
    ) {

      const key =
        element.getAttribute(
          'data-i18n-aria-label'
        );


      if (
        key
      ) {

        element.setAttribute(
          'aria-label',
          t(
            key
          )
        );

      }

    }


    // ----------------------------------------------------------
    // ARIA DESCRIPTION
    // ----------------------------------------------------------

    if (
      element.hasAttribute(
        'data-i18n-aria-description'
      )
    ) {

      const key =
        element.getAttribute(
          'data-i18n-aria-description'
        );


      if (
        key
      ) {

        element.setAttribute(
          'aria-description',
          t(
            key
          )
        );

      }

    }

  }


  // ============================================================
  // SELECTORS
  // ============================================================

  const TRANSLATABLE_SELECTOR = [
    '[data-i18n]',
    '[data-i18n-html]',
    '[data-i18n-placeholder]',
    '[data-i18n-title]',
    '[data-i18n-aria-label]',
    '[data-i18n-aria-description]'
  ].join(',');


  // ============================================================
  // APPLY TRANSLATIONS
  // ============================================================

  function applyTranslations(
    root
  ) {

    if (
      typeof document ===
      'undefined'
    ) {

      return;

    }


    const container =
      root ||
      document;


    /*
     * Translate root itself once
     */
    if (
      container.nodeType ===
      1
    ) {

      translateElement(
        container
      );

    }


    /*
     * Translate children
     */
    if (
      typeof container.querySelectorAll !==
      'function'
    ) {

      return;

    }


    const elements =
      container.querySelectorAll(
        TRANSLATABLE_SELECTOR
      );


    elements.forEach(
      translateElement
    );

  }


  // ============================================================
  // SET LANGUAGE
  // ============================================================

  function setLanguage(
    language
  ) {

    const resolved =
      getCanonicalLanguage(
        language
      );


    if (
      !resolved ||
      !hasLanguage(
        resolved
      )
    ) {

      return false;

    }


    if (
      currentLanguage ===
      resolved
    ) {

      /*
       * ยัง apply ใหม่ได้
       * เผื่อ DOM เพิ่งถูกสร้าง
       */
      applyDocumentLanguage();

      applyTranslations();

      return true;

    }


    currentLanguage =
      resolved;


    try {

      localStorage.setItem(
        STORAGE_KEY,
        currentLanguage
      );

    } catch (_) {
      // ignore
    }


    /*
     * Clear diagnostics cache
     * เพื่อให้ภาษาใหม่ log ได้
     */
    missingKeyCache.clear();


    applyDocumentLanguage();

    applyTranslations();


    dispatchLanguageChange();


    return true;

  }


  // ============================================================
  // RESET LANGUAGE
  // ============================================================

  function resetLanguage() {

    try {

      localStorage.removeItem(
        STORAGE_KEY
      );

    } catch (_) {
      // ignore
    }


    currentLanguage =
      findBestLanguage(
        getBrowserLanguages()
      ) ||
      getCanonicalLanguage(
        DEFAULT_LANGUAGE
      ) ||
      FALLBACK_LANGUAGE;


    missingKeyCache.clear();


    applyDocumentLanguage();

    applyTranslations();


    dispatchLanguageChange();


    return currentLanguage;

  }


  // ============================================================
  // DISPATCH LANGUAGE CHANGE
  // ============================================================

  function dispatchLanguageChange() {

    if (
      typeof document ===
      'undefined'
    ) {

      return;

    }


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

    } catch (_) {

      /*
       * CustomEvent fallback
       */
      try {

        const event =
          document.createEvent(
            'CustomEvent'
          );


        event.initCustomEvent(
          'languagechange',
          false,
          false,
          {
            language:
              currentLanguage
          }
        );


        document.dispatchEvent(
          event
        );

      } catch (__ ) {
        // ignore
      }

    }

  }


  // ============================================================
  // GET LANGUAGE
  // ============================================================

  function getLanguage() {

    return currentLanguage;

  }


  // ============================================================
  // GET LANGUAGE INFO
  // ============================================================

  function getLanguageInfo(
    language
  ) {

    const code =
      language
        ? getCanonicalLanguage(
            language
          )
        : currentLanguage;


    if (
      !code ||
      !LANGUAGES[
        code
      ]
    ) {

      return null;

    }


    const info =
      LANGUAGES[
        code
      ];


    return {

      code,

      name:
        info.name,

      nativeName:
        info.nativeName,

      dir:
        info.dir ||
        'ltr'

    };

  }


  // ============================================================
  // GET ALL LANGUAGES
  // ============================================================

  function getLanguages() {

    return Object.keys(
      LANGUAGES
    )
      .map(
        code => {

          const info =
            LANGUAGES[
              code
            ];


          return {

            code,

            name:
              info.name,

            nativeName:
              info.nativeName,

            dir:
              info.dir ||
              'ltr'

          };

        }
      );

  }


  // ============================================================
  // MUTATION OBSERVER
  // ============================================================

  let observer =
    null;


  function startObserver() {

    if (
      typeof MutationObserver ===
      'undefined'
    ) {

      return;

    }


    if (
      observer
    ) {

      return;

    }


    if (
      !document.body
    ) {

      return;

    }


    observer =
      new MutationObserver(
        mutations => {

          mutations.forEach(
            mutation => {

              if (
                mutation.type !==
                'childList'
              ) {

                return;

              }


              mutation.addedNodes.forEach(
                node => {

                  if (
                    node.nodeType !==
                    1
                  ) {

                    return;

                  }


                  /*
                   * applyTranslations เรียก root
                   * และ descendants ให้อยู่แล้ว
                   *
                   * ไม่ต้อง translateElement ซ้ำ
                   */
                  applyTranslations(
                    node
                  );

                }
              );

            }
          );

        }
      );


    observer.observe(
      document.body,
      {

        childList:
          true,

        subtree:
          true

      }
    );

  }


  // ============================================================
  // STOP OBSERVER
  // ============================================================

  function stopObserver() {

    if (
      !observer
    ) {

      return;

    }


    observer.disconnect();


    observer =
      null;

  }


  // ============================================================
  // REFRESH
  // ============================================================

  function refresh() {

    applyDocumentLanguage();

    applyTranslations();

  }


  // ============================================================
  // GET DICTIONARY
  // ============================================================

  function getDictionary(
    language
  ) {

    const code =
      language
        ? getCanonicalLanguage(
            language
          )
        : currentLanguage;


    if (
      !code ||
      !LANGUAGES[
        code
      ]
    ) {

      return null;

    }


    return LANGUAGES[
      code
    ].messages || null;

  }


  // ============================================================
  // GET RAW MESSAGE
  // ============================================================

  function getRaw(
    key,
    language
  ) {

    const code =
      language
        ? getCanonicalLanguage(
            language
          )
        : currentLanguage;


    if (
      !code
    ) {

      return undefined;

    }


    const messages =
      LANGUAGES[
        code
      ]?.messages;


    return getNestedValue(
      messages,
      key
    );

  }


  // ============================================================
  // DIAGNOSTICS
  // ============================================================

  function getDiagnostics(
    language
  ) {

    const code =
      language
        ? getCanonicalLanguage(
            language
          )
        : currentLanguage;


    const coverage =
      getCoverage(
        code
      );


    const missing =
      getMissingKeys(
        code
      );


    return {

      language:
        code,

      coverage,

      missing,

      missingCount:
        missing.length

    };

  }


  function logDiagnostics(
    language
  ) {

    if (
      typeof console ===
      'undefined'
    ) {

      return;

    }


    const code =
      language
        ? getCanonicalLanguage(
            language
          )
        : currentLanguage;


    const diagnostics =
      getDiagnostics(
        code
      );


    console.group(
      `[I18n] ${code}`
    );


    console.log(
      'Coverage:',
      `${diagnostics.coverage.percent.toFixed(1)}%`
    );


    console.log(
      'Translated:',
      diagnostics.coverage.translated
    );


    console.log(
      'Missing:',
      diagnostics.coverage.missing
    );


    if (
      diagnostics.missing.length
    ) {

      console.table(
        diagnostics.missing
      );

    }


    console.groupEnd();

  }


  // ============================================================
  // INIT
  // ============================================================

  function init() {

    /*
     * Resolve current language one more time
     * in case dictionary changes before DOM ready
     */
    const resolved =
      getCanonicalLanguage(
        currentLanguage
      );


    if (
      resolved &&
      hasLanguage(
        resolved
      )
    ) {

      currentLanguage =
        resolved;

    } else {

      currentLanguage =
        FALLBACK_LANGUAGE;

    }


    applyDocumentLanguage();

    applyTranslations();

    startObserver();

  }


  // ============================================================
  // AUTO INIT
  // ============================================================

  if (
    typeof document !==
    'undefined'
  ) {

    if (
      document.readyState ===
      'loading'
    ) {

      document.addEventListener(
        'DOMContentLoaded',
        init,
        {
          once:
            true
        }
      );

    } else {

      init();

    }

  }


  // ============================================================
  // PUBLIC API
  // ============================================================

  return {

    /*
     * Translation
     */
    t,

    /*
     * Language
     */
    setLanguage,

    resetLanguage,

    getLanguage,

    detectLanguage,

    getLanguageInfo,

    getLanguages,

    /*
     * Dictionary
     */
    getDictionary,

    getRaw,

    /*
     * Translation checks
     */
    has,

    hasEffective,

    /*
     * Diagnostics
     */
    getMissingKeys,

    getCoverage,

    getAllCoverage,

    getDiagnostics,

    logDiagnostics,

    /*
     * DOM
     */
    applyTranslations,

    refresh,

    startObserver,

    stopObserver

  };

})();

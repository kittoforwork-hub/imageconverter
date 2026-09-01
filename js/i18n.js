/* global window, document, localStorage, navigator, MutationObserver */

/*
 * ============================================================
 * WORKSHOP UTILITY - INTERNATIONALIZATION
 * js/i18n.js
 *
 * MASTER LANGUAGE SYSTEM
 *
 * Supported languages
 * - Thai
 * - English
 * - German
 * - Japanese
 * - Korean
 * - Chinese Simplified
 * - Chinese Traditional
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


  const UNKNOWN_KEY_MODE =
    'humanize';


  const DEBUG =
    false;


  // ============================================================
  // LANGUAGE DICTIONARY
  // ============================================================

  const LANGUAGES = {


    // ==========================================================
    // THAI
    // ==========================================================

    th: {

      name:
        'Thai',

      nativeName:
        'ไทย',

      dir:
        'ltr',

      messages: {

        common: {

          home:
            'หน้าหลัก',

          language:
            'ภาษา',

          image:
            'รูปภาพ',

          images:
            'รูปภาพ',

          pdf:
            'PDF',

          notepad:
            'Notepad',

          upload:
            'อัปโหลด',

          chooseFile:
            'เลือกไฟล์',

          chooseFiles:
            'เลือกไฟล์',

          download:
            'ดาวน์โหลด',

          downloadAll:
            'ดาวน์โหลดทั้งหมด',

          clear:
            'ล้างทั้งหมด',

          cancel:
            'ยกเลิก',

          delete:
            'ลบ',

          remove:
            'นำออก',

          process:
            'เริ่มประมวลผล',

          processing:
            'กำลังประมวลผล...',

          completed:
            'เสร็จสิ้น',

          failed:
            'ไม่สำเร็จ',

          loading:
            'กำลังโหลด...',

          ready:
            'พร้อมใช้งาน',

          retry:
            'ลองอีกครั้ง',

          close:
            'ปิด',

          save:
            'บันทึก',

          reset:
            'รีเซ็ต',

          continue:
            'ดำเนินการต่อ',

          confirm:
            'ยืนยัน',

          selectAll:
            'เลือกทั้งหมด',

          items:
            'รายการ',

          files:
            'ไฟล์',

          file:
            'ไฟล์',

          pages:
            'หน้า',

          page:
            'หน้า',

          jobs:
            'งาน',

          original:
            'ต้นฉบับ',

          format:
            'รูปแบบ',

          size:
            'ขนาด',

          quality:
            'คุณภาพ',

          width:
            'กว้าง',

          height:
            'สูง',

          saveAs:
            'บันทึกเป็น',

          result:
            'ผลลัพธ์',

          done:
            'เสร็จแล้ว',

          unlimited:
            'ไม่จำกัด',

          yes:
            'ใช่',

          no:
            'ไม่'
        },


        cute: {

          ready:
            'พร้อมแล้ว ✨',

          completed:
            'ทำงานเสร็จ',

          processing:
            'กำลังทำงาน…',

          itemCount:
            '{count} รายการ'
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

          th:
            'ไทย',

          en:
            'English',

          de:
            'Deutsch',

          ja:
            '日本語',

          ko:
            '한국어',

          zhCN:
            '简体中文',

          zhTW:
            '繁體中文'
        }

      }
    },


    // ==========================================================
    // ENGLISH
    // ==========================================================

    en: {

      name:
        'English',

      nativeName:
        'English',

      dir:
        'ltr',

      messages: {

        common: {

          home:
            'Home',

          language:
            'Language',

          image:
            'Images',

          images:
            'Images',

          pdf:
            'PDF',

          notepad:
            'Notepad',

          upload:
            'Upload',

          chooseFile:
            'Choose File',

          chooseFiles:
            'Choose Files',

          download:
            'Download',

          downloadAll:
            'Download All',

          clear:
            'Clear All',

          cancel:
            'Cancel',

          delete:
            'Delete',

          remove:
            'Remove',

          process:
            'Process',

          processing:
            'Processing...',

          completed:
            'Completed',

          failed:
            'Failed',

          loading:
            'Loading...',

          ready:
            'Ready',

          retry:
            'Try Again',

          close:
            'Close',

          save:
            'Save',

          reset:
            'Reset',

          continue:
            'Continue',

          confirm:
            'Confirm',

          selectAll:
            'Select All',

          items:
            'items',

          files:
            'files',

          file:
            'file',

          pages:
            'pages',

          page:
            'page',

          jobs:
            'Jobs',

          original:
            'Original',

          format:
            'Format',

          size:
            'Size',

          quality:
            'Quality',

          width:
            'Width',

          height:
            'Height',

          saveAs:
            'Save as',

          result:
            'Result',

          done:
            'Done',

          unlimited:
            'Unlimited',

          yes:
            'Yes',

          no:
            'No'
        },


        cute: {

          ready:
            'Ready ✨',

          completed:
            'Completed',

          processing:
            'Working…',

          itemCount:
            '{count} items'
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

          th:
            'Thai',

          en:
            'English',

          de:
            'German',

          ja:
            'Japanese',

          ko:
            'Korean',

          zhCN:
            'Simplified Chinese',

          zhTW:
            'Traditional Chinese'
        }

      }
    },


    // ==========================================================
    // GERMAN
    // ==========================================================

    de: {

      name:
        'German',

      nativeName:
        'Deutsch',

      dir:
        'ltr',

      messages: {

        common: {

          home:
            'Startseite',

          language:
            'Sprache',

          image:
            'Bilder',

          images:
            'Bilder',

          pdf:
            'PDF',

          notepad:
            'Notepad',

          upload:
            'Hochladen',

          chooseFile:
            'Datei auswählen',

          chooseFiles:
            'Dateien auswählen',

          download:
            'Herunterladen',

          downloadAll:
            'Alle herunterladen',

          clear:
            'Alle löschen',

          cancel:
            'Abbrechen',

          delete:
            'Löschen',

          remove:
            'Entfernen',

          process:
            'Verarbeiten',

          processing:
            'Verarbeitung...',

          completed:
            'Abgeschlossen',

          failed:
            'Fehlgeschlagen',

          loading:
            'Wird geladen...',

          ready:
            'Bereit',

          retry:
            'Erneut versuchen',

          close:
            'Schließen',

          save:
            'Speichern',

          reset:
            'Zurücksetzen',

          continue:
            'Weiter',

          confirm:
            'Bestätigen',

          selectAll:
            'Alle auswählen',

          items:
            'Elemente',

          files:
            'Dateien',

          file:
            'Datei',

          pages:
            'Seiten',

          page:
            'Seite',

          jobs:
            'Aufgaben',

          original:
            'Original',

          format:
            'Format',

          size:
            'Größe',

          quality:
            'Qualität',

          width:
            'Breite',

          height:
            'Höhe',

          saveAs:
            'Speichern als',

          result:
            'Ergebnis',

          done:
            'Fertig',

          unlimited:
            'Unbegrenzt',

          yes:
            'Ja',

          no:
            'Nein'
        },


        cute: {

          ready:
            'Bereit ✨',

          completed:
            'Erledigt',

          processing:
            'Wird verarbeitet…',

          itemCount:
            '{count} Elemente'
        },


        page: {

          title:
            'Workshop Utility BY KITTO',

          heading:
            'Dateiverwaltungs-Tools',

          subtitle:
            'Bilder und PDFs direkt im Browser konvertieren und bearbeiten. Keine Dateien werden auf einen Server hochgeladen.',

          footer:
            'Alles läuft im Browser — keine Dateien werden irgendwohin gesendet.',

          notepadTitle:
            'Online Notepad öffnen'
        },


        image: {

          convertTitle:
            'Konvertieren & Größe ändern',

          convertHint:
            'Dateiformate (PNG / JPG / WEBP) konvertieren, Größe ändern, Qualität anpassen, Bilder drehen und spiegeln — mehrere Dateien gleichzeitig.',

          cropTitle:
            'Bild zuschneiden',

          cropHint:
            'Wählen Sie den gewünschten Bereich, passen Sie den Rahmen an und laden Sie das Ergebnis herunter.',

          bgRemoveTitle:
            'Hintergrund entfernen',

          bgRemoveHint:
            'Bildhintergrund automatisch mit KI entfernen — alles läuft im Browser.',

          compressTitle:
            'Bild komprimieren',

          compressHint:
            'Dateigröße durch Anpassung von Qualität und Bildgröße reduzieren.',

          dropImage:
            'Bild hier ablegen',

          chooseImage:
            'Oder klicken, um eine Datei auszuwählen',

          supportedImages:
            'Mehrere Dateien werden unterstützt (JPG · PNG · WEBP · GIF · BMP)',

          addMultiple:
            'Mehrere Bilder hinzufügen',

          cropSeparately:
            'Jedes Bild wird separat zugeschnitten',

          cropInstruction:
            'Rahmen zum Zuschneiden ziehen',

          outputTransparent:
            'Als PNG mit transparentem Hintergrund ausgeben',

          compressSupported:
            'Unterstützt JPG · PNG · WEBP und mehrere Dateien',

          task:
            'Aufgaben',

          convertAll:
            'Alle konvertieren',

          convertingAll:
            'Alle werden konvertiert…',

          compressAll:
            'Alle komprimieren',

          compressingZip:
            'ZIP wird erstellt…',

          removeBackgroundAll:
            'Alle Hintergründe entfernen',

          removeBackgroundAllProcessing:
            'Alle Hintergründe werden entfernt…',

          downloadZip:
            'Alle herunterladen (.zip)',

          allFormats:
            'Format auf alle anwenden',

          choosePerFile:
            '— Pro Datei auswählen —',

          convertTo:
            'Konvertieren zu',

          dimensions:
            'Größe (px)',

          rotateFlip:
            'Drehen / Spiegeln',

          rotateLeft:
            '90° nach links drehen',

          rotateRight:
            '90° nach rechts drehen',

          flipHorizontal:
            'Horizontal spiegeln',

          flipVertical:
            'Vertikal spiegeln',

          lockAspect:
            'Seitenverhältnis sperren',

          aspectRatio:
            'Seitenverhältnis',

          free:
            'Frei',

          crop:
            'Zuschneiden',

          cropping:
            'Wird zugeschnitten…',

          croppingFailed:
            'Zuschneiden fehlgeschlagen: {message}',

          saveFormat:
            'Speichern als',

          waitingConvert:
            'Warten',

          waitingCrop:
            'Rahmen zum Zuschneiden ziehen',

          waitingBackground:
            'Warten auf Hintergrundentfernung',

          removeBackground:
            'Hintergrund entfernen',

          waitingCompress:
            'Warten auf Komprimierung',

          compress:
            'Komprimieren',

          afterCompress:
            'Nach Komprimierung',

          savings:
            'Gespart',

          ready:
            'Bereit zum Download',

          readyDownload:
            'Bereit zum Download · {size}',

          preparingModel:
            'KI-Modell wird vorbereitet…',

          loadingModelProgress:
            'Modell wird geladen… {percent}%',

          removingBackgroundProgress:
            'Verarbeitung… {percent}%',

          backgroundRemovalFailed:
            'Hintergrundentfernung fehlgeschlagen: {message}',

          conversionFailed:
            'Konvertierung fehlgeschlagen: {message}',

          compressing:
            'Wird komprimiert…',

          compressingAll:
            'Alle werden komprimiert…',

          compressionFailed:
            'Komprimierung fehlgeschlagen: {message}',

          readImage:
            'Bild wird gelesen…',

          imageReadFailed:
            'Bild konnte nicht gelesen werden',

          preparing:
            'Wird vorbereitet…',

          characterConvert:
            'Bereit, Ihre Bilder zu konvertieren ✨',

          characterCrop:
            'Wir bringen Ihr Bild perfekt in Form ✂️',

          characterBgRemove:
            'Der Hintergrund wird sauber entfernt 🫧',

          characterCompress:
            'Wir machen Ihre Bilder kleiner und behalten die Qualität 📦',

          modelFirstUse:
            'Bei der ersten Verwendung wird ein KI-Modell von etwa 40 MB geladen. Der Browser speichert es für zukünftige Verwendung.'
        },


        pdf: {

          fromImagesTitle:
            'Bilder zu PDF',

          fromImagesHint:
            'Mehrere Bilder zu einer PDF-Datei zusammenfügen und Seitenreihenfolge anpassen.',

          toImagesTitle:
            'PDF → Bilder',

          toImagesHint:
            'Jede PDF-Seite in eine Bilddatei umwandeln.',

          pagesTitle:
            'PDF-Seiten verwalten',

          pagesHint:
            'Seiten löschen, neu sortieren oder ausgewählte Seiten als neue PDF exportieren.',

          mergeTitle:
            'PDF zusammenführen',

          mergeHint:
            'Mehrere PDF-Dateien zu einer Datei zusammenführen.',

          watermarkTitle:
            'PDF-Wasserzeichen',

          watermarkHint:
            'Text- oder PNG-Wasserzeichen auf PDF-Seiten hinzufügen.',

          pageNumbersTitle:
            'Seitenzahlen hinzufügen',

          pageNumbersHint:
            'Automatisch Seitenzahlen zu jeder PDF-Seite hinzufügen.',

          dropPdf:
            'PDF hier ablegen',

          dropPdfMultiple:
            'Mehrere PDF-Dateien hier ablegen',

          clickChoosePdf:
            'Oder klicken, um Dateien auszuwählen',

          oneFile:
            'Eine Datei gleichzeitig',

          multipleFiles:
            'Mehrere Dateien hinzufügen',

          imagesToPdfOrder:
            'Die Reihenfolge entspricht der Seitenreihenfolge im PDF.',

          mergeOrder:
            'Dateien vor dem Zusammenführen neu sortieren.',

          pageSize:
            'Seitengröße',

          fitToImage:
            'An Bild anpassen',

          buildPdf:
            'PDF erstellen',

          mergeFiles:
            'Dateien zusammenführen',

          mergedSuccess:
            'PDF-Dateien erfolgreich zusammengeführt',

          createdSuccess:
            'PDF erfolgreich erstellt',

          downloadPdf:
            'PDF herunterladen',

          downloadMergedPdf:
            'Zusammengeführtes PDF herunterladen',

          imageFormat:
            'Format',

          resolution:
            'Auflösung',

          renderAllPages:
            'Alle Seiten konvertieren',

          pageProgress:
            'Seite {current}/{total}',

          manageInstructions:
            'Mit ✕ Seiten löschen, mit ↑ ↓ sortieren und Seiten für separaten Export auswählen.',

          downloadPdfOrdered:
            'PDF herunterladen',

          downloadSelected:
            'Ausgewählte herunterladen',

          deleteThisPage:
            'Diese Seite löschen',

          moveUp:
            'Nach oben',

          moveDown:
            'Nach unten',

          watermarkText:
            'Wasserzeichentext',

          watermarkImage:
            'Wasserzeichen-PNG',

          watermarkImagePlaceholder:
            'Leer lassen, wenn nur ein Bild verwendet wird',

          noImageSelected:
            'Kein Bild ausgewählt',

          fontSize:
            'Schriftgröße',

          watermarkImageSize:
            'Größe des Wasserzeichenbildes',

          opacity:
            'Deckkraft',

          angle:
            'Drehwinkel',

          watermarkCombination:
            'Sie können nur Text, nur PNG oder Text und PNG zusammen verwenden.',

          readyWatermark:
            'Bereit für Wasserzeichen',

          applyWatermark:
            'Wasserzeichen hinzufügen',

          pageNumberFormat:
            'Textformat',

          startCountingAt:
            'Zählen ab',

          position:
            'Position',

          bottomCenter:
            'Unten Mitte',

          bottomRight:
            'Unten rechts',

          bottomLeft:
            'Unten links',

          topCenter:
            'Oben Mitte',

          topRight:
            'Oben rechts',

          readyPageNumber:
            'Bereit für Seitenzahlen',

          applyPageNumber:
            'Seitenzahlen hinzufügen',

          pageNumberHelp:
            'Verwenden Sie {n} für die Seitenzahl und {total} für die Gesamtseitenzahl.',

          preparing:
            'Datei wird vorbereitet…',

          loading:
            'PDF wird geladen…',

          loadingFailed:
            'PDF-Datei konnte nicht geöffnet werden',

          invalidPdf:
            'Bitte nur PDF-Dateien auswählen.',

          creating:
            'PDF wird erstellt…',

          creatingProgress:
            'PDF wird erstellt… {current}/{total}',

          converting:
            'Wird konvertiert…',

          convertingProgress:
            'Seite {current}/{total} wird konvertiert',

          cancelling:
            'Wird abgebrochen…',

          cancelled:
            'Abgebrochen · {current}/{total} Seiten konvertiert',

          rendering:
            'Seite {current}/{total} wird konvertiert',

          renderingAll:
            'Alle Seiten werden konvertiert…',

          created:
            'PDF erfolgreich erstellt · {pages} Seiten · {size}',

          merged:
            'PDF erfolgreich zusammengeführt · {pages} Seiten · {size}',

          readyDownload:
            'Bereit zum Download · {size}',

          buildFailed:
            'PDF konnte nicht erstellt werden: {message}',

          mergeFailed:
            'PDFs konnten nicht zusammengeführt werden: {message}',

          renderFailed:
            'Fehler beim Konvertieren des PDFs: {message}',

          zipFailed:
            'ZIP konnte nicht erstellt werden: {message}',

          pageNotFound:
            'Keine Seiten im PDF vorhanden',

          selectPageRequired:
            'Bitte mindestens eine Seite auswählen.',

          minimumFiles:
            'Mindestens 2 Dateien erforderlich.',

          noPages:
            'Keine Seiten gefunden.',

          workerUnavailable:
            'Dieser Browser unterstützt die Hintergrundverarbeitung von PDFs nicht.',

          workerFailed:
            'PDF-Worker ist nicht mehr verfügbar. Bitte erneut versuchen.',

          workerStopped:
            'PDF-Worker wurde vor dem Befehl beendet.',

          workerRequestFailed:
            'PDF-Worker-Anfrage fehlgeschlagen.',

          thumbnailFailed:
            'PDF-Seitenvorschau konnte nicht erstellt werden.',

          deletePage:
            'Seite löschen',

          restorePage:
            'Seite wiederherstellen',

          dropPosition:
            'Seite hier ablegen',

          pageLabel:
            'Seite {page}',

          filesCount:
            '{count} Dateien',

          pagesCount:
            '{count} Seiten',

          characterFromImages:
            'Wir machen aus Ihren Bildern ein ordentliches PDF 📄',

          characterToImages:
            'Wir teilen Ihr PDF Seite für Seite in Bilder 🧩',

          characterPages:
            'PDF-Seiten einfach verwalten 📚',

          characterMerge:
            'Wir fügen Ihre Dokumente zu einer Datei zusammen 💗',

          characterWatermark:
            'Wir fügen ein dezentes Wasserzeichen hinzu 💧',

          characterPageNumbers:
            'Wir fügen Seitenzahlen hinzu 🔖'
        },


        dropzone: {

          image:
            'Bild hierher ziehen oder klicken',

          pdf:
            'PDF hierher ziehen',

          pdfMultiple:
            'Mehrere PDF-Dateien hierher ziehen',

          imageOnly:
            'Bilddateien hierher ziehen',

          pdfOne:
            'PDF hierher ziehen'
        },


        errors: {

          downloadDataNotFound:
            'Keine Daten zum Herunterladen gefunden.',

          fileNotFound:
            'Datei nicht gefunden.',

          fileReadFailed:
            'Datei konnte nicht gelesen werden.',

          fileReadAborted:
            'Dateilesen wurde abgebrochen.',

          imageLoadFailed:
            'Bild konnte nicht geladen werden.',

          unsupportedFile:
            'Dieser Dateityp wird nicht unterstützt.',

          processingFailed:
            'Datei konnte nicht verarbeitet werden.',

          somethingWentWrong:
            'Etwas ist schiefgelaufen. Bitte erneut versuchen.',

          createFailed:
            'Ausgabedatei konnte nicht erstellt werden.',

          canvasContext:
            'Canvas konnte nicht erstellt werden.',

          invalidImageDimensions:
            'Ungültige Bildabmessungen.',

          backgroundFunctionNotFound:
            'Funktion zur Hintergrundentfernung wurde nicht gefunden.',

          backgroundLibraryLoadFailed:
            'Bibliothek zur Hintergrundentfernung konnte nicht geladen werden: {message}'
        },


        file: {

          size:
            'Dateigröße: {size}',

          largeWarning:
            'Diese große Datei kann länger dauern und viel Speicher verwenden.',

          continueQuestion:
            'Möchten Sie fortfahren?',

          original:
            'Original'
        },


        utils: {

          cacheHandlerFailed:
            'clearCache-Handler fehlgeschlagen',

          invalidObjectUrlHolder:
            'replaceObjectUrl benötigt einen gültigen Holder und Key'
        },


        tool: {

          waiting:
            'Warten',

          ready:
            'Bereit',

          processing:
            'Verarbeitung',

          success:
            'Erfolgreich abgeschlossen',

          error:
            'Ein Fehler ist aufgetreten'
        },


        notepad: {

          title:
            'Online Notepad',

          subtitle:
            'Notizen einfach schreiben und automatisch speichern',

          toolbar:
            'Notepad-Werkzeugleiste',

          backHome:
            'Zur Startseite',

          newNote:
            'Neue Notiz erstellen',

          newNoteQuestion:
            'Neue Notiz erstellen?',

          currentTextWillClear:
            'Der aktuelle Text wird gelöscht',

          createNew:
            'Neu erstellen',

          new:
            'Neu',

          copy:
            'Kopieren',

          copyAll:
            'Gesamten Text kopieren',

          save:
            'Speichern',

          saveTxt:
            'Text als TXT speichern',

          clear:
            'Löschen',

          undo:
            'Rückgängig',

          undoLabel:
            'Rückgängig',

          redo:
            'Wiederholen',

          redoLabel:
            'Wiederholen',

          searchPlaceholder:
            'Text suchen...',

          searchLabel:
            'In Notiz suchen',

          clearSearch:
            'Suche löschen',

          editorSection:
            'Texteditor',

          editorPlaceholder:
            'Hier mit der Eingabe beginnen...',

          editorLabel:
            'Textbereich',

          characters:
            'Zeichen',

          words:
            'Wörter',

          lines:
            'Zeilen',

          status: {

            saved:
              'Gespeichert',

            saving:
              'Wird gespeichert...',

            saveFailed:
              'Speichern fehlgeschlagen',

            nothingToSave:
              'Kein Text zum Speichern vorhanden',

            txtSaved:
              'Als .txt gespeichert'
          },

          buttons: {

            nothingToSave:
              'Kein Text',

            txtSaved:
              '✓ Gespeichert',

            noText:
              'Kein Text',

            copied:
              '✓ Kopiert',

            copyFailed:
              'Kopieren fehlgeschlagen'
          },

          search: {

            found:
              'Text gefunden',

            notFound:
              'Text nicht gefunden'
          },

          errors: {

            loadFailed:
              'Gespeicherte Notiz konnte nicht geladen werden'
          }
        },


        language: {

          th:
            'Thai',

          en:
            'English',

          de:
            'German',

          ja:
            'Japanese',

          ko:
            'Korean',

          zhCN:
            'Simplified Chinese',

          zhTW:
            'Traditional Chinese'
        }

      }
    },


    // ==========================================================
    // JAPANESE
    // ==========================================================

    ja: {

      name:
        'Japanese',

      nativeName:
        '日本語',

      dir:
        'ltr',

      messages: {

        common: {

          home:
            'ホーム',

          language:
            '言語',

          image:
            '画像',

          images:
            '画像',

          pdf:
            'PDF',

          notepad:
            'メモ帳',

          upload:
            'アップロード',

          chooseFile:
            'ファイルを選択',

          chooseFiles:
            'ファイルを選択',

          download:
            'ダウンロード',

          downloadAll:
            'すべてダウンロード',

          clear:
            'すべてクリア',

          cancel:
            'キャンセル',

          delete:
            '削除',

          remove:
            '取り除く',

          process:
            '処理',

          processing:
            '処理中...',

          completed:
            '完了',

          failed:
            '失敗',

          loading:
            '読み込み中...',

          ready:
            '準備完了',

          retry:
            'もう一度試す',

          close:
            '閉じる',

          save:
            '保存',

          reset:
            'リセット',

          continue:
            '続ける',

          confirm:
            '確認',

          selectAll:
            'すべて選択',

          items:
            '項目',

          files:
            'ファイル',

          file:
            'ファイル',

          pages:
            'ページ',

          page:
            'ページ',

          jobs:
            'ジョブ',

          original:
            '元のファイル',

          format:
            '形式',

          size:
            'サイズ',

          quality:
            '品質',

          width:
            '幅',

          height:
            '高さ',

          saveAs:
            '名前を付けて保存',

          result:
            '結果',

          done:
            '完了',

          unlimited:
            '無制限',

          yes:
            'はい',

          no:
            'いいえ'
        },


        cute: {

          ready:
            '準備完了 ✨',

          completed:
            '完了',

          processing:
            '処理中…',

          itemCount:
            '{count} 件'
        },


        page: {

          title:
            'Workshop Utility BY KITTO',

          heading:
            'ファイル管理ツール',

          subtitle:
            '画像とPDFをブラウザ上で変換・編集できます。ファイルはサーバーへアップロードされません。',

          footer:
            'すべてブラウザ上で処理 — ファイルは外部へ送信されません。',

          notepadTitle:
            'オンラインメモ帳を開く'
        },


        image: {

          convertTitle:
            '変換・リサイズ',

          convertHint:
            'PNG / JPG / WEBPの変換、サイズ変更、品質調整、回転、反転に対応。複数ファイルを一度に処理できます。',

          cropTitle:
            '画像を切り抜く',

          cropHint:
            '切り抜きたい範囲を選択し、フレームを調整して結果をダウンロードできます。',

          bgRemoveTitle:
            '背景を削除',

          bgRemoveHint:
            'AIで画像背景を自動削除。すべてブラウザ内で処理します。',

          compressTitle:
            '画像を圧縮',

          compressHint:
            '品質とサイズを調整して画像ファイルの容量を小さくします。',

          dropImage:
            'ここに画像をドロップ',

          chooseImage:
            'またはクリックしてファイルを選択',

          supportedImages:
            '複数ファイル対応 (JPG · PNG · WEBP · GIF · BMP)',

          addMultiple:
            '複数画像を追加',

          cropSeparately:
            '各画像を個別に切り抜き',

          cropInstruction:
            'フレームをドラッグして切り抜く',

          outputTransparent:
            '透明背景のPNGとして出力',

          compressSupported:
            'JPG · PNG · WEBP と複数ファイルに対応',

          task:
            'ジョブ',

          convertAll:
            'すべて変換',

          convertingAll:
            'すべて変換中…',

          compressAll:
            'すべて圧縮',

          compressingZip:
            'ZIPを作成中…',

          removeBackgroundAll:
            'すべての背景を削除',

          removeBackgroundAllProcessing:
            'すべての背景を削除中…',

          downloadZip:
            'すべてダウンロード (.zip)',

          allFormats:
            'すべてに形式を適用',

          choosePerFile:
            '— ファイルごとに選択 —',

          convertTo:
            '変換先',

          dimensions:
            'サイズ (px)',

          rotateFlip:
            '回転 / 反転',

          rotateLeft:
            '左に90°回転',

          rotateRight:
            '右に90°回転',

          flipHorizontal:
            '左右反転',

          flipVertical:
            '上下反転',

          lockAspect:
            '縦横比を固定',

          aspectRatio:
            '縦横比',

          free:
            '自由',

          crop:
            '切り抜く',

          cropping:
            '切り抜き中…',

          croppingFailed:
            '切り抜きに失敗しました: {message}',

          saveFormat:
            '保存形式',

          waitingConvert:
            '待機中',

          waitingCrop:
            'フレームをドラッグして切り抜く',

          waitingBackground:
            '背景削除を待機中',

          removeBackground:
            '背景を削除',

          waitingCompress:
            '圧縮を待機中',

          compress:
            '圧縮',

          afterCompress:
            '圧縮後',

          savings:
            '削減量',

          ready:
            'ダウンロード準備完了',

          readyDownload:
            'ダウンロード準備完了 · {size}',

          preparingModel:
            'AIモデルを準備中…',

          loadingModelProgress:
            'モデル読み込み中… {percent}%',

          removingBackgroundProgress:
            '処理中… {percent}%',

          backgroundRemovalFailed:
            '背景削除に失敗しました: {message}',

          conversionFailed:
            '変換に失敗しました: {message}',

          compressing:
            '圧縮中…',

          compressingAll:
            'すべて圧縮中…',

          compressionFailed:
            '圧縮に失敗しました: {message}',

          readImage:
            '画像を読み込み中…',

          imageReadFailed:
            '画像を読み込めませんでした',

          preparing:
            '準備中…',

          characterConvert:
            '画像を変換する準備ができました ✨',

          characterCrop:
            '画像をぴったりフレームに合わせましょう ✂️',

          characterBgRemove:
            '背景をきれいに削除中 🫧',

          characterCompress:
            '品質を保ちながら画像を小さくします 📦',

          modelFirstUse:
            '初回使用時に約40MBのAIモデルをダウンロードします。ブラウザにキャッシュされるため、次回から速くなります。'
        },


        pdf: {

          fromImagesTitle:
            '画像をPDFに',

          fromImagesHint:
            '複数の画像を1つのPDFにまとめ、ページ順を変更できます。',

          toImagesTitle:
            'PDF → 画像',

          toImagesHint:
            'PDFのすべてのページを画像に変換します。',

          pagesTitle:
            'PDFページ管理',

          pagesHint:
            'ページの削除、並べ替え、選択ページの書き出しができます。',

          mergeTitle:
            'PDFを結合',

          mergeHint:
            '複数のPDFファイルを1つにまとめます。',

          watermarkTitle:
            'PDFに透かし',

          watermarkHint:
            'すべてのPDFページにテキストまたはPNGを追加します。',

          pageNumbersTitle:
            'ページ番号を追加',

          pageNumbersHint:
            'PDFの各ページにページ番号を自動追加します。',

          dropPdf:
            'PDFをここにドロップ',

          dropPdfMultiple:
            '複数のPDFをここにドロップ',

          clickChoosePdf:
            'またはクリックしてファイルを選択',

          oneFile:
            '1ファイルずつ',

          multipleFiles:
            '複数ファイルを追加',

          imagesToPdfOrder:
            '追加順がPDFのページ順になります。',

          mergeOrder:
            '結合前にファイル順を変更できます。',

          pageSize:
            'ページサイズ',

          fitToImage:
            '画像に合わせる',

          buildPdf:
            'PDFを作成',

          mergeFiles:
            'ファイルを結合',

          mergedSuccess:
            'PDFを正常に結合しました',

          createdSuccess:
            'PDFを正常に作成しました',

          downloadPdf:
            'PDFをダウンロード',

          downloadMergedPdf:
            '結合したPDFをダウンロード',

          imageFormat:
            '形式',

          resolution:
            '解像度',

          renderAllPages:
            'すべてのページを変換',

          pageProgress:
            'ページ {current}/{total}',

          manageInstructions:
            '✕でページ削除、↑ ↓で並べ替え、チェックで個別書き出しできます。',

          downloadPdfOrdered:
            'PDFをダウンロード',

          downloadSelected:
            '選択したページをダウンロード',

          deleteThisPage:
            'このページを削除',

          moveUp:
            '上へ',

          moveDown:
            '下へ',

          watermarkText:
            '透かしテキスト',

          watermarkImage:
            '透かしPNG',

          watermarkImagePlaceholder:
            '画像のみ使用する場合は空欄',

          noImageSelected:
            '画像が選択されていません',

          fontSize:
            '文字サイズ',

          watermarkImageSize:
            '透かし画像サイズ',

          opacity:
            '不透明度',

          angle:
            '回転角度',

          watermarkCombination:
            'テキストのみ、PNGのみ、または両方を使用できます。',

          readyWatermark:
            '透かしを追加する準備完了',

          applyWatermark:
            '透かしを追加',

          pageNumberFormat:
            'テキスト形式',

          startCountingAt:
            '開始番号',

          position:
            '位置',

          bottomCenter:
            '下中央',

          bottomRight:
            '右下',

          bottomLeft:
            '左下',

          topCenter:
            '上中央',

          topRight:
            '右上',

          readyPageNumber:
            'ページ番号を追加する準備完了',

          applyPageNumber:
            'ページ番号を追加',

          pageNumberHelp:
            '{n} はページ番号、{total} は総ページ数です。',

          preparing:
            'ファイルを準備中…',

          loading:
            'PDFを読み込み中…',

          loadingFailed:
            'PDFを開けませんでした',

          invalidPdf:
            'PDFファイルを選択してください。',

          creating:
            'PDFを作成中…',

          creatingProgress:
            'PDFを作成中… {current}/{total}',

          converting:
            '変換中…',

          convertingProgress:
            'ページ {current}/{total} を変換中',

          cancelling:
            'キャンセル中…',

          cancelled:
            'キャンセルしました · {current}/{total}ページを変換済み',

          rendering:
            'ページ {current}/{total} を変換中',

          renderingAll:
            'すべてのページを変換中…',

          created:
            'PDF作成完了 · {pages}ページ · {size}',

          merged:
            'PDF結合完了 · {pages}ページ · {size}',

          readyDownload:
            'ダウンロード準備完了 · {size}',

          buildFailed:
            'PDF作成に失敗しました: {message}',

          mergeFailed:
            'PDF結合に失敗しました: {message}',

          renderFailed:
            'PDF変換中にエラーが発生しました: {message}',

          zipFailed:
            'ZIPを作成できませんでした: {message}',

          pageNotFound:
            'PDFにページがありません',

          selectPageRequired:
            '少なくとも1ページ選択してください。',

          minimumFiles:
            '結合には2ファイル以上必要です。',

          noPages:
            'ページが見つかりません。',

          workerUnavailable:
            'このブラウザはバックグラウンドPDF処理に対応していません。',

          workerFailed:
            'PDF Workerを使用できません。',

          workerStopped:
            'PDF Workerが停止しました。',

          workerRequestFailed:
            'PDF Workerの処理に失敗しました。',

          thumbnailFailed:
            'PDFページのプレビューを作成できませんでした。',

          deletePage:
            'ページを削除',

          restorePage:
            'ページを復元',

          dropPosition:
            'ここにページを配置',

          pageLabel:
            'ページ {page}',

          filesCount:
            '{count} ファイル',

          pagesCount:
            '{count} ページ',

          characterFromImages:
            '画像をきれいなPDFにまとめます 📄',

          characterToImages:
            'PDFをページごとの画像に分割します 🧩',

          characterPages:
            'PDFページを簡単に整理できます 📚',

          characterMerge:
            'ドキュメントを1つのファイルにまとめます 💗',

          characterWatermark:
            '控えめな透かしを追加します 💧',

          characterPageNumbers:
            'ページ番号を追加して整理します 🔖'
        },


        dropzone: {

          image:
            '画像をここにドロップ、またはクリック',

          pdf:
            'PDFをここにドロップ',

          pdfMultiple:
            '複数のPDFをここにドロップ',

          imageOnly:
            '画像ファイルをここにドロップ',

          pdfOne:
            'PDFをここにドロップ'
        },


        errors: {

          downloadDataNotFound:
            'ダウンロードするデータがありません。',

          fileNotFound:
            'ファイルが見つかりません。',

          fileReadFailed:
            'ファイルを読み込めませんでした。',

          fileReadAborted:
            'ファイルの読み込みが中止されました。',

          imageLoadFailed:
            '画像を読み込めませんでした。',

          unsupportedFile:
            'このファイル形式には対応していません。',

          processingFailed:
            'ファイルの処理に失敗しました。',

          somethingWentWrong:
            'エラーが発生しました。もう一度お試しください。',

          createFailed:
            '出力ファイルを作成できませんでした。',

          canvasContext:
            'Canvasを作成できませんでした。',

          invalidImageDimensions:
            '画像サイズが無効です。',

          backgroundFunctionNotFound:
            '背景削除機能が見つかりません。',

          backgroundLibraryLoadFailed:
            '背景削除ライブラリの読み込みに失敗しました: {message}'
        },


        file: {

          size:
            'ファイルサイズ: {size}',

          largeWarning:
            'このサイズのファイルは処理に時間がかかる場合があります。',

          continueQuestion:
            '続行しますか？',

          original:
            '元のファイル'
        },


        utils: {

          cacheHandlerFailed:
            'clearCacheハンドラーでエラーが発生しました',

          invalidObjectUrlHolder:
            'replaceObjectUrlには有効なholderとkeyが必要です'
        },


        tool: {

          waiting:
            '待機中',

          ready:
            '準備完了',

          processing:
            '処理中',

          success:
            '正常に完了',

          error:
            'エラーが発生しました'
        },


        notepad: {

          title:
            'オンラインメモ帳',

          subtitle:
            '簡単にメモを作成し、自動保存できます',

          toolbar:
            'メモ帳ツールバー',

          backHome:
            'ホームに戻る',

          newNote:
            '新しいメモ',

          newNoteQuestion:
            '新しいメモを作成しますか？',

          currentTextWillClear:
            '現在のテキストが削除されます',

          createNew:
            '新規作成',

          new:
            '新規',

          copy:
            'コピー',

          copyAll:
            'すべてのテキストをコピー',

          save:
            '保存',

          saveTxt:
            'TXTとして保存',

          clear:
            'クリア',

          undo:
            '元に戻す',

          undoLabel:
            '元に戻す',

          redo:
            'やり直す',

          redoLabel:
            'やり直す',

          searchPlaceholder:
            'テキストを検索...',

          searchLabel:
            'メモを検索',

          clearSearch:
            '検索をクリア',

          editorSection:
            'テキストエディター',

          editorPlaceholder:
            'ここに入力してください...',

          editorLabel:
            'テキスト入力欄',

          characters:
            '文字',

          words:
            '単語',

          lines:
            '行',

          status: {

            saved:
              '保存済み',

            saving:
              '保存中...',

            saveFailed:
              '保存に失敗しました',

            nothingToSave:
              '保存するテキストがありません',

            txtSaved:
              '.txtとして保存しました'
          },

          buttons: {

            nothingToSave:
              'テキストなし',

            txtSaved:
              '✓ 保存済み',

            noText:
              'テキストなし',

            copied:
              '✓ コピー済み',

            copyFailed:
              'コピーに失敗しました'
          },

          search: {

            found:
              'テキストが見つかりました',

            notFound:
              'テキストが見つかりません'
          },

          errors: {

            loadFailed:
              '保存されたメモを読み込めませんでした'
          }
        },


        language: {

          th:
            'タイ語',

          en:
            '英語',

          de:
            'ドイツ語',

          ja:
            '日本語',

          ko:
            '韓国語',

          zhCN:
            '簡体字中国語',

          zhTW:
            '繁体字中国語'
        }

      }
    },


    // ==========================================================
    // KOREAN
    // ==========================================================

    ko: {

      name:
        'Korean',

      nativeName:
        '한국어',

      dir:
        'ltr',

      messages: {

        common: {

          home:
            '홈',

          language:
            '언어',

          image:
            '이미지',

          images:
            '이미지',

          pdf:
            'PDF',

          notepad:
            '메모장',

          upload:
            '업로드',

          chooseFile:
            '파일 선택',

          chooseFiles:
            '파일 선택',

          download:
            '다운로드',

          downloadAll:
            '모두 다운로드',

          clear:
            '모두 지우기',

          cancel:
            '취소',

          delete:
            '삭제',

          remove:
            '제거',

          process:
            '처리',

          processing:
            '처리 중...',

          completed:
            '완료',

          failed:
            '실패',

          loading:
            '로드 중...',

          ready:
            '준비 완료',

          retry:
            '다시 시도',

          close:
            '닫기',

          save:
            '저장',

          reset:
            '초기화',

          continue:
            '계속',

          confirm:
            '확인',

          selectAll:
            '모두 선택',

          items:
            '항목',

          files:
            '파일',

          file:
            '파일',

          pages:
            '페이지',

          page:
            '페이지',

          jobs:
            '작업',

          original:
            '원본',

          format:
            '형식',

          size:
            '크기',

          quality:
            '품질',

          width:
            '너비',

          height:
            '높이',

          saveAs:
            '다른 이름으로 저장',

          result:
            '결과',

          done:
            '완료',

          unlimited:
            '무제한',

          yes:
            '예',

          no:
            '아니요'
        },


        cute: {

          ready:
            '준비 완료 ✨',

          completed:
            '완료',

          processing:
            '작업 중…',

          itemCount:
            '{count}개 항목'
        },


        page: {

          title:
            'Workshop Utility BY KITTO',

          heading:
            '파일 관리 도구',

          subtitle:
            '브라우저에서 이미지와 PDF를 변환하고 편집하세요. 파일은 서버로 업로드되지 않습니다.',

          footer:
            '모든 작업은 브라우저에서 처리됩니다 — 파일은 외부로 전송되지 않습니다.',

          notepadTitle:
            '온라인 메모장 열기'
        },


        image: {

          convertTitle:
            '변환 및 크기 조정',

          convertHint:
            'PNG / JPG / WEBP 변환, 크기 조정, 품질 변경, 회전 및 뒤집기를 지원합니다.',

          cropTitle:
            '이미지 자르기',

          cropHint:
            '원하는 영역을 선택하고 프레임을 조정한 후 결과를 다운로드하세요.',

          bgRemoveTitle:
            '배경 제거',

          bgRemoveHint:
            'AI로 이미지 배경을 자동 제거합니다. 모든 작업은 브라우저에서 처리됩니다.',

          compressTitle:
            '이미지 압축',

          compressHint:
            '품질과 이미지 크기를 조정하여 파일 크기를 줄입니다.',

          dropImage:
            '여기에 이미지를 놓으세요',

          chooseImage:
            '또는 클릭하여 파일 선택',

          supportedImages:
            '여러 파일 지원 (JPG · PNG · WEBP · GIF · BMP)',

          addMultiple:
            '여러 이미지 추가',

          cropSeparately:
            '각 이미지를 개별적으로 자릅니다',

          cropInstruction:
            '프레임을 드래그하여 자르기',

          outputTransparent:
            '투명 배경 PNG로 출력',

          compressSupported:
            'JPG · PNG · WEBP 및 여러 파일 지원',

          task:
            '작업',

          convertAll:
            '모두 변환',

          convertingAll:
            '모두 변환 중…',

          compressAll:
            '모두 압축',

          compressingZip:
            'ZIP 생성 중…',

          removeBackgroundAll:
            '모든 배경 제거',

          removeBackgroundAllProcessing:
            '모든 배경 제거 중…',

          downloadZip:
            '모두 다운로드 (.zip)',

          allFormats:
            '모두에 형식 적용',

          choosePerFile:
            '— 파일별 선택 —',

          convertTo:
            '변환 대상',

          dimensions:
            '크기 (px)',

          rotateFlip:
            '회전 / 뒤집기',

          rotateLeft:
            '왼쪽으로 90° 회전',

          rotateRight:
            '오른쪽으로 90° 회전',

          flipHorizontal:
            '가로 뒤집기',

          flipVertical:
            '세로 뒤집기',

          lockAspect:
            '비율 잠금',

          aspectRatio:
            '화면 비율',

          free:
            '자유',

          crop:
            '자르기',

          cropping:
            '자르는 중…',

          croppingFailed:
            '자르기 실패: {message}',

          saveFormat:
            '저장 형식',

          waitingConvert:
            '대기 중',

          waitingCrop:
            '프레임을 드래그하여 자르기',

          waitingBackground:
            '배경 제거 대기 중',

          removeBackground:
            '배경 제거',

          waitingCompress:
            '압축 대기 중',

          compress:
            '압축',

          afterCompress:
            '압축 후',

          savings:
            '절약',

          ready:
            '다운로드 준비 완료',

          readyDownload:
            '다운로드 준비 완료 · {size}',

          preparingModel:
            'AI 모델 준비 중…',

          loadingModelProgress:
            '모델 로드 중… {percent}%',

          removingBackgroundProgress:
            '처리 중… {percent}%',

          backgroundRemovalFailed:
            '배경 제거 실패: {message}',

          conversionFailed:
            '변환 실패: {message}',

          compressing:
            '압축 중…',

          compressingAll:
            '모두 압축 중…',

          compressionFailed:
            '압축 실패: {message}',

          readImage:
            '이미지 읽는 중…',

          imageReadFailed:
            '이미지를 읽을 수 없습니다',

          preparing:
            '준비 중…',

          characterConvert:
            '이미지를 변환할 준비가 되었어요 ✨',

          characterCrop:
            '이미지를 예쁘게 잘라볼게요 ✂️',

          characterBgRemove:
            '배경을 깔끔하게 제거하는 중 🫧',

          characterCompress:
            '품질을 유지하면서 이미지 크기를 줄여요 📦',

          modelFirstUse:
            '처음 사용할 때 약 40MB 크기의 AI 모델을 다운로드합니다. 다음 사용부터는 브라우저 캐시로 더 빠르게 사용할 수 있습니다.'
        },


        pdf: {

          fromImagesTitle:
            '이미지를 PDF로',

          fromImagesHint:
            '여러 이미지를 하나의 PDF로 만들고 페이지 순서를 변경할 수 있습니다.',

          toImagesTitle:
            'PDF → 이미지',

          toImagesHint:
            'PDF의 모든 페이지를 이미지 파일로 변환합니다.',

          pagesTitle:
            'PDF 페이지 관리',

          pagesHint:
            '페이지를 삭제하고 순서를 변경하거나 선택한 페이지만 새 PDF로 내보낼 수 있습니다.',

          mergeTitle:
            'PDF 병합',

          mergeHint:
            '여러 PDF 파일을 하나로 결합합니다.',

          watermarkTitle:
            'PDF 워터마크',

          watermarkHint:
            '모든 PDF 페이지에 텍스트 또는 PNG 워터마크를 추가합니다.',

          pageNumbersTitle:
            '페이지 번호 추가',

          pageNumbersHint:
            '모든 PDF 페이지에 페이지 번호를 자동으로 추가합니다.',

          dropPdf:
            'PDF를 여기에 놓으세요',

          dropPdfMultiple:
            '여러 PDF를 여기에 놓으세요',

          clickChoosePdf:
            '또는 클릭하여 파일 선택',

          oneFile:
            '한 번에 한 파일',

          multipleFiles:
            '여러 파일 추가',

          imagesToPdfOrder:
            '추가 순서가 PDF 페이지 순서가 됩니다.',

          mergeOrder:
            '병합 전에 파일 순서를 변경하세요.',

          pageSize:
            '페이지 크기',

          fitToImage:
            '이미지에 맞춤',

          buildPdf:
            'PDF 만들기',

          mergeFiles:
            '파일 병합',

          mergedSuccess:
            'PDF 병합 완료',

          createdSuccess:
            'PDF 생성 완료',

          downloadPdf:
            'PDF 다운로드',

          downloadMergedPdf:
            '병합된 PDF 다운로드',

          imageFormat:
            '형식',

          resolution:
            '해상도',

          renderAllPages:
            '모든 페이지 변환',

          pageProgress:
            '페이지 {current}/{total}',

          manageInstructions:
            '✕로 페이지 삭제, ↑ ↓로 순서 변경, 체크박스로 별도 내보내기를 선택하세요.',

          downloadPdfOrdered:
            'PDF 다운로드',

          downloadSelected:
            '선택 항목 다운로드',

          deleteThisPage:
            '이 페이지 삭제',

          moveUp:
            '위로 이동',

          moveDown:
            '아래로 이동',

          watermarkText:
            '워터마크 텍스트',

          watermarkImage:
            '워터마크 PNG',

          watermarkImagePlaceholder:
            '이미지만 사용하는 경우 비워두세요',

          noImageSelected:
            '이미지가 선택되지 않았습니다',

          fontSize:
            '글꼴 크기',

          watermarkImageSize:
            '워터마크 이미지 크기',

          opacity:
            '투명도',

          angle:
            '회전 각도',

          watermarkCombination:
            '텍스트만, PNG만 또는 둘 다 사용할 수 있습니다.',

          readyWatermark:
            '워터마크 추가 준비 완료',

          applyWatermark:
            '워터마크 추가',

          pageNumberFormat:
            '텍스트 형식',

          startCountingAt:
            '시작 번호',

          position:
            '위치',

          bottomCenter:
            '하단 가운데',

          bottomRight:
            '오른쪽 하단',

          bottomLeft:
            '왼쪽 하단',

          topCenter:
            '상단 가운데',

          topRight:
            '오른쪽 상단',

          readyPageNumber:
            '페이지 번호 추가 준비 완료',

          applyPageNumber:
            '페이지 번호 추가',

          pageNumberHelp:
            '{n}은 페이지 번호, {total}은 전체 페이지 수입니다.',

          preparing:
            '파일 준비 중…',

          loading:
            'PDF 로드 중…',

          loadingFailed:
            'PDF 파일을 열 수 없습니다',

          invalidPdf:
            'PDF 파일만 선택하세요.',

          creating:
            'PDF 생성 중…',

          creatingProgress:
            'PDF 생성 중… {current}/{total}',

          converting:
            '변환 중…',

          convertingProgress:
            '페이지 {current}/{total} 변환 중',

          cancelling:
            '취소 중…',

          cancelled:
            '취소됨 · {current}/{total}페이지 변환 완료',

          rendering:
            '페이지 {current}/{total} 변환 중',

          renderingAll:
            '모든 페이지 변환 중…',

          created:
            'PDF 생성 완료 · {pages}페이지 · {size}',

          merged:
            'PDF 병합 완료 · {pages}페이지 · {size}',

          readyDownload:
            '다운로드 준비 완료 · {size}',

          buildFailed:
            'PDF 생성 실패: {message}',

          mergeFailed:
            'PDF 병합 실패: {message}',

          renderFailed:
            'PDF 변환 중 오류: {message}',

          zipFailed:
            'ZIP 생성 실패: {message}',

          pageNotFound:
            'PDF에 남은 페이지가 없습니다',

          selectPageRequired:
            '최소 한 페이지를 선택하세요.',

          minimumFiles:
            '병합하려면 최소 2개의 파일이 필요합니다.',

          noPages:
            '페이지를 찾을 수 없습니다.',

          workerUnavailable:
            '이 브라우저는 백그라운드 PDF 처리를 지원하지 않습니다.',

          workerFailed:
            'PDF Worker를 사용할 수 없습니다.',

          workerStopped:
            'PDF Worker가 중지되었습니다.',

          workerRequestFailed:
            'PDF Worker 요청에 실패했습니다.',

          thumbnailFailed:
            'PDF 페이지 미리보기를 만들 수 없습니다.',

          deletePage:
            '페이지 삭제',

          restorePage:
            '페이지 복원',

          dropPosition:
            '여기에 페이지 놓기',

          pageLabel:
            '페이지 {page}',

          filesCount:
            '{count}개 파일',

          pagesCount:
            '{count}개 페이지',

          characterFromImages:
            '이미지를 깔끔한 PDF로 만들어드려요 📄',

          characterToImages:
            'PDF를 페이지별 이미지로 나눠드려요 🧩',

          characterPages:
            'PDF 페이지를 쉽게 관리해보세요 📚',

          characterMerge:
            '문서를 하나의 파일로 합쳐드려요 💗',

          characterWatermark:
            '부드러운 워터마크를 추가해드려요 💧',

          characterPageNumbers:
            '페이지 번호를 넣어 깔끔하게 정리해드려요 🔖'
        },


        dropzone: {

          image:
            '이미지를 여기에 놓거나 클릭하세요',

          pdf:
            'PDF를 여기에 놓으세요',

          pdfMultiple:
            '여러 PDF를 여기에 놓으세요',

          imageOnly:
            '이미지 파일을 여기에 놓으세요',

          pdfOne:
            'PDF를 여기에 놓으세요'
        },


        errors: {

          downloadDataNotFound:
            '다운로드할 데이터가 없습니다.',

          fileNotFound:
            '파일을 찾을 수 없습니다.',

          fileReadFailed:
            '파일을 읽을 수 없습니다.',

          fileReadAborted:
            '파일 읽기가 중단되었습니다.',

          imageLoadFailed:
            '이미지를 불러올 수 없습니다.',

          unsupportedFile:
            '지원되지 않는 파일 형식입니다.',

          processingFailed:
            '파일 처리에 실패했습니다.',

          somethingWentWrong:
            '문제가 발생했습니다. 다시 시도하세요.',

          createFailed:
            '출력 파일을 만들 수 없습니다.',

          canvasContext:
            'Canvas를 만들 수 없습니다.',

          invalidImageDimensions:
            '잘못된 이미지 크기입니다.',

          backgroundFunctionNotFound:
            '배경 제거 기능을 찾을 수 없습니다.',

          backgroundLibraryLoadFailed:
            '배경 제거 라이브러리를 불러오지 못했습니다: {message}'
        },


        file: {

          size:
            '파일 크기: {size}',

          largeWarning:
            '이 정도 크기의 파일은 처리 시간이 오래 걸릴 수 있습니다.',

          continueQuestion:
            '계속하시겠습니까?',

          original:
            '원본'
        },


        utils: {

          cacheHandlerFailed:
            'clearCache 핸들러 실패',

          invalidObjectUrlHolder:
            'replaceObjectUrl에는 유효한 holder와 key가 필요합니다'
        },


        tool: {

          waiting:
            '대기 중',

          ready:
            '준비 완료',

          processing:
            '처리 중',

          success:
            '성공적으로 완료',

          error:
            '오류가 발생했습니다'
        },


        notepad: {

          title:
            '온라인 메모장',

          subtitle:
            '간단하게 메모하고 자동으로 저장하세요',

          toolbar:
            '메모장 도구 모음',

          backHome:
            '홈으로 돌아가기',

          newNote:
            '새 메모 만들기',

          newNoteQuestion:
            '새 메모를 만들까요?',

          currentTextWillClear:
            '현재 텍스트가 삭제됩니다',

          createNew:
            '새로 만들기',

          new:
            '새로 만들기',

          copy:
            '복사',

          copyAll:
            '전체 텍스트 복사',

          save:
            '저장',

          saveTxt:
            'TXT로 저장',

          clear:
            '지우기',

          undo:
            '실행 취소',

          undoLabel:
            '실행 취소',

          redo:
            '다시 실행',

          redoLabel:
            '다시 실행',

          searchPlaceholder:
            '텍스트 검색...',

          searchLabel:
            '메모 검색',

          clearSearch:
            '검색 지우기',

          editorSection:
            '텍스트 편집기',

          editorPlaceholder:
            '여기에 입력하세요...',

          editorLabel:
            '텍스트 입력 영역',

          characters:
            '문자',

          words:
            '단어',

          lines:
            '줄',

          status: {

            saved:
              '저장됨',

            saving:
              '저장 중...',

            saveFailed:
              '저장 실패',

            nothingToSave:
              '저장할 텍스트가 없습니다',

            txtSaved:
              '.txt로 저장됨'
          },

          buttons: {

            nothingToSave:
              '텍스트 없음',

            txtSaved:
              '✓ 저장됨',

            noText:
              '텍스트 없음',

            copied:
              '✓ 복사됨',

            copyFailed:
              '복사 실패'
          },

          search: {

            found:
              '텍스트를 찾았습니다',

            notFound:
              '텍스트를 찾을 수 없습니다'
          },

          errors: {

            loadFailed:
              '저장된 메모를 불러올 수 없습니다'
          }
        },


        language: {

          th:
            '태국어',

          en:
            '영어',

          de:
            '독일어',

          ja:
            '일본어',

          ko:
            '한국어',

          zhCN:
            '중국어 간체',

          zhTW:
            '중국어 번체'
        }

      }
    },


    // ==========================================================
    // CHINESE SIMPLIFIED
    // ==========================================================

    'zh-CN': {

      name:
        'Chinese Simplified',

      nativeName:
        '简体中文',

      dir:
        'ltr',

      messages: {

        common: {

          home:
            '首页',

          language:
            '语言',

          image:
            '图片',

          images:
            '图片',

          pdf:
            'PDF',

          notepad:
            '记事本',

          upload:
            '上传',

          chooseFile:
            '选择文件',

          chooseFiles:
            '选择文件',

          download:
            '下载',

          downloadAll:
            '全部下载',

          clear:
            '全部清除',

          cancel:
            '取消',

          delete:
            '删除',

          remove:
            '移除',

          process:
            '处理',

          processing:
            '处理中...',

          completed:
            '已完成',

          failed:
            '失败',

          loading:
            '加载中...',

          ready:
            '准备就绪',

          retry:
            '重试',

          close:
            '关闭',

          save:
            '保存',

          reset:
            '重置',

          continue:
            '继续',

          confirm:
            '确认',

          selectAll:
            '全选',

          items:
            '项目',

          files:
            '文件',

          file:
            '文件',

          pages:
            '页面',

          page:
            '页面',

          jobs:
            '任务',

          original:
            '原始',

          format:
            '格式',

          size:
            '大小',

          quality:
            '质量',

          width:
            '宽度',

          height:
            '高度',

          saveAs:
            '另存为',

          result:
            '结果',

          done:
            '完成',

          unlimited:
            '无限',

          yes:
            '是',

          no:
            '否'
        },


        cute: {

          ready:
            '准备好了 ✨',

          completed:
            '已完成',

          processing:
            '处理中…',

          itemCount:
            '{count} 个项目'
        },


        page: {

          title:
            'Workshop Utility BY KITTO',

          heading:
            '文件管理工具',

          subtitle:
            '直接在浏览器中转换和编辑图片/PDF。文件不会上传到服务器。',

          footer:
            '所有处理都在浏览器中完成 — 文件不会被发送到其他地方。',

          notepadTitle:
            '打开在线记事本'
        },


        image: {

          convertTitle:
            '转换和调整大小',

          convertHint:
            '转换 PNG / JPG / WEBP 格式、调整大小、质量、旋转和翻转图片。',

          cropTitle:
            '裁剪图片',

          cropHint:
            '选择需要裁剪的区域，调整边框，然后下载结果。',

          bgRemoveTitle:
            '移除背景',

          bgRemoveHint:
            '使用 AI 自动移除图片背景，全部在浏览器中处理。',

          compressTitle:
            '压缩图片',

          compressHint:
            '通过调整质量和尺寸来减小图片文件大小。',

          dropImage:
            '将图片拖到这里',

          chooseImage:
            '或点击选择文件',

          supportedImages:
            '支持多个文件 (JPG · PNG · WEBP · GIF · BMP)',

          addMultiple:
            '添加多个图片',

          cropSeparately:
            '每张图片单独裁剪',

          cropInstruction:
            '拖动边框进行裁剪',

          outputTransparent:
            '输出为透明背景 PNG',

          compressSupported:
            '支持 JPG · PNG · WEBP 和多个文件',

          task:
            '任务',

          convertAll:
            '全部转换',

          convertingAll:
            '正在转换全部…',

          compressAll:
            '全部压缩',

          compressingZip:
            '正在创建 ZIP…',

          removeBackgroundAll:
            '移除所有背景',

          removeBackgroundAllProcessing:
            '正在移除所有背景…',

          downloadZip:
            '全部下载 (.zip)',

          allFormats:
            '应用格式到全部',

          choosePerFile:
            '— 每个文件单独选择 —',

          convertTo:
            '转换为',

          dimensions:
            '尺寸 (px)',

          rotateFlip:
            '旋转 / 翻转',

          rotateLeft:
            '向左旋转90°',

          rotateRight:
            '向右旋转90°',

          flipHorizontal:
            '水平翻转',

          flipVertical:
            '垂直翻转',

          lockAspect:
            '锁定比例',

          aspectRatio:
            '宽高比',

          free:
            '自由',

          crop:
            '裁剪',

          cropping:
            '裁剪中…',

          croppingFailed:
            '裁剪失败: {message}',

          saveFormat:
            '保存格式',

          waitingConvert:
            '等待',

          waitingCrop:
            '拖动边框进行裁剪',

          waitingBackground:
            '等待移除背景',

          removeBackground:
            '移除背景',

          waitingCompress:
            '等待压缩',

          compress:
            '压缩',

          afterCompress:
            '压缩后',

          savings:
            '节省',

          ready:
            '准备下载',

          readyDownload:
            '准备下载 · {size}',

          preparingModel:
            '正在准备 AI 模型…',

          loadingModelProgress:
            '正在加载模型… {percent}%',

          removingBackgroundProgress:
            '处理中… {percent}%',

          backgroundRemovalFailed:
            '背景移除失败: {message}',

          conversionFailed:
            '转换失败: {message}',

          compressing:
            '压缩中…',

          compressingAll:
            '正在压缩全部…',

          compressionFailed:
            '压缩失败: {message}',

          readImage:
            '正在读取图片…',

          imageReadFailed:
            '无法读取图片',

          preparing:
            '准备中…',

          characterConvert:
            '准备把图片转换好啦 ✨',

          characterCrop:
            '让图片裁剪得刚刚好 ✂️',

          characterBgRemove:
            '正在把背景干净地移除 🫧',

          characterCompress:
            '在保持质量的同时缩小图片 📦',

          modelFirstUse:
            '首次使用会下载约40MB的AI模型。浏览器会缓存模型，以便之后更快使用。'
        },


        pdf: {

          fromImagesTitle:
            '图片转 PDF',

          fromImagesHint:
            '将多个图片合并成一个 PDF，并可调整页面顺序。',

          toImagesTitle:
            'PDF → 图片',

          toImagesHint:
            '将 PDF 的每一页转换成图片。',

          pagesTitle:
            '管理 PDF 页面',

          pagesHint:
            '删除页面、重新排序，或将选定页面导出为新的 PDF。',

          mergeTitle:
            '合并 PDF',

          mergeHint:
            '将多个 PDF 文件合并成一个文件。',

          watermarkTitle:
            'PDF 水印',

          watermarkHint:
            '向每个 PDF 页面添加文字或 PNG 水印。',

          pageNumbersTitle:
            '添加页码',

          pageNumbersHint:
            '自动为每个 PDF 页面添加页码。',

          dropPdf:
            '将 PDF 拖到这里',

          dropPdfMultiple:
            '将多个 PDF 文件拖到这里',

          clickChoosePdf:
            '或点击选择文件',

          oneFile:
            '一次一个文件',

          multipleFiles:
            '添加多个文件',

          imagesToPdfOrder:
            '添加顺序将成为 PDF 页面顺序。',

          mergeOrder:
            '合并前可以重新排序文件。',

          pageSize:
            '页面大小',

          fitToImage:
            '适合图片',

          buildPdf:
            '创建 PDF',

          mergeFiles:
            '合并文件',

          mergedSuccess:
            'PDF 合并成功',

          createdSuccess:
            'PDF 创建成功',

          downloadPdf:
            '下载 PDF',

          downloadMergedPdf:
            '下载合并后的 PDF',

          imageFormat:
            '格式',

          resolution:
            '分辨率',

          renderAllPages:
            '转换所有页面',

          pageProgress:
            '页面 {current}/{total}',

          manageInstructions:
            '使用 ✕ 删除页面、↑ ↓ 调整顺序，并勾选页面进行单独导出。',

          downloadPdfOrdered:
            '下载 PDF',

          downloadSelected:
            '下载选中页面',

          deleteThisPage:
            '删除此页面',

          moveUp:
            '上移',

          moveDown:
            '下移',

          watermarkText:
            '水印文字',

          watermarkImage:
            '水印 PNG',

          watermarkImagePlaceholder:
            '仅使用图片时可留空',

          noImageSelected:
            '未选择图片',

          fontSize:
            '字体大小',

          watermarkImageSize:
            '水印图片大小',

          opacity:
            '透明度',

          angle:
            '旋转角度',

          watermarkCombination:
            '可以单独使用文字、单独使用 PNG，或两者同时使用。',

          readyWatermark:
            '准备添加水印',

          applyWatermark:
            '添加水印',

          pageNumberFormat:
            '文字格式',

          startCountingAt:
            '开始编号',

          position:
            '位置',

          bottomCenter:
            '底部居中',

          bottomRight:
            '右下',

          bottomLeft:
            '左下',

          topCenter:
            '顶部居中',

          topRight:
            '右上',

          readyPageNumber:
            '准备添加页码',

          applyPageNumber:
            '添加页码',

          pageNumberHelp:
            '使用 {n} 表示页码，{total} 表示总页数。',

          preparing:
            '准备文件中…',

          loading:
            '正在加载 PDF…',

          loadingFailed:
            '无法打开 PDF 文件',

          invalidPdf:
            '请选择 PDF 文件。',

          creating:
            '正在创建 PDF…',

          creatingProgress:
            '正在创建 PDF… {current}/{total}',

          converting:
            '转换中…',

          convertingProgress:
            '正在转换第 {current}/{total} 页',

          cancelling:
            '正在取消…',

          cancelled:
            '已取消 · 已转换 {current}/{total} 页',

          rendering:
            '正在转换第 {current}/{total} 页',

          renderingAll:
            '正在转换所有页面…',

          created:
            'PDF 创建成功 · {pages} 页 · {size}',

          merged:
            'PDF 合并成功 · {pages} 页 · {size}',

          readyDownload:
            '准备下载 · {size}',

          buildFailed:
            '创建 PDF 失败: {message}',

          mergeFailed:
            '合并 PDF 失败: {message}',

          renderFailed:
            '转换 PDF 时出错: {message}',

          zipFailed:
            '无法创建 ZIP: {message}',

          pageNotFound:
            'PDF 中没有剩余页面',

          selectPageRequired:
            '请至少选择一个页面。',

          minimumFiles:
            '合并至少需要2个文件。',

          noPages:
            '未找到页面。',

          workerUnavailable:
            '此浏览器不支持后台 PDF 处理。',

          workerFailed:
            'PDF Worker 不可用。',

          workerStopped:
            'PDF Worker 已停止。',

          workerRequestFailed:
            'PDF Worker 请求失败。',

          thumbnailFailed:
            '无法创建 PDF 页面预览。',

          deletePage:
            '删除页面',

          restorePage:
            '恢复页面',

          dropPosition:
            '将页面放在这里',

          pageLabel:
            '第 {page} 页',

          filesCount:
            '{count} 个文件',

          pagesCount:
            '{count} 页',

          characterFromImages:
            '把图片整理成漂亮的 PDF 📄',

          characterToImages:
            '把 PDF 一页页变成图片 🧩',

          characterPages:
            '轻松管理 PDF 页面 📚',

          characterMerge:
            '把文档整理成一个文件 💗',

          characterWatermark:
            '添加柔和的文档水印 💧',

          characterPageNumbers:
            '添加页码，让文档更整齐 🔖'
        },


        dropzone: {

          image:
            '将图片拖到这里，或点击选择',

          pdf:
            '将 PDF 拖到这里',

          pdfMultiple:
            '将多个 PDF 拖到这里',

          imageOnly:
            '将图片文件拖到这里',

          pdfOne:
            '将 PDF 拖到这里'
        },


        errors: {

          downloadDataNotFound:
            '没有找到可下载的数据。',

          fileNotFound:
            '找不到文件。',

          fileReadFailed:
            '读取文件失败。',

          fileReadAborted:
            '文件读取已取消。',

          imageLoadFailed:
            '加载图片失败。',

          unsupportedFile:
            '不支持此文件类型。',

          processingFailed:
            '文件处理失败。',

          somethingWentWrong:
            '出现错误，请重试。',

          createFailed:
            '无法创建输出文件。',

          canvasContext:
            '无法创建 Canvas。',

          invalidImageDimensions:
            '图片尺寸无效。',

          backgroundFunctionNotFound:
            '未找到背景移除功能。',

          backgroundLibraryLoadFailed:
            '背景移除库加载失败: {message}'
        },


        file: {

          size:
            '文件大小: {size}',

          largeWarning:
            '此文件较大，处理时间可能更长并占用较多内存。',

          continueQuestion:
            '是否继续？',

          original:
            '原始'
        },


        utils: {

          cacheHandlerFailed:
            'clearCache 处理程序失败',

          invalidObjectUrlHolder:
            'replaceObjectUrl 需要有效的 holder 和 key'
        },


        tool: {

          waiting:
            '等待',

          ready:
            '准备就绪',

          processing:
            '处理中',

          success:
            '处理成功',

          error:
            '发生错误'
        },


        notepad: {

          title:
            '在线记事本',

          subtitle:
            '轻松记录文字并自动保存',

          toolbar:
            '记事本工具栏',

          backHome:
            '返回首页',

          newNote:
            '新建笔记',

          newNoteQuestion:
            '新建笔记？',

          currentTextWillClear:
            '当前文字将被清除',

          createNew:
            '新建',

          new:
            '新建',

          copy:
            '复制',

          copyAll:
            '复制全部文字',

          save:
            '保存',

          saveTxt:
            '保存为 TXT',

          clear:
            '清除',

          undo:
            '撤销',

          undoLabel:
            '撤销',

          redo:
            '重做',

          redoLabel:
            '重做',

          searchPlaceholder:
            '搜索文字...',

          searchLabel:
            '在笔记中搜索',

          clearSearch:
            '清除搜索',

          editorSection:
            '文本编辑器',

          editorPlaceholder:
            '开始输入文字...',

          editorLabel:
            '文本输入区域',

          characters:
            '字符',

          words:
            '单词',

          lines:
            '行',

          status: {

            saved:
              '已保存',

            saving:
              '保存中...',

            saveFailed:
              '保存失败',

            nothingToSave:
              '没有可保存的文字',

            txtSaved:
              '已保存为 .txt'
          },

          buttons: {

            nothingToSave:
              '无文字',

            txtSaved:
              '✓ 已保存',

            noText:
              '无文字',

            copied:
              '✓ 已复制',

            copyFailed:
              '复制失败'
          },

          search: {

            found:
              '找到文字',

            notFound:
              '未找到文字'
          },

          errors: {

            loadFailed:
              '无法加载已保存的笔记'
          }
        },


        language: {

          th:
            '泰语',

          en:
            '英语',

          de:
            '德语',

          ja:
            '日语',

          ko:
            '韩语',

          zhCN:
            '简体中文',

          zhTW:
            '繁体中文'
        }

      }
    },


    // ==========================================================
    // CHINESE TRADITIONAL
    // ==========================================================

    'zh-TW': {

      name:
        'Chinese Traditional',

      nativeName:
        '繁體中文',

      dir:
        'ltr',

      messages: {

        common: {

          home:
            '首頁',

          language:
            '語言',

          image:
            '圖片',

          images:
            '圖片',

          pdf:
            'PDF',

          notepad:
            '記事本',

          upload:
            '上傳',

          chooseFile:
            '選擇檔案',

          chooseFiles:
            '選擇檔案',

          download:
            '下載',

          downloadAll:
            '全部下載',

          clear:
            '全部清除',

          cancel:
            '取消',

          delete:
            '刪除',

          remove:
            '移除',

          process:
            '處理',

          processing:
            '處理中...',

          completed:
            '完成',

          failed:
            '失敗',

          loading:
            '載入中...',

          ready:
            '準備完成',

          retry:
            '再試一次',

          close:
            '關閉',

          save:
            '儲存',

          reset:
            '重設',

          continue:
            '繼續',

          confirm:
            '確認',

          selectAll:
            '全選',

          items:
            '項目',

          files:
            '檔案',

          file:
            '檔案',

          pages:
            '頁面',

          page:
            '頁面',

          jobs:
            '工作',

          original:
            '原始',

          format:
            '格式',

          size:
            '大小',

          quality:
            '品質',

          width:
            '寬度',

          height:
            '高度',

          saveAs:
            '另存為',

          result:
            '結果',

          done:
            '完成',

          unlimited:
            '無限制',

          yes:
            '是',

          no:
            '否'
        },


        cute: {

          ready:
            '準備好了 ✨',

          completed:
            '已完成',

          processing:
            '處理中…',

          itemCount:
            '{count} 個項目'
        },


        page: {

          title:
            'Workshop Utility BY KITTO',

          heading:
            '檔案管理工具',

          subtitle:
            '直接在瀏覽器中轉換和編輯圖片/PDF。檔案不會上傳至伺服器。',

          footer:
            '所有處理都在瀏覽器中完成 — 檔案不會被傳送到其他地方。',

          notepadTitle:
            '開啟 Online Notepad'
        },


        image: {

          convertTitle:
            '轉換與調整大小',

          convertHint:
            '支援 PNG / JPG / WEBP 格式轉換、調整大小、品質、旋轉與翻轉。',

          cropTitle:
            '裁剪圖片',

          cropHint:
            '選擇要裁剪的區域，調整框線後下載結果。',

          bgRemoveTitle:
            '移除背景',

          bgRemoveHint:
            '使用 AI 自動移除圖片背景，全部在瀏覽器中處理。',

          compressTitle:
            '壓縮圖片',

          compressHint:
            '透過調整品質與尺寸來減少圖片檔案大小。',

          dropImage:
            '將圖片拖到這裡',

          chooseImage:
            '或點擊選擇檔案',

          supportedImages:
            '支援多個檔案 (JPG · PNG · WEBP · GIF · BMP)',

          addMultiple:
            '新增多張圖片',

          cropSeparately:
            '每張圖片分別裁剪',

          cropInstruction:
            '拖曳框線進行裁剪',

          outputTransparent:
            '輸出為透明背景 PNG',

          compressSupported:
            '支援 JPG · PNG · WEBP 及多個檔案',

          task:
            '工作',

          convertAll:
            '全部轉換',

          convertingAll:
            '正在轉換全部…',

          compressAll:
            '全部壓縮',

          compressingZip:
            '正在建立 ZIP…',

          removeBackgroundAll:
            '移除所有背景',

          removeBackgroundAllProcessing:
            '正在移除所有背景…',

          downloadZip:
            '全部下載 (.zip)',

          allFormats:
            '套用格式至全部',

          choosePerFile:
            '— 每個檔案個別選擇 —',

          convertTo:
            '轉換為',

          dimensions:
            '尺寸 (px)',

          rotateFlip:
            '旋轉 / 翻轉',

          rotateLeft:
            '向左旋轉90°',

          rotateRight:
            '向右旋轉90°',

          flipHorizontal:
            '水平翻轉',

          flipVertical:
            '垂直翻轉',

          lockAspect:
            '鎖定比例',

          aspectRatio:
            '長寬比',

          free:
            '自由',

          crop:
            '裁剪',

          cropping:
            '裁剪中…',

          croppingFailed:
            '裁剪失敗: {message}',

          saveFormat:
            '儲存格式',

          waitingConvert:
            '等待',

          waitingCrop:
            '拖曳框線進行裁剪',

          waitingBackground:
            '等待移除背景',

          removeBackground:
            '移除背景',

          waitingCompress:
            '等待壓縮',

          compress:
            '壓縮',

          afterCompress:
            '壓縮後',

          savings:
            '節省',

          ready:
            '準備下載',

          readyDownload:
            '準備下載 · {size}',

          preparingModel:
            '正在準備 AI 模型…',

          loadingModelProgress:
            '正在載入模型… {percent}%',

          removingBackgroundProgress:
            '處理中… {percent}%',

          backgroundRemovalFailed:
            '背景移除失敗: {message}',

          conversionFailed:
            '轉換失敗: {message}',

          compressing:
            '壓縮中…',

          compressingAll:
            '正在壓縮全部…',

          compressionFailed:
            '壓縮失敗: {message}',

          readImage:
            '正在讀取圖片…',

          imageReadFailed:
            '無法讀取圖片',

          preparing:
            '準備中…',

          characterConvert:
            '準備把圖片轉換完成 ✨',

          characterCrop:
            '讓圖片裁剪得剛剛好 ✂️',

          characterBgRemove:
            '正在把背景乾淨地移除 🫧',

          characterCompress:
            '在保持品質的同時縮小圖片 📦',

          modelFirstUse:
            '第一次使用時會下載約40MB的 AI 模型。瀏覽器會快取模型，之後使用會更快。'
        },


        pdf: {

          fromImagesTitle:
            '圖片轉 PDF',

          fromImagesHint:
            '將多張圖片合併成單一 PDF，並可調整頁面順序。',

          toImagesTitle:
            'PDF → 圖片',

          toImagesHint:
            '將 PDF 每一頁轉換成圖片。',

          pagesTitle:
            '管理 PDF 頁面',

          pagesHint:
            '刪除頁面、重新排序，或將選取頁面匯出成新的 PDF。',

          mergeTitle:
            '合併 PDF',

          mergeHint:
            '將多個 PDF 檔案合併成一個檔案。',

          watermarkTitle:
            'PDF 浮水印',

          watermarkHint:
            '在每個 PDF 頁面加入文字或 PNG 浮水印。',

          pageNumbersTitle:
            '加入頁碼',

          pageNumbersHint:
            '自動為每個 PDF 頁面加入頁碼。',

          dropPdf:
            '將 PDF 拖到這裡',

          dropPdfMultiple:
            '將多個 PDF 拖到這裡',

          clickChoosePdf:
            '或點擊選擇檔案',

          oneFile:
            '一次一個檔案',

          multipleFiles:
            '新增多個檔案',

          imagesToPdfOrder:
            '新增順序會成為 PDF 頁面順序。',

          mergeOrder:
            '合併前可以重新排序檔案。',

          pageSize:
            '頁面大小',

          fitToImage:
            '符合圖片',

          buildPdf:
            '建立 PDF',

          mergeFiles:
            '合併檔案',

          mergedSuccess:
            'PDF 合併成功',

          createdSuccess:
            'PDF 建立成功',

          downloadPdf:
            '下載 PDF',

          downloadMergedPdf:
            '下載合併後的 PDF',

          imageFormat:
            '格式',

          resolution:
            '解析度',

          renderAllPages:
            '轉換所有頁面',

          pageProgress:
            '頁面 {current}/{total}',

          manageInstructions:
            '使用 ✕ 刪除頁面、↑ ↓ 調整順序，並勾選要單獨匯出的頁面。',

          downloadPdfOrdered:
            '下載 PDF',

          downloadSelected:
            '下載選取頁面',

          deleteThisPage:
            '刪除此頁',

          moveUp:
            '上移',

          moveDown:
            '下移',

          watermarkText:
            '浮水印文字',

          watermarkImage:
            '浮水印 PNG',

          watermarkImagePlaceholder:
            '只使用圖片時可留空',

          noImageSelected:
            '尚未選擇圖片',

          fontSize:
            '字型大小',

          watermarkImageSize:
            '浮水印圖片大小',

          opacity:
            '透明度',

          angle:
            '旋轉角度',

          watermarkCombination:
            '可以只使用文字、只使用 PNG，或兩者一起使用。',

          readyWatermark:
            '準備加入浮水印',

          applyWatermark:
            '加入浮水印',

          pageNumberFormat:
            '文字格式',

          startCountingAt:
            '開始編號',

          position:
            '位置',

          bottomCenter:
            '下方置中',

          bottomRight:
            '右下',

          bottomLeft:
            '左下',

          topCenter:
            '上方置中',

          topRight:
            '右上',

          readyPageNumber:
            '準備加入頁碼',

          applyPageNumber:
            '加入頁碼',

          pageNumberHelp:
            '{n} 代表頁碼，{total} 代表總頁數。',

          preparing:
            '正在準備檔案…',

          loading:
            '正在載入 PDF…',

          loadingFailed:
            '無法開啟 PDF 檔案',

          invalidPdf:
            '請選擇 PDF 檔案。',

          creating:
            '正在建立 PDF…',

          creatingProgress:
            '正在建立 PDF… {current}/{total}',

          converting:
            '轉換中…',

          convertingProgress:
            '正在轉換第 {current}/{total} 頁',

          cancelling:
            '正在取消…',

          cancelled:
            '已取消 · 已轉換 {current}/{total} 頁',

          rendering:
            '正在轉換第 {current}/{total} 頁',

          renderingAll:
            '正在轉換所有頁面…',

          created:
            'PDF 建立成功 · {pages} 頁 · {size}',

          merged:
            'PDF 合併成功 · {pages} 頁 · {size}',

          readyDownload:
            '準備下載 · {size}',

          buildFailed:
            '建立 PDF 失敗: {message}',

          mergeFailed:
            '合併 PDF 失敗: {message}',

          renderFailed:
            '轉換 PDF 時發生錯誤: {message}',

          zipFailed:
            '無法建立 ZIP: {message}',

          pageNotFound:
            'PDF 中沒有剩餘頁面',

          selectPageRequired:
            '請至少選擇一頁。',

          minimumFiles:
            '合併至少需要2個檔案。',

          noPages:
            '找不到頁面。',

          workerUnavailable:
            '此瀏覽器不支援背景 PDF 處理。',

          workerFailed:
            'PDF Worker 無法使用。',

          workerStopped:
            'PDF Worker 已停止。',

          workerRequestFailed:
            'PDF Worker 請求失敗。',

          thumbnailFailed:
            '無法建立 PDF 頁面預覽。',

          deletePage:
            '刪除頁面',

          restorePage:
            '恢復頁面',

          dropPosition:
            '將頁面放在這裡',

          pageLabel:
            '第 {page} 頁',

          filesCount:
            '{count} 個檔案',

          pagesCount:
            '{count} 頁',

          characterFromImages:
            '把圖片整理成漂亮的 PDF 📄',

          characterToImages:
            '把 PDF 一頁頁變成圖片 🧩',

          characterPages:
            '輕鬆管理 PDF 頁面 📚',

          characterMerge:
            '把文件整理成一個檔案 💗',

          characterWatermark:
            '加入柔和的文件浮水印 💧',

          characterPageNumbers:
            '加入頁碼讓文件更整齊 🔖'
        },


        dropzone: {

          image:
            '將圖片拖到這裡，或點擊選擇',

          pdf:
            '將 PDF 拖到這裡',

          pdfMultiple:
            '將多個 PDF 拖到這裡',

          imageOnly:
            '將圖片檔案拖到這裡',

          pdfOne:
            '將 PDF 拖到這裡'
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
            '發生錯誤，請再試一次。',

          createFailed:
            '無法建立輸出檔案。',

          canvasContext:
            '無法建立 Canvas。',

          invalidImageDimensions:
            '圖片尺寸無效。',

          backgroundFunctionNotFound:
            '找不到背景移除功能。',

          backgroundLibraryLoadFailed:
            '背景移除函式庫載入失敗: {message}'
        },


        file: {

          size:
            '檔案大小: {size}',

          largeWarning:
            '此檔案很大，處理可能需要更久並使用較多記憶體。',

          continueQuestion:
            '要繼續嗎？',

          original:
            '原始'
        },


        utils: {

          cacheHandlerFailed:
            'clearCache 處理程式失敗',

          invalidObjectUrlHolder:
            'replaceObjectUrl 需要有效的 holder 和 key'
        },


        tool: {

          waiting:
            '等待中',

          ready:
            '準備完成',

          processing:
            '處理中',

          success:
            '處理成功',

          error:
            '發生錯誤'
        },


        notepad: {

          title:
            'Online Notepad',

          subtitle:
            '輕鬆記錄文字並自動儲存',

          toolbar:
            '記事本工具列',

          backHome:
            '返回首頁',

          newNote:
            '建立新筆記',

          newNoteQuestion:
            '建立新筆記？',

          currentTextWillClear:
            '目前文字將被清除',

          createNew:
            '建立新的',

          new:
            '新建',

          copy:
            '複製',

          copyAll:
            '複製全部文字',

          save:
            '儲存',

          saveTxt:
            '儲存為 TXT',

          clear:
            '清除',

          undo:
            '復原',

          undoLabel:
            '復原',

          redo:
            '重做',

          redoLabel:
            '重做',

          searchPlaceholder:
            '搜尋文字...',

          searchLabel:
            '搜尋筆記',

          clearSearch:
            '清除搜尋',

          editorSection:
            '文字編輯器',

          editorPlaceholder:
            '在此開始輸入文字...',

          editorLabel:
            '文字輸入區',

          characters:
            '字元',

          words:
            '單字',

          lines:
            '行',

          status: {

            saved:
              '已儲存',

            saving:
              '儲存中...',

            saveFailed:
              '儲存失敗',

            nothingToSave:
              '沒有可儲存的文字',

            txtSaved:
              '已儲存為 .txt'
          },

          buttons: {

            nothingToSave:
              '沒有文字',

            txtSaved:
              '✓ 已儲存',

            noText:
              '沒有文字',

            copied:
              '✓ 已複製',

            copyFailed:
              '複製失敗'
          },

          search: {

            found:
              '找到文字',

            notFound:
              '找不到文字'
          },

          errors: {

            loadFailed:
              '無法載入已儲存的筆記'
          }
        },


        language: {

          th:
            '泰文',

          en:
            '英文',

          de:
            '德文',

          ja:
            '日文',

          ko:
            '韓文',

          zhCN:
            '簡體中文',

          zhTW:
            '繁體中文'
        }

      }
    }

  };


  // ============================================================
  // FILE CONVERTER TRANSLATIONS
  // ============================================================

  const CONVERTER_TRANSLATIONS = {


    // ==========================================================
    // THAI
    // ==========================================================

    th: {

      converter: {

        title:
          'File Converter',

        fileTools:
          'FILE TOOLS',

        backHome:
          'กลับหน้าหลัก',

        subtitle:
          'รวมเครื่องมือแปลงไฟล์ไว้ในที่เดียว รองรับรูปภาพ PDF เอกสาร Spreadsheet Data และ Text พร้อมประมวลผลไฟล์ในเบราว์เซอร์สำหรับเครื่องมือที่รองรับ',

        searchPlaceholder:
          'ค้นหา Converter เช่น JPG, PNG, PDF, CSV...',

        searchLabel:
          'ค้นหา Converter',

        clearSearch:
          'ล้างการค้นหา',

        all:
          'ทั้งหมด',

        image:
          'รูปภาพ',

        pdf:
          'PDF',

        document:
          'เอกสาร',

        spreadsheet:
          'Spreadsheet',

        data:
          'Data',

        text:
          'Text',

        popular:
          'POPULAR',

        popularTitle:
          'เครื่องมือยอดนิยม',

        imageTitle:
          'Image Converter',

        pdfTitle:
          'PDF Converter',

        documentTitle:
          'Document Converter',

        spreadsheetTitle:
          'Spreadsheet Converter',

        dataTitle:
          'Data Converter',

        textTitle:
          'Text Converter',

        noResults:
          'ไม่พบ Converter',

        noResultsHint:
          'ลองค้นหาด้วยชื่อไฟล์ เช่น JPG, PNG, PDF, CSV หรือ JSON',

        showAll:
          'แสดงทั้งหมด',

        privacyTitle:
          'Privacy First',

        privacyText:
          'เครื่องมือที่สามารถประมวลผลบนเบราว์เซอร์ได้ จะทำงานโดยไม่จำเป็นต้องอัปโหลดไฟล์ไปยังเซิร์ฟเวอร์ ทั้งนี้ขึ้นอยู่กับประเภทของ Converter',

        close:
          'ปิด',

        dragFiles:
          'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์',

        chooseFiles:
          'หรือเลือกไฟล์จากเครื่องของคุณ',

        browse:
          'เลือกไฟล์',

        selectedFiles:
          'ไฟล์ที่เลือก',

        clearFiles:
          'ล้างทั้งหมด',

        converting:
          'กำลังแปลงไฟล์...',

        preparing:
          'กำลังเตรียมไฟล์',

        converted:
          'แปลงไฟล์สำเร็จ',

        errorTitle:
          'เกิดข้อผิดพลาด',

        errorDefault:
          'ไม่สามารถแปลงไฟล์ได้',

        cancel:
          'ยกเลิก',

        convert:
          'แปลง',

        download:
          'ดาวน์โหลด',

        supported:
          'รองรับ',

        count:
          '{count} ไฟล์',

        tools:
          '{count} Tools',

        descJpgPng:
          'แปลง JPG เป็น PNG',

        descPngJpg:
          'แปลง PNG เป็น JPG',

        descWebpJpg:
          'แปลง WebP เป็น JPG',

        descJpgWebp:
          'แปลง JPG เป็น WebP',

        descPngWebp:
          'แปลง PNG เป็น WebP',

        descWebpPng:
          'แปลง WebP เป็น PNG',

        descSvgPng:
          'แปลง SVG เป็น PNG',

        descBmpPng:
          'แปลง BMP เป็น PNG',

        descGifPng:
          'แปลง GIF เป็น PNG',

        descImageIco:
          'สร้างไฟล์ ICO / Favicon',

        descJpgPdf:
          'แปลง JPG เป็น PDF',

        descPngPdf:
          'แปลง PNG เป็น PDF',

        descPdfJpg:
          'แปลง PDF เป็น JPG',

        descPdfPng:
          'แปลง PDF เป็น PNG',

        descPdfTxt:
          'ดึงข้อความจาก PDF',

        descImagePdf:
          'รวมรูปหลายรูปเป็น PDF',

        descPdfText:
          'ดึงข้อความจาก PDF',

        descPdfImages:
          'แยกทุกหน้า PDF เป็นรูป',

        descDocxPdf:
          'แปลง Word เป็น PDF',

        descXlsxPdf:
          'แปลง Excel เป็น PDF',

        descPptxPdf:
          'แปลง PowerPoint เป็น PDF',

        descTxtPdf:
          'แปลง Text เป็น PDF',

        descHtmlPdf:
          'แปลง HTML เป็น PDF',

        descCsvXlsx:
          'แปลง CSV เป็น Excel',

        descXlsxCsv:
          'แปลง Excel เป็น CSV',

        descCsvJson:
          'แปลง CSV เป็น JSON',

        descJsonCsv:
          'แปลง JSON เป็น CSV',

        descJsonXlsx:
          'แปลง JSON เป็น Excel',

        descJsonXml:
          'แปลง JSON เป็น XML',

        descXmlJson:
          'แปลง XML เป็น JSON',

        descYamlJson:
          'แปลง YAML เป็น JSON',

        descJsonYaml:
          'แปลง JSON เป็น YAML',

        descTxtHtml:
          'แปลง Text เป็น HTML',

        descMdHtml:
          'แปลง Markdown เป็น HTML',

        descHtmlTxt:
          'ดึงข้อความจาก HTML'
      }
    },


    // ==========================================================
    // ENGLISH
    // ==========================================================

    en: {

      converter: {

        title:
          'File Converter',

        fileTools:
          'FILE TOOLS',

        backHome:
          'Back to home',

        subtitle:
          'A collection of file conversion tools in one place. Supports images, PDF, documents, spreadsheets, data and text, with browser-based processing where supported.',

        searchPlaceholder:
          'Search Converter e.g. JPG, PNG, PDF, CSV...',

        searchLabel:
          'Search Converter',

        clearSearch:
          'Clear search',

        all:
          'All',

        image:
          'Images',

        pdf:
          'PDF',

        document:
          'Documents',

        spreadsheet:
          'Spreadsheet',

        data:
          'Data',

        text:
          'Text',

        popular:
          'POPULAR',

        popularTitle:
          'Popular Tools',

        imageTitle:
          'Image Converter',

        pdfTitle:
          'PDF Converter',

        documentTitle:
          'Document Converter',

        spreadsheetTitle:
          'Spreadsheet Converter',

        dataTitle:
          'Data Converter',

        textTitle:
          'Text Converter',

        noResults:
          'No Converter Found',

        noResultsHint:
          'Try searching for a file type such as JPG, PNG, PDF, CSV or JSON',

        showAll:
          'Show all',

        privacyTitle:
          'Privacy First',

        privacyText:
          'Converters that support browser-based processing work without uploading your files to a server.',

        close:
          'Close',

        dragFiles:
          'Drag files here or click to choose',

        chooseFiles:
          'Or choose files from your device',

        browse:
          'Choose files',

        selectedFiles:
          'Selected files',

        clearFiles:
          'Clear all',

        converting:
          'Converting files...',

        preparing:
          'Preparing file',

        converted:
          'Conversion complete',

        errorTitle:
          'Something went wrong',

        errorDefault:
          'Unable to convert the file',

        cancel:
          'Cancel',

        convert:
          'Convert',

        download:
          'Download',

        supported:
          'Supported',

        count:
          '{count} files',

        tools:
          '{count} Tools',

        descJpgPng:
          'Convert JPG to PNG',

        descPngJpg:
          'Convert PNG to JPG',

        descWebpJpg:
          'Convert WebP to JPG',

        descJpgWebp:
          'Convert JPG to WebP',

        descPngWebp:
          'Convert PNG to WebP',

        descWebpPng:
          'Convert WebP to PNG',

        descSvgPng:
          'Convert SVG to PNG',

        descBmpPng:
          'Convert BMP to PNG',

        descGifPng:
          'Convert GIF to PNG',

        descImageIco:
          'Create ICO / Favicon',

        descJpgPdf:
          'Convert JPG to PDF',

        descPngPdf:
          'Convert PNG to PDF',

        descPdfJpg:
          'Convert PDF to JPG',

        descPdfPng:
          'Convert PDF to PNG',

        descPdfTxt:
          'Extract text from PDF',

        descImagePdf:
          'Combine images into PDF',

        descPdfText:
          'Extract text from PDF',

        descPdfImages:
          'Convert every PDF page to images',

        descDocxPdf:
          'Convert Word to PDF',

        descXlsxPdf:
          'Convert Excel to PDF',

        descPptxPdf:
          'Convert PowerPoint to PDF',

        descTxtPdf:
          'Convert Text to PDF',

        descHtmlPdf:
          'Convert HTML to PDF',

        descCsvXlsx:
          'Convert CSV to Excel',

        descXlsxCsv:
          'Convert Excel to CSV',

        descCsvJson:
          'Convert CSV to JSON',

        descJsonCsv:
          'Convert JSON to CSV',

        descJsonXlsx:
          'Convert JSON to Excel',

        descJsonXml:
          'Convert JSON to XML',

        descXmlJson:
          'Convert XML to JSON',

        descYamlJson:
          'Convert YAML to JSON',

        descJsonYaml:
          'Convert JSON to YAML',

        descTxtHtml:
          'Convert Text to HTML',

        descMdHtml:
          'Convert Markdown to HTML',

        descHtmlTxt:
          'Extract text from HTML'
      }
    },


    // ==========================================================
    // GERMAN
    // ==========================================================

    de: {

      converter: {

        title:
          'Dateikonverter',

        fileTools:
          'DATEI-TOOLS',

        backHome:
          'Zur Startseite',

        subtitle:
          'Dateikonverter an einem Ort. Unterstützt Bilder, PDF, Dokumente, Tabellen, Daten und Text.',

        searchPlaceholder:
          'Converter suchen, z. B. JPG, PNG, PDF, CSV...',

        searchLabel:
          'Converter suchen',

        clearSearch:
          'Suche löschen',

        all:
          'Alle',

        image:
          'Bilder',

        pdf:
          'PDF',

        document:
          'Dokumente',

        spreadsheet:
          'Tabellen',

        data:
          'Daten',

        text:
          'Text',

        popular:
          'BELIEBT',

        popularTitle:
          'Beliebte Tools',

        imageTitle:
          'Bildkonverter',

        pdfTitle:
          'PDF-Konverter',

        documentTitle:
          'Dokumentkonverter',

        spreadsheetTitle:
          'Tabellenkonverter',

        dataTitle:
          'Datenkonverter',

        textTitle:
          'Textkonverter',

        noResults:
          'Kein Converter gefunden',

        noResultsHint:
          'Suche nach Dateitypen wie JPG, PNG, PDF, CSV oder JSON',

        showAll:
          'Alle anzeigen',

        privacyTitle:
          'Datenschutz zuerst',

        privacyText:
          'Converter mit browserbasierter Verarbeitung arbeiten ohne das Hochladen Ihrer Dateien auf einen Server.',

        close:
          'Schließen',

        dragFiles:
          'Dateien hierher ziehen oder klicken',

        chooseFiles:
          'Oder Dateien vom Gerät auswählen',

        browse:
          'Dateien auswählen',

        selectedFiles:
          'Ausgewählte Dateien',

        clearFiles:
          'Alle löschen',

        converting:
          'Dateien werden konvertiert...',

        preparing:
          'Datei wird vorbereitet',

        converted:
          'Konvertierung abgeschlossen',

        errorTitle:
          'Ein Fehler ist aufgetreten',

        errorDefault:
          'Datei konnte nicht konvertiert werden',

        cancel:
          'Abbrechen',

        convert:
          'Konvertieren',

        download:
          'Herunterladen',

        supported:
          'Unterstützt',

        count:
          '{count} Dateien',

        tools:
          '{count} Tools',

        descJpgPng:
          'JPG in PNG konvertieren',

        descPngJpg:
          'PNG in JPG konvertieren',

        descWebpJpg:
          'WebP in JPG konvertieren',

        descJpgWebp:
          'JPG in WebP konvertieren',

        descPngWebp:
          'PNG in WebP konvertieren',

        descWebpPng:
          'WebP in PNG konvertieren',

        descSvgPng:
          'SVG in PNG konvertieren',

        descBmpPng:
          'BMP in PNG konvertieren',

        descGifPng:
          'GIF in PNG konvertieren',

        descImageIco:
          'ICO / Favicon erstellen',

        descJpgPdf:
          'JPG in PDF konvertieren',

        descPngPdf:
          'PNG in PDF konvertieren',

        descPdfJpg:
          'PDF in JPG konvertieren',

        descPdfPng:
          'PDF in PNG konvertieren',

        descPdfTxt:
          'Text aus PDF extrahieren',

        descImagePdf:
          'Bilder zu PDF zusammenfügen',

        descPdfText:
          'Text aus PDF extrahieren',

        descPdfImages:
          'Alle PDF-Seiten in Bilder umwandeln',

        descDocxPdf:
          'Word in PDF konvertieren',

        descXlsxPdf:
          'Excel in PDF konvertieren',

        descPptxPdf:
          'PowerPoint in PDF konvertieren',

        descTxtPdf:
          'Text in PDF konvertieren',

        descHtmlPdf:
          'HTML in PDF konvertieren',

        descCsvXlsx:
          'CSV in Excel konvertieren',

        descXlsxCsv:
          'Excel in CSV konvertieren',

        descCsvJson:
          'CSV in JSON konvertieren',

        descJsonCsv:
          'JSON in CSV konvertieren',

        descJsonXlsx:
          'JSON in Excel konvertieren',

        descJsonXml:
          'JSON in XML konvertieren',

        descXmlJson:
          'XML in JSON konvertieren',

        descYamlJson:
          'YAML in JSON konvertieren',

        descJsonYaml:
          'JSON in YAML konvertieren',

        descTxtHtml:
          'Text in HTML konvertieren',

        descMdHtml:
          'Markdown in HTML konvertieren',

        descHtmlTxt:
          'Text aus HTML extrahieren'
      }
    },


    // ==========================================================
    // JAPANESE
    // ==========================================================

    ja: {

      converter: {

        title:
          'ファイルコンバーター',

        fileTools:
          'ファイルツール',

        backHome:
          'ホームに戻る',

        subtitle:
          '画像、PDF、ドキュメント、スプレッドシート、データ、テキストを一か所で変換できます。',

        searchPlaceholder:
          'JPG、PNG、PDF、CSV などを検索...',

        searchLabel:
          'コンバーターを検索',

        clearSearch:
          '検索をクリア',

        all:
          'すべて',

        image:
          '画像',

        pdf:
          'PDF',

        document:
          'ドキュメント',

        spreadsheet:
          'スプレッドシート',

        data:
          'データ',

        text:
          'テキスト',

        popular:
          '人気',

        popularTitle:
          '人気のツール',

        imageTitle:
          '画像コンバーター',

        pdfTitle:
          'PDFコンバーター',

        documentTitle:
          'ドキュメントコンバーター',

        spreadsheetTitle:
          'スプレッドシートコンバーター',

        dataTitle:
          'データコンバーター',

        textTitle:
          'テキストコンバーター',

        noResults:
          'コンバーターが見つかりません',

        noResultsHint:
          'JPG、PNG、PDF、CSV、JSON などで検索してください',

        showAll:
          'すべて表示',

        privacyTitle:
          'プライバシー優先',

        privacyText:
          'ブラウザ処理に対応したツールは、ファイルをサーバーにアップロードせず処理します。',

        close:
          '閉じる',

        dragFiles:
          'ここにファイルをドロップ、またはクリックして選択',

        chooseFiles:
          'またはデバイスからファイルを選択',

        browse:
          'ファイルを選択',

        selectedFiles:
          '選択したファイル',

        clearFiles:
          'すべてクリア',

        converting:
          'ファイルを変換中...',

        preparing:
          'ファイルを準備中',

        converted:
          '変換完了',

        errorTitle:
          'エラーが発生しました',

        errorDefault:
          'ファイルを変換できませんでした',

        cancel:
          'キャンセル',

        convert:
          '変換',

        download:
          'ダウンロード',

        supported:
          '対応',

        count:
          '{count} ファイル',

        tools:
          '{count} ツール',

        descJpgPng:
          'JPGをPNGに変換',

        descPngJpg:
          'PNGをJPGに変換',

        descWebpJpg:
          'WebPをJPGに変換',

        descJpgWebp:
          'JPGをWebPに変換',

        descPngWebp:
          'PNGをWebPに変換',

        descWebpPng:
          'WebPをPNGに変換',

        descSvgPng:
          'SVGをPNGに変換',

        descBmpPng:
          'BMPをPNGに変換',

        descGifPng:
          'GIFをPNGに変換',

        descImageIco:
          'ICO / Faviconを作成',

        descJpgPdf:
          'JPGをPDFに変換',

        descPngPdf:
          'PNGをPDFに変換',

        descPdfJpg:
          'PDFをJPGに変換',

        descPdfPng:
          'PDFをPNGに変換',

        descPdfTxt:
          'PDFからテキストを抽出',

        descImagePdf:
          '画像をPDFにまとめる',

        descPdfText:
          'PDFからテキストを抽出',

        descPdfImages:
          'PDFの各ページを画像に変換',

        descDocxPdf:
          'WordをPDFに変換',

        descXlsxPdf:
          'ExcelをPDFに変換',

        descPptxPdf:
          'PowerPointをPDFに変換',

        descTxtPdf:
          'TextをPDFに変換',

        descHtmlPdf:
          'HTMLをPDFに変換',

        descCsvXlsx:
          'CSVをExcelに変換',

        descXlsxCsv:
          'ExcelをCSVに変換',

        descCsvJson:
          'CSVをJSONに変換',

        descJsonCsv:
          'JSONをCSVに変換',

        descJsonXlsx:
          'JSONをExcelに変換',

        descJsonXml:
          'JSONをXMLに変換',

        descXmlJson:
          'XMLをJSONに変換',

        descYamlJson:
          'YAMLをJSONに変換',

        descJsonYaml:
          'JSONをYAMLに変換',

        descTxtHtml:
          'TextをHTMLに変換',

        descMdHtml:
          'MarkdownをHTMLに変換',

        descHtmlTxt:
          'HTMLからテキストを抽出'
      }
    },


    // ==========================================================
    // KOREAN
    // ==========================================================

    ko: {

      converter: {

        title:
          '파일 변환기',

        fileTools:
          '파일 도구',

        backHome:
          '홈으로 돌아가기',

        subtitle:
          '이미지, PDF, 문서, 스프레드시트, 데이터 및 텍스트를 한곳에서 변환할 수 있습니다.',

        searchPlaceholder:
          'JPG, PNG, PDF, CSV 등을 검색...',

        searchLabel:
          '변환기 검색',

        clearSearch:
          '검색 지우기',

        all:
          '전체',

        image:
          '이미지',

        pdf:
          'PDF',

        document:
          '문서',

        spreadsheet:
          '스프레드시트',

        data:
          '데이터',

        text:
          '텍스트',

        popular:
          '인기',

        popularTitle:
          '인기 도구',

        imageTitle:
          '이미지 변환기',

        pdfTitle:
          'PDF 변환기',

        documentTitle:
          '문서 변환기',

        spreadsheetTitle:
          '스프레드시트 변환기',

        dataTitle:
          '데이터 변환기',

        textTitle:
          '텍스트 변환기',

        noResults:
          '변환기를 찾을 수 없습니다',

        noResultsHint:
          'JPG, PNG, PDF, CSV 또는 JSON과 같은 형식으로 검색해 보세요',

        showAll:
          '전체 보기',

        privacyTitle:
          '개인정보 보호 우선',

        privacyText:
          '브라우저 처리를 지원하는 도구는 파일을 서버에 업로드하지 않고 처리합니다.',

        close:
          '닫기',

        dragFiles:
          '파일을 여기에 놓거나 클릭하여 선택하세요',

        chooseFiles:
          '또는 기기에서 파일을 선택하세요',

        browse:
          '파일 선택',

        selectedFiles:
          '선택한 파일',

        clearFiles:
          '모두 지우기',

        converting:
          '파일 변환 중...',

        preparing:
          '파일 준비 중',

        converted:
          '변환 완료',

        errorTitle:
          '오류가 발생했습니다',

        errorDefault:
          '파일을 변환할 수 없습니다',

        cancel:
          '취소',

        convert:
          '변환',

        download:
          '다운로드',

        supported:
          '지원',

        count:
          '{count}개 파일',

        tools:
          '{count}개 도구',

        descJpgPng:
          'JPG를 PNG로 변환',

        descPngJpg:
          'PNG를 JPG로 변환',

        descWebpJpg:
          'WebP를 JPG로 변환',

        descJpgWebp:
          'JPG를 WebP로 변환',

        descPngWebp:
          'PNG를 WebP로 변환',

        descWebpPng:
          'WebP를 PNG로 변환',

        descSvgPng:
          'SVG를 PNG로 변환',

        descBmpPng:
          'BMP를 PNG로 변환',

        descGifPng:
          'GIF를 PNG로 변환',

        descImageIco:
          'ICO / Favicon 만들기',

        descJpgPdf:
          'JPG를 PDF로 변환',

        descPngPdf:
          'PNG를 PDF로 변환',

        descPdfJpg:
          'PDF를 JPG로 변환',

        descPdfPng:
          'PDF를 PNG로 변환',

        descPdfTxt:
          'PDF에서 텍스트 추출',

        descImagePdf:
          '이미지를 PDF로 결합',

        descPdfText:
          'PDF에서 텍스트 추출',

        descPdfImages:
          'PDF의 모든 페이지를 이미지로 변환',

        descDocxPdf:
          'Word를 PDF로 변환',

        descXlsxPdf:
          'Excel을 PDF로 변환',

        descPptxPdf:
          'PowerPoint를 PDF로 변환',

        descTxtPdf:
          'Text를 PDF로 변환',

        descHtmlPdf:
          'HTML을 PDF로 변환',

        descCsvXlsx:
          'CSV를 Excel로 변환',

        descXlsxCsv:
          'Excel을 CSV로 변환',

        descCsvJson:
          'CSV를 JSON으로 변환',

        descJsonCsv:
          'JSON을 CSV로 변환',

        descJsonXlsx:
          'JSON을 Excel로 변환',

        descJsonXml:
          'JSON을 XML로 변환',

        descXmlJson:
          'XML을 JSON으로 변환',

        descYamlJson:
          'YAML을 JSON으로 변환',

        descJsonYaml:
          'JSON을 YAML로 변환',

        descTxtHtml:
          'Text를 HTML로 변환',

        descMdHtml:
          'Markdown을 HTML로 변환',

        descHtmlTxt:
          'HTML에서 텍스트 추출'
      }
    },


    // ==========================================================
    // CHINESE SIMPLIFIED
    // ==========================================================

    'zh-CN': {

      converter: {

        title:
          '文件转换器',

        fileTools:
          '文件工具',

        backHome:
          '返回首页',

        subtitle:
          '将图片、PDF、文档、电子表格、数据和文本转换集中在一个地方。',

        searchPlaceholder:
          '搜索转换器，例如 JPG、PNG、PDF、CSV...',

        searchLabel:
          '搜索转换器',

        clearSearch:
          '清除搜索',

        all:
          '全部',

        image:
          '图片',

        pdf:
          'PDF',

        document:
          '文档',

        spreadsheet:
          '电子表格',

        data:
          '数据',

        text:
          '文本',

        popular:
          '热门',

        popularTitle:
          '热门工具',

        imageTitle:
          '图片转换器',

        pdfTitle:
          'PDF 转换器',

        documentTitle:
          '文档转换器',

        spreadsheetTitle:
          '电子表格转换器',

        dataTitle:
          '数据转换器',

        textTitle:
          '文本转换器',

        noResults:
          '未找到转换器',

        noResultsHint:
          '尝试搜索 JPG、PNG、PDF、CSV 或 JSON',

        showAll:
          '显示全部',

        privacyTitle:
          '隐私优先',

        privacyText:
          '支持浏览器处理的工具会直接在浏览器中处理文件，不会上传到服务器。',

        close:
          '关闭',

        dragFiles:
          '将文件拖到这里，或点击选择',

        chooseFiles:
          '或从设备中选择文件',

        browse:
          '选择文件',

        selectedFiles:
          '已选择的文件',

        clearFiles:
          '全部清除',

        converting:
          '正在转换文件...',

        preparing:
          '正在准备文件',

        converted:
          '转换完成',

        errorTitle:
          '发生错误',

        errorDefault:
          '无法转换文件',

        cancel:
          '取消',

        convert:
          '转换',

        download:
          '下载',

        supported:
          '支持',

        count:
          '{count} 个文件',

        tools:
          '{count} 个工具',

        descJpgPng:
          '将 JPG 转换为 PNG',

        descPngJpg:
          '将 PNG 转换为 JPG',

        descWebpJpg:
          '将 WebP 转换为 JPG',

        descJpgWebp:
          '将 JPG 转换为 WebP',

        descPngWebp:
          '将 PNG 转换为 WebP',

        descWebpPng:
          '将 WebP 转换为 PNG',

        descSvgPng:
          '将 SVG 转换为 PNG',

        descBmpPng:
          '将 BMP 转换为 PNG',

        descGifPng:
          '将 GIF 转换为 PNG',

        descImageIco:
          '创建 ICO / Favicon',

        descJpgPdf:
          '将 JPG 转换为 PDF',

        descPngPdf:
          '将 PNG 转换为 PDF',

        descPdfJpg:
          '将 PDF 转换为 JPG',

        descPdfPng:
          '将 PDF 转换为 PNG',

        descPdfTxt:
          '从 PDF 提取文本',

        descImagePdf:
          '将多个图片合并为 PDF',

        descPdfText:
          '从 PDF 提取文本',

        descPdfImages:
          '将 PDF 每一页转换为图片',

        descDocxPdf:
          '将 Word 转换为 PDF',

        descXlsxPdf:
          '将 Excel 转换为 PDF',

        descPptxPdf:
          '将 PowerPoint 转换为 PDF',

        descTxtPdf:
          '将文本转换为 PDF',

        descHtmlPdf:
          '将 HTML 转换为 PDF',

        descCsvXlsx:
          '将 CSV 转换为 Excel',

        descXlsxCsv:
          '将 Excel 转换为 CSV',

        descCsvJson:
          '将 CSV 转换为 JSON',

        descJsonCsv:
          '将 JSON 转换为 CSV',

        descJsonXlsx:
          '将 JSON 转换为 Excel',

        descJsonXml:
          '将 JSON 转换为 XML',

        descXmlJson:
          '将 XML 转换为 JSON',

        descYamlJson:
          '将 YAML 转换为 JSON',

        descJsonYaml:
          '将 JSON 转换为 YAML',

        descTxtHtml:
          '将文本转换为 HTML',

        descMdHtml:
          '将 Markdown 转换为 HTML',

        descHtmlTxt:
          '从 HTML 提取文本'
      }
    },


    // ==========================================================
    // CHINESE TRADITIONAL
    // ==========================================================

    'zh-TW': {

      converter: {

        title:
          '檔案轉換器',

        fileTools:
          '檔案工具',

        backHome:
          '返回首頁',

        subtitle:
          '將圖片、PDF、文件、試算表、資料與文字轉換集中在同一個地方。',

        searchPlaceholder:
          '搜尋轉換器，例如 JPG、PNG、PDF、CSV...',

        searchLabel:
          '搜尋轉換器',

        clearSearch:
          '清除搜尋',

        all:
          '全部',

        image:
          '圖片',

        pdf:
          'PDF',

        document:
          '文件',

        spreadsheet:
          '試算表',

        data:
          '資料',

        text:
          '文字',

        popular:
          '熱門',

        popularTitle:
          '熱門工具',

        imageTitle:
          '圖片轉換器',

        pdfTitle:
          'PDF 轉換器',

        documentTitle:
          '文件轉換器',

        spreadsheetTitle:
          '試算表轉換器',

        dataTitle:
          '資料轉換器',

        textTitle:
          '文字轉換器',

        noResults:
          '找不到轉換器',

        noResultsHint:
          '請嘗試搜尋 JPG、PNG、PDF、CSV 或 JSON',

        showAll:
          '顯示全部',

        privacyTitle:
          '隱私優先',

        privacyText:
          '支援瀏覽器處理的工具會直接在瀏覽器中處理檔案，不會上傳到伺服器。',

        close:
          '關閉',

        dragFiles:
          '將檔案拖曳到這裡，或點擊選擇',

        chooseFiles:
          '或從裝置選擇檔案',

        browse:
          '選擇檔案',

        selectedFiles:
          '已選擇的檔案',

        clearFiles:
          '全部清除',

        converting:
          '正在轉換檔案...',

        preparing:
          '正在準備檔案',

        converted:
          '轉換完成',

        errorTitle:
          '發生錯誤',

        errorDefault:
          '無法轉換檔案',

        cancel:
          '取消',

        convert:
          '轉換',

        download:
          '下載',

        supported:
          '支援',

        count:
          '{count} 個檔案',

        tools:
          '{count} 個工具',

        descJpgPng:
          '將 JPG 轉換為 PNG',

        descPngJpg:
          '將 PNG 轉換為 JPG',

        descWebpJpg:
          '將 WebP 轉換為 JPG',

        descJpgWebp:
          '將 JPG 轉換為 WebP',

        descPngWebp:
          '將 PNG 轉換為 WebP',

        descWebpPng:
          '將 WebP 轉換為 PNG',

        descSvgPng:
          '將 SVG 轉換為 PNG',

        descBmpPng:
          '將 BMP 轉換為 PNG',

        descGifPng:
          '將 GIF 轉換為 PNG',

        descImageIco:
          '建立 ICO / Favicon',

        descJpgPdf:
          '將 JPG 轉換為 PDF',

        descPngPdf:
          '將 PNG 轉換為 PDF',

        descPdfJpg:
          '將 PDF 轉換為 JPG',

        descPdfPng:
          '將 PDF 轉換為 PNG',

        descPdfTxt:
          '從 PDF 擷取文字',

        descImagePdf:
          '將多張圖片合併為 PDF',

        descPdfText:
          '從 PDF 擷取文字',

        descPdfImages:
          '將 PDF 每一頁轉換為圖片',

        descDocxPdf:
          '將 Word 轉換為 PDF',

        descXlsxPdf:
          '將 Excel 轉換為 PDF',

        descPptxPdf:
          '將 PowerPoint 轉換為 PDF',

        descTxtPdf:
          '將文字轉換為 PDF',

        descHtmlPdf:
          '將 HTML 轉換為 PDF',

        descCsvXlsx:
          '將 CSV 轉換為 Excel',

        descXlsxCsv:
          '將 Excel 轉換為 CSV',

        descCsvJson:
          '將 CSV 轉換為 JSON',

        descJsonCsv:
          '將 JSON 轉換為 CSV',

        descJsonXlsx:
          '將 JSON 轉換為 Excel',

        descJsonXml:
          '將 JSON 轉換為 XML',

        descXmlJson:
          '將 XML 轉換為 JSON',

        descYamlJson:
          '將 YAML 轉換為 JSON',

        descJsonYaml:
          '將 JSON 轉換為 YAML',

        descTxtHtml:
          '將文字轉換為 HTML',

        descMdHtml:
          '將 Markdown 轉換為 HTML',

        descHtmlTxt:
          '從 HTML 擷取文字'
      }
    }

  };


  // ============================================================
  // DEEP MERGE
  // ============================================================

  function mergeObjects(
    target,
    source
  ) {

    if (
      !target ||
      !source ||
      typeof target !== 'object' ||
      typeof source !== 'object'
    ) {

      return target;
    }


    Object.keys(
      source
    ).forEach(
      key => {

        const sourceValue =
          source[key];


        if (
          sourceValue &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue)
        ) {

          if (
            !target[key] ||
            typeof target[key] !== 'object' ||
            Array.isArray(target[key])
          ) {

            target[key] = {};
          }


          mergeObjects(
            target[key],
            sourceValue
          );

        } else {

          target[key] =
            sourceValue;

        }

      }
    );


    return target;

  }


  // ============================================================
  // MERGE CONVERTER DICTIONARY
  // ============================================================

  Object.keys(
    CONVERTER_TRANSLATIONS
  ).forEach(
    language => {

      if (
        !LANGUAGES[language]
      ) {

        LANGUAGES[language] = {

          name:
            language,

          nativeName:
            language,

          dir:
            'ltr',

          messages:
            {}

        };

      }


      if (
        !LANGUAGES[language].messages
      ) {

        LANGUAGES[language].messages =
          {};

      }


      mergeObjects(
        LANGUAGES[language].messages,
        CONVERTER_TRANSLATIONS[language]
      );

    }
  );


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


    de:
      'de',

    'de-de':
      'de',

    'de-at':
      'de',

    'de-ch':
      'de',


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
      language === null ||
      language === undefined
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
  // BASE LANGUAGE
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


    return normalized.split(
      '-'
    )[0];

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


    // ----------------------------------------------------------
    // Chinese Traditional first
    // ----------------------------------------------------------

    for (
      const rawLanguage of
      languageList
    ) {

      const normalized =
        normalizeLanguage(
          rawLanguage
        );


      if (
        normalized === 'zh-tw' ||
        normalized === 'zh-hk' ||
        normalized === 'zh-mo' ||
        normalized.includes('hant')
      ) {

        if (
          hasLanguage(
            'zh-TW'
          )
        ) {

          return 'zh-TW';
        }

      }

    }


    // ----------------------------------------------------------
    // Chinese Simplified
    // ----------------------------------------------------------

    for (
      const rawLanguage of
      languageList
    ) {

      const normalized =
        normalizeLanguage(
          rawLanguage
        );


      if (
        normalized === 'zh-cn' ||
        normalized === 'zh-sg' ||
        normalized === 'zh-my' ||
        normalized.includes('hans')
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


    // ----------------------------------------------------------
    // Canonical exact
    // ----------------------------------------------------------

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


    // ----------------------------------------------------------
    // Base language
    // ----------------------------------------------------------

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
        current === null ||
        current === undefined
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
        current[key];

    }


    return current;

  }


  // ============================================================
  // FLATTEN
  // ============================================================

  function flattenMessages(
    source,
    prefix = '',
    output = {}
  ) {

    if (
      !source ||
      typeof source !== 'object'
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
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {

          flattenMessages(
            value,
            path,
            output
          );

        } else {

          output[path] =
            value;

        }

      }
    );


    return output;

  }


  // ============================================================
  // INTERPOLATE
  // ============================================================

  function interpolate(
    value,
    data
  ) {

    if (
      typeof value !== 'string'
    ) {

      return value;
    }


    if (
      !data ||
      typeof data !== 'object'
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
          ).trim();


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
            replacement === null ||
            replacement === undefined
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
  // HUMANIZE
  // ============================================================

  function humanizeKey(
    key
  ) {

    if (
      typeof key !== 'string'
    ) {

      return String(
        key
      );
    }


    const lastPart =
      key
        .split('.')
        .filter(Boolean)
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
  // UNKNOWN FALLBACK
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
  // CURRENT MESSAGES
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
  // FALLBACK MESSAGES
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
  // RESOLVE TRANSLATION
  // ============================================================

  function resolveTranslation(
    key
  ) {

    const currentMessages =
      getCurrentMessages();


    const fallbackMessages =
      getFallbackMessages();


    const currentValue =
      getNestedValue(
        currentMessages,
        key
      );


    if (
      currentValue !== undefined &&
      currentValue !== null
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


    const fallbackValue =
      getNestedValue(
        fallbackMessages,
        key
      );


    if (
      fallbackValue !== undefined &&
      fallbackValue !== null
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
  // MISSING CACHE
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
      typeof console !== 'undefined'
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
      key === null ||
      key === undefined
    ) {

      return '';
    }


    const normalizedKey =
      String(
        key
      ).trim();


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
  // HAS
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
      ) !== undefined
    );

  }


  // ============================================================
  // HAS EFFECTIVE
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
      ) !== undefined
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
      ) !== undefined
    );

  }


  // ============================================================
  // MISSING KEYS
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
      ]?.messages || {};


    const currentMessages =
      LANGUAGES[
        requestedLanguage
      ]?.messages || {};


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
          ) !== undefined;


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
  // COVERAGE
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
          ) !== undefined
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
  // ALL COVERAGE
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


    // ----------------------------------------------------------
    // IMPORTANT:
    // Do not force page.title over page-specific title.
    // ----------------------------------------------------------

    const titleElement =
      document.querySelector(
        'title[data-i18n]'
      );


    if (
      titleElement
    ) {

      translateElement(
        titleElement
      );


      const titleText =
        String(
          titleElement.textContent ||
          ''
        ).trim();


      if (
        titleText
      ) {

        document.title =
          titleText;
      }


    } else {

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

  }


  // ============================================================
  // SAFE HTML
  // ============================================================

  function translateHtmlValue(
    key,
    data
  ) {

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
      element.nodeType !== 1
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
  // TRANSLATABLE SELECTOR
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


    if (
      container.nodeType === 1
    ) {

      translateElement(
        container
      );

    }


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


    const changed =
      currentLanguage !==
      resolved;


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


    missingKeyCache.clear();


    applyDocumentLanguage();

    applyTranslations();


    if (
      changed
    ) {

      dispatchLanguageChange();

    } else {

      /*
       * Even if language is the same,
       * refresh DOM in case a page just
       * created new dynamic elements.
       */

      dispatchLanguageChange();

    }


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


    return (
      LANGUAGES[
        code
      ].messages ||
      null
    );

  }


  // ============================================================
  // GET RAW
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

    t,

    setLanguage,

    resetLanguage,

    getLanguage,

    detectLanguage,

    getLanguageInfo,

    getLanguages,

    getDictionary,

    getRaw,

    has,

    hasEffective,

    getMissingKeys,

    getCoverage,

    getAllCoverage,

    getDiagnostics,

    logDiagnostics,

    applyTranslations,

    refresh,

    startObserver,

    stopObserver

  };

})();

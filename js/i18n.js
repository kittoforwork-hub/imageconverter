 /* global window, document, localStorage, navigator, MutationObserver */

 /*
  * ============================================================
  * WORKSHOP UTILITY - INTERNATIONALIZATION
  * js/i18n.js
  *
  * Master language system
  *
  * - Auto detect browser language
  * - Remember user's language choice
  * - Translate static HTML
  * - Translate title / aria / placeholder
  * - Support dynamically created elements
  * - Support interpolation: {count}, {size}, etc.
  * - English fallback
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


   // ============================================================
   // LANGUAGE DICTIONARY
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

         // ------------------------------------------------------
         // COMMON
         // ------------------------------------------------------

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


         // ------------------------------------------------------
         // CUTE UI
         // ------------------------------------------------------

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


         // ------------------------------------------------------
         // PAGE
         // ------------------------------------------------------

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


         // ------------------------------------------------------
         // IMAGE
         // ------------------------------------------------------

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

           conversionFailed:
             'แปลงไม่สำเร็จ: {message}',

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


         // ------------------------------------------------------
         // PDF
         // ------------------------------------------------------

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


         // ------------------------------------------------------
         // DROPZONE
         // ------------------------------------------------------

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


         // ------------------------------------------------------
         // ERRORS
         // ------------------------------------------------------

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


         // ------------------------------------------------------
         // FILE
         // ------------------------------------------------------

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


         // ------------------------------------------------------
         // UTILS
         // ------------------------------------------------------

         utils: {

           cacheHandlerFailed:
             'ตัวจัดการ clearCache ทำงานไม่สำเร็จ',

           invalidObjectUrlHolder:
             'replaceObjectUrl ต้องมี holder และ key'
         },


         // ------------------------------------------------------
         // TOOL META
         // ------------------------------------------------------

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


         // ------------------------------------------------------
         // LANGUAGE NAMES
         // ------------------------------------------------------

         language: {

           th:
             'ไทย',

           en:
             'English',

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

           conversionFailed:
             'Conversion failed: {message}',

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


         language: {

           th:
             'ไทย',

           en:
             'English',

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
     // JAPANESE
     // ==========================================================

     ja: {

       name: 'Japanese',

       nativeName: '日本語',

       dir: 'ltr',

       messages: {

         common: {

           home: 'ホーム',
           language: '言語',
           image: '画像',
           images: '画像',
           pdf: 'PDF',
           notepad: 'メモ帳',
           upload: 'アップロード',
           chooseFile: 'ファイルを選択',
           chooseFiles: 'ファイルを選択',
           download: 'ダウンロード',
           downloadAll: 'すべてダウンロード',
           clear: 'すべてクリア',
           cancel: 'キャンセル',
           delete: '削除',
           remove: '削除',
           process: '処理する',
           processing: '処理中...',
           completed: '完了',
           failed: '失敗',
           loading: '読み込み中...',
           ready: '準備完了',
           retry: '再試行',
           close: '閉じる',
           save: '保存',
           reset: 'リセット',
           continue: '続行',
           confirm: '確認',
           selectAll: 'すべて選択',
           items: '項目',
           files: 'ファイル',
           file: 'ファイル',
           pages: 'ページ',
           page: 'ページ',
           jobs: 'ジョブ',
           original: '元のファイル',
           format: '形式',
           size: 'サイズ',
           quality: '品質',
           width: '幅',
           height: '高さ',
           saveAs: '保存形式',
           result: '結果',
           done: '完了',
           unlimited: '制限なし',
           yes: 'はい',
           no: 'いいえ'
         },


         cute: {
           ready: '準備完了 ✨',
           completed: '完了',
           processing: '作業中…',
           itemCount: '{count} 件'
         },


         page: {

           title: 'Workshop Utility BY KITTO',

           heading: 'ファイル管理ツール',

           subtitle:
             'ブラウザ上ですべての画像/PDFを変換・編集できます。サーバーへファイルをアップロードしません。',

           footer:
             'すべてブラウザ上で処理されます — ファイルは外部へ送信されません。',

           notepadTitle:
             'オンラインメモ帳を開く'
         },


         image: {

           convertTitle:
             '形式変換＆サイズ変更',

           convertHint:
             'ファイル形式（PNG / JPG / WEBP）を変換し、サイズ、品質、回転、反転を調整できます。複数ファイルに対応。',

           cropTitle:
             '画像を切り抜く',

           cropHint:
             '画像上で切り抜く範囲を選択し、自由に調整して結果をダウンロードできます。',

           bgRemoveTitle:
             '背景を削除',

           bgRemoveHint:
             'AIで画像の背景を自動削除します。すべてブラウザ上で処理され、画像はサーバーへアップロードされません。',

           compressTitle:
             '画像を圧縮',

           compressHint:
             '品質と画像サイズを調整してファイルサイズを小さくします。すべてブラウザ上で処理されます。',

           dropImage:
             'ここに画像をドロップ',

           chooseImage:
             'またはクリックしてファイルを選択',

           supportedImages:
             '複数ファイル対応（JPG · PNG · WEBP · GIF · BMP）',

           addMultiple:
             '複数の画像を追加できます',

           cropSeparately:
             '画像ごとに個別に切り抜きます',

           cropInstruction:
             '枠をドラッグして切り抜き',

           outputTransparent:
             '透明背景のPNGとして出力',

           compressSupported:
             'JPG · PNG · WEBP、複数ファイル対応',

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
             'すべて背景削除',

           removeBackgroundAllProcessing:
             'すべての背景を削除中…',

           downloadZip:
             'すべてダウンロード (.zip)',

           allFormats:
             'すべての形式',

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
             'アスペクト比',

           free:
             '自由',

           crop:
             '切り抜く',

           cropping:
             '切り抜き中…',

           croppingFailed:
             '切り抜きに失敗しました: {message}',

           conversionFailed:
             '変換に失敗しました: {message}',

           saveFormat:
             '保存形式',

           waitingConvert:
             '変換待ち',

           waitingCrop:
             '枠をドラッグして切り抜き',

           waitingBackground:
             '背景削除待ち',

           removeBackground:
             '背景を削除',

           waitingCompress:
             '圧縮待ち',

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
             'モデルを読み込み中… {percent}%',

           removingBackgroundProgress:
             '処理中… {percent}%',

           backgroundRemovalFailed:
             '背景の削除に失敗しました: {message}',

           characterConvert:
             '画像を変換する準備ができました ✨',

           characterCrop:
             '画像をきれいに切り抜きましょう ✂️',

           characterBgRemove:
             '背景をきれいに削除します 🫧',

           characterCompress:
             '品質を保ちながら画像を小さくします 📦',

           modelFirstUse:
             '初回使用時に約40MBのAIモデルを読み込みます。ブラウザにキャッシュされるため、次回からは高速になります。処理時間は端末の性能によって異なります。'
         },


         pdf: {

           fromImagesTitle:
             '画像をPDFに結合',

           fromImagesHint:
             '複数の画像を1つのPDFにまとめ、ページ順を自由に並べ替えられます。',

           toImagesTitle:
             'PDF → 画像',

           toImagesHint:
             'PDFのすべてのページを画像ファイルに変換します。形式と解像度を選択できます。',

           pagesTitle:
             'PDFページを管理',

           pagesHint:
             'ページを削除、並べ替え、選択したページだけを新しいPDFとして保存できます。',

           mergeTitle:
             'PDFを結合',

           mergeHint:
             '複数のPDFを1つに結合し、結合前に順番を並べ替えられます。',

           watermarkTitle:
             'PDFに透かし',

           watermarkHint:
             'PDFの各ページにテキストまたはPNGの透かしを追加します。',

           pageNumbersTitle:
             'ページ番号を追加',

           pageNumbersHint:
             'PDFの各ページに自動でページ番号を追加します。位置と形式を選択できます。',

           dropPdf:
             'ここにPDFをドロップ',

           dropPdfMultiple:
             'ここに複数のPDFをドロップ',

           clickChoosePdf:
             'またはクリックしてファイルを選択',

           oneFile:
             '1ファイルずつ',

           multipleFiles:
             '複数ファイルを追加',

           imagesToPdfOrder:
             '追加した順番がPDFのページ順になります。後から変更できます。',

           mergeOrder:
             '下で結合前の順番を変更できます。',

           pageSize:
             'ページサイズ',

           fitToImage:
             '画像に合わせる',

           buildPdf:
             'PDFを作成',

           mergeFiles:
             'ファイルを結合',

           mergedSuccess:
             'PDFの結合が完了しました',

           createdSuccess:
             'PDFを作成しました',

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
             '✕でページを削除し、↑ ↓で並べ替え、チェックを入れたページを別PDFとして保存できます。',

           downloadPdfOrdered:
             'PDFをダウンロード（現在の順序）',

           downloadSelected:
             '選択したページをダウンロード',

           deleteThisPage:
             'このページを削除',

           moveUp:
             '上へ移動',

           moveDown:
             '下へ移動',

           watermarkText:
             '透かし文字',

           watermarkImage:
             '透かしPNG',

           watermarkImagePlaceholder:
             '画像のみ使用する場合は空欄にしてください',

           noImageSelected:
             '画像が選択されていません',

           fontSize:
             '文字サイズ',

           watermarkImageSize:
             '透かし画像サイズ',

           opacity:
             '透明度',

           angle:
             '回転角度',

           watermarkCombination:
             '文字のみ、PNGのみ、または文字とPNGの両方を使用できます。',

           readyWatermark:
             '透かしを追加する準備ができました',

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
             'ページ番号を追加する準備ができました',

           applyPageNumber:
             'ページ番号を追加',

           pageNumberHelp:
             '{n} はページ番号、{total} は総ページ数です。',

           characterFromImages:
             '画像をきれいなPDFにまとめます 📄',

           characterToImages:
             'PDFをページごとに画像へ分割します 🧩',

           characterPages:
             'PDFページをかんたんに管理できます 📚',

           characterMerge:
             '書類を1つのファイルにまとめます 💗',

           characterWatermark:
             '文書にやさしい透かしを追加します 💧',

           characterPageNumbers:
             'ページ番号を付けて整理します 🔖'
         },


         dropzone: {

           image:
             'ここに画像をドラッグ＆ドロップするか、クリックしてファイルを選択してください',

           pdf:
             'ここにPDFをドラッグ＆ドロップしてください',

           pdfMultiple:
             'ここに複数のPDFをドラッグ＆ドロップしてください',

           imageOnly:
             'ここに画像ファイルをドラッグ＆ドロップしてください',

           pdfOne:
             'ここにPDFをドラッグ＆ドロップしてください'
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
             'エラーが発生しました。もう一度お試しください。',

           createFailed:
             '出力ファイルの作成に失敗しました。',

           canvasContext:
             'Canvasを作成できませんでした。',

           invalidImageDimensions:
             '画像サイズが正しくありません。',

           backgroundFunctionNotFound:
             '背景削除機能がライブラリに見つかりません。',

           backgroundLibraryLoadFailed:
             '背景削除ライブラリの読み込みに失敗しました: {message}'
         },


         file: {

           size:
             'ファイルサイズ: {size}',

           largeWarning:
             'このサイズのファイルは処理に時間がかかり、メモリを多く使用する可能性があります。',

           continueQuestion:
             '続行しますか？',

           original:
             '元のファイル'
         },


         utils: {

           cacheHandlerFailed:
             'clearCache ハンドラーの実行に失敗しました',

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
             '正常に完了しました',

           error:
             'エラーが発生しました'
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
     // KOREAN
     // ==========================================================

     ko: {

       name: 'Korean',

       nativeName: '한국어',

       dir: 'ltr',

       messages: {

         common: {

           home: '홈',
           language: '언어',
           image: '이미지',
           images: '이미지',
           pdf: 'PDF',
           notepad: '메모장',
           upload: '업로드',
           chooseFile: '파일 선택',
           chooseFiles: '파일 선택',
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
           selectAll: '모두 선택',
           items: '항목',
           files: '파일',
           file: '파일',
           pages: '페이지',
           page: '페이지',
           jobs: '작업',
           original: '원본',
           format: '형식',
           size: '크기',
           quality: '품질',
           width: '너비',
           height: '높이',
           saveAs: '다른 이름으로 저장',
           result: '결과',
           done: '완료',
           unlimited: '제한 없음',
           yes: '예',
           no: '아니요'
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
             '모든 이미지와 PDF를 브라우저에서 변환하고 편집하세요. 서버에 파일을 업로드하지 않습니다.',

           footer:
             '모든 작업은 브라우저에서 처리됩니다 — 파일은 외부로 전송되지 않습니다.',

           notepadTitle:
             '온라인 메모장 열기'
         },


         image: {

           convertTitle:
             '변환 및 크기 조정',

           convertHint:
             '파일 형식(PNG / JPG / WEBP)을 변환하고 크기, 품질, 회전, 뒤집기를 조정할 수 있습니다. 여러 파일을 한 번에 처리할 수 있습니다.',

           cropTitle:
             '이미지 자르기',

           cropHint:
             '이미지에서 원하는 영역을 선택하고 자유롭게 조정한 후 결과를 다운로드하세요.',

           bgRemoveTitle:
             '배경 제거',

           bgRemoveHint:
             'AI로 이미지 배경을 자동으로 제거합니다. 모든 작업은 브라우저에서 처리되며 이미지가 서버로 업로드되지 않습니다.',

           compressTitle:
             '이미지 압축',

           compressHint:
             '품질과 이미지 크기를 조정하여 파일 크기를 줄입니다. 모든 작업은 브라우저에서 처리됩니다.',

           dropImage:
             '여기에 이미지를 놓으세요',

           chooseImage:
             '또는 클릭하여 파일 선택',

           supportedImages:
             '여러 파일 지원 (JPG · PNG · WEBP · GIF · BMP)',

           addMultiple:
             '여러 이미지 추가',

           cropSeparately:
             '각 이미지는 개별적으로 자릅니다',

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
             '모든 배경을 제거하는 중…',

           downloadZip:
             '모두 다운로드 (.zip)',

           allFormats:
             '전체 형식',

           choosePerFile:
             '— 파일별 선택 —',

           convertTo:
             '변환 형식',

           dimensions:
             '크기 (px)',

           rotateFlip:
             '회전 / 뒤집기',

           rotateLeft:
             '왼쪽으로 90° 회전',

           rotateRight:
             '오른쪽으로 90° 회전',

           flipHorizontal:
             '좌우 뒤집기',

           flipVertical:
             '상하 뒤집기',

           lockAspect:
             '가로세로 비율 잠금',

           aspectRatio:
             '가로세로 비율',

           free:
             '자유',

           crop:
             '자르기',

           cropping:
             '자르는 중…',

           croppingFailed:
             '자르기 실패: {message}',

           conversionFailed:
             '변환 실패: {message}',

           saveFormat:
             '저장 형식',

           waitingConvert:
             '대기 중',

           waitingCrop:
             '프레임을 드래그하여 자르세요',

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
             '절감',

           ready:
             '다운로드 준비 완료',

           readyDownload:
             '다운로드 준비 완료 · {size}',

           preparingModel:
             'AI 모델 준비 중…',

           loadingModelProgress:
             '모델 불러오는 중… {percent}%',

           removingBackgroundProgress:
             '처리 중… {percent}%',

           backgroundRemovalFailed:
             '배경 제거 실패: {message}',

           characterConvert:
             '이미지 변환 준비 완료 ✨',

           characterCrop:
             '이미지를 딱 맞게 잘라볼게요 ✂️',

           characterBgRemove:
             '배경을 깔끔하게 제거합니다 🫧',

           characterCompress:
             '품질을 유지하면서 이미지를 작게 만듭니다 📦',

           modelFirstUse:
             '처음 사용하면 약 40MB의 AI 모델을 다운로드합니다. 브라우저에 캐시되어 다음 사용부터 더 빨라집니다. 처리 시간은 기기 성능에 따라 달라집니다.'
         },


         pdf: {

           fromImagesTitle:
             '이미지를 PDF로',

           fromImagesHint:
             '여러 이미지를 하나의 PDF로 만들고 페이지 순서를 변경할 수 있습니다.',

           toImagesTitle:
             'PDF → 이미지',

           toImagesHint:
             'PDF의 모든 페이지를 이미지 파일로 변환합니다. 형식과 해상도를 선택할 수 있습니다.',

           pagesTitle:
             'PDF 페이지 관리',

           pagesHint:
             '페이지를 삭제하거나 순서를 변경하고 선택한 페이지만 새 PDF로 저장할 수 있습니다.',

           mergeTitle:
             'PDF 병합',

           mergeHint:
             '여러 PDF 파일을 하나로 병합하고 병합 전에 순서를 변경할 수 있습니다.',

           watermarkTitle:
             'PDF 워터마크',

           watermarkHint:
             'PDF의 모든 페이지에 텍스트 또는 PNG 워터마크를 추가합니다.',

           pageNumbersTitle:
             '페이지 번호 추가',

           pageNumbersHint:
             'PDF의 모든 페이지에 페이지 번호를 자동으로 추가합니다.',

           dropPdf:
             '여기에 PDF를 놓으세요',

           dropPdfMultiple:
             '여기에 여러 PDF 파일을 놓으세요',

           clickChoosePdf:
             '또는 클릭하여 파일 선택',

           oneFile:
             '한 번에 한 파일',

           multipleFiles:
             '여러 파일 추가',

           imagesToPdfOrder:
             '추가한 순서가 PDF 페이지 순서가 됩니다.',

           mergeOrder:
             '아래에서 병합 전에 순서를 변경할 수 있습니다.',

           pageSize:
             '페이지 크기',

           fitToImage:
             '이미지에 맞추기',

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
             '✕로 페이지를 삭제하고 ↑ ↓로 순서를 변경할 수 있습니다.',

           downloadPdfOrdered:
             'PDF 다운로드 (현재 순서)',

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
             '이미지만 사용할 경우 비워두세요',

           noImageSelected:
             '이미지가 선택되지 않았습니다',

           fontSize:
             '글자 크기',

           watermarkImageSize:
             '워터마크 이미지 크기',

           opacity:
             '투명도',

           angle:
             '회전 각도',

           watermarkCombination:
             '텍스트만, PNG만 또는 둘 다 사용할 수 있습니다.',

           readyWatermark:
             '워터마크를 추가할 준비가 되었습니다',

           applyWatermark:
             '워터마크 추가',

           pageNumberFormat:
             '텍스트 형식',

           startCountingAt:
             '시작 번호',

           position:
             '위치',

           bottomCenter:
             '하단 중앙',

           bottomRight:
             '오른쪽 아래',

           bottomLeft:
             '왼쪽 아래',

           topCenter:
             '상단 중앙',

           topRight:
             '오른쪽 위',

           readyPageNumber:
             '페이지 번호를 추가할 준비가 되었습니다',

           applyPageNumber:
             '페이지 번호 추가',

           pageNumberHelp:
             '{n}은 페이지 번호, {total}은 전체 페이지 수입니다.',

           characterFromImages:
             '이미지를 깔끔한 PDF로 만들어요 📄',

           characterToImages:
             'PDF를 페이지별 이미지로 나눠드려요 🧩',

           characterPages:
             'PDF 페이지를 쉽게 관리해요 📚',

           characterMerge:
             '문서를 하나의 파일로 합쳐드려요 💗',

           characterWatermark:
             '문서에 부드러운 워터마크를 추가해요 💧',

           characterPageNumbers:
             '페이지 번호를 넣어 깔끔하게 정리해요 🔖'
         },


         dropzone: {

           image:
             '이미지 파일을 여기에 드래그 앤 드롭하거나 클릭하여 선택하세요',

           pdf:
             'PDF 파일을 여기에 드래그 앤 드롭하세요',

           pdfMultiple:
             '여기에 여러 PDF 파일을 드래그 앤 드롭하세요',

           imageOnly:
             '여기에 이미지 파일을 드래그 앤 드롭하세요',

           pdfOne:
             '여기에 PDF를 드래그 앤 드롭하세요'
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
             '오류가 발생했습니다. 다시 시도해 주세요.',

           createFailed:
             '출력 파일을 만들지 못했습니다.',

           canvasContext:
             'Canvas를 생성할 수 없습니다.',

           invalidImageDimensions:
             '이미지 크기가 올바르지 않습니다.',

           backgroundFunctionNotFound:
             '배경 제거 기능을 라이브러리에서 찾을 수 없습니다.',

           backgroundLibraryLoadFailed:
             '배경 제거 라이브러리를 불러오지 못했습니다: {message}'
         },


         file: {

           size:
             '파일 크기: {size}',

           largeWarning:
             '이 정도 크기의 파일은 처리 시간이 길어지고 메모리를 많이 사용할 수 있습니다.',

           continueQuestion:
             '계속하시겠습니까?',

           original:
             '원본'
         },


         utils: {

           cacheHandlerFailed:
             'clearCache 핸들러 실행에 실패했습니다',

           invalidObjectUrlHolder:
             'replaceObjectUrl에 유효한 holder와 key가 필요합니다'
         },


         tool: {

           waiting:
             '대기 중',

           ready:
             '준비 완료',

           processing:
             '처리 중',

           success:
             '정상적으로 완료되었습니다',

           error:
             '오류가 발생했습니다'
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
     // SIMPLIFIED CHINESE
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

           home: '首页',
           language: '语言',
           image: '图片',
           images: '图片',
           pdf: 'PDF',
           notepad: '记事本',
           upload: '上传',
           chooseFile: '选择文件',
           chooseFiles: '选择文件',
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
           selectAll: '全选',
           items: '项',
           files: '个文件',
           file: '文件',
           pages: '页',
           page: '页',
           jobs: '任务',
           original: '原始',
           format: '格式',
           size: '大小',
           quality: '质量',
           width: '宽度',
           height: '高度',
           saveAs: '保存为',
           result: '结果',
           done: '完成',
           unlimited: '不限制',
           yes: '是',
           no: '否'
         },


         cute: {

           ready:
             '准备好了 ✨',

           completed:
             '处理完成',

           processing:
             '正在处理…',

           itemCount:
             '{count} 个项目'
         },


         page: {

           title:
             'Workshop Utility BY KITTO',

           heading:
             '文件管理工具',

           subtitle:
             '在浏览器中转换和编辑图片/PDF。不会将文件上传到任何服务器。',

           footer:
             '全部在浏览器中处理 — 文件不会发送到任何地方。',

           notepadTitle:
             '打开在线记事本'
         },


         image: {

           convertTitle:
             '格式转换与调整大小',

           convertHint:
             '转换文件格式（PNG / JPG / WEBP），调整尺寸、质量、旋转和翻转。支持批量处理。',

           cropTitle:
             '裁剪图片',

           cropHint:
             '选择要裁剪的区域，自由调整裁剪框，然后下载结果。',

           bgRemoveTitle:
             '移除背景',

           bgRemoveHint:
             '使用 AI 自动移除图片背景。全部在浏览器中处理，不会上传图片。',

           compressTitle:
             '压缩图片',

           compressHint:
             '通过调整质量和尺寸减小图片文件大小。全部在浏览器中处理。',

           dropImage:
             '将图片拖放到这里',

           chooseImage:
             '或点击选择文件',

           supportedImages:
             '支持多个文件（JPG · PNG · WEBP · GIF · BMP）',

           addMultiple:
             '可添加多个图片',

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
             '全部移除背景',

           removeBackgroundAllProcessing:
             '正在移除所有背景…',

           downloadZip:
             '全部下载 (.zip)',

           allFormats:
             '全部格式',

           choosePerFile:
             '— 单独选择 —',

           convertTo:
             '转换为',

           dimensions:
             '尺寸 (px)',

           rotateFlip:
             '旋转 / 翻转',

           rotateLeft:
             '向左旋转 90°',

           rotateRight:
             '向右旋转 90°',

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
             '正在裁剪…',

           croppingFailed:
             '裁剪失败：{message}',

           conversionFailed:
             '转换失败：{message}',

           saveFormat:
             '保存为',

           waitingConvert:
             '等待转换',

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
             '正在处理… {percent}%',

           backgroundRemovalFailed:
             '移除背景失败：{message}',

           characterConvert:
             '准备转换图片 ✨',

           characterCrop:
             '让我们把图片裁剪得刚刚好 ✂️',

           characterBgRemove:
             '正在干净地移除背景 🫧',

           characterCompress:
             '在保持质量的同时减小图片大小 📦',

           modelFirstUse:
             '首次使用会加载约 40MB 的 AI 模型。浏览器会缓存模型，以便下次更快使用。处理时间取决于设备性能。'
         },


         pdf: {

           fromImagesTitle:
             '图片转 PDF',

           fromImagesHint:
             '将多个图片合并为一个 PDF，并调整页面顺序。',

           toImagesTitle:
             'PDF → 图片',

           toImagesHint:
             '将 PDF 的每一页转换为图片。可以选择格式和分辨率。',

           pagesTitle:
             '管理 PDF 页面',

           pagesHint:
             '删除页面、重新排序，或将选中的页面导出为新的 PDF。',

           mergeTitle:
             '合并 PDF',

           mergeHint:
             '将多个 PDF 合并为一个文件，并在合并前调整顺序。',

           watermarkTitle:
             'PDF 水印',

           watermarkHint:
             '在 PDF 每一页添加文字或 PNG 水印。',

           pageNumbersTitle:
             '添加页码',

           pageNumbersHint:
             '自动为 PDF 每一页添加页码，并选择位置和格式。',

           dropPdf:
             '将 PDF 拖放到这里',

           dropPdfMultiple:
             '将多个 PDF 拖放到这里',

           clickChoosePdf:
             '或点击选择文件',

           oneFile:
             '一次一个文件',

           multipleFiles:
             '可添加多个文件',

           imagesToPdfOrder:
             '添加顺序将成为 PDF 页面顺序。',

           mergeOrder:
             '可在下方重新排序后再合并。',

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
             '第 {current}/{total} 页',

           manageInstructions:
             '使用 ✕ 删除页面，使用 ↑ ↓ 重新排序，并勾选要单独导出的页面。',

           downloadPdfOrdered:
             '下载 PDF（当前顺序）',

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
             '尚未选择图片',

           fontSize:
             '字体大小',

           watermarkImageSize:
             '水印图片大小',

           opacity:
             '透明度',

           angle:
             '旋转角度',

           watermarkCombination:
             '可以只使用文字、只使用 PNG，或同时使用两者。',

           readyWatermark:
             '准备添加水印',

           applyWatermark:
             '添加水印',

           pageNumberFormat:
             '文字格式',

           startCountingAt:
             '起始页码',

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
             '{n} 表示页码，{total} 表示总页数。',

           characterFromImages:
             '把图片整理成漂亮的 PDF 📄',

           characterToImages:
             '将 PDF 按页面拆分成图片 🧩',

           characterPages:
             '轻松管理 PDF 页面 📚',

           characterMerge:
             '将文档合并成一个文件 💗',

           characterWatermark:
             '为文档添加柔和的水印 💧',

           characterPageNumbers:
             '添加页码，让文档更整齐 🔖'
         },


         dropzone: {

           image:
             '将图片文件拖放到这里，或点击选择文件',

           pdf:
             '将 PDF 拖放到这里',

           pdfMultiple:
             '将多个 PDF 拖放到这里',

           imageOnly:
             '将图片文件拖放到这里',

           pdfOne:
             '将 PDF 拖放到这里'
         },


         errors: {

           downloadDataNotFound:
             '找不到可下载的数据。',

           fileNotFound:
             '找不到文件。',

           fileReadFailed:
             '读取文件失败。',

           fileReadAborted:
             '文件读取已中止。',

           imageLoadFailed:
             '图片加载失败。',

           unsupportedFile:
             '不支持此文件类型。',

           processingFailed:
             '文件处理失败。',

           somethingWentWrong:
             '发生错误，请重试。',

           createFailed:
             '创建输出文件失败。',

           canvasContext:
             '无法创建 Canvas。',

           invalidImageDimensions:
             '图片尺寸无效。',

           backgroundFunctionNotFound:
             '找不到背景移除功能。',

           backgroundLibraryLoadFailed:
             '加载背景移除库失败：{message}'
         },


         file: {

           size:
             '文件大小：{size}',

           largeWarning:
             '此大小的文件可能需要更长的处理时间，并占用较多内存。',

           continueQuestion:
             '是否继续？',

           original:
             '原始'
         },


         utils: {

           cacheHandlerFailed:
             'clearCache 处理程序执行失败',

           invalidObjectUrlHolder:
             'replaceObjectUrl 需要有效的 holder 和 key'
         },


         tool: {

           waiting: '等待中',
           ready: '准备就绪',
           processing: '处理中',
           success: '处理成功',
           error: '发生错误'
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
     // TRADITIONAL CHINESE
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

           home: '首頁',
           language: '語言',
           image: '圖片',
           images: '圖片',
           pdf: 'PDF',
           notepad: '記事本',
           upload: '上傳',
           chooseFile: '選擇檔案',
           chooseFiles: '選擇檔案',
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
           selectAll: '全選',
           items: '項目',
           files: '個檔案',
           file: '檔案',
           pages: '頁',
           page: '頁',
           jobs: '工作',
           original: '原始',
           format: '格式',
           size: '大小',
           quality: '品質',
           width: '寬度',
           height: '高度',
           saveAs: '另存為',
           result: '結果',
           done: '完成',
           unlimited: '不限制',
           yes: '是',
           no: '否'
         },


         cute: {

           ready:
             '準備好了 ✨',

           completed:
             '處理完成',

           processing:
             '正在處理…',

           itemCount:
             '{count} 個項目'
         },


         page: {

           title:
             'Workshop Utility BY KITTO',

           heading:
             '檔案管理工具',

           subtitle:
             '在瀏覽器中轉換和編輯圖片/PDF，不會將檔案上傳到任何伺服器。',

           footer:
             '全部在瀏覽器中處理 — 檔案不會傳送到任何地方。',

           notepadTitle:
             '開啟線上記事本'
         },


         image: {

           convertTitle:
             '格式轉換與調整大小',

           convertHint:
             '轉換檔案格式（PNG / JPG / WEBP），調整尺寸、品質、旋轉和翻轉。支援多個檔案。',

           cropTitle:
             '裁切圖片',

           cropHint:
             '選擇要裁切的區域，自由調整框線後下載結果。',

           bgRemoveTitle:
             '移除背景',

           bgRemoveHint:
             '使用 AI 自動移除圖片背景。全部在瀏覽器中處理，不會上傳圖片。',

           compressTitle:
             '壓縮圖片',

           compressHint:
             '透過調整品質和尺寸來縮小圖片檔案大小。全部在瀏覽器中處理。',

           dropImage:
             '將圖片拖曳到這裡',

           chooseImage:
             '或點擊選擇檔案',

           supportedImages:
             '支援多個檔案（JPG · PNG · WEBP · GIF · BMP）',

           addMultiple:
             '可新增多張圖片',

           cropSeparately:
             '每張圖片分別裁切',

           cropInstruction:
             '拖曳框線進行裁切',

           outputTransparent:
             '輸出為透明背景 PNG',

           compressSupported:
             '支援 JPG · PNG · WEBP 和多個檔案',

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
             '全部移除背景',

           removeBackgroundAllProcessing:
             '正在移除所有背景…',

           downloadZip:
             '全部下載 (.zip)',

           allFormats:
             '全部格式',

           choosePerFile:
             '— 個別選擇 —',

           convertTo:
             '轉換為',

           dimensions:
             '尺寸 (px)',

           rotateFlip:
             '旋轉 / 翻轉',

           rotateLeft:
             '向左旋轉 90°',

           rotateRight:
             '向右旋轉 90°',

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
             '裁切',

           cropping:
             '正在裁切…',

           croppingFailed:
             '裁切失敗：{message}',

           conversionFailed:
             '轉換失敗：{message}',

           saveFormat:
             '儲存格式',

           waitingConvert:
             '等待轉換',

           waitingCrop:
             '拖曳框線進行裁切',

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
             '正在處理… {percent}%',

           backgroundRemovalFailed:
             '移除背景失敗：{message}',

           characterConvert:
             '準備轉換圖片 ✨',

           characterCrop:
             '讓我們把圖片裁切得剛剛好 ✂️',

           characterBgRemove:
             '正在乾淨地移除背景 🫧',

           characterCompress:
             '在保持品質的同時縮小圖片 📦',

           modelFirstUse:
             '第一次使用會載入約 40MB 的 AI 模型。瀏覽器會快取模型，之後使用會更快。處理時間取決於裝置效能。'
         },


         pdf: {

           fromImagesTitle:
             '圖片轉 PDF',

           fromImagesHint:
             '將多張圖片合併成一個 PDF，並可調整頁面順序。',

           toImagesTitle:
             'PDF → 圖片',

           toImagesHint:
             '將 PDF 的每一頁轉換為圖片檔案，可選擇格式與解析度。',

           pagesTitle:
             '管理 PDF 頁面',

           pagesHint:
             '刪除頁面、重新排序，或將選取的頁面輸出為新的 PDF。',

           mergeTitle:
             '合併 PDF',

           mergeHint:
             '將多個 PDF 合併成一個檔案，並可在合併前調整順序。',

           watermarkTitle:
             'PDF 浮水印',

           watermarkHint:
             '在 PDF 每一頁加入文字或 PNG 浮水印。',

           pageNumbersTitle:
             '加入頁碼',

           pageNumbersHint:
             '自動在 PDF 每一頁加入頁碼，並選擇位置與格式。',

           dropPdf:
             '將 PDF 拖曳到這裡',

           dropPdfMultiple:
             '將多個 PDF 拖曳到這裡',

           clickChoosePdf:
             '或點擊選擇檔案',

           oneFile:
             '一次一個檔案',

           multipleFiles:
             '可新增多個檔案',

           imagesToPdfOrder:
             '新增順序會成為 PDF 的頁面順序。',

           mergeOrder:
             '可在下方調整合併前的順序。',

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
             '第 {current}/{total} 頁',

           manageInstructions:
             '使用 ✕ 刪除頁面，使用 ↑ ↓ 調整順序，並勾選要另外匯出的頁面。',

           downloadPdfOrdered:
             '下載 PDF（目前順序）',

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
             '字體大小',

           watermarkImageSize:
             '浮水印圖片大小',

           opacity:
             '透明度',

           angle:
             '旋轉角度',

           watermarkCombination:
             '可以只使用文字、只使用 PNG，或同時使用兩者。',

           readyWatermark:
             '準備加入浮水印',

           applyWatermark:
             '加入浮水印',

           pageNumberFormat:
             '文字格式',

           startCountingAt:
             '起始頁碼',

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

           characterFromImages:
             '將圖片整理成漂亮的 PDF 📄',

           characterToImages:
             '將 PDF 依頁面拆成圖片 🧩',

           characterPages:
             '輕鬆管理 PDF 頁面 📚',

           characterMerge:
             '將文件合併成一個檔案 💗',

           characterWatermark:
             '為文件加入柔和的浮水印 💧',

           characterPageNumbers:
             '加入頁碼，讓文件更整齊 🔖'
         },


         dropzone: {

           image:
             '將圖片檔案拖曳到這裡，或點擊選擇檔案',

           pdf:
             '將 PDF 拖曳到這裡',

           pdfMultiple:
             '將多個 PDF 拖曳到這裡',

           imageOnly:
             '將圖片檔案拖曳到這裡',

           pdfOne:
             '將 PDF 拖曳到這裡'
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
             '圖片載入失敗。',

           unsupportedFile:
             '不支援此檔案類型。',

           processingFailed:
             '檔案處理失敗。',

           somethingWentWrong:
             '發生錯誤，請再試一次。',

           createFailed:
             '建立輸出檔案失敗。',

           canvasContext:
             '無法建立 Canvas。',

           invalidImageDimensions:
             '圖片尺寸無效。',

           backgroundFunctionNotFound:
             '找不到背景移除功能。',

           backgroundLibraryLoadFailed:
             '載入背景移除程式庫失敗：{message}'
         },


         file: {

           size:
             '檔案大小：{size}',

           largeWarning:
             '此大小的檔案可能需要較長的處理時間，並使用較多記憶體。',

           continueQuestion:
             '是否要繼續？',

           original:
             '原始'
         },


         utils: {

           cacheHandlerFailed:
             'clearCache 處理程序執行失敗',

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


         language: {

           th: 'ไทย',
           en: 'English',
           ja: '日本語',
           ko: '한국어',
           zhCN: '简体中文',
           zhTW: '繁體中文'
         }

       }
     }

   };


   // ============================================================
   // LANGUAGE HELPERS
   // ============================================================

   function hasLanguage(
     language
   ) {

     return Object.prototype.hasOwnProperty.call(
       LANGUAGES,
       language
     );
   }


   function normalizeLanguage(
     language
   ) {

     if (!language) {
       return '';
     }


     return String(language)
       .trim()
       .replace(
         /_/g,
         '-'
       );
   }


   function getBaseLanguage(
     language
   ) {

     const normalized =
       normalizeLanguage(
         language
       );


     if (!normalized) {
       return '';
     }


     return normalized
       .split('-')[0]
       .toLowerCase();
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
     // Chinese special handling
     // ----------------------------------------------------------

     for (
       const rawLanguage of
       languageList
     ) {

       const language =
         normalizeLanguage(
           rawLanguage
         ).toLowerCase();


       if (
         language === 'zh-tw' ||
         language === 'zh-hk' ||
         language === 'zh-mo' ||
         language.includes('hant')
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
         language === 'zh-cn' ||
         language === 'zh-sg' ||
         language === 'zh-my' ||
         language.includes('hans')
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
     // Exact match
     // ----------------------------------------------------------

     for (
       const rawLanguage of
       languageList
     ) {

       const language =
         normalizeLanguage(
           rawLanguage
         );


       if (
         hasLanguage(
           language
         )
       ) {

         return language;
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


       if (!base) {
         continue;
       }


       if (
         hasLanguage(
           base
         )
       ) {

         return base;
       }
     }


     return null;
   }


   // ============================================================
   // BROWSER LANGUAGES
   // ============================================================

   function getBrowserLanguages() {

     const languages = [];


     if (
       typeof navigator !==
       'undefined'
     ) {

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
     }


     return languages;
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


       if (
         saved &&
         hasLanguage(
           saved
         )
       ) {

         return saved;
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


     if (saved) {
       return saved;
     }


     const browserLanguages =
       getBrowserLanguages();


     const detected =
       findBestLanguage(
         browserLanguages
       );


     if (detected) {
       return detected;
     }


     return DEFAULT_LANGUAGE;
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
       String(path)
         .split('.');


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
   // INTERPOLATE
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

         if (
           Object.prototype.hasOwnProperty.call(
             data,
             key
           )
         ) {

           return String(
             data[key]
           );
         }


         return full;
       }
     );
   }


   // ============================================================
   // TRANSLATE
   // ============================================================

   function t(
     key,
     data
   ) {

     const currentMessages =
       LANGUAGES[
         currentLanguage
       ]?.messages;


     const fallbackMessages =
       LANGUAGES[
         DEFAULT_LANGUAGE
       ]?.messages;


     let value =
       getNestedValue(
         currentMessages,
         key
       );


     // ----------------------------------------------------------
     // fallback to English
     // ----------------------------------------------------------

     if (
       value === undefined
     ) {

       value =
         getNestedValue(
           fallbackMessages,
           key
         );
     }


     // ----------------------------------------------------------
     // unknown key
     // ----------------------------------------------------------

     if (
       value === undefined
     ) {

       return String(
         key
       );
     }


     return interpolate(
       value,
       data
     );
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


     if (!info) {
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


     if (title) {

       document.title =
         title;
     }
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
     // text
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


       if (key) {

         element.textContent =
           t(key);
       }
     }


     // ----------------------------------------------------------
     // html
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


       if (key) {

         element.innerHTML =
           t(key);
       }
     }


     // ----------------------------------------------------------
     // placeholder
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


       if (key) {

         element.setAttribute(
           'placeholder',
           t(key)
         );
       }
     }


     // ----------------------------------------------------------
     // title
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


       if (key) {

         element.setAttribute(
           'title',
           t(key)
         );
       }
     }


     // ----------------------------------------------------------
     // aria-label
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


       if (key) {

         element.setAttribute(
           'aria-label',
           t(key)
         );
       }
     }


     // ----------------------------------------------------------
     // aria-description
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


       if (key) {

         element.setAttribute(
           'aria-description',
           t(key)
         );
       }
     }
   }


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
       container.nodeType ===
       1
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
         [
           '[data-i18n]',
           '[data-i18n-html]',
           '[data-i18n-placeholder]',
           '[data-i18n-title]',
           '[data-i18n-aria-label]',
           '[data-i18n-aria-description]'
         ].join(',')
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

     const normalized =
       normalizeLanguage(
         language
       );


     if (
       !hasLanguage(
         normalized
       )
     ) {

       return false;
     }


     currentLanguage =
       normalized;


     // ----------------------------------------------------------
     // save
     // ----------------------------------------------------------

     try {

       localStorage.setItem(
         STORAGE_KEY,
         currentLanguage
       );

     } catch (_) {}


     // ----------------------------------------------------------
     // apply
     // ----------------------------------------------------------

     applyDocumentLanguage();

     applyTranslations();


     // ----------------------------------------------------------
     // notify
     // ----------------------------------------------------------

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
   // RESET LANGUAGE
   // ============================================================

   function resetLanguage() {

     try {

       localStorage.removeItem(
         STORAGE_KEY
       );

     } catch (_) {}


     currentLanguage =
       findBestLanguage(
         getBrowserLanguages()
       ) ||
       DEFAULT_LANGUAGE;


     applyDocumentLanguage();

     applyTranslations();


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
       language ||
       currentLanguage;


     const info =
       LANGUAGES[
         code
       ];


     if (!info) {
       return null;
     }


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
     ).map(
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
   // OBSERVER
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

           for (
             const mutation of
             mutations
           ) {

             if (
               mutation.type !==
               'childList'
             ) {

               continue;
             }


             mutation.addedNodes
               .forEach(
                 node => {

                   if (
                     node.nodeType !==
                     1
                   ) {

                     return;
                   }


                   translateElement(
                     node
                   );


                   applyTranslations(
                     node
                   );
                 }
               );
           }
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

     if (!observer) {
       return;
     }


     observer.disconnect();

     observer =
       null;
   }


   // ============================================================
   // INIT
   // ============================================================

   function init() {

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

     getLanguageInfo,

     getLanguages,

     detectLanguage,

     applyTranslations,

     startObserver,

     stopObserver

   };

 })();

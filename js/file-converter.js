/* ============================================================
FILE CONVERTER
/js/file-converter.js

Client-side file conversion controller

IMAGE

* JPG  -> PNG
* PNG  -> JPG
* JPG  -> WebP
* PNG  -> WebP
* WebP -> JPG
* WebP -> PNG
* SVG  -> PNG
* BMP  -> PNG
* GIF  -> PNG
* Image -> ICO

PDF

* JPG / PNG / Image -> PDF
* PDF -> JPG
* PDF -> PNG
* PDF -> TXT
* PDF -> Images ZIP

DATA

* CSV  -> JSON
* JSON -> CSV
* JSON -> XML
* XML  -> JSON
* YAML -> JSON
* JSON -> YAML

TEXT

* TXT      -> HTML
* HTML     -> TXT
* TXT      -> PDF
* HTML     -> PDF
* Markdown -> HTML

SPREADSHEET

* CSV  -> XLSX
* XLSX -> CSV
* JSON -> XLSX
* XLSX -> PDF

DOCUMENT

* DOCX -> PDF
* PPTX -> PDF

Everything is processed locally in the browser.
============================================================ */

(() => {

"use strict";

/* ============================================================
I18N
============================================================ */

const I18n =
window.I18n || null;

function getLanguage() {

if (
  I18n &&
  typeof I18n.getLanguage ===
    "function"
) {

  return I18n.getLanguage();

}

return "en";

}

/*

* ============================================================
* FILE-CONVERTER LOCAL TRANSLATION FALLBACK
*
* i18n.js รุ่นปัจจุบันของคุณยังไม่มี namespace "converter"
* ดังนั้นส่วนนี้จะเป็น fallback ให้ File Converter ใช้งาน
* หลายภาษาได้ทันที โดยไม่ต้องแก้ i18n.js ก่อน
* ============================================================
  */

const UI_TRANSLATIONS = {

en: {

  title:
    "File Converter",

  subtitle:
    "Convert images, PDF, documents, spreadsheets, data and text files directly in your browser.",

  fileTools:
    "FILE TOOLS",

  backHome:
    "Back to home",

  searchPlaceholder:
    "Search converters such as JPG, PNG, PDF, CSV...",

  searchLabel:
    "Search converters",

  clearSearch:
    "Clear search",

  all:
    "All",

  image:
    "Images",

  pdf:
    "PDF",

  document:
    "Documents",

  spreadsheet:
    "Spreadsheet",

  data:
    "Data",

  text:
    "Text",

  popular:
    "POPULAR",

  popularTitle:
    "Popular converters",

  imageTitle:
    "Image Converter",

  pdfTitle:
    "PDF Converter",

  documentTitle:
    "Document Converter",

  spreadsheetTitle:
    "Spreadsheet Converter",

  dataTitle:
    "Data Converter",

  textTitle:
    "Text Converter",

  noResults:
    "No converter found",

  noResultsHint:
    "Try searching for JPG, PNG, PDF, CSV or JSON.",

  showAll:
    "Show all",

  privacyTitle:
    "Privacy First",

  privacyText:
    "Converters that can run in your browser process files locally without uploading them to a server.",

  dragFiles:
    "Drop files here",

  chooseFiles:
    "Or choose files from your device",

  browse:
    "Choose files",

  selectedFiles:
    "Selected files",

  clearFiles:
    "Clear all",

  converting:
    "Converting files...",

  preparing:
    "Preparing files...",

  converted:
    "Conversion completed",

  errorTitle:
    "Something went wrong",

  errorDefault:
    "Unable to convert the file.",

  cancel:
    "Cancel",

  convert:
    "Convert",

  download:
    "Download",

  ready:
    "Ready",

  unsupported:
    "This converter is not available yet.",

  supported:
    "Supported",

  convertedOne:
    "{count} file converted",

  convertedMany:
    "{count} files converted",

  selectedOne:
    "{count} file",

  selectedMany:
    "{count} files",

  resultReady:
    "Conversion completed",

  convertingFile:
    "Converting {current}/{total}: {name}",

  convertedFile:
    "Converted {name} successfully",

  maxFiles:
    "Maximum {count} files allowed",

  fileTooLarge:
    "{name}: file is larger than {size}",

  unsupportedFile:
    "{name}: unsupported file type",

  converterNotFound:
    "Converter not found",

  converterUnavailable:
    "This converter is not available yet.",

  pleaseSelectFile:
    "Please select at least one file.",

  canvasUnavailable:
    "Canvas is not available in this browser.",

  imageOpenFailed:
    "Unable to open the image.",

  outputFailed:
    "Unable to create the output file.",

  pdfNotFound:
    "PDF.js could not be loaded.",

  pdfLibNotFound:
    "pdf-lib could not be loaded.",

  jsZipNotFound:
    "JSZip could not be loaded.",

  xlsxNotFound:
    "SheetJS XLSX could not be loaded.",

  mammothNotFound:
    "Mammoth could not be loaded.",

  csvEmpty:
    "CSV contains no data.",

  jsonInvalid:
    "Invalid JSON file.",

  jsonEmpty:
    "JSON contains no data.",

  jsonObjectRequired:
    "JSON must contain object data.",

  xmlEmpty:
    "XML contains no data.",

  xmlInvalid:
    "Invalid XML format.",

  xmlRootMissing:
    "XML root element was not found.",

  yamlEmpty:
    "YAML contains no data.",

  svgEmpty:
    "SVG file is empty.",

  docxTextMissing:
    "No text was found in the DOCX file.",

  pptxSlideMissing:
    "No slides were found in the PPTX file.",

  pdfCanvasFailed:
    "Unable to create a PDF canvas.",

  pdfTextFailed:
    "Unable to extract PDF text.",

  conversionFailed:
    "Conversion failed.",

  done:
    "Done"
},


th: {

  title:
    "File Converter",

  subtitle:
    "รวมเครื่องมือแปลงไฟล์ รูปภาพ PDF เอกสาร Spreadsheet Data และ Text พร้อมประมวลผลในเบราว์เซอร์",

  fileTools:
    "FILE TOOLS",

  backHome:
    "กลับหน้าหลัก",

  searchPlaceholder:
    "ค้นหา Converter เช่น JPG, PNG, PDF, CSV...",

  searchLabel:
    "ค้นหา Converter",

  clearSearch:
    "ล้างการค้นหา",

  all:
    "ทั้งหมด",

  image:
    "รูปภาพ",

  pdf:
    "PDF",

  document:
    "เอกสาร",

  spreadsheet:
    "Spreadsheet",

  data:
    "Data",

  text:
    "Text",

  popular:
    "POPULAR",

  popularTitle:
    "เครื่องมือยอดนิยม",

  imageTitle:
    "Image Converter",

  pdfTitle:
    "PDF Converter",

  documentTitle:
    "Document Converter",

  spreadsheetTitle:
    "Spreadsheet Converter",

  dataTitle:
    "Data Converter",

  textTitle:
    "Text Converter",

  noResults:
    "ไม่พบ Converter",

  noResultsHint:
    "ลองค้นหาด้วยชื่อไฟล์ เช่น JPG, PNG, PDF, CSV หรือ JSON",

  showAll:
    "แสดงทั้งหมด",

  privacyTitle:
    "Privacy First",

  privacyText:
    "เครื่องมือที่สามารถประมวลผลในเบราว์เซอร์จะทำงานกับไฟล์ภายในเครื่อง โดยไม่จำเป็นต้องอัปโหลดไฟล์ไปยังเซิร์ฟเวอร์",

  dragFiles:
    "ลากไฟล์มาวางที่นี่",

  chooseFiles:
    "หรือเลือกไฟล์จากเครื่องของคุณ",

  browse:
    "เลือกไฟล์",

  selectedFiles:
    "ไฟล์ที่เลือก",

  clearFiles:
    "ล้างทั้งหมด",

  converting:
    "กำลังแปลงไฟล์...",

  preparing:
    "กำลังเตรียมไฟล์...",

  converted:
    "แปลงไฟล์สำเร็จ",

  errorTitle:
    "เกิดข้อผิดพลาด",

  errorDefault:
    "ไม่สามารถแปลงไฟล์ได้",

  cancel:
    "ยกเลิก",

  convert:
    "แปลงไฟล์",

  download:
    "ดาวน์โหลด",

  ready:
    "พร้อม",

  unsupported:
    "Converter นี้ยังไม่พร้อมใช้งาน",

  supported:
    "รองรับ",

  convertedOne:
    "แปลงสำเร็จ {count} ไฟล์",

  convertedMany:
    "แปลงสำเร็จ {count} ไฟล์",

  selectedOne:
    "{count} ไฟล์",

  selectedMany:
    "{count} ไฟล์",

  resultReady:
    "แปลงไฟล์เสร็จเรียบร้อย",

  convertingFile:
    "กำลังแปลง {current}/{total}: {name}",

  convertedFile:
    "แปลง {name} สำเร็จ",

  maxFiles:
    "เลือกได้สูงสุด {count} ไฟล์",

  fileTooLarge:
    "{name}: ไฟล์ใหญ่เกิน {size}",

  unsupportedFile:
    "{name}: ไม่รองรับไฟล์ประเภทนี้",

  converterNotFound:
    "ไม่พบ Converter",

  converterUnavailable:
    "Converter นี้ยังไม่พร้อมใช้งาน",

  pleaseSelectFile:
    "กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์",

  canvasUnavailable:
    "เบราว์เซอร์นี้ไม่รองรับ Canvas",

  imageOpenFailed:
    "ไม่สามารถเปิดรูปภาพได้",

  outputFailed:
    "ไม่สามารถสร้างไฟล์ผลลัพธ์ได้",

  pdfNotFound:
    "ไม่พบ PDF.js",

  pdfLibNotFound:
    "ไม่พบ pdf-lib",

  jsZipNotFound:
    "ไม่พบ JSZip",

  xlsxNotFound:
    "ไม่พบ SheetJS XLSX",

  mammothNotFound:
    "ไม่พบ Mammoth",

  csvEmpty:
    "CSV ไม่มีข้อมูล",

  jsonInvalid:
    "ไฟล์ JSON ไม่ถูกต้อง",

  jsonEmpty:
    "JSON ไม่มีข้อมูล",

  jsonObjectRequired:
    "ไม่พบข้อมูลแบบ Object ใน JSON",

  xmlEmpty:
    "XML ไม่มีข้อมูล",

  xmlInvalid:
    "รูปแบบ XML ไม่ถูกต้อง",

  xmlRootMissing:
    "ไม่พบ XML root element",

  yamlEmpty:
    "YAML ไม่มีข้อมูล",

  svgEmpty:
    "ไฟล์ SVG ว่างเปล่า",

  docxTextMissing:
    "ไม่พบข้อความในไฟล์ DOCX",

  pptxSlideMissing:
    "ไม่พบ slide ใน PPTX",

  pdfCanvasFailed:
    "ไม่สามารถสร้าง Canvas สำหรับ PDF ได้",

  pdfTextFailed:
    "ไม่สามารถดึงข้อความจาก PDF ได้",

  conversionFailed:
    "แปลงไฟล์ไม่สำเร็จ",

  done:
    "เสร็จแล้ว"
},


ja: {

  title:
    "File Converter",

  subtitle:
    "画像、PDF、ドキュメント、スプレッドシート、データ、テキストをブラウザ上で変換します。",

  fileTools:
    "FILE TOOLS",

  backHome:
    "ホームに戻る",

  searchPlaceholder:
    "JPG、PNG、PDF、CSV などを検索...",

  searchLabel:
    "コンバーターを検索",

  clearSearch:
    "検索をクリア",

  all:
    "すべて",

  image:
    "画像",

  pdf:
    "PDF",

  document:
    "ドキュメント",

  spreadsheet:
    "スプレッドシート",

  data:
    "データ",

  text:
    "テキスト",

  popular:
    "POPULAR",

  popularTitle:
    "人気のコンバーター",

  imageTitle:
    "画像コンバーター",

  pdfTitle:
    "PDF コンバーター",

  documentTitle:
    "ドキュメントコンバーター",

  spreadsheetTitle:
    "スプレッドシートコンバーター",

  dataTitle:
    "データコンバーター",

  textTitle:
    "テキストコンバーター",

  noResults:
    "コンバーターが見つかりません",

  noResultsHint:
    "JPG、PNG、PDF、CSV、JSON などで検索してください。",

  showAll:
    "すべて表示",

  privacyTitle:
    "Privacy First",

  privacyText:
    "対応している変換処理はブラウザ内でローカルに実行されます。",

  dragFiles:
    "ここにファイルをドロップ",

  chooseFiles:
    "またはデバイスから選択",

  browse:
    "ファイルを選択",

  selectedFiles:
    "選択したファイル",

  clearFiles:
    "すべてクリア",

  converting:
    "ファイルを変換中...",

  preparing:
    "準備中...",

  converted:
    "変換完了",

  errorTitle:
    "エラーが発生しました",

  errorDefault:
    "ファイルを変換できませんでした。",

  cancel:
    "キャンセル",

  convert:
    "変換",

  download:
    "ダウンロード",

  ready:
    "準備完了",

  unsupported:
    "このコンバーターはまだ利用できません。",

  supported:
    "対応",

  convertedOne:
    "{count} ファイルを変換しました",

  convertedMany:
    "{count} ファイルを変換しました",

  selectedOne:
    "{count} ファイル",

  selectedMany:
    "{count} ファイル",

  resultReady:
    "変換が完了しました",

  convertingFile:
    "{current}/{total} を変換中: {name}",

  convertedFile:
    "{name} を変換しました",

  maxFiles:
    "最大 {count} ファイルまでです",

  fileTooLarge:
    "{name}: ファイルサイズが大きすぎます",

  unsupportedFile:
    "{name}: 対応していないファイル形式です",

  converterNotFound:
    "コンバーターが見つかりません",

  converterUnavailable:
    "このコンバーターはまだ利用できません",

  pleaseSelectFile:
    "少なくとも1つのファイルを選択してください",

  canvasUnavailable:
    "このブラウザでは Canvas を利用できません",

  imageOpenFailed:
    "画像を開けませんでした",

  outputFailed:
    "出力ファイルを作成できませんでした",

  pdfNotFound:
    "PDF.js が見つかりません",

  pdfLibNotFound:
    "pdf-lib が見つかりません",

  jsZipNotFound:
    "JSZip が見つかりません",

  xlsxNotFound:
    "SheetJS XLSX が見つかりません",

  mammothNotFound:
    "Mammoth が見つかりません",

  csvEmpty:
    "CSV にデータがありません",

  jsonInvalid:
    "JSON ファイルが正しくありません",

  jsonEmpty:
    "JSON にデータがありません",

  jsonObjectRequired:
    "JSON にオブジェクトデータがありません",

  xmlEmpty:
    "XML にデータがありません",

  xmlInvalid:
    "XML の形式が正しくありません",

  xmlRootMissing:
    "XML の root 要素が見つかりません",

  yamlEmpty:
    "YAML にデータがありません",

  svgEmpty:
    "SVG ファイルが空です",

  docxTextMissing:
    "DOCX にテキストがありません",

  pptxSlideMissing:
    "PPTX にスライドがありません",

  pdfCanvasFailed:
    "PDF 用 Canvas を作成できません",

  pdfTextFailed:
    "PDF のテキストを抽出できません",

  conversionFailed:
    "変換に失敗しました",

  done:
    "完了"
},


ko: {

  title:
    "File Converter",

  subtitle:
    "이미지, PDF, 문서, 스프레드시트, 데이터 및 텍스트 파일을 브라우저에서 변환합니다.",

  fileTools:
    "FILE TOOLS",

  backHome:
    "홈으로 돌아가기",

  searchPlaceholder:
    "JPG, PNG, PDF, CSV 등을 검색...",

  searchLabel:
    "변환기 검색",

  clearSearch:
    "검색 지우기",

  all:
    "전체",

  image:
    "이미지",

  pdf:
    "PDF",

  document:
    "문서",

  spreadsheet:
    "스프레드시트",

  data:
    "데이터",

  text:
    "텍스트",

  popular:
    "POPULAR",

  popularTitle:
    "인기 변환기",

  imageTitle:
    "이미지 변환기",

  pdfTitle:
    "PDF 변환기",

  documentTitle:
    "문서 변환기",

  spreadsheetTitle:
    "스프레드시트 변환기",

  dataTitle:
    "데이터 변환기",

  textTitle:
    "텍스트 변환기",

  noResults:
    "변환기를 찾을 수 없습니다",

  noResultsHint:
    "JPG, PNG, PDF, CSV 또는 JSON으로 검색해 보세요.",

  showAll:
    "모두 표시",

  privacyTitle:
    "Privacy First",

  privacyText:
    "지원되는 변환기는 파일을 서버에 업로드하지 않고 브라우저에서 로컬로 처리합니다.",

  dragFiles:
    "여기에 파일을 놓으세요",

  chooseFiles:
    "또는 기기에서 선택하세요",

  browse:
    "파일 선택",

  selectedFiles:
    "선택한 파일",

  clearFiles:
    "모두 지우기",

  converting:
    "파일 변환 중...",

  preparing:
    "파일 준비 중...",

  converted:
    "변환 완료",

  errorTitle:
    "오류가 발생했습니다",

  errorDefault:
    "파일을 변환할 수 없습니다.",

  cancel:
    "취소",

  convert:
    "변환",

  download:
    "다운로드",

  ready:
    "준비 완료",

  unsupported:
    "이 변환기는 아직 사용할 수 없습니다.",

  supported:
    "지원",

  convertedOne:
    "{count}개 파일 변환 완료",

  convertedMany:
    "{count}개 파일 변환 완료",

  selectedOne:
    "{count}개 파일",

  selectedMany:
    "{count}개 파일",

  resultReady:
    "변환이 완료되었습니다",

  convertingFile:
    "{current}/{total} 변환 중: {name}",

  convertedFile:
    "{name} 변환 완료",

  maxFiles:
    "최대 {count}개 파일까지 가능합니다",

  fileTooLarge:
    "{name}: 파일이 너무 큽니다",

  unsupportedFile:
    "{name}: 지원하지 않는 파일 형식입니다",

  converterNotFound:
    "변환기를 찾을 수 없습니다",

  converterUnavailable:
    "이 변환기는 아직 사용할 수 없습니다",

  pleaseSelectFile:
    "파일을 하나 이상 선택하세요",

  canvasUnavailable:
    "이 브라우저에서는 Canvas를 사용할 수 없습니다",

  imageOpenFailed:
    "이미지를 열 수 없습니다",

  outputFailed:
    "출력 파일을 만들 수 없습니다",

  pdfNotFound:
    "PDF.js를 찾을 수 없습니다",

  pdfLibNotFound:
    "pdf-lib를 찾을 수 없습니다",

  jsZipNotFound:
    "JSZip을 찾을 수 없습니다",

  xlsxNotFound:
    "SheetJS XLSX를 찾을 수 없습니다",

  mammothNotFound:
    "Mammoth를 찾을 수 없습니다",

  csvEmpty:
    "CSV에 데이터가 없습니다",

  jsonInvalid:
    "JSON 파일이 올바르지 않습니다",

  jsonEmpty:
    "JSON에 데이터가 없습니다",

  jsonObjectRequired:
    "JSON에서 객체 데이터를 찾을 수 없습니다",

  xmlEmpty:
    "XML에 데이터가 없습니다",

  xmlInvalid:
    "XML 형식이 올바르지 않습니다",

  xmlRootMissing:
    "XML 루트 요소를 찾을 수 없습니다",

  yamlEmpty:
    "YAML에 데이터가 없습니다",

  svgEmpty:
    "SVG 파일이 비어 있습니다",

  docxTextMissing:
    "DOCX에서 텍스트를 찾을 수 없습니다",

  pptxSlideMissing:
    "PPTX에서 슬라이드를 찾을 수 없습니다",

  pdfCanvasFailed:
    "PDF Canvas를 만들 수 없습니다",

  pdfTextFailed:
    "PDF 텍스트를 추출할 수 없습니다",

  conversionFailed:
    "변환에 실패했습니다",

  done:
    "완료"
},


"zh-CN": {

  title:
    "文件转换器",

  subtitle:
    "在浏览器中直接转换图片、PDF、文档、表格、数据和文本文件。",

  fileTools:
    "FILE TOOLS",

  backHome:
    "返回首页",

  searchPlaceholder:
    "搜索 JPG、PNG、PDF、CSV 等...",

  searchLabel:
    "搜索转换器",

  clearSearch:
    "清除搜索",

  all:
    "全部",

  image:
    "图片",

  pdf:
    "PDF",

  document:
    "文档",

  spreadsheet:
    "电子表格",

  data:
    "数据",

  text:
    "文本",

  popular:
    "POPULAR",

  popularTitle:
    "热门转换工具",

  imageTitle:
    "图片转换器",

  pdfTitle:
    "PDF 转换器",

  documentTitle:
    "文档转换器",

  spreadsheetTitle:
    "电子表格转换器",

  dataTitle:
    "数据转换器",

  textTitle:
    "文本转换器",

  noResults:
    "未找到转换器",

  noResultsHint:
    "请尝试搜索 JPG、PNG、PDF、CSV 或 JSON。",

  showAll:
    "显示全部",

  privacyTitle:
    "Privacy First",

  privacyText:
    "支持的转换工具会直接在浏览器本地处理文件，无需上传到服务器。",

  dragFiles:
    "将文件拖放到这里",

  chooseFiles:
    "或从设备中选择文件",

  browse:
    "选择文件",

  selectedFiles:
    "已选择文件",

  clearFiles:
    "全部清除",

  converting:
    "正在转换文件...",

  preparing:
    "正在准备文件...",

  converted:
    "转换完成",

  errorTitle:
    "发生错误",

  errorDefault:
    "无法转换文件。",

  cancel:
    "取消",

  convert:
    "转换",

  download:
    "下载",

  ready:
    "准备完成",

  unsupported:
    "此转换器暂不可用。",

  supported:
    "支持",

  convertedOne:
    "已转换 {count} 个文件",

  convertedMany:
    "已转换 {count} 个文件",

  selectedOne:
    "{count} 个文件",

  selectedMany:
    "{count} 个文件",

  resultReady:
    "文件转换完成",

  convertingFile:
    "正在转换 {current}/{total}: {name}",

  convertedFile:
    "{name} 转换成功",

  maxFiles:
    "最多允许 {count} 个文件",

  fileTooLarge:
    "{name}: 文件太大",

  unsupportedFile:
    "{name}: 不支持此文件类型",

  converterNotFound:
    "找不到转换器",

  converterUnavailable:
    "此转换器暂不可用",

  pleaseSelectFile:
    "请至少选择一个文件",

  canvasUnavailable:
    "当前浏览器不支持 Canvas",

  imageOpenFailed:
    "无法打开图片",

  outputFailed:
    "无法创建输出文件",

  pdfNotFound:
    "找不到 PDF.js",

  pdfLibNotFound:
    "找不到 pdf-lib",

  jsZipNotFound:
    "找不到 JSZip",

  xlsxNotFound:
    "找不到 SheetJS XLSX",

  mammothNotFound:
    "找不到 Mammoth",

  csvEmpty:
    "CSV 没有数据",

  jsonInvalid:
    "JSON 文件无效",

  jsonEmpty:
    "JSON 没有数据",

  jsonObjectRequired:
    "JSON 中没有对象数据",

  xmlEmpty:
    "XML 没有数据",

  xmlInvalid:
    "XML 格式无效",

  xmlRootMissing:
    "未找到 XML 根元素",

  yamlEmpty:
    "YAML 没有数据",

  svgEmpty:
    "SVG 文件为空",

  docxTextMissing:
    "DOCX 中没有找到文本",

  pptxSlideMissing:
    "PPTX 中没有找到幻灯片",

  pdfCanvasFailed:
    "无法创建 PDF Canvas",

  pdfTextFailed:
    "无法提取 PDF 文本",

  conversionFailed:
    "转换失败",

  done:
    "完成"
},


"zh-TW": {

  title:
    "檔案轉換器",

  subtitle:
    "直接在瀏覽器中轉換圖片、PDF、文件、試算表、資料與文字檔案。",

  fileTools:
    "FILE TOOLS",

  backHome:
    "回到首頁",

  searchPlaceholder:
    "搜尋 JPG、PNG、PDF、CSV 等...",

  searchLabel:
    "搜尋轉換器",

  clearSearch:
    "清除搜尋",

  all:
    "全部",

  image:
    "圖片",

  pdf:
    "PDF",

  document:
    "文件",

  spreadsheet:
    "試算表",

  data:
    "資料",

  text:
    "文字",

  popular:
    "POPULAR",

  popularTitle:
    "熱門轉換工具",

  imageTitle:
    "圖片轉換器",

  pdfTitle:
    "PDF 轉換器",

  documentTitle:
    "文件轉換器",

  spreadsheetTitle:
    "試算表轉換器",

  dataTitle:
    "資料轉換器",

  textTitle:
    "文字轉換器",

  noResults:
    "找不到轉換器",

  noResultsHint:
    "請嘗試搜尋 JPG、PNG、PDF、CSV 或 JSON。",

  showAll:
    "顯示全部",

  privacyTitle:
    "Privacy First",

  privacyText:
    "支援的轉換工具會直接在瀏覽器本機處理檔案，不需要上傳到伺服器。",

  dragFiles:
    "將檔案拖放到這裡",

  chooseFiles:
    "或從裝置中選擇檔案",

  browse:
    "選擇檔案",

  selectedFiles:
    "已選擇檔案",

  clearFiles:
    "全部清除",

  converting:
    "正在轉換檔案...",

  preparing:
    "正在準備檔案...",

  converted:
    "轉換完成",

  errorTitle:
    "發生錯誤",

  errorDefault:
    "無法轉換檔案。",

  cancel:
    "取消",

  convert:
    "轉換",

  download:
    "下載",

  ready:
    "準備完成",

  unsupported:
    "此轉換器目前尚未提供。",

  supported:
    "支援",

  convertedOne:
    "已轉換 {count} 個檔案",

  convertedMany:
    "已轉換 {count} 個檔案",

  selectedOne:
    "{count} 個檔案",

  selectedMany:
    "{count} 個檔案",

  resultReady:
    "檔案轉換完成",

  convertingFile:
    "正在轉換 {current}/{total}: {name}",

  convertedFile:
    "{name} 轉換成功",

  maxFiles:
    "最多允許 {count} 個檔案",

  fileTooLarge:
    "{name}: 檔案太大",

  unsupportedFile:
    "{name}: 不支援此檔案類型",

  converterNotFound:
    "找不到轉換器",

  converterUnavailable:
    "此轉換器目前尚未提供",

  pleaseSelectFile:
    "請至少選擇一個檔案",

  canvasUnavailable:
    "目前瀏覽器不支援 Canvas",

  imageOpenFailed:
    "無法開啟圖片",

  outputFailed:
    "無法建立輸出檔案",

  pdfNotFound:
    "找不到 PDF.js",

  pdfLibNotFound:
    "找不到 pdf-lib",

  jsZipNotFound:
    "找不到 JSZip",

  xlsxNotFound:
    "找不到 SheetJS XLSX",

  mammothNotFound:
    "找不到 Mammoth",

  csvEmpty:
    "CSV 沒有資料",

  jsonInvalid:
    "JSON 檔案無效",

  jsonEmpty:
    "JSON 沒有資料",

  jsonObjectRequired:
    "JSON 中沒有物件資料",

  xmlEmpty:
    "XML 沒有資料",

  xmlInvalid:
    "XML 格式無效",

  xmlRootMissing:
    "找不到 XML 根元素",

  yamlEmpty:
    "YAML 沒有資料",

  svgEmpty:
    "SVG 檔案是空的",

  docxTextMissing:
    "DOCX 中沒有找到文字",

  pptxSlideMissing:
    "PPTX 中沒有找到投影片",

  pdfCanvasFailed:
    "無法建立 PDF Canvas",

  pdfTextFailed:
    "無法擷取 PDF 文字",

  conversionFailed:
    "轉換失敗",

  done:
    "完成"
}

};

function interpolate(
text,
values
) {

if (
  typeof text !==
  "string"
) {

  return String(
    text ?? ""
  );

}


if (
  !values ||
  typeof values !==
    "object"
) {

  return text;

}


return text.replace(
  /\{([^}]+)\}/g,
  (
    full,
    key
  ) => {

    const clean =
      String(
        key
      ).trim();


    if (
      Object.prototype.hasOwnProperty.call(
        values,
        clean
      )
    ) {

      return String(
        values[clean]
      );

    }


    return full;

  }
);

}

function localTranslate(
key,
values
) {

const language =
  getLanguage();


const dictionary =
  UI_TRANSLATIONS[
    language
  ] ||
  UI_TRANSLATIONS.en;


const value =
  dictionary[
    key
  ] ??
  UI_TRANSLATIONS.en[
    key
  ] ??
  key;


return interpolate(
  value,
  values
);

}

/*

* ใช้ I18n เมื่อมี key จริง
* แต่ไม่ปล่อยให้ unknown-key ของ i18n
* แสดงข้อความแบบ "Search Placeholder"
  */
  function t(
  key,
  values
  ) {

if (

  I18n &&
  typeof I18n.hasEffective ===
    "function" &&
  I18n.hasEffective(
    `converter.${key}`
  )
) {

  return I18n.t(
    `converter.${key}`,
    values
  );

}


return localTranslate(
  key,
  values
);

}

function tKey(
fullKey,
fallbackKey,
values
) {

if (
  I18n &&
  typeof I18n.hasEffective ===
    "function" &&
  I18n.hasEffective(
    fullKey
  )
) {

  return I18n.t(
    fullKey,
    values
  );

}


return localTranslate(
  fallbackKey,
  values
);

}

/* ============================================================
DOM
============================================================ */

const searchInput =
document.getElementById(
"converter-search"
);

const clearSearchButton =
document.getElementById(
"clear-search"
);

const searchResultInfo =
document.getElementById(
"search-result-info"
);

const filterButtons =
Array.from(
document.querySelectorAll(
".filter-button"
)
);

const converterCards =
Array.from(
document.querySelectorAll(
".converter-card"
)
);

const categorySections =
Array.from(
document.querySelectorAll(
".converter-category"
)
);

const emptyState =
document.getElementById(
"empty-state"
);

const resetSearchButton =
document.getElementById(
"reset-search"
);

const modal =
document.getElementById(
"converter-modal"
);

const modalTitle =
document.getElementById(
"modal-title"
);

const modalDescription =
document.getElementById(
"modal-description"
);

const modalCategory =
document.getElementById(
"modal-category"
);

const modalClose =
document.getElementById(
"modal-close"
);

const modalCancel =
document.getElementById(
"modal-cancel"
);

const dropZone =
document.getElementById(
"drop-zone"
);

const browseFilesButton =
document.getElementById(
"browse-files"
);

const fileInput =
document.getElementById(
"file-input"
);

const supportedFormats =
document.getElementById(
"supported-formats"
);

const fileListSection =
document.getElementById(
"file-list-section"
);

const fileList =
document.getElementById(
"file-list"
);

const fileCount =
document.getElementById(
"file-count"
);

const clearFilesButton =
document.getElementById(
"clear-files"
);

const progressSection =
document.getElementById(
"progress-section"
);

const progressBar =
document.getElementById(
"progress-bar"
);

const progressPercent =
document.getElementById(
"progress-percent"
);

const progressStatus =
document.getElementById(
"progress-status"
);

const resultSection =
document.getElementById(
"result-section"
);

const resultSummary =
document.getElementById(
"result-summary"
);

const resultList =
document.getElementById(
"result-list"
);

const errorMessage =
document.getElementById(
"error-message"
);

const errorText =
document.getElementById(
"error-text"
);

const convertButton =
document.getElementById(
"convert-button"
);

/* ============================================================
SAFETY
============================================================ */

const requiredElements = [

searchInput,
clearSearchButton,
searchResultInfo,
emptyState,
resetSearchButton,

modal,
modalTitle,
modalDescription,
modalCategory,
modalClose,
modalCancel,

dropZone,
browseFilesButton,
fileInput,
supportedFormats,

fileListSection,
fileList,
fileCount,
clearFilesButton,

progressSection,
progressBar,
progressPercent,
progressStatus,

resultSection,
resultSummary,
resultList,

errorMessage,
errorText,

convertButton

];

if (
requiredElements.some(
element =>
!element
)
) {

console.error(
  "[File Converter] Missing required DOM element."
);

return;

}

/* ============================================================
STATE
============================================================ */

let activeConverterId =
null;

let activeConverter =
null;

let selectedFiles =
[];

let convertedResults =
[];

let activeFilter =
"all";

let isConverting =
false;

let previousBodyOverflow =
"";

let previousActiveElement =
null;

/* ============================================================
CONFIG
============================================================ */

const MAX_FILES =
50;

const MAX_FILE_SIZE =
100 * 1024 * 1024;

const JPEG_QUALITY =
0.92;

const WEBP_QUALITY =
0.90;

const CDN = {

pdfJs:
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",

pdfWorker:
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",

pdfLib:
  "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",

jsZip:
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",

xlsx:
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",

mammoth:
  "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js"

};

/* ============================================================
LIBRARY PROMISE CACHE
============================================================ */

let pdfJsPromise =
null;

let pdfLibPromise =
null;

let jsZipPromise =
null;

let xlsxPromise =
null;

let mammothPromise =
null;

/* ============================================================
HELPERS
============================================================ */

function safeString(
value
) {

return String(
  value ?? ""
).trim();
}

function normalize(
value
) {

return safeString(
  value
).toLowerCase();

}

function escapeHtml(
value
) {

return safeString(
  value
)
  .replaceAll(
    "&",
    "&amp;"
  )
  .replaceAll(
    "<",
    "&lt;"
  )
  .replaceAll(
    ">",
    "&gt;"
  )
  .replaceAll(
    '"',
    "&quot;"
  )
  .replaceAll(
    "'",
    "&#039;"
  );

}

function getExtension(
fileName
) {

const name =
  safeString(
    fileName
  );


const index =
  name.lastIndexOf(
    "."
  );


if (
  index === -1
) {

  return "";

}


return name
  .slice(
    index + 1
  )
  .toLowerCase();

}

function removeExtension(
fileName
) {

const name =
  safeString(
    fileName
  );


const index =
  name.lastIndexOf(
    "."
  );


if (
  index <= 0
) {

  return name;

}


return name.slice(
  0,
  index
);

}

function formatBytes(
bytes
) {

const value =
  Number(
    bytes
  ) || 0;


if (
  value < 1024
) {

  return `${value} B`;

}


if (
  value < 1024 * 1024
) {

  return `${(
    value / 1024
  ).toFixed(1)} KB`;

}


if (
  value <
  1024 * 1024 * 1024
) {

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} MB`;

}


return `${(
  value /
  (1024 * 1024 * 1024)
).toFixed(2)} GB`;

}

function wait(
ms
) {

return new Promise(
  resolve =>
    setTimeout(
      resolve,
      ms
    )
);

}

function nextFrame() {

return new Promise(
  resolve =>
    requestAnimationFrame(
      resolve
    )
);

}

function getErrorMessage(
error
) {

if (
  error instanceof Error
) {

  return (
    error.message ||
    t(
      "errorDefault"
    )
  );

}


return (
  safeString(
    error
  ) ||
  t(
    "errorDefault"
  )
);

}

/* ============================================================
CONVERTER TRANSLATION META
============================================================ */

const CONVERTER_I18N = {

"jpg-png": {
  title:
    "JPG → PNG",
  description:
    "แปลง JPG / JPEG เป็น PNG",
  titleKey:
    "descJpgPng",
  category:
    "image"
},

"png-jpg": {
  title:
    "PNG → JPG",
  description:
    "แปลง PNG เป็น JPG",
  titleKey:
    "descPngJpg",
  category:
    "image"
},

"jpg-webp": {
  title:
    "JPG → WebP",
  description:
    "แปลง JPG / JPEG เป็น WebP",
  titleKey:
    "descJpgWebp",
  category:
    "image"
},

"png-webp": {
  title:
    "PNG → WebP",
  description:
    "แปลง PNG เป็น WebP",
  titleKey:
    "descPngWebp",
  category:
    "image"
},

"webp-jpg": {
  title:
    "WebP → JPG",
  description:
    "แปลง WebP เป็น JPG",
  titleKey:
    "descWebpJpg",
  category:
    "image"
},

"webp-png": {
  title:
    "WebP → PNG",
  description:
    "แปลง WebP เป็น PNG",
  titleKey:
    "descWebpPng",
  category:
    "image"
},

"svg-png": {
  title:
    "SVG → PNG",
  description:
    "แปลง SVG เป็น PNG",
  titleKey:
    "descSvgPng",
  category:
    "image"
},

"bmp-png": {
  title:
    "BMP → PNG",
  description:
    "แปลง BMP เป็น PNG",
  titleKey:
    "descBmpPng",
  category:
    "image"
},

"gif-png": {
  title:
    "GIF → PNG",
  description:
    "แปลง GIF เป็น PNG",
  titleKey:
    "descGifPng",
  category:
    "image"
},

"image-ico": {
  title:
    "Image → ICO",
  description:
    "สร้างไฟล์ ICO / Favicon",
  titleKey:
    "descImageIco",
  category:
    "image"
},

"jpg-pdf": {
  title:
    "JPG → PDF",
  description:
    "แปลง JPG / JPEG เป็น PDF",
  titleKey:
    "descJpgPdf",
  category:
    "pdf"
},

"png-pdf": {
  title:
    "PNG → PDF",
  description:
    "แปลง PNG เป็น PDF",
  titleKey:
    "descPngPdf",
  category:
    "pdf"
},

"image-pdf": {
  title:
    "Image → PDF",
  description:
    "รวมรูปภาพเป็น PDF",
  titleKey:
    "descImagePdf",
  category:
    "pdf"
},

"pdf-jpg": {
  title:
    "PDF → JPG",
  description:
    "แปลง PDF ทุกหน้าเป็น JPG ZIP",
  titleKey:
    "descPdfJpg",
  category:
    "pdf"
},

"pdf-png": {
  title:
    "PDF → PNG",
  description:
    "แปลง PDF ทุกหน้าเป็น PNG ZIP",
  titleKey:
    "descPdfPng",
  category:
    "pdf"
},

"pdf-txt": {
  title:
    "PDF → TXT",
  description:
    "ดึงข้อความจาก PDF",
  titleKey:
    "descPdfTxt",
  category:
    "pdf"
},

"pdf-text": {
  title:
    "PDF → Text",
  description:
    "Extract ข้อความจาก PDF",
  titleKey:
    "descPdfText",
  category:
    "pdf"
},

"pdf-images": {
  title:
    "PDF → Images",
  description:
    "แยกทุกหน้า PDF เป็น JPG ZIP",
  titleKey:
    "descPdfImages",
  category:
    "pdf"
},

"csv-json": {
  title:
    "CSV → JSON",
  description:
    "แปลง CSV เป็น JSON",
  titleKey:
    "descCsvJson",
  category:
    "data"
},

"json-csv": {
  title:
    "JSON → CSV",
  description:
    "แปลง JSON เป็น CSV",
  titleKey:
    "descJsonCsv",
  category:
    "data"
},

"json-xml": {
  title:
    "JSON → XML",
  description:
    "แปลง JSON เป็น XML",
  titleKey:
    "descJsonXml",
  category:
    "data"
},

"xml-json": {
  title:
    "XML → JSON",
  description:
    "แปลง XML เป็น JSON",
  titleKey:
    "descXmlJson",
  category:
    "data"
},

"yaml-json": {
  title:
    "YAML → JSON",
  description:
    "แปลง YAML เป็น JSON",
  titleKey:
    "descYamlJson",
  category:
    "data"
},

"json-yaml": {
  title:
    "JSON → YAML",
  description:
    "แปลง JSON เป็น YAML",
  titleKey:
    "descJsonYaml",
  category:
    "data"
},

"txt-html": {
  title:
    "TXT → HTML",
  description:
    "แปลง Text เป็น HTML",
  titleKey:
    "descTxtHtml",
  category:
    "text"
},

"html-txt": {
  title:
    "HTML → TXT",
  description:
    "ดึงข้อความจาก HTML",
  titleKey:
    "descHtmlTxt",
  category:
    "text"
},

"txt-pdf": {
  title:
    "TXT → PDF",
  description:
    "แปลง Text เป็น PDF",
  titleKey:
    "descTxtPdf",
  category:
    "text"
},

"html-pdf": {
  title:
    "HTML → PDF",
  description:
    "แปลง HTML เป็น PDF",
  titleKey:
    "descHtmlPdf",
  category:
    "document"
},

"md-html": {
  title:
    "Markdown → HTML",
  description:
    "แปลง Markdown เป็น HTML",
  titleKey:
    "descMdHtml",
  category:
    "text"
},

"csv-xlsx": {
  title:
    "CSV → XLSX",
  description:
    "แปลง CSV เป็น Excel",
  titleKey:
    "descCsvXlsx",
  category:
    "spreadsheet"
},

"xlsx-csv": {
  title:
    "XLSX → CSV",
  description:
    "แปลง Excel เป็น CSV",
  titleKey:
    "descXlsxCsv",
  category:
    "spreadsheet"
},

"json-xlsx": {
  title:
    "JSON → XLSX",
  description:
    "แปลง JSON เป็น Excel",
  titleKey:
    "descJsonXlsx",
  category:
    "spreadsheet"
},

"xlsx-pdf": {
  title:
    "XLSX → PDF",
  description:
    "แปลง Excel เป็น PDF",
  titleKey:
    "descXlsxPdf",
  category:
    "document"
},

"docx-pdf": {
  title:
    "DOCX → PDF",
  description:
    "แปลง Word เป็น PDF",
  titleKey:
    "descDocxPdf",
  category:
    "document"
},

"pptx-pdf": {
  title:
    "PPTX → PDF",
  description:
    "แปลง PowerPoint เป็น PDF",
  titleKey:
    "descPptxPdf",
  category:
    "document"
}

};

const DYNAMIC_CONVERTER_TRANSLATIONS = {

en: {

  descJpgPng:
    "Convert JPG to PNG",

  descPngJpg:
    "Convert PNG to JPG",

  descJpgWebp:
    "Convert JPG to WebP",

  descPngWebp:
    "Convert PNG to WebP",

  descWebpJpg:
    "Convert WebP to JPG",

  descWebpPng:
    "Convert WebP to PNG",

  descSvgPng:
    "Convert SVG to PNG",

  descBmpPng:
    "Convert BMP to PNG",

  descGifPng:
    "Convert GIF to PNG",

  descImageIco:
    "Create an ICO / Favicon file",

  descJpgPdf:
    "Convert JPG to PDF",

  descPngPdf:
    "Convert PNG to PDF",

  descImagePdf:
    "Combine images into a PDF",

  descPdfJpg:
    "Convert PDF pages to JPG files",

  descPdfPng:
    "Convert PDF pages to PNG files",

  descPdfTxt:
    "Extract text from PDF",

  descPdfText:
    "Extract text from PDF",

  descPdfImages:
    "Export PDF pages as images",

  descCsvJson:
    "Convert CSV to JSON",

  descJsonCsv:
    "Convert JSON to CSV",

  descJsonXml:
    "Convert JSON to XML",

  descXmlJson:
    "Convert XML to JSON",

  descYamlJson:
    "Convert YAML to JSON",

  descJsonYaml:
    "Convert JSON to YAML",

  descTxtHtml:
    "Convert text to HTML",

  descHtmlTxt:
    "Extract text from HTML",

  descTxtPdf:
    "Convert text to PDF",

  descHtmlPdf:
    "Convert HTML to PDF",

  descMdHtml:
    "Convert Markdown to HTML",

  descCsvXlsx:
    "Convert CSV to Excel",

  descXlsxCsv:
    "Convert Excel to CSV",

  descJsonXlsx:
    "Convert JSON to Excel",

  descXlsxPdf:
    "Convert Excel to PDF",

  descDocxPdf:
    "Convert Word to PDF",

  descPptxPdf:
    "Convert PowerPoint to PDF"
},


th: {

  descJpgPng:
    "แปลง JPG เป็น PNG",

  descPngJpg:
    "แปลง PNG เป็น JPG",

  descJpgWebp:
    "แปลง JPG เป็น WebP",

  descPngWebp:
    "แปลง PNG เป็น WebP",

  descWebpJpg:
    "แปลง WebP เป็น JPG",

  descWebpPng:
    "แปลง WebP เป็น PNG",

  descSvgPng:
    "แปลง SVG เป็น PNG",

  descBmpPng:
    "แปลง BMP เป็น PNG",

  descGifPng:
    "แปลง GIF เป็น PNG",

  descImageIco:
    "สร้างไฟล์ ICO / Favicon",

  descJpgPdf:
    "แปลง JPG เป็น PDF",

  descPngPdf:
    "แปลง PNG เป็น PDF",

  descImagePdf:
    "รวมรูปภาพเป็น PDF",

  descPdfJpg:
    "แปลงทุกหน้า PDF เป็นรูป JPG",

  descPdfPng:
    "แปลงทุกหน้า PDF เป็นรูป PNG",

  descPdfTxt:
    "ดึงข้อความจาก PDF",

  descPdfText:
    "ดึงข้อความจาก PDF",

  descPdfImages:
    "แยกหน้า PDF เป็นรูปภาพ",

  descCsvJson:
    "แปลง CSV เป็น JSON",

  descJsonCsv:
    "แปลง JSON เป็น CSV",

  descJsonXml:
    "แปลง JSON เป็น XML",

  descXmlJson:
    "แปลง XML เป็น JSON",

  descYamlJson:
    "แปลง YAML เป็น JSON",

  descJsonYaml:
    "แปลง JSON เป็น YAML",

  descTxtHtml:
    "แปลง Text เป็น HTML",

  descHtmlTxt:
    "ดึงข้อความจาก HTML",

  descTxtPdf:
    "แปลง Text เป็น PDF",

  descHtmlPdf:
    "แปลง HTML เป็น PDF",

  descMdHtml:
    "แปลง Markdown เป็น HTML",

  descCsvXlsx:
    "แปลง CSV เป็น Excel",

  descXlsxCsv:
    "แปลง Excel เป็น CSV",

  descJsonXlsx:
    "แปลง JSON เป็น Excel",

  descXlsxPdf:
    "แปลง Excel เป็น PDF",

  descDocxPdf:
    "แปลง Word เป็น PDF",

  descPptxPdf:
    "แปลง PowerPoint เป็น PDF"
},


ja: {},

ko: {},

"zh-CN": {},

"zh-TW": {}

};

/*

* เติมภาษาอื่นจาก English อัตโนมัติ
* เพื่อไม่ให้ description กลายเป็น key
  */
  [
  "ja",
  "ko",
  "zh-CN",
  "zh-TW"
  ].forEach(
  language => {

  DYNAMIC_CONVERTER_TRANSLATIONS[
  language
  ] =
  {
  ...DYNAMIC_CONVERTER_TRANSLATIONS.en,
  ...(
  DYNAMIC_CONVERTER_TRANSLATIONS[
  language
  ] || {}
  )
  };

}

);

function getConverterText(
converterId,
type
) {

const meta =
  CONVERTER_I18N[
    converterId
  ];


if (
  !meta
) {

  return "";

}


if (
  type ===
  "title"
) {

  return meta.title;

}


if (
  type ===
  "description"
) {

  const language =
    getLanguage();


  const dict =
    DYNAMIC_CONVERTER_TRANSLATIONS[
      language
    ] ||
    DYNAMIC_CONVERTER_TRANSLATIONS.en;


  return (
    dict[
      meta.titleKey
    ] ||
    meta.description
  );

}


return "";

}

function translateStaticConverterHtml() {

const nodes =
  document.querySelectorAll(
    "[data-i18n], " +
    "[data-i18n-placeholder], " +
    "[data-i18n-title], " +
    "[data-i18n-aria-label]"
  );


if (
  I18n &&
  typeof I18n.applyTranslations ===
    "function"
) {

  I18n.applyTranslations(
    document
  );

}


/*
 * Fallback / override เฉพาะ converter namespace
 */
nodes.forEach(
  element => {

    const key =
      element.getAttribute(
        "data-i18n"
      );


    if (
      !key
    ) {

      return;

    }


    if (
      key.startsWith(
        "converter."
      )
    ) {

      const shortKey =
        key.replace(
          /^converter\./,
          ""
        );


      element.textContent =
        t(
          shortKey
        );

    }

  }
);


document
  .querySelectorAll(
    "[data-i18n-placeholder]"
  )
  .forEach(
    element => {

      const key =
        element.getAttribute(
          "data-i18n-placeholder"
        );


      if (
        key &&
        key.startsWith(
          "converter."
        )
      ) {

        element.placeholder =
          t(
            key.replace(
              /^converter\./,
              ""
            )
          );

      }

    }
  );


document
  .querySelectorAll(
    "[data-i18n-aria-label]"
  )
  .forEach(
    element => {

      const key =
        element.getAttribute(
          "data-i18n-aria-label"
        );


      if (
        key &&
        key.startsWith(
          "converter."
        )
      ) {

        element.setAttribute(
          "aria-label",
          t(
            key.replace(
              /^converter\./,
              ""
            )
          )
        );

      }

    }
  );

}

/* ============================================================
DYNAMIC SCRIPT LOADER
============================================================ */

function loadScript(
src,
test
) {

if (
  typeof test === "function" &&
  test()
) {

  return Promise.resolve();

}


const existing =
  Array.from(
    document.scripts
  ).find(
    script =>
      script.dataset &&
      script.dataset.kitScript ===
        src
  );


if (
  existing
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      if (
        typeof test === "function" &&
        test()
      ) {

        resolve();

        return;

      }


      existing.addEventListener(
        "load",
        () => {

          if (
            typeof test ===
            "function" &&
            !test()
          ) {

            reject(
              new Error(
                `โหลด library ไม่สำเร็จ: ${src}`
              )
            );

            return;

          }

          resolve();

        },
        {
          once:
            true
        }
      );


      existing.addEventListener(
        "error",
        () =>
          reject(
            new Error(
              `โหลด library ไม่สำเร็จ: ${src}`
            )
          ),
        {
          once:
            true
        }
      );

    }
  );

}


return new Promise(
  (
    resolve,
    reject
  ) => {

    const script =
      document.createElement(
        "script"
      );


    script.src =
      src;


    script.async =
      true;


    script.dataset.kitScript =
      src;


    script.onload =
      () => {

        if (
          typeof test === "function" &&
          !test()
        ) {

          reject(
            new Error(
              `โหลด library ไม่สำเร็จ: ${src}`
            )
          );

          return;

        }

        resolve();

      };


    script.onerror =
      () =>
        reject(
          new Error(
            `โหลด library ไม่สำเร็จ: ${src}`
          )
        );


    document.head.appendChild(
      script
    );

  }
);

}

/* ============================================================
ENSURE PDF.JS
============================================================ */

function ensurePdfJs() {

if (
  window.pdfjsLib
) {

  try {

    window.pdfjsLib
      .GlobalWorkerOptions
      .workerSrc =
      CDN.pdfWorker;

  } catch {

    /* ignore */

  }


  return Promise.resolve(
    window.pdfjsLib
  );

}


if (
  pdfJsPromise
) {

  return pdfJsPromise;

}


pdfJsPromise =
  loadScript(
    CDN.pdfJs,
    () =>
      Boolean(
        window.pdfjsLib
      )
  )
  .then(
    () => {

      if (
        !window.pdfjsLib
      ) {

        throw new Error(
          t(
            "pdfNotFound"
          )
        );

      }


      window.pdfjsLib
        .GlobalWorkerOptions
        .workerSrc =
        CDN.pdfWorker;


      return window.pdfjsLib;

    }
  )
  .catch(
    error => {

      pdfJsPromise =
        null;

      throw error;

    }
  );


return pdfJsPromise;

}

/* ============================================================
ENSURE PDF-LIB
============================================================ */

function ensurePdfLib() {

if (
  window.PDFLib
) {

  return Promise.resolve(
    window.PDFLib
  );

}


if (
  pdfLibPromise
) {

  return pdfLibPromise;

}


pdfLibPromise =
  loadScript(
    CDN.pdfLib,
    () =>
      Boolean(
        window.PDFLib
      )
  )
  .then(
    () => {

      if (
        !window.PDFLib
      ) {

        throw new Error(
          t(
            "pdfLibNotFound"
          )
        );

      }


      return window.PDFLib;

    }
  )
  .catch(
    error => {

      pdfLibPromise =
        null;

      throw error;

    }
  );


return pdfLibPromise;

}

/* ============================================================
ENSURE JSZIP
============================================================ */

function ensureJsZip() {

if (
  window.JSZip
) {

  return Promise.resolve(
    window.JSZip
  );

}


if (
  jsZipPromise
) {

  return jsZipPromise;

}


jsZipPromise =
  loadScript(
    CDN.jsZip,
    () =>
      Boolean(
        window.JSZip
      )
  )
  .then(
    () => {

      if (
        !window.JSZip
      ) {

        throw new Error(
          t(
            "jsZipNotFound"
          )
        );

      }


      return window.JSZip;

    }
  )
  .catch(
    error => {

      jsZipPromise =
        null;

      throw error;

    }
  );


return jsZipPromise;

}

/* ============================================================
ENSURE XLSX
============================================================ */

function ensureXlsx() {

if (
  window.XLSX
) {

  return Promise.resolve(
    window.XLSX
  );

}


if (
  xlsxPromise
) {

  return xlsxPromise;

}


xlsxPromise =
  loadScript(
    CDN.xlsx,
    () =>
      Boolean(
        window.XLSX
      )
  )
  .then(
    () => {

      if (
        !window.XLSX
      ) {

        throw new Error(
          t(
            "xlsxNotFound"
          )
        );

      }


      return window.XLSX;

    }
  )
  .catch(
    error => {

      xlsxPromise =
        null;

      throw error;

    }
  );


return xlsxPromise;

}

/* ============================================================
ENSURE MAMMOTH
============================================================ */

function ensureMammoth() {

if (
  window.mammoth
) {

  return Promise.resolve(
    window.mammoth
  );

}


if (
  mammothPromise
) {

  return mammothPromise;

}


mammothPromise =
  loadScript(
    CDN.mammoth,
    () =>
      Boolean(
        window.mammoth
      )
  )
  .then(
    () => {

      if (
        !window.mammoth
      ) {

        throw new Error(
          t(
            "mammothNotFound"
          )
        );

      }


      return window.mammoth;

    }
  )
  .catch(
    error => {

      mammothPromise =
        null;

      throw error;

    }
  );


return mammothPromise;

}

/* ============================================================
RESULT
============================================================ */

function createResult(
originalFile,
blob,
extension
) {

if (
  !(blob instanceof Blob)
) {

  throw new Error(
    t(
      "outputFailed"
    )
  );

}


const cleanExtension =
  safeString(
    extension
  )
  .replace(
    /^\./,
    ""
  );


const baseName =
  removeExtension(
    originalFile.name
  );


const outputName =
  `${baseName}.${cleanExtension}`;


const url =
  URL.createObjectURL(
    blob
  );


return {

  name:
    outputName,

  blob,

  url,

  extension:
    cleanExtension

};
}

/* ============================================================
IMAGE
============================================================ */

function loadImage(
blob
) {

return new Promise(
  (
    resolve,
    reject
  ) => {

    const url =
      URL.createObjectURL(
        blob
      );


    const image =
      new Image();


    image.onload =
      () => {

        URL.revokeObjectURL(
          url
        );


        resolve(
          image
        );

      };


    image.onerror =
      () => {

        URL.revokeObjectURL(
          url
        );


        reject(
          new Error(
            t(
              "imageOpenFailed"
            )
          )
        );

      };


    image.src =
      url;

  }
);

}

function canvasToBlob(
canvas,
type,
quality
) {

return new Promise(
  (
    resolve,
    reject
  ) => {

    canvas.toBlob(
      blob => {

        if (
          !blob
        ) {

          reject(
            new Error(
              t(
                "outputFailed"
              )
            )
          );

          return;

        }


        resolve(
          blob
        );

      },
      type,
      quality
    );

  }
);

}

async function convertImage(
file,
converter
) {

const image =
  await loadImage(
    file
  );


const width =
  image.naturalWidth ||
  image.width;


const height =
  image.naturalHeight ||
  image.height;


const canvas =
  document.createElement(
    "canvas"
  );


canvas.width =
  width;


canvas.height =
  height;


const ctx =
  canvas.getContext(
    "2d"
  );


if (
  !ctx
) {

  throw new Error(
    t(
      "canvasUnavailable"
    )
  );

}


if (
  converter.outputMime ===
  "image/jpeg"
) {

  ctx.fillStyle =
    "#ffffff";


  ctx.fillRect(
    0,
    0,
    width,
    height
  );

}


ctx.drawImage(
  image,
  0,
  0
);


const quality =
  converter.outputMime ===
  "image/jpeg"
    ? JPEG_QUALITY
    : converter.outputMime ===
      "image/webp"
      ? WEBP_QUALITY
      : undefined;


const blob =
  await canvasToBlob(
    canvas,
    converter.outputMime,
    quality
  );


return createResult(
  file,
  blob,
  converter.outputExtension
);

}

/* ============================================================
SVG -> PNG
============================================================ */

async function convertSvgToPng(
file,
converter
) {

const source =
  await file.text();


if (
  !source.trim()
) {

  throw new Error(
    t(
      "svgEmpty"
    )
  );

}


const svgBlob =
  new Blob(
    [source],
    {
      type:
        "image/svg+xml"
    }
  );


const image =
  await loadImage(
    svgBlob
  );


const width =
  image.naturalWidth ||
  image.width ||
  1024;


const height =
  image.naturalHeight ||
  image.height ||
  1024;


const canvas =
  document.createElement(
    "canvas"
  );


canvas.width =
  Math.ceil(
    width
  );


canvas.height =
  Math.ceil(
    height
  );


const ctx =
  canvas.getContext(
    "2d"
  );


if (
  !ctx
) {

  throw new Error(
    t(
      "canvasUnavailable"
    )
  );

}


ctx.clearRect(
  0,
  0,
  canvas.width,
  canvas.height
);


ctx.drawImage(
  image,
  0,
  0,
  canvas.width,
  canvas.height
);


const blob =
  await canvasToBlob(
    canvas,
    "image/png"
  );


return createResult(
  file,
  blob,
  converter.outputExtension
);

}

/* ============================================================
IMAGE -> ICO
============================================================ */

async function convertImageToIco(
file,
converter
) {

const image =
  await loadImage(
    file
  );


const size =
  256;


const sourceWidth =
  image.naturalWidth ||
  image.width;


const sourceHeight =
  image.naturalHeight ||
  image.height;


const scale =
  Math.min(
    size / sourceWidth,
    size / sourceHeight
  );


const drawWidth =
  Math.max(
    1,
    Math.round(
      sourceWidth * scale
    )
  );


const drawHeight =
  Math.max(
    1,
    Math.round(
      sourceHeight * scale
    )
  );


const canvas =
  document.createElement(
    "canvas"
  );


canvas.width =
  size;


canvas.height =
  size;


const ctx =
  canvas.getContext(
    "2d"
  );


if (
  !ctx
) {

  throw new Error(
    t(
      "canvasUnavailable"
    )
  );

}


ctx.clearRect(
  0,
  0,
  size,
  size
);


ctx.drawImage(
  image,
  Math.round(
    (size - drawWidth) / 2
  ),
  Math.round(
    (size - drawHeight) / 2
  ),
  drawWidth,
  drawHeight
);


const pngBlob =
  await canvasToBlob(
    canvas,
    "image/png"
  );


const pngBytes =
  new Uint8Array(
    await pngBlob.arrayBuffer()
  );


const offset =
  6 + 16;


const buffer =
  new ArrayBuffer(
    offset +
    pngBytes.length
  );


const view =
  new DataView(
    buffer
  );


view.setUint16(
  0,
  0,
  true
);


view.setUint16(
  2,
  1,
  true
);


view.setUint16(
  4,
  1,
  true
);


view.setUint8(
  6,
  0
);


view.setUint8(
  7,
  0
);


view.setUint8(
  8,
  0
);


view.setUint8(
  9,
  0
);


view.setUint16(
  10,
  1,
  true
);


view.setUint16(
  12,
  32,
  true
);


view.setUint32(
  14,
  pngBytes.length,
  true
);


view.setUint32(
  18,
  offset,
  true
);


new Uint8Array(
  buffer
).set(
  pngBytes,
  offset
);


const blob =
  new Blob(
    [buffer],
    {
      type:
        converter.outputMime
    }
  );


return createResult(
  file,
  blob,
  converter.outputExtension
);

}

/* ============================================================
IMAGE -> PDF
============================================================ */

async function convertImageToPdf(
file,
converter
) {

const PDFLib =
  await ensurePdfLib();


const pdfDoc =
  await PDFLib.PDFDocument.create();


const extension =
  getExtension(
    file.name
  );


let image;


if (
  extension === "png"
) {

  image =
    await pdfDoc.embedPng(
      await file.arrayBuffer()
    );

} else {

  const source =
    await loadImage(
      file
    );


  const width =
    source.naturalWidth ||
    source.width;


  const height =
    source.naturalHeight ||
    source.height;


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    width;


  canvas.height =
    height;


  const ctx =
    canvas.getContext(
      "2d"
    );


  if (
    !ctx
  ) {

    throw new Error(
      t(
        "canvasUnavailable"
      )
    );

  }


  ctx.fillStyle =
    "#ffffff";


  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  ctx.drawImage(
    source,
    0,
    0
  );


  const jpg =
    await canvasToBlob(
      canvas,
      "image/jpeg",
      0.94
    );


  image =
    await pdfDoc.embedJpg(
      await jpg.arrayBuffer()
    );

}


const pageWidth =
  595.28;


const pageHeight =
  841.89;


const margin =
  28.35;


const imgWidth =
  image.width;


const imgHeight =
  image.height;


const scale =
  Math.min(
    (
      pageWidth -
      margin * 2
    ) / imgWidth,
    (
      pageHeight -
      margin * 2
    ) / imgHeight
  );


const drawWidth =
  imgWidth *
  scale;


const drawHeight =
  imgHeight *
  scale;


const x =
  (
    pageWidth -
    drawWidth
  ) / 2;


const y =
  (
    pageHeight -
    drawHeight
  ) / 2;


const page =
  pdfDoc.addPage(
    [
      pageWidth,
      pageHeight
    ]
  );


page.drawImage(
  image,
  {
    x,
    y,
    width:
      drawWidth,
    height:
      drawHeight
  }
);


const bytes =
  await pdfDoc.save();


return createResult(
  file,
  new Blob(
    [bytes],
    {
      type:
        "application/pdf"
    }
  ),
  converter.outputExtension
);

}

/* ============================================================
PDF RENDER
============================================================ */

async function renderPdfPages(
file,
scale = 1.5
) {

const pdfjsLib =
  await ensurePdfJs();


const buffer =
  await file.arrayBuffer();


const loadingTask =
  pdfjsLib.getDocument(
    {
      data:
        buffer
    }
  );


const pdf =
  await loadingTask.promise;


const pages =
  [];


for (
  let pageNumber = 1;
  pageNumber <= pdf.numPages;
  pageNumber++
) {

  const page =
    await pdf.getPage(
      pageNumber
    );


  const viewport =
    page.getViewport(
      {
        scale
      }
    );


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    Math.ceil(
      viewport.width
    );


  canvas.height =
    Math.ceil(
      viewport.height
    );


  const ctx =
    canvas.getContext(
      "2d",
      {
        alpha:
          false
      }
    );


  if (
    !ctx
  ) {

    throw new Error(
      t(
        "pdfCanvasFailed"
      )
    );

  }


  ctx.fillStyle =
    "#ffffff";


  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  await page
    .render(
      {
        canvasContext:
          ctx,
        viewport
      }
    )
    .promise;


  pages.push(
    {
      pageNumber,
      canvas
    }
  );

}


return pages;

}

/* ============================================================
PDF -> JPG ZIP
============================================================ */

async function convertPdfToJpgZip(
file,
converter
) {

const JSZip =
  await ensureJsZip();


const pages =
  await renderPdfPages(
    file,
    1.5
  );


const zip =
  new JSZip();


for (
  const page of pages
) {

  const blob =
    await canvasToBlob(
      page.canvas,
      "image/jpeg",
      0.92
    );


  zip.file(
    `${removeExtension(
      file.name
    )}_page-${String(
      page.pageNumber
    ).padStart(
      3,
      "0"
    )}.jpg`,
    blob
  );

}


const zipBlob =
  await zip.generateAsync(
    {
      type:
        "blob",
      compression:
        "DEFLATE",
      compressionOptions:
        {
          level:
            6
        }
    }
  );


return createResult(
  file,
  zipBlob,
  converter.outputExtension
);

}

/* ============================================================
PDF -> PNG ZIP
============================================================ */

async function convertPdfToPngZip(
file,
converter
) {

const JSZip =
  await ensureJsZip();


const pages =
  await renderPdfPages(
    file,
    1.5
  );


const zip =
  new JSZip();


for (
  const page of pages
) {

  const blob =
    await canvasToBlob(
      page.canvas,
      "image/png"
    );


  zip.file(
    `${removeExtension(
      file.name
    )}_page-${String(
      page.pageNumber
    ).padStart(
      3,
      "0"
    )}.png`,
    blob
  );

}


const zipBlob =
  await zip.generateAsync(
    {
      type:
        "blob",
      compression:
        "DEFLATE",
      compressionOptions:
        {
          level:
            6
        }
    }
  );


return createResult(
  file,
  zipBlob,
  converter.outputExtension
);

}

/* ============================================================
PDF -> TEXT
============================================================ */

async function convertPdfToText(
file,
converter
) {

const pdfjsLib =
  await ensurePdfJs();


const pdf =
  await pdfjsLib
    .getDocument(
      {
        data:
          await file.arrayBuffer()
      }
    )
    .promise;


const pages =
  [];


for (
  let pageNumber = 1;
  pageNumber <= pdf.numPages;
  pageNumber++
) {

  const page =
    await pdf.getPage(
      pageNumber
    );


  const content =
    await page.getTextContent();


  const items =
    Array.isArray(
      content.items
    )
      ? content.items
      : [];


  const lines =
    [];


  let currentLine =
    "";


  let lastY =
    null;


  for (
    const item of items
  ) {

    const text =
      safeString(
        item?.str
      );


    if (
      !text
    ) {

      continue;

    }


    const y =
      Array.isArray(
        item.transform
      )
        ? Number(
            item.transform[5]
          )
        : null;


    if (
      lastY !== null &&
      y !== null &&
      Math.abs(
        y - lastY
      ) > 4
    ) {

      if (
        currentLine
      ) {

        lines.push(
          currentLine
        );


        currentLine =
          "";

      }

    }


    if (
      currentLine
    ) {

      currentLine +=
        " ";

    }


    currentLine +=
      text;


    lastY =
      y;

  }


  if (
    currentLine
  ) {

    lines.push(
      currentLine
    );

  }


  pages.push(
    `===== PAGE ${pageNumber} =====\n${
      lines.join(
        "\n"
      )
    }`
  );

}


const output =
  pages.join(
    "\n\n"
  );


return createResult(
  file,
  new Blob(
    [output],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

/* ============================================================
CSV
============================================================ */

function parseCsv(
text
) {

const rows =
  [];


let row =
  [];


let cell =
  "";


let inQuotes =
  false;


for (
  let i = 0;
  i < text.length;
  i++
) {

  const char =
    text[i];


  const next =
    text[i + 1];


  if (
    char === '"'
  ) {

    if (
      inQuotes &&
      next === '"'
    ) {

      cell +=
        '"';


      i++;

    } else {

      inQuotes =
        !inQuotes;

    }


    continue;

  }


  if (
    char === "," &&
    !inQuotes
  ) {

    row.push(
      cell
    );


    cell =
      "";


    continue;

  }


  if (
    (
      char === "\n" ||
      char === "\r"
    ) &&
    !inQuotes
  ) {

    if (
      char === "\r" &&
      next === "\n"
    ) {

      i++;

    }


    row.push(
      cell
    );


    rows.push(
      row
    );


    row =
      [];


    cell =
      "";


    continue;

  }


  cell +=
    char;

}


if (
  cell.length > 0 ||
  row.length > 0
) {

  row.push(
    cell
  );


  rows.push(
    row
  );

}


return rows;

}

async function convertCsvToJson(
file,
converter
) {

const rows =
  parseCsv(
    await file.text()
  );


if (
  rows.length === 0
) {

  throw new Error(
    t(
      "csvEmpty"
    )
  );

}


const headers =
  rows[0].map(
    (
      value,
      index
    ) =>
      safeString(
        value
      ) ||
      `column_${index + 1}`
  );


const data =
  rows
    .slice(1)
    .filter(
      row =>
        row.some(
          value =>
            safeString(
              value
            ) !== ""
        )
    )
    .map(
      row => {

        const object =
          {};


        headers.forEach(
          (
            header,
            index
          ) => {

            object[
              header
            ] =
              row[index] ??
              "";

          }
        );


        return object;

      }
    );


const output =
  JSON.stringify(
    data,
    null,
    2
  );


return createResult(
  file,
  new Blob(
    [output],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

async function convertJsonToCsv(
file,
converter
) {

const data =
  parseJson(
    await file.text()
  );


const rows =
  Array.isArray(
    data
  )
    ? data
    : [data];


if (
  !rows.length
) {

  throw new Error(
    t(
      "jsonEmpty"
    )
  );

}


const headers =
  Array.from(
    new Set(
      rows.flatMap(
        item =>
          (
            item &&
            typeof item ===
              "object"
          )
            ? Object.keys(
                item
              )
            : []
      )
    )
  );


if (
  !headers.length
) {

  throw new Error(
    t(
      "jsonObjectRequired"
    )
  );

}


function escapeCsv(
  value
) {

  let text;


  if (
    value === null ||
    value === undefined
  ) {

    text =
      "";

  } else if (
    typeof value === "object"
  ) {

    text =
      JSON.stringify(
        value
      );

  } else {

    text =
      String(
        value
      );

  }


  if (
    /[",\n\r]/.test(
      text
    )
  ) {

    return `"${text.replaceAll(
      '"',
      '""'
    )}"`;

  }


  return text;

}


const lines =
  [];


lines.push(
  headers
    .map(
      escapeCsv
    )
    .join(
      ","
    )
);


rows.forEach(
  row => {

    lines.push(
      headers
        .map(
          header =>
            escapeCsv(
              row &&
              typeof row ===
                "object"
                ? row[header]
                : ""
            )
        )
        .join(
          ","
        )
    );

  }
);


const output =
  "\uFEFF" +
  lines.join(
    "\r\n"
  );


return createResult(
  file,
  new Blob(
    [output],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

function parseJson(
text
) {

try {

  return JSON.parse(
    text
  );

} catch {

  throw new Error(
    t(
      "jsonInvalid"
    )
  );

}

}

/* ============================================================
JSON -> XML
============================================================ */

async function convertJsonToXml(
file,
converter
) {

const data =
  parseJson(
    await file.text()
  );


const xml =
  jsonValueToXml(
    data,
    "root"
  );


const output =
  `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;


return createResult(
  file,
  new Blob(
    [output],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

function escapeXml(
value
) {

return String(
  value ?? ""
)
  .replaceAll(
    "&",
    "&amp;"
  )
  .replaceAll(
    "<",
    "&lt;"
  )
  .replaceAll(
    ">",
    "&gt;"
  )
  .replaceAll(
    '"',
    "&quot;"
  )
  .replaceAll(
    "'",
    "&apos;"
  );

}

function safeXmlName(
value
) {

let name =
  safeString(
    value
  )
  .replace(
    /[^A-Za-z0-9_.:-]+/g,
    "_"
  );


if (
  !name
) {

  name =
    "item";

}


if (
  /^[0-9]/.test(
    name
  )
) {

  name =
    `item_${name}`;

}


return name;

}

function jsonValueToXml(
value,
key
) {

const tag =
  safeXmlName(
    key
  );


if (
  value === null ||
  value === undefined
) {

  return `<${tag}></${tag}>`;

}


if (
  Array.isArray(
    value
  )
) {

  return value
    .map(
      item =>
        jsonValueToXml(
          item,
          "item"
        )
    )
    .join(
      ""
    );

}


if (
  typeof value !== "object"
) {

  return `<${tag}>${escapeXml(
    value
  )}</${tag}>`;

}


const children =
  Object.entries(
    value
  )
  .map(
    (
      [
        childKey,
        childValue
      ]
    ) =>
      jsonValueToXml(
        childValue,
        childKey
      )
  )
  .join(
    "\n"
  );


return [
  `<${tag}>`,
  children,
  `</${tag}>`
].join(
  "\n"
);

}

/* ============================================================
XML -> JSON
============================================================ */

async function convertXmlToJson(
file,
converter
) {

const source =
  await file.text();


if (
  !source.trim()
) {

  throw new Error(
    t(
      "xmlEmpty"
    )
  );

}


const parser =
  new DOMParser();


const xml =
  parser.parseFromString(
    source,
    "application/xml"
  );


if (
  xml.querySelector(
    "parsererror"
  )
) {

  throw new Error(
    t(
      "xmlInvalid"
    )
  );

}


const root =
  xml.documentElement;


if (
  !root
) {

  throw new Error(
    t(
      "xmlRootMissing"
    )
  );

}


const value =
  xmlElementToJson(
    root
  );


const output =
  JSON.stringify(
    {
      [root.nodeName]:
        value
    },
    null,
    2
  );


return createResult(
  file,
  new Blob(
    [output],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

function xmlElementToJson(
element
) {

const children =
  Array.from(
    element.children
  );


if (
  children.length === 0
) {

  return element.textContent ?? "";

}


const output =
  {};


if (
  element.attributes &&
  element.attributes.length
) {

  const attributes =
    {};


  Array.from(
    element.attributes
  ).forEach(
    attribute => {

      attributes[
        attribute.name
      ] =
        attribute.value;

    }
  );


  output._attributes =
    attributes;

}


children.forEach(
  child => {

    const key =
      child.nodeName;


    const value =
      xmlElementToJson(
        child
      );


    if (
      Object.prototype.hasOwnProperty.call(
        output,
        key
      )
    ) {

      if (
        !Array.isArray(
          output[key]
        )
      ) {

        output[key] =
          [
            output[key]
          ];

      }


      output[key].push(
        value
      );

    } else {

      output[key] =
        value;

    }

  }
);


return output;

}

/* ============================================================
YAML -> JSON
============================================================ */

async function convertYamlToJson(
file,
converter
) {

const source =
  await file.text();


if (
  !source.trim()
) {

  throw new Error(
    t(
      "yamlEmpty"
    )
  );

}


const data =
  parseSimpleYaml(
    source
  );


const output =
  JSON.stringify(
    data,
    null,
    2
  );


return createResult(
  file,
  new Blob(
    [output],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

function parseSimpleYaml(
text
) {

const lines =
  text.split(
    /\r?\n/
  );


const root =
  {};


const stack =
  [
    {
      indent:
        -1,

      value:
        root
    }
  ];


for (
  let index = 0;
  index < lines.length;
  index++
) {

  const raw =
    lines[index];


  if (
    !raw.trim()
  ) {

    continue;

  }


  if (
    /^\s*#/.test(
      raw
    )
  ) {

    continue;

  }


  const indent =
    raw.match(
      /^\s*/
    )[0].length;


  const line =
    raw.trim();


  while (
    stack.length > 1 &&
    indent <=
      stack[
        stack.length - 1
      ].indent
  ) {

    stack.pop();

  }


  const parent =
    stack[
      stack.length - 1
    ].value;


  if (
    line.startsWith(
      "- "
    )
  ) {

    if (
      Array.isArray(
        parent
      )
    ) {

      parent.push(
        parseYamlScalar(
          line.slice(
            2
          )
        )
      );

    }


    continue;

  }


  const colon =
    findYamlColon(
      line
    );


  if (
    colon < 0
  ) {

    continue;

  }


  const key =
    stripYamlQuotes(
      line.slice(
        0,
        colon
      ).trim()
    );


  const valueText =
    line.slice(
      colon + 1
    ).trim();


  if (
    valueText === ""
  ) {

    let child =
      {};


    const next =
      findNextYamlLine(
        lines,
        index + 1
      );


    if (
      next &&
      next.text.trim().startsWith(
        "- "
      )
    ) {

      child =
        [];

    }


    parent[key] =
      child;


    stack.push(
      {
        indent,
        value:
          child
      }
    );

  } else {

    parent[key] =
      parseYamlScalar(
        valueText
      );

  }

}


return root;

}

function findYamlColon(
line
) {

let quote =
  null;


for (
  let index = 0;
  index < line.length;
  index++
) {

  const char =
    line[index];


  if (
    char === '"' ||
    char === "'"
  ) {

    if (
      quote === char
    ) {

      quote =
        null;

    } else if (
      quote === null
    ) {

      quote =
        char;

    }

  }


  if (
    char === ":" &&
    quote === null
  ) {

    return index;

  }

}


return -1;

}

function findNextYamlLine(
lines,
start
) {

for (
  let index = start;
  index < lines.length;
  index++
) {

  if (
    lines[index].trim()
  ) {

    return {
      text:
        lines[index]
    };

  }

}


return null;

}

function stripYamlQuotes(
value
) {

const text =
  safeString(
    value
  );


if (
  (
    text.startsWith('"') &&
    text.endsWith('"')
  ) ||
  (
    text.startsWith("'") &&
    text.endsWith("'")
  )
) {

  return text.slice(
    1,
    -1
  );

}


return text;

}

function parseYamlScalar(
value
) {

const text =
  safeString(
    value
  );


if (
  text === ""
) {

  return "";

}


if (
  text === "null" ||
  text === "~"
) {

  return null;

}


if (
  text === "true"
) {

  return true;

}


if (
  text === "false"
) {

  return false;

}


if (
  /^-?\d+(?:\.\d+)?$/.test(
    text
  )
) {

  return Number(
    text
  );

}


if (
  (
    text.startsWith("[") &&
    text.endsWith("]")
  ) ||
  (
    text.startsWith("{") &&
    text.endsWith("}")
  )
) {

  try {

    return JSON.parse(
      text
    );

  } catch {

    /* keep string */

  }

}


return stripYamlQuotes(
  text
);

}

/* ============================================================
JSON -> YAML
============================================================ */

async function convertJsonToYaml(
file,
converter
) {

const data =
  parseJson(
    await file.text()
  );


const output =
  jsonToYaml(
    data,
    0
  );


return createResult(
  file,
  new Blob(
    [output],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

function yamlScalar(
value
) {

if (
  value === null
) {

  return "null";

}


if (
  typeof value ===
  "boolean"
) {

  return value
    ? "true"
    : "false";

}


if (
  typeof value ===
  "number"
) {

  return String(
    value
  );

}


const text =
  String(
    value ?? ""
  );


if (
  text === ""
) {

  return '""';

}


if (
  /^[A-Za-z0-9_.\/-]+$/.test(
    text
  )
) {

  return text;

}


return JSON.stringify(
  text
);

}

function jsonToYaml(
value,
depth
) {

const indent =
  "  ".repeat(
    depth
  );


if (
  value === null ||
  typeof value !== "object"
) {

  return yamlScalar(
    value
  );

}


if (
  Array.isArray(
    value
  )
) {

  if (
    value.length === 0
  ) {

    return "[]";

  }


  return value
    .map(
      item => {

        if (
          item !== null &&
          typeof item ===
            "object"
        ) {

          const nested =
            jsonToYaml(
              item,
              depth + 1
            );


          const lines =
            nested.split(
              "\n"
            );


          return `${indent}- ${
            lines[0]
          }${
            lines.length > 1
              ? "\n" +
                lines
                  .slice(1)
                  .map(
                    line =>
                      `${indent}  ${line}`
                  )
                  .join(
                    "\n"
                  )
              : ""
          }`;

        }


        return `${indent}- ${
          yamlScalar(
            item
          )
        }`;

      }
    )
    .join(
      "\n"
    );

}


const entries =
  Object.entries(
    value
  );


if (
  !entries.length
) {

  return "{}";

}


return entries
  .map(
    (
      [
        key,
        child
      ]
    ) => {

      const safeKey =
        /^[A-Za-z0-9_-]+$/.test(
          key
        )
          ? key
          : JSON.stringify(
              key
            );


      if (
        child !== null &&
        typeof child ===
          "object"
      ) {

        return `${indent}${safeKey}:\n${
          jsonToYaml(
            child,
            depth + 1
          )
        }`;

      }


      return `${indent}${safeKey}: ${
        yamlScalar(
          child
        )
      }`;

    }
  )
  .join(
    "\n"
  );

}

/* ============================================================
TEXT
============================================================ */

async function convertTxtToHtml(
file,
converter
) {

const source =
  await file.text();


const title =
  escapeHtml(
    removeExtension(
      file.name
    )
  );


const body =
  source
    .split(
      /\r?\n\r?\n/
    )
    .map(
      paragraph =>
        `<p>${escapeHtml(
          paragraph
        ).replace(
          /\r?\n/g,
          "<br>"
        )}</p>`
    )
    .join(
      "\n"
    );


const html =
  `<!DOCTYPE html>

<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body{
  font-family:Arial,sans-serif;
  line-height:1.7;
  max-width:900px;
  margin:40px auto;
  padding:0 20px;
}
p{
  margin-bottom:16px;
}
</style>
</head>
<body>
${body}
</body>
</html>`;

return createResult(
  file,
  new Blob(
    [html],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

async function convertHtmlToTxt(
file,
converter
) {

const source =
  await file.text();


const parser =
  new DOMParser();


const doc =
  parser.parseFromString(
    source,
    "text/html"
  );


const text =
  doc.body
    ? (
        doc.body.innerText ||
        doc.body.textContent ||
        ""
      )
    : "";


return createResult(
  file,
  new Blob(
    [
      text.trim()
    ],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

async function convertMarkdownToHtml(
file,
converter
) {

const source =
  await file.text();


const body =
  markdownToHtml(
    source
  );


const html =
  `<!DOCTYPE html>

<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(
  removeExtension(
    file.name
  )
)}</title>
</head>
<body>
${body}
</body>
</html>`;

return createResult(
  file,
  new Blob(
    [html],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

function markdownToHtml(
source
) {

let html =
  escapeHtml(
    source
  );


html =
  html.replace(
    /^###### (.+)$/gm,
    "<h6>$1</h6>"
  );


html =
  html.replace(
    /^##### (.+)$/gm,
    "<h5>$1</h5>"
  );


html =
  html.replace(
    /^#### (.+)$/gm,
    "<h4>$1</h4>"
  );


html =
  html.replace(
    /^### (.+)$/gm,
    "<h3>$1</h3>"
  );


html =
  html.replace(
    /^## (.+)$/gm,
    "<h2>$1</h2>"
  );


html =
  html.replace(
    /^# (.+)$/gm,
    "<h1>$1</h1>"
  );


html =
  html.replace(
    /\*\*(.+?)\*\*/g,
    "<strong>$1</strong>"
  );


html =
  html.replace(
    /\*(.+?)\*/g,
    "<em>$1</em>"
  );


html =
  html.replace(
    /`(.+?)`/g,
    "<code>$1</code>"
  );


const lines =
  html.split(
    "\n"
  );


const output =
  [];


let inList =
  false;


for (
  const line of lines
) {

  if (
    /^\- /.test(
      line
    )
  ) {

    if (
      !inList
    ) {

      output.push(
        "<ul>"
      );


      inList =
        true;

    }


    output.push(
      `<li>${line.slice(
        2
      )}</li>`
    );

  } else {

    if (
      inList
    ) {

      output.push(
        "</ul>"
      );


      inList =
        false;

    }


    if (
      line.trim()
    ) {

      output.push(
        line
      );

    }

  }

}


if (
  inList
) {

  output.push(
    "</ul>"
  );

}


return output
  .join(
    "\n"
  )
  .replace(
    /\n{2,}/g,
    "\n"
  );

}

/* ============================================================
TEXT -> PDF
============================================================ */

async function convertTextToPdf(
file,
converter
) {

return buildTextPdf(
  file,
  await file.text(),
  converter
);

}

/* ============================================================
HTML -> PDF
============================================================ */

async function convertHtmlToPdf(
file,
converter
) {

const source =
  await file.text();


const parser =
  new DOMParser();


const doc =
  parser.parseFromString(
    source,
    "text/html"
  );


const text =
  doc.body
    ? (
        doc.body.innerText ||
        doc.body.textContent ||
        ""
      )
    : "";


return buildTextPdf(
  file,
  text,
  converter
);

}

/* ============================================================
TEXT PDF BUILDER
============================================================ */

async function buildTextPdf(
file,
text,
converter
) {

const PDFLib =
  await ensurePdfLib();


const pdfDoc =
  await PDFLib.PDFDocument.create();


const font =
  await pdfDoc.embedFont(
    PDFLib.StandardFonts.Helvetica
  );


const pageWidth =
  595.28;


const pageHeight =
  841.89;


const margin =
  36;


const fontSize =
  10;


const lineHeight =
  15;


const lines =
  wrapText(
    text,
    92
  );


let page =
  pdfDoc.addPage(
    [
      pageWidth,
      pageHeight
    ]
  );


let y =
  pageHeight -
  margin;


for (
  const line of lines
) {

  if (
    y <
    margin
  ) {

    page =
      pdfDoc.addPage(
        [
          pageWidth,
          pageHeight
        ]
      );


    y =
      pageHeight -
      margin;

  }


  page.drawText(
    normalizePdfText(
      line
    ),
    {
      x:
        margin,

      y,

      size:
        fontSize,

      font
    }
  );


  y -=
    lineHeight;

}


const bytes =
  await pdfDoc.save();


return createResult(
  file,
  new Blob(
    [bytes],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

function normalizePdfText(
value
) {

return String(
  value ?? ""
)
  .replace(
    /[^\x09\x0A\x0D\x20-\x7E]/g,
    "?"
  );

}

function wrapText(
text,
maxChars
) {

const lines =
  [];


const paragraphs =
  String(
    text ?? ""
  )
  .replace(
    /\r\n/g,
    "\n"
  )
  .replace(
    /\r/g,
    "\n"
  )
  .split(
    "\n"
  );


paragraphs.forEach(
  paragraph => {

    if (
      paragraph === ""
    ) {

      lines.push(
        ""
      );


      return;

    }


    let remaining =
      paragraph;


    while (
      remaining.length >
      maxChars
    ) {

      let cut =
        remaining.lastIndexOf(
          " ",
          maxChars
        );


      if (
        cut <= 0
      ) {

        cut =
          maxChars;

      }


      lines.push(
        remaining.slice(
          0,
          cut
        )
      );


      remaining =
        remaining
          .slice(
            cut
          )
          .trimStart();

    }


    lines.push(
      remaining
    );

  }
);


return lines;

}

/* ============================================================
DOCX -> PDF
============================================================ */

async function convertDocxToPdf(
file,
converter
) {

const mammoth =
  await ensureMammoth();


const result =
  await mammoth.extractRawText(
    {
      arrayBuffer:
        await file.arrayBuffer()
    }
  );


const text =
  safeString(
    result.value
  );


if (
  !text
) {

  throw new Error(
    t(
      "docxTextMissing"
    )
  );

}


return buildTextPdf(
  file,
  text,
  converter
);

}

/* ============================================================
PPTX -> PDF
============================================================ */

async function convertPptxToPdf(
file,
converter
) {

const JSZip =
  await ensureJsZip();


const zip =
  await JSZip.loadAsync(
    await file.arrayBuffer()
  );


const slideFiles =
  Object.keys(
    zip.files
  )
  .filter(
    name =>
      /^ppt\/slides\/slide\d+\.xml$/i.test(
        name
      )
  )
  .sort(
    naturalSort
  );


if (
  !slideFiles.length
) {

  throw new Error(
    t(
      "pptxSlideMissing"
    )
  );

}


const sections =
  [];


for (
  const fileName of slideFiles
) {

  const xml =
    await zip.files[
      fileName
    ].async(
      "text"
    );


  const parser =
    new DOMParser();


  const doc =
    parser.parseFromString(
      xml,
      "application/xml"
    );


  const textNodes =
    Array.from(
      doc.querySelectorAll(
        "t"
      )
    );


  const slideText =
    textNodes
      .map(
        node =>
          safeString(
            node.textContent
          )
      )
      .filter(Boolean)
      .join(
        "\n"
      );


  sections.push(
    `SLIDE ${extractNumber(
      fileName
    )}\n${slideText}`
  );

}


return buildTextPdf(
  file,
  sections.join(
    "\n\n"
  ),
  converter
);

}

function naturalSort(
a,
b
) {

return a.localeCompare(
  b,
  undefined,
  {
    numeric:
      true,
    sensitivity:
      "base"
  }
);

}

function extractNumber(
value
) {

const match =
  String(
    value
  ).match(
    /(\d+)/
  );


return match
  ? match[1]
  : "1";

}

/* ============================================================
CSV -> XLSX
============================================================ */

async function convertCsvToXlsx(
file,
converter
) {

const XLSX =
  await ensureXlsx();


const rows =
  parseCsv(
    await file.text()
  );


const sheet =
  XLSX.utils.aoa_to_sheet(
    rows
  );


const workbook =
  XLSX.utils.book_new();


XLSX.utils.book_append_sheet(
  workbook,
  sheet,
  "Sheet1"
);


const bytes =
  XLSX.write(
    workbook,
    {
      bookType:
        "xlsx",
      type:
        "array"
    }
  );


return createResult(
  file,
  new Blob(
    [bytes],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

/* ============================================================
XLSX -> CSV
============================================================ */

async function convertXlsxToCsv(
file,
converter
) {

const XLSX =
  await ensureXlsx();


const workbook =
  XLSX.read(
    await file.arrayBuffer(),
    {
      type:
        "array"
    }
  );


const chunks =
  [];


workbook.SheetNames.forEach(
  sheetName => {

    const worksheet =
      workbook.Sheets[
        sheetName
      ];


    const csv =
      XLSX.utils.sheet_to_csv(
        worksheet
      );


    chunks.push(
      `# SHEET: ${sheetName}\n${csv}`
    );

  }
);


const output =
  "\uFEFF" +
  chunks.join(
    "\r\n\r\n"
  );


return createResult(
  file,
  new Blob(
    [output],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

/* ============================================================
JSON -> XLSX
============================================================ */

async function convertJsonToXlsx(
file,
converter
) {

const XLSX =
  await ensureXlsx();


const data =
  parseJson(
    await file.text()
  );


const rows =
  Array.isArray(
    data
  )
    ? data
    : [data];


const sheet =
  XLSX.utils.json_to_sheet(
    rows
  );


const workbook =
  XLSX.utils.book_new();


XLSX.utils.book_append_sheet(
  workbook,
  sheet,
  "Sheet1"
);


const bytes =
  XLSX.write(
    workbook,
    {
      bookType:
        "xlsx",
      type:
        "array"
    }
  );


return createResult(
  file,
  new Blob(
    [bytes],
    {
      type:
        converter.outputMime
    }
  ),
  converter.outputExtension
);

}

/* ============================================================
XLSX -> PDF
============================================================ */

async function convertXlsxToPdf(
file,
converter
) {

const XLSX =
  await ensureXlsx();


const workbook =
  XLSX.read(
    await file.arrayBuffer(),
    {
      type:
        "array",
      cellText:
        true
    }
  );


const lines =
  [];


workbook.SheetNames.forEach(
  sheetName => {

    lines.push(
      `SHEET: ${sheetName}`
    );


    const worksheet =
      workbook.Sheets[
        sheetName
      ];


    const rows =
      XLSX.utils.sheet_to_json(
        worksheet,
        {
          header:
            1,
          raw:
            false,
          defval:
            ""
        }
      );


    rows.forEach(
      row => {

        lines.push(
          row
            .map(
              value =>
                String(
                  value
                )
            )
            .join(
              "    "
            )
        );

      }
    );


    lines.push(
      ""
    );

  }
);


return buildTextPdf(
  file,
  lines.join(
    "\n"
  ),
  converter
);

}

/* ============================================================
CONVERTER REGISTRY
============================================================ */

const CONVERTERS = {

"jpg-png": {

  title:
    "JPG → PNG",

  description:
    "แปลง JPG / JPEG เป็น PNG",

  category:
    "image",

  categoryLabel:
    "IMAGE CONVERTER",

  inputExtensions:
    [
      "jpg",
      "jpeg"
    ],

  inputMimeTypes:
    [
      "image/jpeg"
    ],

  outputExtension:
    "png",

  outputMime:
    "image/png",

  convert:
    convertImage

},


"png-jpg": {

  title:
    "PNG → JPG",

  description:
    "แปลง PNG เป็น JPG",

  category:
    "image",

  categoryLabel:
    "IMAGE CONVERTER",

  inputExtensions:
    [
      "png"
    ],

  inputMimeTypes:
    [
      "image/png"
    ],

  outputExtension:
    "jpg",

  outputMime:
    "image/jpeg",

  convert:
    convertImage

},


"jpg-webp": {

  title:
    "JPG → WebP",

  description:
    "แปลง JPG / JPEG เป็น WebP",

  category:
    "image",

  categoryLabel:
    "IMAGE CONVERTER",

  inputExtensions:
    [
      "jpg",
      "jpeg"
    ],

  inputMimeTypes:
    [
      "image/jpeg"
    ],

  outputExtension:
    "webp",

  outputMime:
    "image/webp",

  convert:
    convertImage

},


"png-webp": {

  title:
    "PNG → WebP",

  description:
    "แปลง PNG เป็น WebP",

  category:
    "image",

  categoryLabel:
    "IMAGE CONVERTER",

  inputExtensions:
    [
      "png"
    ],

  inputMimeTypes:
    [
      "image/png"
    ],

  outputExtension:
    "webp",

  outputMime:
    "image/webp",

  convert:
    convertImage

},


"webp-jpg": {

  title:
    "WebP → JPG",

  description:
    "แปลง WebP เป็น JPG",

  category:
    "image",

  categoryLabel:
    "IMAGE CONVERTER",

  inputExtensions:
    [
      "webp"
    ],

  inputMimeTypes:
    [
      "image/webp"
    ],

  outputExtension:
    "jpg",

  outputMime:
    "image/jpeg",

  convert:
    convertImage

},


"webp-png": {

  title:
    "WebP → PNG",

  description:
    "แปลง WebP เป็น PNG",

  category:
    "image",

  categoryLabel:
    "IMAGE CONVERTER",

  inputExtensions:
    [
      "webp"
    ],

  inputMimeTypes:
    [
      "image/webp"
    ],

  outputExtension:
    "png",

  outputMime:
    "image/png",

  convert:
    convertImage

},


"svg-png": {

  title:
    "SVG → PNG",

  description:
    "แปลง SVG เป็น PNG",

  category:
    "image",

  categoryLabel:
    "IMAGE CONVERTER",

  inputExtensions:
    [
      "svg"
    ],

  inputMimeTypes:
    [
      "image/svg+xml"
    ],

  outputExtension:
    "png",

  outputMime:
    "image/png",

  convert:
    convertSvgToPng

},


"bmp-png": {

  title:
    "BMP → PNG",

  description:
    "แปลง BMP เป็น PNG",

  category:
    "image",

  categoryLabel:
    "IMAGE CONVERTER",

  inputExtensions:
    [
      "bmp"
    ],

  inputMimeTypes:
    [
      "image/bmp",
      "image/x-ms-bmp"
    ],

  outputExtension:
    "png",

  outputMime:
    "image/png",

  convert:
    convertImage

},


"gif-png": {

  title:
    "GIF → PNG",

  description:
    "แปลง GIF เป็น PNG",

  category:
    "image",

  categoryLabel:
    "IMAGE CONVERTER",

  inputExtensions:
    [
      "gif"
    ],

  inputMimeTypes:
    [
      "image/gif"
    ],

  outputExtension:
    "png",

  outputMime:
    "image/png",

  convert:
    convertImage

},


"image-ico": {

  title:
    "Image → ICO",

  description:
    "สร้างไฟล์ ICO / Favicon",

  category:
    "image",

  categoryLabel:
    "IMAGE CONVERTER",

  inputExtensions:
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "bmp"
    ],

  inputMimeTypes:
    [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/bmp",
      "image/x-ms-bmp"
    ],

  outputExtension:
    "ico",

  outputMime:
    "image/x-icon",

  convert:
    convertImageToIco

},


"jpg-pdf": {

  title:
    "JPG → PDF",

  description:
    "แปลง JPG / JPEG เป็น PDF",

  category:
    "pdf",

  categoryLabel:
    "PDF CONVERTER",

  inputExtensions:
    [
      "jpg",
      "jpeg"
    ],

  inputMimeTypes:
    [
      "image/jpeg"
    ],

  outputExtension:
    "pdf",

  outputMime:
    "application/pdf",

  convert:
    convertImageToPdf

},


"png-pdf": {

  title:
    "PNG → PDF",

  description:
    "แปลง PNG เป็น PDF",

  category:
    "pdf",

  categoryLabel:
    "PDF CONVERTER",

  inputExtensions:
    [
      "png"
    ],

  inputMimeTypes:
    [
      "image/png"
    ],

  outputExtension:
    "pdf",

  outputMime:
    "application/pdf",

  convert:
    convertImageToPdf

},


"image-pdf": {

  title:
    "Image → PDF",

  description:
    "รวมรูปภาพเป็น PDF",

  category:
    "pdf",

  categoryLabel:
    "PDF CONVERTER",

  inputExtensions:
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "bmp"
    ],

  inputMimeTypes:
    [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/bmp",
      "image/x-ms-bmp"
    ],

  outputExtension:
    "pdf",

  outputMime:
    "application/pdf",

  convert:
    convertImageToPdf

},


"pdf-jpg": {

  title:
    "PDF → JPG",

  description:
    "แปลง PDF ทุกหน้าเป็น JPG ZIP",

  category:
    "pdf",

  categoryLabel:
    "PDF CONVERTER",

  inputExtensions:
    [
      "pdf"
    ],

  inputMimeTypes:
    [
      "application/pdf"
    ],

  outputExtension:
    "zip",

  outputMime:
    "application/zip",

  convert:
    convertPdfToJpgZip

},


"pdf-png": {

  title:
    "PDF → PNG",

  description:
    "แปลง PDF ทุกหน้าเป็น PNG ZIP",

  category:
    "pdf",

  categoryLabel:
    "PDF CONVERTER",

  inputExtensions:
    [
      "pdf"
    ],

  inputMimeTypes:
    [
      "application/pdf"
    ],

  outputExtension:
    "zip",

  outputMime:
    "application/zip",

  convert:
    convertPdfToPngZip

},


"pdf-txt": {

  title:
    "PDF → TXT",

  description:
    "ดึงข้อความจาก PDF",

  category:
    "pdf",

  categoryLabel:
    "PDF CONVERTER",

  inputExtensions:
    [
      "pdf"
    ],

  inputMimeTypes:
    [
      "application/pdf"
    ],

  outputExtension:
    "txt",

  outputMime:
    "text/plain;charset=utf-8",

  convert:
    convertPdfToText

},


"pdf-text": {

  title:
    "PDF → Text",

  description:
    "Extract ข้อความจาก PDF",

  category:
    "pdf",

  categoryLabel:
    "PDF CONVERTER",

  inputExtensions:
    [
      "pdf"
    ],

  inputMimeTypes:
    [
      "application/pdf"
    ],

  outputExtension:
    "txt",

  outputMime:
    "text/plain;charset=utf-8",

  convert:
    convertPdfToText

},


"pdf-images": {

  title:
    "PDF → Images",

  description:
    "แยกทุกหน้า PDF เป็น JPG ZIP",

  category:
    "pdf",

  categoryLabel:
    "PDF CONVERTER",

  inputExtensions:
    [
      "pdf"
    ],

  inputMimeTypes:
    [
      "application/pdf"
    ],

  outputExtension:
    "zip",

  outputMime:
    "application/zip",

  convert:
    convertPdfToJpgZip

},


"csv-json": {

  title:
    "CSV → JSON",

  description:
    "แปลง CSV เป็น JSON",

  category:
    "data",

  categoryLabel:
    "DATA CONVERTER",

  inputExtensions:
    [
      "csv"
    ],

  inputMimeTypes:
    [
      "text/csv",
      "text/plain"
    ],

  outputExtension:
    "json",

  outputMime:
    "application/json",

  convert:
    convertCsvToJson

},


"json-csv": {

  title:
    "JSON → CSV",

  description:
    "แปลง JSON เป็น CSV",

  category:
    "data",

  categoryLabel:
    "DATA CONVERTER",

  inputExtensions:
    [
      "json"
    ],

  inputMimeTypes:
    [
      "application/json",
      "text/json"
    ],

  outputExtension:
    "csv",

  outputMime:
    "text/csv;charset=utf-8",

  convert:
    convertJsonToCsv

},


"json-xml": {

  title:
    "JSON → XML",

  description:
    "แปลง JSON เป็น XML",

  category:
    "data",

  categoryLabel:
    "DATA CONVERTER",

  inputExtensions:
    [
      "json"
    ],

  inputMimeTypes:
    [
      "application/json",
      "text/json"
    ],

  outputExtension:
    "xml",

  outputMime:
    "application/xml;charset=utf-8",

  convert:
    convertJsonToXml

},


"xml-json": {

  title:
    "XML → JSON",

  description:
    "แปลง XML เป็น JSON",

  category:
    "data",

  categoryLabel:
    "DATA CONVERTER",

  inputExtensions:
    [
      "xml"
    ],

  inputMimeTypes:
    [
      "application/xml",
      "text/xml"
    ],

  outputExtension:
    "json",

  outputMime:
    "application/json",

  convert:
    convertXmlToJson

},


"yaml-json": {

  title:
    "YAML → JSON",

  description:
    "แปลง YAML เป็น JSON",

  category:
    "data",

  categoryLabel:
    "DATA CONVERTER",

  inputExtensions:
    [
      "yaml",
      "yml"
    ],

  inputMimeTypes:
    [
      "text/yaml",
      "application/yaml",
      "text/plain"
    ],

  outputExtension:
    "json",

  outputMime:
    "application/json",

  convert:
    convertYamlToJson

},


"json-yaml": {

  title:
    "JSON → YAML",

  description:
    "แปลง JSON เป็น YAML",

  category:
    "data",

  categoryLabel:
    "DATA CONVERTER",

  inputExtensions:
    [
      "json"
    ],

  inputMimeTypes:
    [
      "application/json",
      "text/json"
    ],

  outputExtension:
    "yaml",

  outputMime:
    "text/yaml;charset=utf-8",

  convert:
    convertJsonToYaml

},


"txt-html": {

  title:
    "TXT → HTML",

  description:
    "แปลง Text เป็น HTML",

  category:
    "text",

  categoryLabel:
    "TEXT CONVERTER",

  inputExtensions:
    [
      "txt"
    ],

  inputMimeTypes:
    [
      "text/plain"
    ],

  outputExtension:
    "html",

  outputMime:
    "text/html;charset=utf-8",

  convert:
    convertTxtToHtml

},


"html-txt": {

  title:
    "HTML → TXT",

  description:
    "ดึงข้อความจาก HTML",

  category:
    "text",

  categoryLabel:
    "TEXT CONVERTER",

  inputExtensions:
    [
      "html",
      "htm"
    ],

  inputMimeTypes:
    [
      "text/html"
    ],

  outputExtension:
    "txt",

  outputMime:
    "text/plain;charset=utf-8",

  convert:
    convertHtmlToTxt

},


"txt-pdf": {

  title:
    "TXT → PDF",

  description:
    "แปลง Text เป็น PDF",

  category:
    "text",

  categoryLabel:
    "TEXT CONVERTER",

  inputExtensions:
    [
      "txt"
    ],

  inputMimeTypes:
    [
      "text/plain"
    ],

  outputExtension:
    "pdf",

  outputMime:
    "application/pdf",

  convert:
    convertTextToPdf

},


"html-pdf": {

  title:
    "HTML → PDF",

  description:
    "แปลง HTML เป็น PDF",

  category:
    "document",

  categoryLabel:
    "DOCUMENT CONVERTER",

  inputExtensions:
    [
      "html",
      "htm"
    ],

  inputMimeTypes:
    [
      "text/html"
    ],

  outputExtension:
    "pdf",

  outputMime:
    "application/pdf",

  convert:
    convertHtmlToPdf

},


"md-html": {

  title:
    "Markdown → HTML",

  description:
    "แปลง Markdown เป็น HTML",

  category:
    "text",

  categoryLabel:
    "TEXT CONVERTER",

  inputExtensions:
    [
      "md"
    ],

  inputMimeTypes:
    [
      "text/markdown",
      "text/plain"
    ],

  outputExtension:
    "html",

  outputMime:
    "text/html;charset=utf-8",

  convert:
    convertMarkdownToHtml

},


"csv-xlsx": {

  title:
    "CSV → XLSX",

  description:
    "แปลง CSV เป็น Excel",

  category:
    "spreadsheet",

  categoryLabel:
    "SPREADSHEET CONVERTER",

  inputExtensions:
    [
      "csv"
    ],

  inputMimeTypes:
    [
      "text/csv",
      "text/plain"
    ],

  outputExtension:
    "xlsx",

  outputMime:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  convert:
    convertCsvToXlsx

},


"xlsx-csv": {

  title:
    "XLSX → CSV",

  description:
    "แปลง Excel เป็น CSV",

  category:
    "spreadsheet",

  categoryLabel:
    "SPREADSHEET CONVERTER",

  inputExtensions:
    [
      "xlsx",
      "xls"
    ],

  inputMimeTypes:
    [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel"
    ],

  outputExtension:
    "csv",

  outputMime:
    "text/csv;charset=utf-8",

  convert:
    convertXlsxToCsv

},


"json-xlsx": {

  title:
    "JSON → XLSX",

  description:
    "แปลง JSON เป็น Excel",

  category:
    "spreadsheet",

  categoryLabel:
    "SPREADSHEET CONVERTER",

  inputExtensions:
    [
      "json"
    ],

  inputMimeTypes:
    [
      "application/json",
      "text/json"
    ],

  outputExtension:
    "xlsx",

  outputMime:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  convert:
    convertJsonToXlsx

},


"xlsx-pdf": {

  title:
    "XLSX → PDF",

  description:
    "แปลงข้อมูล Excel เป็น PDF",

  category:
    "document",

  categoryLabel:
    "DOCUMENT CONVERTER",

  inputExtensions:
    [
      "xlsx",
      "xls"
    ],

  inputMimeTypes:
    [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel"
    ],

  outputExtension:
    "pdf",

  outputMime:
    "application/pdf",

  convert:
    convertXlsxToPdf

},


"docx-pdf": {

  title:
    "DOCX → PDF",

  description:
    "แปลงข้อความจาก Word เป็น PDF",

  category:
    "document",

  categoryLabel:
    "DOCUMENT CONVERTER",

  inputExtensions:
    [
      "docx"
    ],

  inputMimeTypes:
    [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ],

  outputExtension:
    "pdf",

  outputMime:
    "application/pdf",

  convert:
    convertDocxToPdf

},


"pptx-pdf": {

  title:
    "PPTX → PDF",

  description:
    "ดึงข้อความจาก PowerPoint แล้วสร้าง PDF",

  category:
    "document",

  categoryLabel:
    "DOCUMENT CONVERTER",

  inputExtensions:
    [
      "pptx"
    ],

  inputMimeTypes:
    [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ],

  outputExtension:
    "pdf",

  outputMime:
    "application/pdf",

  convert:
    convertPptxToPdf

}
};

/* ============================================================
ACCEPT ATTRIBUTE
============================================================ */

function buildAcceptAttribute(
converter
) {

return [
  ...converter.inputExtensions.map(
    ext =>
      `.${ext}`
  ),
  ...converter.inputMimeTypes
]
  .filter(Boolean)
  .join(",");

}

/* ============================================================
MODAL / RESULT CLEANUP
============================================================ */

function cleanupResults() {

convertedResults.forEach(
  result => {

    if (
      result &&
      result.url
    ) {

      try {

        URL.revokeObjectURL(
          result.url
        );

      } catch {

        /* ignore */

      }

    }

  }
);


convertedResults =
  [];

}

function resetConverterState() {

selectedFiles =
  [];


cleanupResults();


fileList.innerHTML =
  "";


fileListSection.hidden =
  true;


fileCount.textContent =
  t(
    "selectedMany",
    {
      count:
        0
    }
  );


resultSection.hidden =
  true;


resultList.innerHTML =
  "";


errorMessage.hidden =
  true;


errorText.textContent =
  "";


resetProgress();


convertButton.disabled =
  true;


convertButton.classList.remove(
  "is-loading"
);


setConvertButtonText();


browseFilesButton.disabled =
  false;


clearFilesButton.disabled =
  false;

}

function setConvertButtonText(
working = false
) {

convertButton.innerHTML =
  working
    ? `
        <span>
          ${escapeHtml(
            t("converting")
          )}
        </span>
      `
    : `
        <span>
          ${escapeHtml(
            t("convert")
          )}
        </span>

        <span>
          →
        </span>
      `;

}

/* ============================================================
OPEN CONVERTER
============================================================ */

function openConverter(
converterId
) {

const converter =
  CONVERTERS[
    converterId
  ];


if (
  !converter
) {

  showError(
    t(
      "converterNotFound"
    )
  );


  return;

}


activeConverterId =
  converterId;


activeConverter =
  converter;


previousActiveElement =
  document.activeElement;


resetConverterState();


updateModalLanguage();


fileInput.accept =
  buildAcceptAttribute(
    converter
  );


modal.hidden =
  false;


previousBodyOverflow =
  document.body.style.overflow;


document.body.style.overflow =
  "hidden";


setTimeout(
  () => {

    modalClose.focus();

  },
  0
);

}

/* ============================================================
MODAL LANGUAGE
============================================================ */

function updateModalLanguage() {

if (
  !activeConverter
) {

  return;

}


const converterId =
  activeConverterId;


const converter =
  activeConverter;


modalTitle.textContent =
  getConverterText(
    converterId,
    "title"
  );


modalDescription.textContent =
  getConverterText(
    converterId,
    "description"
  );


modalCategory.textContent =
  converter.categoryLabel;


supportedFormats.textContent =
  `${t(
    "supported"
  )}: ${
    converter.inputExtensions
      .map(
        ext =>
          ext.toUpperCase()
      )
      .join(
        ", "
      )
  }`;


modalClose.setAttribute(
  "aria-label",
  t(
    "cancel"
  )
);


dropZone.setAttribute(
  "aria-label",
  `${t(
    "dragFiles"
  )} — ${t(
    "chooseFiles"
  )}`
);


resetProgress();


if (
  resultSection.hidden ===
  false
) {

  renderResults();

}


updateFileList();


updateSearchLanguage();

}

/* ============================================================
CLOSE CONVERTER
============================================================ */

function closeConverter() {

if (
  isConverting
) {

  return;

}


cleanupResults();


modal.hidden =
  true;


document.body.style.overflow =
  previousBodyOverflow;


activeConverterId =
  null;


activeConverter =
  null;


resetConverterState();


if (
  previousActiveElement &&
  typeof previousActiveElement.focus ===
    "function"
) {

  try {

    previousActiveElement.focus();

  } catch {

    /* ignore */

  }

}


previousActiveElement =
  null;

}

/* ============================================================
ADD FILES
============================================================ */

function addFiles(
files
) {

if (
  !activeConverter ||
  isConverting
) {

  return;

}


if (
  !Array.isArray(files) ||
  !files.length
) {

  return;

}


hideError();


const rejected =
  [];


const valid =
  [];


for (
  const file of files
) {

  if (
    selectedFiles.length +
    valid.length >=
    MAX_FILES
  ) {

    rejected.push(
      t(
        "maxFiles",
        {
          count:
            MAX_FILES
        }
      )
    );


    break;

  }


  if (
    file.size >
    MAX_FILE_SIZE
  ) {

    rejected.push(
      t(
        "fileTooLarge",
        {
          name:
            file.name,

          size:
            formatBytes(
              MAX_FILE_SIZE
            )
        }
      )
    );


    continue;

  }


  if (
    !isFileSupported(
      file,
      activeConverter
    )
  ) {

    rejected.push(
      t(
        "unsupportedFile",
        {
          name:
            file.name
        }
      )
    );


    continue;

  }


  const duplicate =
    selectedFiles.some(
      existing =>
        existing.name ===
          file.name &&
        existing.size ===
          file.size &&
        existing.lastModified ===
          file.lastModified
    );


  if (
    duplicate
  ) {

    continue;

  }


  valid.push(
    file
  );

}


selectedFiles.push(
  ...valid
);


updateFileList();


convertButton.disabled =
  selectedFiles.length ===
  0;


if (
  rejected.length
) {

  showError(
    rejected.join(
      "\n"
    )
  );

}

}

function isFileSupported(
file,
converter
) {

const extension =
  getExtension(
    file.name
  );


if (
  converter.inputExtensions.includes(
    extension
  )
) {

  return true;

}


const mime =
  normalize(
    file.type
  );


return (
  Boolean(mime) &&
  converter.inputMimeTypes.includes(
    mime
  )
);

}

/* ============================================================
UPDATE FILE LIST
============================================================ */

function updateFileList() {

fileList.innerHTML =
  "";


const count =
  selectedFiles.length;


fileCount.textContent =
  count === 1
    ? t(
        "selectedOne",
        {
          count
        }
      )
    : t(
        "selectedMany",
        {
          count
        }
      );


fileListSection.hidden =
  count === 0;


if (
  count === 0
) {

  return;

}


const fragment =
  document.createDocumentFragment();


selectedFiles.forEach(
  (
    file,
    index
  ) => {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "file-item";


    const extension =
      getExtension(
        file.name
      );


    row.innerHTML =
      `
        <div class="file-item-icon">
          ${escapeHtml(
            extension ||
            "FILE"
          )}
        </div>

        <div class="file-item-info">

          <div class="file-item-name">
            ${escapeHtml(
              file.name
            )}
          </div>

          <div class="file-item-size">
            ${formatBytes(
              file.size
            )}
          </div>

        </div>

        <button
          type="button"
          class="file-item-remove"
          data-remove-index="${index}"
          aria-label="${escapeHtml(
            t(
              "clearFiles"
            )
          )}"
        >
          ×
        </button>
      `;


    fragment.appendChild(
      row
    );

  }
);


fileList.appendChild(
  fragment
);

}

/* ============================================================
REMOVE FILE
============================================================ */

fileList.addEventListener(
"click",
event => {

  const button =
    event.target.closest(
      "[data-remove-index]"
    );


  if (
    !button ||
    isConverting
  ) {

    return;

  }


  const index =
    Number(
      button.dataset.removeIndex
    );


  if (
    !Number.isInteger(
      index
    ) ||
    index < 0 ||
    index >= selectedFiles.length
  ) {

    return;

  }


  selectedFiles.splice(
    index,
    1
  );


  updateFileList();


  convertButton.disabled =
    selectedFiles.length ===
    0;

}

);

/* ============================================================
CLEAR FILES
============================================================ */

clearFilesButton.addEventListener(
"click",
() => {

  if (
    isConverting
  ) {

    return;

  }


  selectedFiles =
    [];


  updateFileList();


  cleanupResults();


  resultSection.hidden =
    true;


  resultList.innerHTML =
    "";


  convertButton.disabled =
    true;


  hideError();


  resetProgress();

}

);

/* ============================================================
DROP / INPUT
============================================================ */

browseFilesButton.addEventListener(
"click",
event => {

  event.stopPropagation();


  if (
    !isConverting
  ) {

    fileInput.click();

  }

}

);

dropZone.addEventListener(
"click",
event => {

  if (
    event.target.closest(
      "button"
    )
  ) {

    return;

  }


  if (
    isConverting
  ) {

    return;

  }


  fileInput.click();

}

);

dropZone.addEventListener(
"keydown",
event => {

  if (
    event.key ===
      "Enter" ||
    event.key ===
      " "
  ) {

    event.preventDefault();


    if (
      !isConverting
    ) {

      fileInput.click();

    }

  }

}

);

fileInput.addEventListener(
"change",
event => {

  addFiles(
    Array.from(
      event.target.files ||
      []
    )
  );


  fileInput.value =
    "";

}

);

[
"dragenter",
"dragover"
].forEach(
eventName => {

  dropZone.addEventListener(
    eventName,
    event => {

      event.preventDefault();
      event.stopPropagation();


      if (
        !isConverting
      ) {

        dropZone.classList.add(
          "drag-over"
        );

      }

    }
  );

}

);

[
"dragleave",
"drop"
].forEach(
eventName => {

  dropZone.addEventListener(
    eventName,
    event => {

      event.preventDefault();
      event.stopPropagation();


      dropZone.classList.remove(
        "drag-over"
      );

    }
  );

}

);

dropZone.addEventListener(
"drop",
event => {

  if (
    isConverting
  ) {

    return;

  }


  addFiles(
    Array.from(
      event.dataTransfer?.files ||
      []
    )
  );

}

);

/* ============================================================
PROGRESS
============================================================ */

function setProgress(
percent,
status
) {

const value =
  Math.max(
    0,
    Math.min(
      100,
      Number(
        percent
      ) || 0
    )
  );


progressBar.style.width =
  `${value}%`;


progressPercent.textContent =
  `${value}%`;


progressStatus.textContent =
  safeString(
    status
  ) ||
  t(
    "preparing"
  );

}

function resetProgress() {

progressSection.hidden =
  true;


progressBar.style.width =
  "0%";


progressPercent.textContent =
  "0%";


progressStatus.textContent =
  t(
    "preparing"
  );

}

/* ============================================================
CONVERSION
============================================================ */

convertButton.addEventListener(
"click",
async () => {
   
  if (
    isConverting ||
    !activeConverter ||
    selectedFiles.length === 0
  ) {

    if (
      !selectedFiles.length &&
      activeConverter
    ) {

      showError(
        t(
          "pleaseSelectFile"
        )
      );

    }


    return;

  }


  await runConversion();

}

);

async function runConversion() {

isConverting =
  true;


hideError();


cleanupResults();


resultSection.hidden =
  true;


resultList.innerHTML =
  "";


progressSection.hidden =
  false;


convertButton.disabled =
  true;


convertButton.classList.add(
  "is-loading"
);


setConvertButtonText(
  true
);


browseFilesButton.disabled =
  true;


clearFilesButton.disabled =
  true;


try {

  const total =
    selectedFiles.length;


  for (
    let index = 0;
    index < total;
    index++
  ) {

    const file =
      selectedFiles[index];


    setProgress(
      Math.round(
        (
          index /
          total
        ) *
        100
      ),
      t(
        "convertingFile",
        {
          current:
            index + 1,

          total,

          name:
            file.name
        }
      )
    );


    await nextFrame();


    const result =
      await activeConverter.convert(
        file,
        activeConverter
      );


    convertedResults.push(
      result
    );


    setProgress(
      Math.round(
        (
          (index + 1) /
          total
        ) *
        100
      ),
      t(
        "convertedFile",
        {
          name:
            file.name
        }
      )
    );


    await wait(
      30
    );

  }


  renderResults();


  resultSection.hidden =
    false;


  progressStatus.textContent =
    t(
      "resultReady"
    );


} catch (
  error
) {

  console.error(
    "[File Converter]",
    error
  );


  showError(
    getErrorMessage(
      error
    )
  );

} finally {

  isConverting =
    false;


  convertButton.classList.remove(
    "is-loading"
  );


  setConvertButtonText(
    false
  );


  browseFilesButton.disabled =
    false;


  clearFilesButton.disabled =
    false;


  convertButton.disabled =
    selectedFiles.length === 0;

}

}

/* ============================================================
RESULTS
============================================================ */

function renderResults() {

resultList.innerHTML =
  "";


const count =
  convertedResults.length;


resultSummary.textContent =
  count === 1
    ? t(
        "convertedOne",
        {
          count
        }
      )
    : t(
        "convertedMany",
        {
          count
        }
      );


const fragment =
  document.createDocumentFragment();


convertedResults.forEach(
  result => {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "result-item";


    row.innerHTML =
      `
        <div class="file-item-icon">
          ${escapeHtml(
            (
              result.extension ||
              "file"
            ).toUpperCase()
          )}
        </div>

        <div class="result-item-info">

          <div class="result-item-name">
            ${escapeHtml(
              result.name
            )}
          </div>

          <div class="result-item-size">
            ${formatBytes(
              result.blob.size
            )}
          </div>

        </div>

        <a
          class="result-download"
          href="${result.url}"
          download="${escapeHtml(
            result.name
          )}"
        >
          ${escapeHtml(
            t(
              "download"
            )
          )}
        </a>
      `;


    fragment.appendChild(
      row
    );

  }
);


resultList.appendChild(
  fragment
);

}

/* ============================================================
ERROR
============================================================ */

function showError(
message
) {

errorText.textContent =
  safeString(
    message
  );


errorMessage.hidden =
  false;

}

function hideError() {

errorMessage.hidden =
  true;


errorText.textContent =
  "";

}

/* ============================================================
SEARCH
============================================================ */

function applySearchAndFilter() {

const query =
  normalize(
    searchInput.value
  );


let visibleCount =
  0;


converterCards.forEach(
  card => {

    const category =
      normalize(
        card.dataset.category
      );


    const searchable =
      normalize(
        [
          card.dataset.name,
          card.dataset.converter,
          card.textContent,
          card.querySelector(
            ".card-content h3"
          )?.textContent || ""
        ].join(
          " "
        )
      );


    const categoryMatched =
      activeFilter ===
        "all" ||
      category ===
        activeFilter;


    const searchMatched =
      !query ||
      searchable.includes(
        query
      );


    const visible =
      categoryMatched &&
      searchMatched;


    card.hidden =
      !visible;


    if (
      visible
    ) {

      visibleCount++;

    }

  }
);


categorySections.forEach(
  section => {

    const sectionName =
      section.dataset.categorySection;


    const cards =
      Array.from(
        section.querySelectorAll(
          ".converter-card"
        )
      );


    let visible =
      cards.some(
        card =>
          !card.hidden
      );


    if (
      query &&
      sectionName ===
        "popular"
    ) {

      visible =
        false;

    }


    section.hidden =
      !visible;

  }
);


emptyState.hidden =
  visibleCount > 0;


clearSearchButton.hidden =
  !query;


if (
  query ||
  activeFilter !==
    "all"
) {

  searchResultInfo.textContent =
    `${visibleCount} ${t(
      "supported"
    ).toLowerCase()}`;

} else {

  searchResultInfo.textContent =
    "";

}

}

function updateSearchLanguage() {

searchInput.placeholder =
  t(
    "searchPlaceholder"
  );


searchInput.setAttribute(
  "aria-label",
  t(
    "searchLabel"
  )
);


clearSearchButton.setAttribute(
  "aria-label",
  t(
    "clearSearch"
  )
);


applySearchAndFilter();

}

searchInput.addEventListener(
"input",
applySearchAndFilter
);

clearSearchButton.addEventListener(
"click",
() => {

  searchInput.value =
    "";


  activeFilter =
    "all";


  updateFilterButtons();


  applySearchAndFilter();


  searchInput.focus();

}

);

resetSearchButton.addEventListener(
"click",
() => {

  searchInput.value =
    "";


  activeFilter =
    "all";


  updateFilterButtons();


  applySearchAndFilter();

}

);

/* ============================================================
FILTER
============================================================ */

filterButtons.forEach(
button => {
   
  button.addEventListener(
    "click",
    () => {

      activeFilter =
        safeString(
          button.dataset.filter
        ) ||
        "all";


      updateFilterButtons();


      applySearchAndFilter();

    }
  );

}

);

function updateFilterButtons() {

filterButtons.forEach(
  button => {

    button.classList.toggle(
      "active",
      button.dataset.filter ===
        activeFilter
    );

  }
);

}

function translateFilterButtons() {

const map = {

  all:
    "all",

  image:
    "image",

  pdf:
    "pdf",

  document:
    "document",

  spreadsheet:
    "spreadsheet",

  data:
    "data",

  text:
    "text"

};


filterButtons.forEach(
  button => {

    const key =
      map[
        button.dataset.filter
      ];


    const label =
      button.querySelector(
        "span:last-child"
      );


    if (
      label &&
      key
    ) {

      label.textContent =
        t(
          key
        );

    }

  }
);

}

/* ============================================================
TRANSLATE STATIC HTML
============================================================ */

function refreshStaticUI() {

translateStaticConverterHtml();


translateFilterButtons();


updateSearchLanguage();


/*
 * Category counts
 * ไม่ hard-code ภาษา
 */
categorySections.forEach(
  section => {

    const key =
      section.dataset.categorySection;


    const countNode =
      section.querySelector(
        "[data-category-count]"
      );


    if (
      !countNode
    ) {

      return;

    }


    const count =
      section.querySelectorAll(
        ".converter-card"
      ).length;


    countNode.textContent =
      `${count} ${
        getLanguage() === "th"
          ? "Tools"
          : "Tools"
      }`;

  }
);


if (
  activeConverter
) {

  updateModalLanguage();

}


setConvertButtonText(
  isConverting
);


if (
  selectedFiles.length
) {

  updateFileList();

}


if (
  convertedResults.length
) {

  renderResults();

}


progressStatus.textContent =
  progressSection.hidden
    ? progressStatus.textContent
    : progressStatus.textContent;

}

/* ============================================================
CARD CLICK
============================================================ */

converterCards.forEach(
card => {

  card.addEventListener(
    "click",
    () => {

      const converterId =
        safeString(
          card.dataset.converter
        );


      if (
        converterId
      ) {

        openConverter(
          converterId
        );

      }

    }
  );

}


);

/* ============================================================
MODAL EVENTS
============================================================ */

modalClose.addEventListener(
"click",
closeConverter
);

modalCancel.addEventListener(
"click",
closeConverter
);

modal.addEventListener(
"click",
event => {


  if (
    event.target.closest(
      "[data-modal-close]"
    )
  ) {

    closeConverter();

  }

}


);

document.addEventListener(
"keydown",
event => {


  if (
    event.key ===
      "Escape" &&
    !modal.hidden
  ) {

    closeConverter();

  }

}


);

/* ============================================================
LANGUAGE CHANGE
============================================================ */

document.addEventListener(
"languagechange",
() => {


  refreshStaticUI();

},
true


);

/* ============================================================
CLEANUP
============================================================ */

window.addEventListener(
"beforeunload",
() => {

  cleanupResults();

}

);

/* ============================================================
INITIALIZE
============================================================ */

refreshStaticUI();

updateFilterButtons();

applySearchAndFilter();

console.log(
"[File Converter] Initialized successfully."
);

})();

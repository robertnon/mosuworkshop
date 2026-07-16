/**
 * เวอร์ชันดีบัก + ตรวจสอบโค้ดส่วนลดฝั่งเซิร์ฟเวอร์ (จำกัดจำนวนครั้ง + วันหมดอายุ)
 * + เพิ่ม doGet สำหรับปุ่ม "ใช้โค้ด" หน้าเว็บ (เช็กอย่างเดียว ไม่นับการใช้งาน)
 *
 * วิธีใช้:
 * 1. แทนที่โค้ดเดิมทั้งหมดด้วยโค้ดนี้
 * 2. Deploy > Manage deployments > กดดินสอ (Edit) > Version: "New version" > Deploy
 *    (สำคัญมาก! ถ้าไม่กดขั้นตอนนี้ ลิงก์เดิมจะยังรันโค้ดเก่าอยู่)
 * 3. รันฟังก์ชัน "testDoPost" จาก dropdown ด้านบน แล้วกด Run ครั้งเดียว —
 *    จะสร้างชีต "Discounts" ให้อัตโนมัติ พร้อมตัวอย่างโค้ด 2 แถว (WELCOME10, VIP15)
 * 4. ไปแก้ไข/เพิ่ม/ลบโค้ดในชีต "Discounts" ได้เลยโดยไม่ต้องแตะโค้ด คอลัมน์คือ:
 *      โค้ด | เปอร์เซ็นต์ส่วนลด | จำกัดจำนวนครั้ง | ใช้ไปแล้ว | วันหมดอายุ | เปิดใช้งาน
 *    - "จำกัดจำนวนครั้ง" เว้นว่าง = ไม่จำกัด (นับรวมทุกคนที่ใช้โค้ดนี้ ไม่ใช่ต่อคน)
 *    - "วันหมดอายุ" เว้นว่าง = ไม่มีวันหมดอายุ
 *    - "เปิดใช้งาน" ใส่ FALSE เพื่อปิดโค้ดชั่วคราวโดยไม่ต้องลบแถว
 *    - "ใช้ไปแล้ว" สคริปต์จะ +1 ให้เองเฉพาะตอนมีการ "ยืนยันคำสั่งซื้อ" จริงเท่านั้น
 *      (การกดปุ่ม "ใช้โค้ด" เพื่อพรีวิวในหน้าเว็บ ไม่นับเป็นการใช้งาน)
 *
 * หมายเหตุด้านความปลอดภัย: สคริปต์นี้ตรวจ % ส่วนลด/โควต้า/วันหมดอายุ จากชีต "Discounts" ไม่เชื่อ %
 * ที่หน้าเว็บส่งมา — เดิมทีช่อง "ราคารวมก่อนลด" (subtotal) ยังเชื่อค่าที่หน้าเว็บส่งมาอยู่ แต่จุดนี้ถูกปิด
 * ไปแล้วในเวอร์ชันนี้ (ดูหัวข้อ "ตารางราคาย้ายมาอยู่ในชีต Prices" ด้านล่าง) ตอนนี้ subtotal คำนวณจาก
 * ชีต Prices ฝั่งเซิร์ฟเวอร์เองเสมอ ไม่เชื่อค่าจากเบราว์เซอร์อีกต่อไป
 *
 * ========== เพิ่มใหม่: รับแจ้งชำระเงิน (QR พร้อมเพย์ + อัปโหลดสลิป + ตรวจสอบสลิปจริงกับธนาคาร) ==========
 * หน้าเว็บจะสร้าง QR พร้อมเพย์ให้ลูกค้าสแกนเองหลังยืนยันคำสั่งซื้อ (ไม่ผ่านสคริปต์นี้) แล้วเมื่อลูกค้า
 * กดปุ่ม "ฉันโอนเงินแล้ว" (ตอนนี้บังคับต้องแนบสลิปก่อนถึงจะกดปุ่มนี้ได้ ทั้งฝั่งหน้าเว็บและฝั่งสคริปต์นี้)
 * หน้าเว็บจะยิง POST มาที่นี่อีกครั้งพร้อม
 * { action: 'confirmPayment', orderCode, slipBase64, slipMimeType, slipFileName } ซึ่งสคริปต์จะ:
 *   1. อัปโหลดสลิป (ถ้ามี) เข้าโฟลเดอร์ Drive ชื่อ "Payment Slips - คำสั่งซื้อ" (เปิดสิทธิ์ดูได้ทุกคนที่มีลิงก์)
 *   2. ส่งรูปสลิปไปตรวจสอบจริงกับธนาคารผ่าน SlipOK API (ถ้าตั้งค่า SLIPOK_API_KEY/SLIPOK_BRANCH_ID ไว้แล้ว)
 *      ตรวจได้ว่า: สลิปเป็นของจริงไหม, ยอดเงินตรงกับยอดที่ต้องชำระไหม, โอนเข้าบัญชีร้านจริงไหม, และเป็น
 *      สลิปซ้ำที่เคยใช้แจ้งมาก่อนหรือไม่ — ถ้าตรวจไม่ผ่าน ระบบจะ "ไม่บล็อก" คำสั่งซื้อ แค่ทำเครื่องหมาย
 *      แจ้งเตือนให้ร้านค้าเห็นชัดในชีต/อีเมล/หน้าเว็บ เพื่อให้ร้านค้าเป็นผู้ตัดสินใจขั้นสุดท้ายเสมอ
 *      ถ้ายังไม่ตั้งค่า SlipOK ไว้ ระบบจะข้ามขั้นตอนนี้ไปเฉยๆ (ทำงานเหมือนเดิมก่อนแก้ไข)
 *   3. อัปเดตคอลัมน์ "สถานะการชำระเงิน", "ลิงก์สลิปโอนเงิน" และคอลัมน์ผลตรวจสอบ (transRef, ธนาคาร,
 *      ชื่อผู้โอน, ยอดเงินในสลิป, วันเวลาที่โอนจริง) ในแถวคำสั่งซื้อที่ตรงกันในชีต Orders
 *   4. ส่งอีเมลแจ้งร้านค้า (NOTIFY_EMAIL) พร้อมแนบรูปสลิปและผลตรวจสอบไปด้วย
 * แม้ตั้งค่า SlipOK แล้ว ร้านค้าก็ยังควรตรวจสลิป/ยอดเงินเองก่อนเริ่มดำเนินการทุกครั้ง โดยเฉพาะออเดอร์ที่
 * ระบบทำเครื่องหมาย "ตรวจไม่ผ่าน" ไว้ — ระบบช่วยกรองเบื้องต้นเท่านั้น ไม่ได้แทนการตัดสินใจของร้าน 100%
 * ทดสอบได้ด้วยฟังก์ชัน testConfirmPayment() (ต้องรัน testDoPost() ให้มีคำสั่งซื้อ TEST-001 ก่อน)
 *
 * ========== เพิ่มใหม่: อีเมล + ที่อยู่จัดส่งของลูกค้า ==========
 * หน้าเว็บส่ง customerEmail / customerAddress มาด้วยตอนสร้างคำสั่งซื้อ สคริปต์จะ:
 *   1. บันทึกลงคอลัมน์ "อีเมล" และ "ที่อยู่จัดส่ง" ท้ายชีต Orders (ต่อท้ายคอลัมน์เดิมทั้งหมด เพื่อไม่ให้
 *      คอลัมน์เดิมเลื่อนตำแหน่ง กรณีชีตนี้เคยถูกสร้าง header ไปแล้วจากการ deploy ครั้งก่อนๆ)
 *   2. ใส่อีเมล/ที่อยู่ลงในอีเมลแจ้งเตือนคำสั่งซื้อใหม่ (NOTIFY_EMAIL) และตั้ง Reply-To เป็นอีเมลลูกค้าให้เลย
 *
 * ========== เพิ่มใหม่: ตารางราคาย้ายมาอยู่ในชีต "Prices" (แหล่งข้อมูลราคาที่แท้จริงจุดเดียว) ==========
 * ก่อนหน้านี้ราคาทุกตัวเลือกฝังอยู่ในโค้ดหน้าเว็บ (priceData) เท่านั้น ตอนนี้ย้ายมาไว้ในชีต "Prices" แทน
 * (สร้างอัตโนมัติพร้อมราคาเริ่มต้นตอนรันครั้งแรก) แก้ไขราคาได้จากชีตโดยตรง ไม่ต้องแตะโค้ด/ไม่ต้อง deploy ใหม่:
 *   - แก้ได้: คอลัมน์ "ชื่อที่แสดง" และ "ราคา (บาท)"
 *   - ห้ามแก้: คอลัมน์ "กลุ่ม" และ "รหัสตัวเลือก" (โค้ดใช้ 2 คอลัมน์นี้จับคู่กับตัวเลือกในหน้าเว็บ)
 * หน้าเว็บจะดึงราคาจากชีตนี้ผ่าน doGet?action=getPrices ตอนโหลดหน้าเว็บทุกครั้ง (ถ้าดึงไม่ได้ จะใช้ราคา
 * สำรองที่ฝังไว้ในโค้ดหน้าเว็บแทนชั่วคราว)
 *
 * ========== เพิ่มใหม่: คอลัมน์ "คงเหลือ" ในชีต Prices (เช็คสินค้าหมดอัตโนมัติ) ==========
 * เพิ่มคอลัมน์ E "คงเหลือ" ต่อท้ายคอลัมน์ราคา — เว้นว่าง = ไม่จำกัดสต๊อกเหมือนเดิม, ใส่ 0 = สินค้าหมด
 * (ใส่ตัวเลขอื่นเป็นแค่บันทึกช่วยจำ ระบบยังไม่ได้ตัดสต๊อกอัตโนมัติตอนมีออเดอร์เข้า ต้องมาลดในชีตเอง)
 * ผลลัพธ์เมื่อตั้งเป็น 0:
 *   1. หน้าเว็บ (doGet?action=getPrices) จะส่ง stock:0 กลับไป ตัวเลือกนั้นจะถูกปิด/แสดง "สินค้าหมด"
 *      ให้ลูกค้าเห็นทันทีที่โหลด/รีเฟรชหน้าเว็บ เลือกไม่ได้จนกว่าจะกลับมาเปิดใหม่ในชีต
 *   2. doPost ตอนสร้างคำสั่งซื้อ เช็คซ้ำอีกชั้นฝั่งเซิร์ฟเวอร์ (กันเคสลูกค้าเปิดหน้าเว็บค้างไว้นานแล้วร้าน
 *      เพิ่งอัปเดตสต๊อกพอดี) ถ้ามีตัวเลือกไหนหมดสต๊อกตอนกดยืนยัน จะปฏิเสธคำสั่งซื้อทันที (ไม่เขียนแถวลง
 *      ชีต Orders ไม่ตัดโค้ดส่วนลด) แล้วตอบกลับ { result:'error', code:'sold_out', message, soldOutItems }
 *      ให้หน้าเว็บแจ้งลูกค้าและดึงสต๊อกล่าสุดมาปิดตัวเลือกให้อัตโนมัติ
 *
 * ========== เพิ่มใหม่: แพ็กเกจสำเร็จรูป (ชีต "Presets" — แก้ไข/เพิ่ม/ลบแพ็กเกจได้จากในชีตเลย) ==========
 * เพิ่มปุ่มเลือกแพ็กเกจสำเร็จรูปไว้บนสุดของฟอร์ม (Starter / Balanced / Apex-FPS Pro เป็นค่าเริ่มต้น + ปุ่ม
 * ล้างค่า/กำหนดเองที่ตรึงไว้ถาวร) กดแพ็กเกจไหนแล้วระบบจะกรอกตัวเลือกทุกฟิลด์ให้อัตโนมัติ (ยังแก้ไขเองทีละ
 * ฟิลด์ต่อได้ตามปกติ) หน้าเว็บดึงรายการแพ็กเกจจากชีต Presets ผ่าน doGet?action=getPresets ตอนโหลดหน้าเว็บ
 * ทุกครั้ง (ถ้าดึงไม่ได้จะใช้แพ็กเกจสำรอง 3 อันที่ฝังไว้ในโค้ดหน้าเว็บแทนชั่วคราว) — หมายความว่าจะเพิ่ม/ลบ/
 * แก้ชื่อ/คำอธิบาย/ตัวเลือกของแพ็กเกจ ทำได้จากในชีต Presets ล้วนๆ ไม่ต้องแก้โค้ด HTML เลย ราคาที่แสดงบน
 * การ์ดคำนวณสดจากชีต Prices เสมอ ไม่ใช่ราคาตายตัว และถ้าตัวเลือกในแพ็กเกจดันหมดสต๊อกพอดี ระบบจะเว้นฟิลด์
 * นั้นว่างไว้ให้ลูกค้าเลือกเอง
 *
 * ========== เพิ่มใหม่: กันสแปม/บอทยิง endpoint ตรงๆ (ข้าม UI หน้าเว็บ) ==========
 * URL ของ Apps Script Web App เป็น URL สาธารณะ ใครก็ยิง POST ตรงมาที่ endpoint นี้ได้โดยไม่ผ่านหน้าเว็บเลย
 * เพิ่มการเช็ค runAntiSpamChecks() ก่อนสร้างคำสั่งซื้อใหม่ทุกครั้ง 5 ชั้น:
 *   1. Honeypot — ช่อง hpWebsite ที่ซ่อนไว้ในหน้าเว็บด้วย CSS คนมองไม่เห็น แต่บอทมักกรอกทุกช่องที่เจอ
 *   2. เวลากรอกฟอร์มเร็วผิดปกติ — เทียบ timestamp ตอนหน้าเว็บโหลดเสร็จกับตอนกดยืนยัน (ต่ำกว่า MIN_FORM_FILL_MS)
 *   3. อีเมล/ที่อยู่ต้องกรอกมาถูกรูปแบบและไม่ยาวเกินไป
 *   4. selections (PCB/Stick/Shell) ต้องตรงกับตัวเลือกที่มีจริงในชีต Prices เท่านั้น
 *   5. กันยิงคำสั่งซื้อซ้ำถี่ๆ ภายใน DUPLICATE_WINDOW_SECONDS วินาที (ดับเบิลคลิก/บอทรัว) ผ่าน CacheService
 * ถ้าติดเงื่อนไขไหนก็ตาม จะไม่เขียนแถวลงชีต Orders และตอบกลับ { result:'error', code:'invalid_request' }
 * แบบข้อความกลางๆ (ไม่บอกเหตุผลจริงกลับไปให้ผู้ยิง กันบอทปรับตัวหนี) รายละเอียดจริงบันทึกไว้ใน Logger.log
 * เท่านั้น (ดูได้จาก Apps Script > Executions)
 *
 * ========== เพิ่มใหม่: โหมด "เปลี่ยนอนาล็อกอย่างเดียว" (แยกจาก Custom Build) ==========
 * หน้าเว็บมีหน้าแรกให้เลือกโหมดก่อนเข้าฟอร์ม: "Custom Build" (ฟอร์มเดิมทั้งหมด) หรือ "เปลี่ยนอนาล็อกอย่าง
 * เดียว" (ฟอร์มสั้นๆ เลือกชนิดอนาล็อก ALPS/HE/TMR + จำนวนก้าน 1 หรือ 2 ก้าน) ราคาบริการนี้แยกชีตต่างหาก
 * ("AnalogService") เพราะคิดราคาต่อก้าน (อะไหล่ + ค่าแรง) คูณจำนวนก้าน ไม่ใช่ราคาเหมาชุดแบบตอนอัปเกรด
 * Stick Module ในงาน Custom Build (ชีต Prices เดิมไม่ถูกแตะเลย)
 *
 * ทุกคำขอสร้างคำสั่งซื้อจะมี data.orderType บอกว่าเป็น 'analogOnly' หรือไม่ (ค่าเริ่มต้น/ไม่ระบุ = ถือเป็น
 * 'custom' เหมือนเดิม) — runAntiSpamChecks / findSoldOutSelections / computeServerSubtotal ทั้งหมดแยกสาขา
 * การตรวจสอบตาม orderType นี้ แต่ยังใช้ชีต Orders คอลัมน์เดิมทุกคอลัมน์ร่วมกัน (คอลัมน์ "รายการ" เป็นข้อความ
 * อิสระที่ frontend สร้างเอง จึงไม่ต้องเพิ่ม/แก้คอลัมน์ในชีต Orders เลย)
 *
 * ที่สำคัญกว่านั้น: doPost ตอนสร้างคำสั่งซื้อใหม่ ไม่ได้ "เชื่อ" ยอด subtotal ที่หน้าเว็บส่งมาเฉยๆ อีกต่อไป —
 * จะคำนวณยอดจริงเองจากชีต Prices โดยอิงตัวเลือกที่ลูกค้าเลือก (data.selections) แล้วใช้ยอดที่คำนวณเองเสมอ
 * ถ้ายอดจากหน้าเว็บกับยอดที่คำนวณได้ไม่ตรงกัน (เช่น มีคนแก้ราคาในเบราว์เซอร์เอง) ระบบจะ:
 *   1. ใช้ยอดที่ถูกต้องจริงๆ เสมอ (ไม่ใช้ยอดที่หน้าเว็บส่งมา)
 *   2. บันทึกหมายเหตุไว้ในคอลัมน์ "ผลตรวจสอบราคา" ของชีต Orders
 *   3. ขึ้นหัวข้ออีเมลแจ้งเตือนเป็น "⚠ ตรวจสอบราคา — ..." ให้เห็นชัดว่ามีความผิดปกติเกิดขึ้น
 * ปิดช่องโหว่เดิมที่เคยเตือนไว้ด้านบนว่า "subtotal ยังคงเชื่อค่าที่หน้าเว็บส่งมาอยู่" เรียบร้อยแล้ว
 */

var NOTIFY_EMAIL = 'moszombie1@gmail.com'; // ใส่อีเมลตรงนี้ถ้าต้องการให้แจ้งเตือนทางอีเมลด้วย
var ORDERS_SHEET_NAME = 'Orders';
var DISCOUNTS_SHEET_NAME = 'Discounts';
var PRICES_SHEET_NAME = 'Prices';
var PRESETS_SHEET_NAME = 'Presets';
var ANALOG_SERVICE_SHEET_NAME = 'AnalogService';
var SETTINGS_SHEET_NAME = 'Settings';
var SLIPS_FOLDER_NAME = 'Payment Slips - คำสั่งซื้อ'; // โฟลเดอร์ใน Google Drive ที่จะเก็บรูปสลิปโอนเงิน

// ========== ตรวจสอบสลิปโอนเงินจริงกับธนาคาร (SlipOK API) ==========
// วิธีสมัคร (ฟรี 100 สลิป/เดือน ไม่มีข้อผูกมัด — เกินโควต้าคิด ~1 บาท/รายการ):
//   1. ไปที่ https://slipok.com กด "ทดลองใช้งาน" > เลือกแบบ "ธุรกิจ" > แอด LINE OA แล้วทำตามขั้นตอน
//      สมัครแพ็กเกจ "OK BASIC" (ฟรี) — ตอนสมัครต้องผูก "บัญชี/พร้อมเพย์ที่รับเงินจริงของร้าน" ไว้ในระบบ
//      ด้วย (ใช้เลขเดียวกับ PROMPTPAY_ID ในหน้าเว็บ) ไม่งั้นระบบจะเช็ค "โอนผิดบัญชี" ให้ไม่ได้
//   2. หลังสมัครจะได้ "API Key" และ "Branch ID" มาจากแอดมิน SlipOK ใส่ค่าไว้ 2 บรรทัดด้านล่างนี้
//   3. ถ้าปล่อยว่างไว้ ระบบจะยังทำงานได้ปกติทุกอย่าง แค่ข้ามขั้นตอนตรวจสอบอัตโนมัตินี้ไปเฉยๆ
//      (เหมือนเดิมก่อนแก้ไข คือร้านต้องตรวจสลิปเองทั้งหมด)
var SLIPOK_API_KEY = 'SLIPOKWND9NDM'; // ใส่ API Key จาก SlipOK ตรงนี้
var SLIPOK_BRANCH_ID = '71143'; // ใส่ Branch ID จาก SlipOK ตรงนี้ (ตัวเลขไม่กี่หลัก)

// รหัสธนาคาร -> ชื่อเต็ม (ใช้แค่แสดงผลให้อ่านง่ายขึ้นในชีต/อีเมล ไม่กระทบการตรวจสอบ)
var BANK_CODE_NAMES = {
  '002':'ธนาคารกรุงเทพ', '004':'ธนาคารกสิกรไทย', '006':'ธนาคารกรุงไทย', '011':'ธนาคารทหารไทยธนชาต',
  '014':'ธนาคารไทยพาณิชย์', '025':'ธนาคารกรุงศรีอยุธยา', '069':'ธนาคารเกียรตินาคินภัทร', '022':'ธนาคารซีไอเอ็มบีไทย',
  '067':'ธนาคารทิสโก้', '024':'ธนาคารยูโอบี', '071':'ธนาคารไทยเครดิตเพื่อรายย่อย', '073':'ธนาคารแลนด์ แอนด์ เฮ้าส์',
  '070':'ธนาคารไอซีบีซี (ไทย)', '030':'ธนาคารออมสิน', '033':'ธนาคารอาคารสงเคราะห์', '034':'ธ.ก.ส.', '035':'ธนาคารเพื่อการส่งออกและนำเข้าฯ'
};

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('เขียนลงไฟล์: ' + ss.getName() + ' | URL: ' + ss.getUrl());

    var data = JSON.parse(e.postData.contents);

    // ปุ่ม "ฉันโอนเงินแล้ว" ในหน้าเว็บ (หลังสร้างคำสั่งซื้อแล้ว) ยิงมาที่นี่แยกจากการสร้างคำสั่งซื้อใหม่
    if (data.action === 'confirmPayment') {
      return handleConfirmPayment(ss, data);
    }

    // ========== กันสแปม/บอทยิง endpoint ตรงๆ (ข้ามหน้าเว็บ) ==========
    // เช็ค 4 ชั้น: honeypot ที่คนมองไม่เห็นแต่บอทมักกรอก, เวลากรอกฟอร์มเร็วผิดปกติ, ข้อมูลที่จำเป็นไม่ครบ/
    // ไม่ตรงกับตัวเลือกจริงในชีต, และคำสั่งซื้อซ้ำถี่เกินไปในเวลาสั้นๆ (กันดับเบิลคลิก/ยิงรัว)
    var spamCheck = runAntiSpamChecks(ss, data);
    if (!spamCheck.ok) {
      Logger.log('SPAM BLOCKED: ' + spamCheck.reason + ' | payload=' + JSON.stringify(data).slice(0, 500));
      return jsonOutput({ result: 'error', code: 'invalid_request', message: 'คำขอไม่ถูกต้อง กรุณาลองใหม่อีกครั้งผ่านหน้าเว็บ' });
    }

    // เช็คสต๊อกกันเคส race condition: ลูกค้าเปิดหน้าเว็บค้างไว้นาน แล้วร้านเพิ่งอัปเดตชีตว่าของหมด
    // ระหว่างนั้นพอดี — ปฏิเสธการสร้างคำสั่งซื้อทันทีถ้ามีตัวเลือกไหนหมดสต๊อก (ไม่เขียนแถวลงชีต ไม่ตัดโค้ดส่วนลด)
    var orderType = (data.orderType === 'analogOnly') ? 'analogOnly' : 'custom';

    // เช็คว่าโหมดนี้เปิดรับออเดอร์อยู่ไหม (ดูจากชีต "Settings") — กันกรณีร้านปิดรับโหมดนี้ชั่วคราวแล้วมีคน
    // ยิง request ตรงๆ ข้ามหน้าเว็บ (ฝั่งหน้าเว็บก็เช็คแล้วเช่นกัน แต่ฝั่งเซิร์ฟเวอร์ต้องเช็คซ้ำเสมอ)
    var settingsMap = getSettingsMap(ss);
    var modeEnabledKey = (orderType === 'analogOnly') ? 'analogOnlyEnabled' : 'customBuildEnabled';
    if (settingsMap[modeEnabledKey] === false) {
      return jsonOutput({
        result: 'error',
        code: 'mode_disabled',
        message: 'ขออภัย ร้านปิดรับออเดอร์โหมดนี้ชั่วคราว กรุณาลองใหม่ภายหลังหรือติดต่อร้านโดยตรง'
      });
    }

    var soldOutItems = findSoldOutSelections(ss, orderType, data.selections);
    if (soldOutItems.length > 0) {
      return jsonOutput({
        result: 'error',
        code: 'sold_out',
        message: 'ขออภัย ตัวเลือกต่อไปนี้สินค้าหมดพอดี กรุณารีเฟรชหน้าเว็บแล้วเลือกใหม่: ' + soldOutItems.join(', '),
        soldOutItems: soldOutItems
      });
    }

    var clientSubtotal = Number(data.subtotal || data.total || 0);
    var serverSubtotal = computeServerSubtotal(ss, orderType, data.selections);
    var subtotal = (serverSubtotal !== null) ? serverSubtotal : clientSubtotal;

    var priceCheckNote = '';
    if (serverSubtotal !== null && serverSubtotal !== clientSubtotal) {
      priceCheckNote = 'ยอดจากหน้าเว็บ (' + clientSubtotal + ') ไม่ตรงกับราคาจริงในชีต Prices — ใช้ยอดที่ถูกต้อง (' + serverSubtotal + ') แทนแล้ว';
      Logger.log('WARNING: subtotal mismatch — client=' + clientSubtotal + ' server=' + serverSubtotal + ' order=' + (data.orderCode || ''));
    } else if (serverSubtotal === null) {
      priceCheckNote = 'ไม่สามารถตรวจสอบราคากับชีต Prices ได้ (ไม่มี selections หรือคีย์ไม่ตรง) — ใช้ยอดจากหน้าเว็บ กรุณาตรวจสอบเอง';
    }

    var requestedCode = (data.discountCode || '').toString().trim();

    var discountResult = { valid: false, percent: 0, reason: '' };
    if (requestedCode) {
      discountResult = validateAndConsumeDiscount(ss, requestedCode);
    }

    var discountPercent = discountResult.valid ? discountResult.percent : 0;
    var discountAmount = discountResult.valid ? Math.round(subtotal * discountPercent / 100) : 0;
    var total = subtotal - discountAmount;

    var sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(ORDERS_SHEET_NAME);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['วันที่/เวลา', 'เลขที่คำสั่งซื้อ', 'รายการ', 'ราคารวมก่อนลด', 'โค้ดส่วนลด', 'สถานะโค้ด', 'ส่วนลด (บาท)', 'ยอดรวมสุทธิ', 'สถานะการชำระเงิน', 'ลิงก์สลิปโอนเงิน', 'อีเมล', 'ที่อยู่จัดส่ง', 'ผลตรวจสอบราคา']);
      sheet.setFrozenRows(1);
    }

    var codeStatus = '';
    if (requestedCode) {
      codeStatus = discountResult.valid ? 'ใช้ได้ (-' + discountPercent + '%)' : discountResult.reason;
    }

    sheet.appendRow([
      new Date(),
      data.orderCode || '',
      data.summary || '',
      subtotal,
      requestedCode,
      codeStatus,
      discountAmount,
      total,
      'รอลูกค้าชำระเงิน',
      '',
      data.customerEmail || '',
      data.customerAddress || '',
      priceCheckNote
    ]);

    Logger.log('เขียนแถวสำเร็จ แถวล่าสุดตอนนี้คือแถวที่: ' + sheet.getLastRow());

    if (NOTIFY_EMAIL && NOTIFY_EMAIL.indexOf('@') > -1) {
      var customerEmail = (data.customerEmail || '').toString().trim();
      var mailOptions = {
        to: NOTIFY_EMAIL,
        subject: (priceCheckNote ? '⚠ ตรวจสอบราคา — ' : '') + 'มีคำสั่งซื้อใหม่ #' + (data.orderCode || ''),
        body: (data.summary || '') + '\n\nราคารวมก่อนลด: ' + subtotal +
              (requestedCode ? '\nโค้ดส่วนลด: ' + requestedCode + ' — ' + (codeStatus || '-') : '') +
              '\nยอดรวมสุทธิ: ' + total +
              '\n\nอีเมลลูกค้า: ' + (customerEmail || '-') +
              '\nที่อยู่จัดส่ง: ' + (data.customerAddress || '-') +
              (priceCheckNote ? '\n\n⚠ ' + priceCheckNote : '') +
              '\n\n---\nลิงก์สเปรดชีตที่บันทึกจริง: ' + ss.getUrl()
      };
      // ตั้ง reply-to เป็นอีเมลลูกค้า เผื่อร้านอยากกด Reply คุยกับลูกค้าโดยตรงจากอีเมลแจ้งเตือนนี้เลย
      if (customerEmail.indexOf('@') > -1) {
        mailOptions.replyTo = customerEmail;
      }
      MailApp.sendEmail(mailOptions);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        result: 'success',
        sheetUrl: ss.getUrl(),
        discountApplied: discountResult.valid,
        discountReason: discountResult.valid ? '' : discountResult.reason,
        total: total
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('ERROR: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========== เช็กโค้ดส่วนลดแบบสด (เรียกตอนลูกค้ากด "ใช้โค้ด" ในหน้าเว็บ) ==========
// อ่านอย่างเดียว ไม่แก้อะไรในชีต ไม่นับเป็นการใช้งานโค้ด
function doGet(e) {
  var action = e.parameter.action;

  if (action === 'checkDiscount') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var code = String(e.parameter.code || '').trim();
    var result = code
      ? evaluateDiscount(findDiscountRow(ss, code))
      : { valid: false, percent: 0, reason: 'ไม่พบโค้ดนี้' };

    return ContentService
      .createTextOutput(JSON.stringify({ valid: result.valid, percent: result.percent, reason: result.reason }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // หน้าเว็บเรียกตอนโหลดหน้าแรก เพื่อดึงตารางราคาปัจจุบันจากชีต "Prices" มาแสดง/คำนวณ
  if (action === 'getPrices') {
    var ssPrices = SpreadsheetApp.getActiveSpreadsheet();
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', prices: getPricesMap(ssPrices) }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // หน้าเว็บเรียกตอนโหลดหน้าแรก เพื่อดึงรายการแพ็กเกจสำเร็จรูปจากชีต "Presets" มาสร้างปุ่มให้อัตโนมัติ
  if (action === 'getPresets') {
    var ssPresets = SpreadsheetApp.getActiveSpreadsheet();
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', presets: getPresetsList(ssPresets) }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // หน้าเว็บเรียกตอนเลือกโหมด "เปลี่ยนอนาล็อกอย่างเดียว" เพื่อดึงราคาอะไหล่+ค่าแรงจากชีต "AnalogService"
  if (action === 'getAnalogPrices') {
    var ssAnalog = SpreadsheetApp.getActiveSpreadsheet();
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', analogPrices: getAnalogServiceMap(ssAnalog) }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // หน้าเว็บเรียกตอนโหลดหน้าแรก (mode-select) เพื่อเช็คว่าโหมดไหนเปิด/ปิดรับออเดอร์อยู่จากชีต "Settings"
  if (action === 'getSettings') {
    var ssSettings = SpreadsheetApp.getActiveSpreadsheet();
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', settings: getSettingsMap(ssSettings) }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: 'error', message: 'unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========== ตารางราคา (ชีต "Prices" — แหล่งข้อมูลราคาจริงเพียงที่เดียว ทั้งฝั่งแสดงผลและฝั่งตรวจสอบ) ==========
// อ่านทุกแถวในชีต Prices แล้วแปลงเป็น { กลุ่ม: { รหัสตัวเลือก: { label, price, stock } } }
// stock: null = ไม่จำกัด (เว้นว่างในชีต), ตัวเลข = จำนวนคงเหลือจริง (0 = สินค้าหมด หน้าเว็บจะปิดตัวเลือกนี้อัตโนมัติ)
function getPricesMap(ss) {
  var sheet = ss.getSheetByName(PRICES_SHEET_NAME);
  if (!sheet) sheet = createPricesSheet(ss);

  var lastRow = sheet.getLastRow();
  var map = {};
  if (lastRow < 2) return map;

  // กลุ่ม | รหัสตัวเลือก | ชื่อที่แสดง | ราคา | คงเหลือ (คอลัมน์ E เพิ่มใหม่ — เว้นว่างได้ถ้าไม่ต้องการจำกัดสต๊อก)
  var values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  for (var i = 0; i < values.length; i++) {
    var group = (values[i][0] || '').toString().trim();
    var option = (values[i][1] || '').toString().trim();
    var label = (values[i][2] || '').toString().trim();
    var price = Number(values[i][3]) || 0;
    var stockRaw = values[i][4];
    var stock = (stockRaw === '' || stockRaw === null || stockRaw === undefined) ? null : Number(stockRaw);
    if (stock !== null && isNaN(stock)) stock = null; // กันชีตกรอกค่าที่ไม่ใช่ตัวเลขมาโดยไม่ตั้งใจ
    if (!group || !option) continue;
    if (!map[group]) map[group] = {};
    map[group][option] = { label: label, price: price, stock: stock };
  }
  return map;
}

// ========== กันสแปม/บอทยิง endpoint ตรงๆ (ข้าม UI หน้าเว็บ) ==========
// MIN_FORM_FILL_MS: เวลาต่ำสุด (มิลลิวินาที) นับจากหน้าเว็บโหลดเสร็จถึงตอนกดยืนยัน — ถ้าเร็วกว่านี้มาก
// แสดงว่าไม่ใช่คนกรอกจริง (คนจริงต้องพิมพ์อีเมล/ที่อยู่อย่างน้อยไม่กี่วินาที) ปรับตัวเลขนี้ได้ถ้ารู้สึกว่า
// เข้มไป/หลวมไป — ต่ำไปจะจับบอทไม่ได้ สูงไปจะไปบล็อกลูกค้าจริงที่กรอกไว inline ผ่าน autofill ของเบราว์เซอร์
var MIN_FORM_FILL_MS = 1500;
// DUPLICATE_WINDOW_SECONDS: ถ้ามีคำสั่งซื้อหน้าตาเดียวกันทุกอย่าง (อีเมล+ที่อยู่+ยอดเงิน) ส่งซ้ำเข้ามาภายใน
// ไม่กี่วินาทีนี้ ถือว่าเป็นการกดซ้ำ/ยิงรัว ไม่สร้างคำสั่งซื้อซ้ำให้
var DUPLICATE_WINDOW_SECONDS = 30;

function runAntiSpamChecks(ss, data) {
  // 1) Honeypot — ช่องที่คนมองไม่เห็นในหน้าเว็บ (ซ่อนด้วย CSS) แต่บอทที่กรอกฟอร์มอัตโนมัติมักจะกรอกทุกช่อง
  //    ที่เจอใน DOM รวมถึงช่องที่ซ่อนไว้ด้วย ถ้าช่องนี้มีค่าใดๆ เข้ามา แปลว่าไม่ใช่คนกรอกแน่นอน
  var honeypot = (data.hpWebsite || '').toString().trim();
  if (honeypot) {
    return { ok: false, reason: 'honeypot filled: "' + honeypot + '"' };
  }

  // 2) เวลากรอกฟอร์มเร็วผิดปกติ — data.formRenderedAt คือ timestamp (ms) ที่หน้าเว็บส่งมาตอนโหลดเสร็จ
  var renderedAt = Number(data.formRenderedAt || 0);
  if (renderedAt > 0) {
    var elapsedMs = Date.now() - renderedAt;
    if (elapsedMs >= 0 && elapsedMs < MIN_FORM_FILL_MS) {
      return { ok: false, reason: 'submitted too fast (' + elapsedMs + 'ms)' };
    }
  }

  // 3) ข้อมูลจำเป็นต้องครบและสมเหตุสมผล กันเพย์โหลดขยะ/ฟิลด์เกินขนาดที่บอทยิงมาตรงๆ
  var email = (data.customerEmail || '').toString().trim();
  var address = (data.customerAddress || '').toString().trim();
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !EMAIL_PATTERN.test(email) || email.length > 200) {
    return { ok: false, reason: 'invalid email: "' + email.slice(0, 100) + '"' };
  }
  if (!address || address.length > 2000) {
    return { ok: false, reason: 'invalid address length (' + address.length + ')' };
  }

  // 4) selections ต้องเป็นตัวเลือกที่มีจริงในชีตราคาเท่านั้น (กันเพย์โหลดที่ไม่ได้มาจากฟอร์มจริง)
  //    แยกเช็คตาม data.orderType — 'analogOnly' ใช้ชีต AnalogService, ที่เหลือ (ค่าเริ่มต้น/'custom') ใช้ชีต Prices
  var sel = data.selections || {};
  if (data.orderType === 'analogOnly') {
    var analogMap = getAnalogServiceMap(ss);
    var analogType = (sel.analogType || '').toString().trim();
    var quantity = Number(sel.quantity || 0);
    if (!analogType || !analogMap[analogType]) {
      return { ok: false, reason: 'invalid/missing analogType: "' + analogType + '"' };
    }
    if (quantity !== 1 && quantity !== 2) {
      return { ok: false, reason: 'invalid quantity: "' + sel.quantity + '"' };
    }
    if (quantity === 1) {
      var side = (sel.side || '').toString().trim();
      if (side !== 'left' && side !== 'right') {
        return { ok: false, reason: 'invalid/missing side for quantity=1: "' + side + '"' };
      }
    }
  } else {
    var pricesMap = getPricesMap(ss);
    var requiredGroups = ['pcb', 'stickModule', 'ps4shell'];
    for (var i = 0; i < requiredGroups.length; i++) {
      var g = requiredGroups[i];
      var val = (sel[g] || '').toString().trim();
      if (!val || !pricesMap[g] || !pricesMap[g][val]) {
        return { ok: false, reason: 'invalid/missing selection for "' + g + '": "' + val + '"' };
      }
    }
  }

  // 5) กันยิงคำสั่งซื้อซ้ำถี่ๆ (ดับเบิลคลิก/บอทรัว) — ใช้ CacheService เก็บลายนิ้วมือคำสั่งซื้อไว้ชั่วคราว
  var fingerprint = [email, address, Number(data.subtotal || data.total || 0)].join('|');
  var cache = CacheService.getScriptCache();
  var cacheKey = 'order_fp_' + Utilities.base64EncodeWebSafe(Utilities.newBlob(fingerprint).getBytes()).slice(0, 200);
  if (cache.get(cacheKey)) {
    return { ok: false, reason: 'duplicate order within ' + DUPLICATE_WINDOW_SECONDS + 's window' };
  }
  cache.put(cacheKey, '1', DUPLICATE_WINDOW_SECONDS);

  return { ok: true };
}

// เช็คว่า selections ที่ลูกค้าส่งมามีตัวเลือกไหนที่สินค้าหมด (stock === 0) แล้วบ้าง
// คืนค่าเป็น array ของ label ตัวเลือกที่หมด (array ว่าง = ผ่านหมด ของครบ)
// orderType: 'analogOnly' เช็คกับชีต AnalogService, ที่เหลือ (ค่าเริ่มต้น/'custom') เช็คกับชีต Prices ตามเดิม
function findSoldOutSelections(ss, orderType, selections) {
  var soldOut = [];
  if (!selections || typeof selections !== 'object') return soldOut;

  if (orderType === 'analogOnly') {
    var analogMap = getAnalogServiceMap(ss);
    var chosen = (selections.analogType || '').toString().trim();
    var entry = chosen && analogMap[chosen];
    if (entry && entry.stock === 0) {
      soldOut.push(entry.label || ('analogType:' + chosen));
    }
    return soldOut;
  }

  var pricesMap = getPricesMap(ss);
  var groups = ['pcb', 'paddles', 'triggerBumper', 'faceButtons', 'stickModule', 'ps4shell'];
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    var val = (selections[g] || '').toString().trim();
    if (!val) continue;
    var groupPrices = pricesMap[g];
    var priceEntry = groupPrices && groupPrices[val];
    if (priceEntry && priceEntry.stock === 0) {
      soldOut.push(priceEntry.label || (g + ':' + val));
    }
  }
  return soldOut;
}

// คำนวณยอดรวม (subtotal) จริงจากชีตราคา โดยอิงตัวเลือกที่ลูกค้าเลือกจริง (data.selections จากหน้าเว็บ)
// คืนค่า null ถ้าตรวจสอบไม่ได้ (ไม่มี selections มา หรือมีคีย์ที่จับคู่กับชีตราคาไม่ได้) — กรณีนี้ doPost จะ
// fallback ไปใช้ยอดที่หน้าเว็บส่งมาแทน แต่จะบันทึกหมายเหตุไว้ให้ร้านตรวจสอบเอง
// orderType: 'analogOnly' คำนวณจากชีต AnalogService (ราคาอะไหล่+ค่าแรง ต่อก้าน คูณจำนวนก้าน),
//            ที่เหลือ (ค่าเริ่มต้น/'custom') คำนวณจากชีต Prices เหมือนเดิมทุกประการ
function computeServerSubtotal(ss, orderType, selections) {
  if (!selections || typeof selections !== 'object') return null;

  if (orderType === 'analogOnly') {
    var analogMap = getAnalogServiceMap(ss);
    var analogType = (selections.analogType || '').toString().trim();
    var quantity = Number(selections.quantity || 0);
    if (!analogType || !analogMap[analogType] || (quantity !== 1 && quantity !== 2)) return null;
    var unitPrice = (Number(analogMap[analogType].partPrice) || 0) + (Number(analogMap[analogType].laborPrice) || 0);
    return unitPrice * quantity;
  }

  var groups = ['pcb', 'paddles', 'triggerBumper', 'faceButtons', 'stickModule', 'ps4shell'];
  var pricesMap = getPricesMap(ss);
  var total = 0;

  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    var chosen = (selections[g] || '').toString().trim();
    if (!chosen) return null;
    var groupPrices = pricesMap[g];
    if (!groupPrices || !groupPrices[chosen]) return null;
    total += Number(groupPrices[chosen].price) || 0;
  }

  return total;
}

// สร้างชีต Prices พร้อมราคาเริ่มต้น (ตรงกับราคาที่เคยฝังในโค้ดหน้าเว็บ) — แก้ไขราคาได้ที่คอลัมน์
// "ชื่อที่แสดง" กับ "ราคา (บาท)" เท่านั้น ห้ามแก้คอลัมน์ "กลุ่ม" กับ "รหัสตัวเลือก" เพราะโค้ดใช้จับคู่
// คอลัมน์ "คงเหลือ" (E) เป็นตัวเลือกเสริม: เว้นว่างไว้ = ไม่จำกัดสต๊อก, ใส่ 0 = สินค้าหมด (หน้าเว็บจะปิด
// ตัวเลือกนี้ให้อัตโนมัติทันทีที่รีเฟรชหน้า), ใส่ตัวเลขอื่นๆ ระบบจะยังไม่ลดให้อัตโนมัติตอนมีออเดอร์เข้า
// (ต้องมาลดเองในชีต) — ใช้เป็นตัวช่วยเตือน ไม่ใช่ระบบสต๊อกเต็มรูปแบบ
function createPricesSheet(ss) {
  var sheet = ss.insertSheet(PRICES_SHEET_NAME);
  sheet.appendRow(['กลุ่ม (ห้ามแก้)', 'รหัสตัวเลือก (ห้ามแก้)', 'ชื่อที่แสดง (แก้ได้)', 'ราคา บาท (แก้ได้)', 'คงเหลือ (เว้นว่าง=ไม่จำกัด, 0=สินค้าหมด)']);
  var rows = [
    ['pcb', 'suiovoi', 'SuiOvOi 8K', 2000, ''],
    ['pcb', 'hyperstrike', 'Hyperstrike 8K', 2500, ''],
    ['paddles', 'none', 'ไม่มี', 0, ''],
    ['paddles', 'one', '1 ปุ่ม', 300, ''],
    ['paddles', 'two', '2 ปุ่ม', 500, ''],
    ['triggerBumper', 'none', 'ไม่เพิ่ม Trigger/Bumper Clicky', 0, ''],
    ['triggerBumper', 'clicky', 'Trigger/Bumper Clicky', 550, ''],
    ['faceButtons', 'dpad', 'D-pad Clicky Button', 350, ''],
    ['faceButtons', 'fullface', 'Full Face Clicky Button', 600, ''],
    ['stickModule', 'alps', 'ALPS', 200, ''],
    ['stickModule', 'he', 'HE', 400, ''],
    ['stickModule', 'tmr', 'TMR', 600, ''],
    ['ps4shell', 'withController', 'ส่งจอยมาให้ทำ (มีคอนโทรลเลอร์ PS4 เอง)', 0, ''],
    ['ps4shell', 'noController', 'ไม่มีจอย PS4 (ทางร้านจัดหากรอบให้)', 400, '']
  ];
  rows.forEach(function(r){ sheet.appendRow(r); });
  sheet.setFrozenRows(1);
  return sheet;
}

// ========== บริการ "เปลี่ยนอนาล็อกอย่างเดียว" (ชีต "AnalogService" — แยกจากชีต Prices เพราะคิดราคา
// ต่อก้าน + มีค่าแรงแยกต่างหาก ไม่ใช่ราคาแบบเหมาชุดเหมือนตอนอัปเกรดในงาน Custom Build) ==========
// อ่านทุกแถวแล้วแปลงเป็น { รหัส: { label, partPrice, laborPrice, stock } }
function getAnalogServiceMap(ss) {
  var sheet = ss.getSheetByName(ANALOG_SERVICE_SHEET_NAME);
  if (!sheet) sheet = createAnalogServiceSheet(ss);

  var lastRow = sheet.getLastRow();
  var map = {};
  if (lastRow < 2) return map;

  // รหัส | ชื่อที่แสดง | ราคาอะไหล่ต่อก้าน | ค่าแรงต่อก้าน | คงเหลือ
  var values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  for (var i = 0; i < values.length; i++) {
    var code = (values[i][0] || '').toString().trim();
    if (!code) continue;
    var stockRaw = values[i][4];
    var stock = (stockRaw === '' || stockRaw === null || stockRaw === undefined) ? null : Number(stockRaw);
    if (stock !== null && isNaN(stock)) stock = null;

    map[code] = {
      label: (values[i][1] || '').toString().trim(),
      partPrice: Number(values[i][2]) || 0,
      laborPrice: Number(values[i][3]) || 0,
      stock: stock
    };
  }
  return map;
}

// สร้างชีต AnalogService พร้อมราคาเริ่มต้น (ตัวเลขตัวอย่าง — แก้เป็นราคาจริงของร้านได้เลยจากในชีต)
// ราคารวมต่อก้าน = ราคาอะไหล่ + ค่าแรง แล้วคูณด้วยจำนวนก้านที่ลูกค้าเลือก (1 หรือ 2) ตอนคำนวณยอดจริง
// ห้ามแก้คอลัมน์ "รหัส" (A) เพราะโค้ดหน้าเว็บ/แบ็กเอนด์ใช้จับคู่กับตัวเลือกที่ลูกค้าเลือก
function createAnalogServiceSheet(ss) {
  var sheet = ss.insertSheet(ANALOG_SERVICE_SHEET_NAME);
  sheet.appendRow(['รหัส (ห้ามแก้)', 'ชื่อที่แสดง (แก้ได้)', 'ราคาอะไหล่ต่อก้าน บาท (แก้ได้)', 'ค่าแรงต่อก้าน บาท (แก้ได้)', 'คงเหลือ (เว้นว่าง=ไม่จำกัด, 0=สินค้าหมด)']);
  var rows = [
    ['alps', 'ALPS', 100, 100, ''],
    ['he', 'HE', 200, 100, ''],
    ['tmr', 'TMR', 300, 100, '']
  ];
  rows.forEach(function(r){ sheet.appendRow(r); });
  sheet.setFrozenRows(1);
  return sheet;
}

// ========== ตั้งค่าเปิด/ปิดรับออเดอร์แต่ละโหมด (ชีต "Settings") ==========
// ใช้ตอนอยากปิดรับออเดอร์โหมดใดโหมดหนึ่งชั่วคราว (เช่น คิวเต็ม, พักงาน Custom Build ไปโฟกัสงานซ่อม) โดยไม่ต้อง
// แก้โค้ดเลย — แค่เปลี่ยนค่าในชีตเป็น FALSE การ์ดโหมดนั้นจะกดเข้าไม่ได้ในหน้าเว็บทันที (รีเฟรชหน้าเว็บ) และ
// ฝั่งเซิร์ฟเวอร์ก็ปฏิเสธคำสั่งซื้อของโหมดนั้นด้วย (กันกรณีมีคนยิง request ตรงๆ ข้ามหน้าเว็บ)
function getSettingsMap(ss) {
  var sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) sheet = createSettingsSheet(ss);

  var lastRow = sheet.getLastRow();
  var map = {};
  if (lastRow < 2) return map;

  // รหัสตั้งค่า | ค่า (TRUE/FALSE) | คำอธิบาย
  var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (var i = 0; i < values.length; i++) {
    var key = (values[i][0] || '').toString().trim();
    if (!key) continue;
    var raw = values[i][1];
    // เว้นว่าง/พิมพ์อะไรมาก็ตามที่ไม่ใช่ FALSE ชัดเจน ถือว่า "เปิด" ไว้ก่อน กันเผลอปิดร้านทั้งเว็บเพราะพิมพ์ผิด
    map[key] = !(raw === false || String(raw).trim().toUpperCase() === 'FALSE');
  }
  return map;
}

// สร้างชีต Settings พร้อมค่าเริ่มต้น (เปิดรับออเดอร์ทั้งสองโหมด) — เปลี่ยน TRUE/FALSE ในคอลัมน์ B ได้เลย
// ห้ามแก้คอลัมน์ "รหัสตั้งค่า" (A) เพราะโค้ดหน้าเว็บ/แบ็กเอนด์ใช้จับคู่กับชื่อนี้ตรงๆ
function createSettingsSheet(ss) {
  var sheet = ss.insertSheet(SETTINGS_SHEET_NAME);
  sheet.appendRow(['รหัสตั้งค่า (ห้ามแก้)', 'ค่า (TRUE=เปิด / FALSE=ปิด)', 'คำอธิบาย']);
  sheet.appendRow(['customBuildEnabled', true, 'เปิด/ปิดรับออเดอร์โหมด Custom Build (การ์ดบนหน้าแรกของเว็บ)']);
  sheet.appendRow(['analogOnlyEnabled', true, 'เปิด/ปิดรับออเดอร์โหมด เปลี่ยนอนาล็อกอย่างเดียว (การ์ดบนหน้าแรกของเว็บ)']);
  sheet.setFrozenRows(1);
  return sheet;
}

// ========== แพ็กเกจสำเร็จรูป (ชีต "Presets" — แก้ไข/เพิ่ม/ลบแพ็กเกจได้จากในชีตเลย ไม่ต้องแตะ HTML) ==========
// อ่านทุกแถวในชีต Presets แล้วแปลงเป็น array ของแพ็กเกจ เรียงตามคอลัมน์ "ลำดับ" จากน้อยไปมาก
// ข้าม (ไม่ส่งให้หน้าเว็บ) แถวที่คอลัมน์ "เปิดใช้งาน" เป็น FALSE ชัดเจน — เว้นว่างถือว่าเปิดใช้งาน
function getPresetsList(ss) {
  var sheet = ss.getSheetByName(PRESETS_SHEET_NAME);
  if (!sheet) sheet = createPresetsSheet(ss);

  var lastRow = sheet.getLastRow();
  var list = [];
  if (lastRow < 2) return list;

  // ลำดับ | รหัส | ไอคอน | ชื่อแพ็กเกจ | คำอธิบาย | PCB | ปุ่มหลัง | ด้านปุ่มหลัง | Trigger/Face | Stick Module | PS4 Shell | เปิดใช้งาน
  var values = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  for (var i = 0; i < values.length; i++) {
    var key = (values[i][1] || '').toString().trim();
    if (!key) continue;
    var enabledRaw = values[i][11];
    var enabled = !(enabledRaw === false || String(enabledRaw).trim().toUpperCase() === 'FALSE');
    if (!enabled) continue;

    list.push({
      order: Number(values[i][0]) || (i + 1),
      key: key,
      icon: (values[i][2] || '').toString().trim(),
      name: (values[i][3] || '').toString().trim(),
      desc: (values[i][4] || '').toString().trim(),
      pcb: (values[i][5] || '').toString().trim(),
      paddles: (values[i][6] || '').toString().trim(),
      paddleSide: (values[i][7] || '').toString().trim(),
      triggerFace: (values[i][8] || '').toString().trim(),
      stickModule: (values[i][9] || '').toString().trim(),
      ps4shell: (values[i][10] || '').toString().trim()
    });
  }
  list.sort(function(a, b){ return a.order - b.order; });
  return list;
}

// สร้างชีต Presets พร้อมแพ็กเกจเริ่มต้น 3 แพ็กเกจ (ตรงกับที่เคยฝังในโค้ดหน้าเว็บ) — แก้ไข/เพิ่ม/ลบแถวได้
// อิสระ ห้ามแก้แค่คอลัมน์ "รหัส" ของแพ็กเกจที่มีอยู่แล้ว (ถ้าจะเปลี่ยนรหัส ให้ลบแถวเดิมแล้วเพิ่มแถวใหม่แทน)
// ค่าที่ใส่ได้ในแต่ละคอลัมน์ตัวเลือกต้องตรงกับ "รหัสตัวเลือก" ในชีต Prices เท่านั้น:
//   PCB: suiovoi / hyperstrike
//   ปุ่มหลัง: none / one / two
//   ด้านปุ่มหลัง: left / right (ใส่เฉพาะตอนปุ่มหลัง = one, ถ้าไม่ใช่เว้นว่างได้)
//   Trigger/Face: none / clicky / full
//   Stick Module: alps / he / tmr
//   PS4 Shell: withController / noController
function createPresetsSheet(ss) {
  var sheet = ss.insertSheet(PRESETS_SHEET_NAME);
  sheet.appendRow([
    'ลำดับ', 'รหัส (ห้ามซ้ำ)', 'ไอคอน', 'ชื่อแพ็กเกจ', 'คำอธิบาย',
    'PCB (suiovoi/hyperstrike)', 'ปุ่มหลัง (none/one/two)', 'ด้านปุ่มหลัง (left/right)',
    'Trigger/Face (none/clicky/full)', 'Stick Module (alps/he/tmr)', 'PS4 Shell (withController/noController)',
    'เปิดใช้งาน (TRUE/FALSE)'
  ]);
  var rows = [
    [1, 'starter', '🎮', 'Starter', 'เซ็ตพื้นฐาน คุ้มค่าที่สุด เหมาะมือใหม่หรืองบจำกัด', 'suiovoi', 'none', '', 'none', 'alps', 'withController', true],
    [2, 'balanced', '🎯', 'Balanced', 'อัปเกรดกลางๆ คุ้มค่า เพิ่มปุ่มหลัง 1 ปุ่ม + HE Stick', 'suiovoi', 'one', 'right', 'clicky', 'he', 'withController', true],
    [3, 'apex', '⚡', 'Apex / FPS Pro', 'สเปกสูงสุด ปุ่มหลัง 2 ปุ่ม + TMR Stick + Full Face Clicky', 'hyperstrike', 'two', '', 'full', 'tmr', 'withController', true]
  ];
  rows.forEach(function(r){ sheet.appendRow(r); });
  sheet.setFrozenRows(1);
  return sheet;
}
// ทำ 4 อย่าง: (1) อัปโหลดสลิปเข้า Google Drive (2) ส่งสลิปไปตรวจสอบจริงกับธนาคารผ่าน SlipOK API
// (ถ้าตั้งค่า SLIPOK_API_KEY / SLIPOK_BRANCH_ID ไว้แล้ว — ดูวิธีสมัครที่คอมเมนต์ด้านบนของไฟล์)
// (3) อัปเดตสถานะ + ผลตรวจสอบในชีต Orders แถวที่ตรงกับเลขที่คำสั่งซื้อ (4) ส่งอีเมลแจ้งร้านค้า
// หมายเหตุ: ต่อให้ SlipOK ตรวจไม่ผ่าน ระบบจะ "ไม่บล็อก" ลูกค้าแบบเงียบๆ — ยังบันทึกคำสั่งซื้อไว้ปกติ
// แค่ทำเครื่องหมาย "ตรวจไม่ผ่าน" ให้เห็นชัดในชีต/อีเมล/หน้าเว็บ เพื่อให้ร้านค้าเป็นคนตัดสินใจขั้นสุดท้าย
// (กัน false positive เช่น QR ในรูปเบลอ หรือธนาคารบางแห่งมีดีเลย์ตรวจช้าไม่กี่นาที)
function handleConfirmPayment(ss, data) {
  try {
    var orderCode = (data.orderCode || '').toString().trim();
    if (!orderCode) {
      return jsonOutput({ result: 'error', message: 'ไม่พบเลขที่คำสั่งซื้อ' });
    }
    if (!data.slipBase64) {
      return jsonOutput({ result: 'error', message: 'กรุณาแนบสลิปโอนเงินก่อนยืนยัน' });
    }

    var sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    var found = sheet ? findOrderRowByCode(sheet, orderCode) : null;
    if (!found) {
      return jsonOutput({ result: 'error', message: 'ไม่พบคำสั่งซื้อเลขที่ ' + orderCode + ' ในชีต กรุณาติดต่อร้านโดยตรง' });
    }

    // ยอดรวมสุทธิของคำสั่งซื้อนี้ (คอลัมน์ H "ยอดรวมสุทธิ") เอาไว้ส่งให้ SlipOK เทียบกับยอดในสลิปให้อัตโนมัติ
    var expectedAmountRaw = sheet.getRange(found.sheetRow, 8).getValue();
    var expectedAmount = (expectedAmountRaw === '' || expectedAmountRaw === null) ? null : Number(expectedAmountRaw);

    var slipUrl = uploadSlipToDrive(orderCode, data.slipBase64, data.slipMimeType, data.slipFileName);
    var verify = verifySlipWithSlipOk(data.slipBase64, data.slipMimeType, data.slipFileName, expectedAmount);
    var statusText = buildPaymentStatusText(verify);

    // หาคอลัมน์จากชื่อหัวคอลัมน์ สร้างใหม่ต่อท้ายให้อัตโนมัติถ้ายังไม่มี (ไม่กระทบคอลัมน์เดิมที่มีอยู่)
    var colVerifyResult = ensureColumn(sheet, 'ผลตรวจสอบสลิปอัตโนมัติ (SlipOK)');
    var colTransRef      = ensureColumn(sheet, 'เลขอ้างอิงธนาคาร (transRef)');
    var colBankRoute      = ensureColumn(sheet, 'ธนาคารต้นทาง → ปลายทาง');
    var colSenderName     = ensureColumn(sheet, 'ชื่อผู้โอน (จากสลิป)');
    var colSlipAmount      = ensureColumn(sheet, 'ยอดเงินในสลิป (จากธนาคาร)');
    var colTransTime        = ensureColumn(sheet, 'วันเวลาที่โอนจริง (จากธนาคาร)');

    sheet.getRange(found.sheetRow, 9).setValue(statusText);   // คอลัมน์ I เดิม: สถานะการชำระเงิน
    sheet.getRange(found.sheetRow, 10).setValue(slipUrl);     // คอลัมน์ J เดิม: ลิงก์สลิปโอนเงิน
    sheet.getRange(found.sheetRow, colVerifyResult).setValue(verify.summaryForSheet);
    sheet.getRange(found.sheetRow, colTransRef).setValue(verify.transRef || '');
    sheet.getRange(found.sheetRow, colBankRoute).setValue(verify.bankRouteText || '');
    sheet.getRange(found.sheetRow, colSenderName).setValue(verify.senderName || '');
    sheet.getRange(found.sheetRow, colSlipAmount).setValue(verify.amount || '');
    sheet.getRange(found.sheetRow, colTransTime).setValue(verify.transDateTimeText || '');

    if (NOTIFY_EMAIL && NOTIFY_EMAIL.indexOf('@') > -1) {
      var subjectPrefix = verify.ok === false ? '⚠ สลิปตรวจไม่ผ่าน — ' : (verify.ok === true ? '✓ ตรวจสอบสลิปผ่านแล้ว — ' : '');
      var body = 'ลูกค้าแจ้งชำระเงินสำหรับคำสั่งซื้อ #' + orderCode + '\n\n' +
        'สถานะ: ' + statusText + '\n' +
        'ผลตรวจสอบอัตโนมัติ: ' + verify.summaryForSheet + '\n' +
        (verify.transRef ? ('เลขอ้างอิงธนาคาร: ' + verify.transRef + '\n') : '') +
        'ลิงก์สลิป: ' + slipUrl + '\n' +
        '\nกรุณาตรวจสอบยอดเงินที่โอนเข้าจริงเทียบกับ "ยอดรวมสุทธิ" ในชีต Orders ก่อนเริ่มดำเนินการทุกครั้ง\n' +
        '(ระบบช่วยตรวจเบื้องต้นเท่านั้น ไม่ได้แทนการตัดสินใจของร้านค้า 100%)\n' +
        '\n---\nลิงก์สเปรดชีต: ' + ss.getUrl();

      var mailPayload = {
        to: NOTIFY_EMAIL,
        subject: subjectPrefix + 'ลูกค้าแจ้งชำระเงิน #' + orderCode,
        body: body
      };

      try {
        mailPayload.attachments = [blobFromBase64(data.slipBase64, data.slipMimeType, data.slipFileName)];
      } catch (attachErr) {
        Logger.log('แนบไฟล์สลิปในอีเมลไม่สำเร็จ: ' + attachErr.message);
      }

      MailApp.sendEmail(mailPayload);
    }

    return jsonOutput({
      result: 'success',
      slipUrl: slipUrl,
      verified: verify.ok,               // true = ตรวจผ่าน, false = ตรวจไม่ผ่าน, null = ยังไม่ได้ตั้งค่า SlipOK
      verifyMessage: verify.messageForCustomer
    });

  } catch (err) {
    Logger.log('ERROR (confirmPayment): ' + err.message);
    return jsonOutput({ result: 'error', message: err.message });
  }
}

// ========== เรียก SlipOK API เพื่อตรวจสอบสลิปกับธนาคารจริง ==========
// ส่งรูปสลิป (+ ยอดเงินที่คาดหวัง ถ้ามี) ไปให้ SlipOK อ่าน QR ท้ายสลิปแล้วเช็คย้อนกลับกับธนาคาร/ITMX
// log:true ทำให้ SlipOK เก็บสลิปนี้ไว้เช็ค "สลิปซ้ำ" กับครั้งต่อๆ ไปด้วย (error 1012 ถ้าเคยส่งมาแล้ว)
// คืนค่าเป็น object เดียวที่รวมทุกอย่างที่ต้องใช้ต่อ (บันทึกชีต / ส่งอีเมล / ตอบกลับหน้าเว็บ)
//   ok: true  = ตรวจผ่าน ยอด/บัญชีตรงกับสลิปจริง
//   ok: false = ตรวจไม่ผ่าน (สลิปปลอม/สลิปซ้ำ/ยอดไม่ตรง/ผิดบัญชี ฯลฯ) ดู reason/messageForCustomer
//   ok: null  = ยังไม่ได้ตั้งค่า SLIPOK_API_KEY / SLIPOK_BRANCH_ID เลยข้ามการตรวจสอบไป
function verifySlipWithSlipOk(base64, mimeType, fileName, expectedAmount) {
  if (!SLIPOK_API_KEY || !SLIPOK_BRANCH_ID) {
    return {
      ok: null,
      summaryForSheet: 'ยังไม่ได้ตั้งค่า SlipOK API (ข้ามการตรวจสอบอัตโนมัติ)',
      messageForCustomer: '',
      transRef: '', bankRouteText: '', senderName: '', amount: '', transDateTimeText: ''
    };
  }

  try {
    var blob = blobFromBase64(base64, mimeType, fileName);
    var url = 'https://api.slipok.com/api/line/apikey/' + SLIPOK_BRANCH_ID;
    var payload = { files: blob, log: 'true' };
    if (expectedAmount !== null && expectedAmount !== undefined && !isNaN(expectedAmount) && expectedAmount > 0) {
      payload.amount = String(expectedAmount);
    }
    Logger.log('เรียก SlipOK: ' + url + ' (amount=' + (payload.amount || '-') + ')');

    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: { 'x-authorization': SLIPOK_API_KEY },
      payload: payload,
      muteHttpExceptions: true
    });

    // Log ทุกครั้งไม่ว่าผลจะเป็นอย่างไร (ดูได้ที่เมนู Executions ทางซ้ายของตัวแก้ไข Apps Script)
    // มีประโยชน์มากตอนดีบัก เช่น API Key/Branch ID ผิด, หมดโควต้า, หรือ URL เรียกไม่ถึง
    Logger.log('SlipOK HTTP ' + response.getResponseCode() + ': ' + response.getContentText());

    var result = JSON.parse(response.getContentText());
    var d = result.data || null;

    var bankRouteText = d ? (bankName(d.sendingBank) + ' → ' + bankName(d.receivingBank)) : '';
    var senderName = d && d.sender ? (d.sender.displayName || d.sender.name || '') : '';
    var transDateTimeText = d && d.transDate ? (formatSlipDate(d.transDate) + ' ' + (d.transTime || '')) : '';

    // ตรวจผ่านสมบูรณ์: HTTP 200, success: true ทั้งชั้นนอกและใน data
    if (result.success === true && d && d.success === true) {
      return {
        ok: true,
        summaryForSheet: '✓ ตรวจสอบผ่านแล้ว ยอด/บัญชีตรงกับสลิปจริง',
        messageForCustomer: '✓ ระบบตรวจสอบสลิปกับธนาคารแล้ว ข้อมูลถูกต้อง',
        transRef: d.transRef || '', bankRouteText: bankRouteText, senderName: senderName,
        amount: d.amount || '', transDateTimeText: transDateTimeText
      };
    }

    // ตรวจไม่ผ่าน — แปล error code เป็นข้อความอ่านง่าย (ดูความหมายเต็มได้ที่ slipok.com/api-documentation/error-status-code)
    var code = result.code || (d && d.code) || 0;
    var reasonMap = {
      1006: 'ไฟล์รูปภาพไม่ถูกต้อง',
      1007: 'ไม่พบ QR Code ยืนยันสลิปในรูปภาพนี้ (อาจไม่ใช่สลิปโอนเงินจริง หรือรูปไม่ชัด)',
      1008: 'QR Code ในรูปไม่ใช่ QR สำหรับตรวจสอบการชำระเงิน',
      1010: 'ธนาคารนี้ต้องรอสักครู่หลังโอนก่อนตรวจสอบได้ (ลองแจ้งใหม่อีกครั้งในไม่กี่นาที)',
      1011: 'QR Code หมดอายุ หรือไม่พบรายการโอนนี้ในระบบธนาคาร',
      1012: 'สลิปนี้เคยถูกใช้แจ้งชำระเงินมาแล้วก่อนหน้านี้ (สลิปซ้ำ)' + (result.message ? ' — ' + result.message : ''),
      1013: 'ยอดเงินในสลิปไม่ตรงกับยอดที่ต้องชำระ',
      1014: 'บัญชี/พร้อมเพย์ปลายทางในสลิปไม่ตรงกับบัญชีของร้าน'
    };
    var reason = reasonMap[code] || (result.message || 'ไม่สามารถตรวจสอบสลิปนี้ได้');

    return {
      ok: false,
      summaryForSheet: '⚠ ตรวจไม่ผ่าน (' + code + '): ' + reason,
      messageForCustomer: '⚠ ระบบตรวจสอบสลิปแล้วพบปัญหา: ' + reason + ' — ร้านค้าจะตรวจสอบอีกครั้งด้วยตนเอง',
      transRef: d ? (d.transRef || '') : '', bankRouteText: bankRouteText, senderName: senderName,
      amount: d ? (d.amount || '') : '', transDateTimeText: transDateTimeText
    };

  } catch (err) {
    Logger.log('SlipOK verify error: ' + err.message);
    return {
      ok: null,
      summaryForSheet: 'เรียก SlipOK API ไม่สำเร็จ (' + err.message + ') — กรุณาตรวจสอบสลิปด้วยตนเอง',
      messageForCustomer: '',
      transRef: '', bankRouteText: '', senderName: '', amount: '', transDateTimeText: ''
    };
  }
}

function bankName(code) {
  if (!code) return '-';
  return BANK_CODE_NAMES[code] || ('ธนาคารรหัส ' + code);
}

// แปลงวันที่จาก SlipOK รูปแบบ 'yyyyMMdd' เป็น 'dd/MM/yyyy' ให้อ่านง่ายในชีต
function formatSlipDate(yyyyMMdd) {
  var s = (yyyyMMdd || '').toString();
  if (s.length !== 8) return s;
  return s.substring(6, 8) + '/' + s.substring(4, 6) + '/' + s.substring(0, 4);
}

// สร้างข้อความสถานะการชำระเงิน (คอลัมน์ I ในชีต Orders) ตามผลตรวจสอบของ SlipOK
function buildPaymentStatusText(verify) {
  if (verify.ok === true) return '✓ แจ้งชำระเงินแล้ว — ตรวจสอบสลิปผ่านอัตโนมัติ';
  if (verify.ok === false) return '⚠ แจ้งชำระเงินแล้ว — สลิปตรวจไม่ผ่าน กรุณาตรวจสอบด่วน';
  return 'แจ้งชำระเงินแล้ว (แนบสลิป) — รอตรวจสอบด้วยตนเอง';
}

// หา index คอลัมน์จากชื่อหัวคอลัมน์ในแถวที่ 1 ถ้ายังไม่มีคอลัมน์นี้ จะสร้างคอลัมน์ใหม่ต่อท้ายให้อัตโนมัติ
// (กันปัญหาชีตที่เคยสร้างไว้ก่อนหน้านี้แล้วยังไม่มีคอลัมน์ใหม่ๆ ที่เพิ่มเข้ามาทีหลัง ไม่ต้องลบชีตเก่าทิ้ง)
function ensureColumn(sheet, headerName) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  for (var i = 0; i < headers.length; i++) {
    if ((headers[i] || '').toString().trim() === headerName) return i + 1;
  }
  var newCol = lastCol + 1;
  sheet.getRange(1, newCol).setValue(headerName);
  return newCol;
}

// หาแถวของคำสั่งซื้อในชีต Orders จากเลขที่คำสั่งซื้อ (คอลัมน์ B) — คืน { sheetRow } หรือ null
function findOrderRowByCode(sheet, code) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var codes = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (var i = 0; i < codes.length; i++) {
    if ((codes[i][0] || '').toString().trim() === code) {
      return { sheetRow: i + 2 };
    }
  }
  return null;
}

function blobFromBase64(base64, mimeType, fileName) {
  var bytes = Utilities.base64Decode(base64);
  return Utilities.newBlob(bytes, mimeType || 'image/jpeg', fileName || 'slip.jpg');
}

// อัปโหลดสลิปเข้าโฟลเดอร์ใน Drive แล้วเปิดสิทธิ์ "ทุกคนที่มีลิงก์ดูได้" เพื่อให้กดลิงก์จากชีต/อีเมลดูได้เลย
// หมายเหตุ: ไฟล์จะอยู่ใน Drive ของบัญชีที่ deploy สคริปต์นี้ (เจ้าของสเปรดชีต)
function uploadSlipToDrive(orderCode, base64, mimeType, fileName) {
  var blob = blobFromBase64(base64, mimeType, fileName || (orderCode + '-slip.jpg'));
  var folder = getOrCreateSlipsFolder();
  var file = folder.createFile(blob);
  file.setName(orderCode + ' - ' + file.getName());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function getOrCreateSlipsFolder() {
  var folders = DriveApp.getFoldersByName(SLIPS_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(SLIPS_FOLDER_NAME);
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * หาแถวของโค้ดในชีต Discounts (สร้างชีตให้ถ้ายังไม่มี)
 * คืนค่า { sheet, sheetRow, row } หรือ null ถ้าไม่พบโค้ดนี้
 */
function findDiscountRow(ss, rawCode) {
  var sheet = ss.getSheetByName(DISCOUNTS_SHEET_NAME);
  if (!sheet) {
    sheet = createDiscountsSheet(ss);
  }

  var code = rawCode.toString().trim().toUpperCase();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  // คอลัมน์: A โค้ด, B เปอร์เซ็นต์, C จำกัดจำนวนครั้ง, D ใช้ไปแล้ว, E วันหมดอายุ, F เปิดใช้งาน
  var values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  for (var i = 0; i < values.length; i++) {
    var rowCode = (values[i][0] || '').toString().trim().toUpperCase();
    if (rowCode === code) {
      return { sheet: sheet, sheetRow: i + 2, row: values[i] };
    }
  }
  return null;
}

/**
 * ตรวจสอบว่าโค้ด (ที่หาแถวเจอแล้ว) ยังใช้ได้อยู่ไหม — เปิดใช้งาน / ยังไม่หมดอายุ / ยังไม่เต็มโควต้า
 * ไม่แก้อะไรในชีต แค่ประเมินผลอย่างเดียว
 */
function evaluateDiscount(found) {
  if (!found) return { valid: false, percent: 0, reason: 'ไม่พบโค้ดนี้' };

  var row = found.row;
  var percent = Number(row[1]) || 0;
  var maxUses = (row[2] === '' || row[2] === null) ? null : Number(row[2]);
  var usedCount = Number(row[3]) || 0;
  var expiry = row[4] ? new Date(row[4]) : null;
  var active = (row[5] === false) ? false : true; // ว่าง/TRUE ถือว่าเปิดใช้งาน

  if (!active) return { valid: false, percent: 0, reason: 'โค้ดถูกปิดใช้งาน' };
  if (expiry && expiry.getTime() < Date.now()) return { valid: false, percent: 0, reason: 'โค้ดหมดอายุแล้ว' };
  if (maxUses !== null && usedCount >= maxUses) return { valid: false, percent: 0, reason: 'โค้ดถูกใช้ครบจำนวนแล้ว' };

  return { valid: true, percent: percent, reason: '' };
}

/**
 * ตรวจสอบโค้ดส่วนลดกับชีต "Discounts" — ถ้าใช้ได้จะ +1 คอลัมน์ "ใช้ไปแล้ว" ให้อัตโนมัติ
 * ใช้ตอนบันทึกคำสั่งซื้อจริงใน doPost เท่านั้น (ตัวเดียวที่ "นับ" การใช้งาน)
 * คืนค่า { valid, percent, reason }
 */
function validateAndConsumeDiscount(ss, rawCode) {
  var found = findDiscountRow(ss, rawCode);
  var result = evaluateDiscount(found);

  if (result.valid) {
    var usedCount = Number(found.row[3]) || 0;
    found.sheet.getRange(found.sheetRow, 4).setValue(usedCount + 1);
  }

  return result;
}

function createDiscountsSheet(ss) {
  var sheet = ss.insertSheet(DISCOUNTS_SHEET_NAME);
  sheet.appendRow(['โค้ด', 'เปอร์เซ็นต์ส่วนลด', 'จำกัดจำนวนครั้ง (ว่าง=ไม่จำกัด)', 'ใช้ไปแล้ว', 'วันหมดอายุ (ว่าง=ไม่หมดอายุ)', 'เปิดใช้งาน (TRUE/FALSE)']);
  sheet.appendRow(['WELCOME10', 10, '', 0, '', true]);
  sheet.appendRow(['VIP15', 15, 50, 0, '', true]);
  sheet.setFrozenRows(1);
  return sheet;
}

// เรียกใช้ตรงนี้ได้เลยจากตัวแก้ไข Apps Script (เลือกจาก dropdown แล้วกด Run)
// เพื่อทดสอบโดยไม่ต้องผ่านหน้าเว็บ จะเขียนแถวทดสอบทันที + สร้างชีต Discounts ถ้ายังไม่มี
// แก้ discountCode ด้านล่างเป็นโค้ดอื่น/โค้ดผิด/โค้ดหมดอายุ เพื่อทดสอบเคสอื่นๆ ได้
function testDoPost() {
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        orderCode: 'TEST-001',
        summary: 'แถวทดสอบระบบ',
        subtotal: 999, // ตั้งใจใส่ยอดผิดๆ เพื่อทดสอบว่าระบบตรวจจับและแก้ยอดให้ถูกต้องอัตโนมัติ (ดูคอลัมน์ "ผลตรวจสอบราคา")
        discountCode: 'WELCOME10',
        customerEmail: 'test@example.com',
        customerAddress: '123/45 ถนนทดสอบ แขวงทดสอบ เขตทดสอบ กรุงเทพฯ 10110',
        hpWebsite: '', // honeypot ต้องว่างเสมอ (จำลองคนกรอกจริง) — ถ้าใส่ค่าจะโดนระบบกันสแปมบล็อกทันที
        formRenderedAt: Date.now() - 10000, // จำลองว่าเปิดหน้าเว็บมาแล้ว 10 วิ ก่อนกดยืนยัน ผ่านเกณฑ์ MIN_FORM_FILL_MS
        selections: {
          pcb: 'suiovoi', paddles: 'none', triggerBumper: 'none',
          faceButtons: 'dpad', stickModule: 'alps', ps4shell: 'withController'
        } // รวมแล้วควรได้ 2,550 บาท — ถ้าคอลัมน์ "ราคารวมก่อนลด" ในชีตออกมาเป็น 2550 (ไม่ใช่ 999) แปลว่าทำงานถูกต้อง
      })
    }
  };
  var result = doPost(fakeEvent);
  Logger.log(result.getContent());
}

// ทดสอบการแจ้งชำระเงิน (พร้อมแนบสลิปตัวอย่าง 1x1 พิกเซล เพราะตอนนี้บังคับต้องแนบสลิป) — รันได้จาก dropdown
// ต้องรัน testDoPost() ก่อนอย่างน้อย 1 ครั้ง เพื่อให้มีคำสั่งซื้อ TEST-001 อยู่ในชีต Orders ให้ทดสอบด้วย
// หมายเหตุ: ถ้าตั้งค่า SLIPOK_API_KEY/SLIPOK_BRANCH_ID ไว้แล้ว รูป 1x1 พิกเซลนี้จะถูกตรวจว่า "ไม่พบ QR
// Code" (error 1007) ตามที่ควรจะเป็น เพราะไม่ใช่สลิปจริง — นั่นแปลว่าระบบตรวจสอบทำงานถูกต้องแล้ว
function testConfirmPayment() {
  var tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        action: 'confirmPayment',
        orderCode: 'TEST-001',
        slipBase64: tinyPngBase64,
        slipMimeType: 'image/png',
        slipFileName: 'test-slip.png'
      })
    }
  };
  var result = doPost(fakeEvent);
  Logger.log(result.getContent());
}
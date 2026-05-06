import { STAMP_DATA_URI, QR_DATA_URI } from '../utils/document-assets';

export function contractTemplate(data: {
  bookingId: string;
  issuedAt: string;
  trip: {
    departureAt: string;
    origin: { nameAr: string; nameEn: string };
    destination: { nameAr: string; nameEn: string };
    driver: { fullName: string; phone: string };
    car: { brand: string; model: string; plateNumber: string; carType: string };
    bookingMode: string;
  };
  rider: { fullName: string; phone: string };
  totalPrice: string;
  paymentMethod: string;
  passengerCount: number | null;
}): string {
  const today = data.issuedAt;
  const paymentLabel = data.paymentMethod === 'cash' ? 'نقدي' : data.paymentMethod === 'card' ? 'بطاقة بنكية' : 'محفظة إلكترونية';
  const bookingLabel = `حجز مركبة لعدد ${data.passengerCount ?? 0} ركاب`;

  const stampSrc = STAMP_DATA_URI;
  const qrSrc = QR_DATA_URI;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; color: #1a1a2e; background: #fff; padding: 40px; font-size: 13px; line-height: 1.8; position: relative; }

  /* ── Watermark stamp ─────────────────────────────────────────────────── */
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-20deg);
    width: 280px;
    height: 280px;
    opacity: 0.07;
    pointer-events: none;
    z-index: 0;
  }

  /* ── Header ──────────────────────────────────────────────────────────── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #8b1a2e;
    padding-bottom: 14px;
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }
  .header-brand { display: flex; flex-direction: column; gap: 2px; }
  .company-name { font-size: 17px; font-weight: 700; color: #8b1a2e; }
  .company-sub { font-size: 11px; color: #555; }
  .doc-title { font-size: 18px; font-weight: 700; text-align: center; color: #1a1a2e; }
  .doc-meta { font-size: 11px; color: #666; text-align: left; }

  /* ── Body content ────────────────────────────────────────────────────── */
  .body-content { position: relative; z-index: 1; }
  h3 { font-size: 14px; color: #8b1a2e; margin: 20px 0 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px; margin-bottom: 12px; }
  .field label { color: #666; font-size: 11px; }
  .field p { font-weight: 600; }
  .clause { margin: 8px 0; padding-right: 12px; border-right: 3px solid #e8c8c8; color: #444; }
  .clause strong { color: #1a1a2e; }

  /* ── Signatures ──────────────────────────────────────────────────────── */
  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-top: 40px;
    position: relative;
    z-index: 1;
  }
  .sig-box { border-top: 1px solid #ccc; padding-top: 8px; text-align: center; }
  .sig-name { font-weight: 700; margin-bottom: 4px; }
  .sig-label { font-size: 11px; color: #999; }

  /* ── Stamp area in signatures ────────────────────────────────────────── */
  .sig-stamp-area {
    margin-top: 10px;
    min-height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed #ddd;
    border-radius: 4px;
    background: #fafafa;
  }
  .sig-stamp-area-label { font-size: 10px; color: #bbb; }

  /* ── Footer ──────────────────────────────────────────────────────────── */
  .footer {
    margin-top: 32px;
    border-top: 1px solid #e0e0e0;
    padding-top: 14px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    position: relative;
    z-index: 1;
  }
  .footer-left { display: flex; flex-direction: column; gap: 6px; }
  .footer-copy { color: #999; font-size: 11px; }
  .footer-cr { font-size: 11px; color: #555; font-weight: 600; }
  .footer-qr { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .footer-qr img { width: 72px; height: 72px; object-fit: contain; }
  .footer-qr-label { font-size: 10px; color: #888; }
</style>
</head>
<body>

  ${stampSrc ? `<img class="watermark" src="${stampSrc}" alt="" aria-hidden="true" />` : ''}

  <div class="header">
    <div class="header-brand">
      <span class="company-name">مؤسسة أرض المشاعر للنقل البري</span>
      <span class="company-sub">س.ت: 4031276214 — مكة المكرمة</span>
    </div>
    <div class="doc-title">عقد نقل بري</div>
    <div class="doc-meta">
      <div>رقم العقد: ${data.bookingId.slice(0, 8).toUpperCase()}</div>
      <div>تاريخ الإصدار: ${today}</div>
    </div>
  </div>

  <div class="body-content">
    <p>بموجب هذا العقد، تم الاتفاق بين الطرفين التاليين:</p>

    <h3>الطرف الأول — المسافر</h3>
    <div class="grid">
      <div class="field"><label>الاسم</label><p>${data.rider.fullName}</p></div>
      <div class="field"><label>رقم الهاتف</label><p>${data.rider.phone}</p></div>
    </div>

    <h3>الطرف الثاني — مؤسسة أرض المشاعر للنقل البري</h3>
    <div class="grid">
      <div class="field"><label>اسم السائق</label><p>${data.trip.driver.fullName}</p></div>
      <div class="field"><label>رقم الهاتف</label><p>${data.trip.driver.phone}</p></div>
      <div class="field"><label>المركبة</label><p>${data.trip.car.brand} ${data.trip.car.model}</p></div>
      <div class="field"><label>رقم اللوحة</label><p>${data.trip.car.plateNumber}</p></div>
    </div>

    <h3>تفاصيل الرحلة</h3>
    <div class="grid">
      <div class="field"><label>نقطة الانطلاق</label><p>${data.trip.origin.nameAr}</p></div>
      <div class="field"><label>الوجهة</label><p>${data.trip.destination.nameAr}</p></div>
      <div class="field"><label>موعد الرحلة</label><p>${data.trip.departureAt}</p></div>
      <div class="field"><label>نوع الخدمة</label><p>${bookingLabel}</p></div>
      <div class="field"><label>المبلغ الإجمالي</label><p>${data.totalPrice} ريال</p></div>
      <div class="field"><label>طريقة الدفع</label><p>${paymentLabel}</p></div>
    </div>

    <h3>بنود العقد</h3>

    <div class="clause">
      <strong>١. الالتزام بالموعد:</strong> يلتزم السائق بالحضور في الوقت المحدد للرحلة، وفي حال التأخير لأكثر من ٣٠ دقيقة يحق للمسافر طلب إلغاء الحجز باسترداد كامل.
    </div>
    <div class="clause">
      <strong>٢. سلامة الركاب:</strong> يلتزم السائق بقواعد السلامة المرورية وأنظمة المملكة العربية السعودية طوال الرحلة.
    </div>
    <div class="clause">
      <strong>٣. سياسة الإلغاء:</strong> يخضع الإلغاء لسياسة الاسترداد المعتمدة في المنصة بحسب وقت الإلغاء قبل الرحلة.
    </div>
    <div class="clause">
      <strong>٤. الأمتعة:</strong> يحق للمسافر حمل حقيبة واحدة متوسطة الحجم بدون رسوم إضافية، وتُحدد الأمتعة الإضافية باتفاق مسبق مع السائق.
    </div>
    <div class="clause">
      <strong>٥. المسؤولية:</strong> تعتبر مؤسسة أرض المشاعر وسيطاً وغير مسؤولة عن أي اتفاقات خارج المنصة.
    </div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-name">${data.rider.fullName}</div>
      <div class="sig-label">توقيع المسافر</div>
      <div class="sig-stamp-area"><span class="sig-stamp-area-label">الختم / التوقيع</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-name">مؤسسة أرض المشاعر للنقل البري</div>
      <div class="sig-label">توقيع الطرف الثاني</div>
      <div class="sig-stamp-area"><span class="sig-stamp-area-label">الختم / التوقيع</span></div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">
      <span class="footer-cr">س.ت: 4031276214 — مكة المكرمة، حي الزهراء</span>
      <span class="footer-copy">عقد رسمي صادر عن مؤسسة أرض المشاعر للنقل البري • ${today}</span>
    </div>
    ${qrSrc ? `
    <div class="footer-qr">
      <img src="${qrSrc}" alt="رمز التحقق" />
      <span class="footer-qr-label">رمز التحقق التجاري</span>
    </div>` : ''}
  </div>

</body>
</html>`;
}

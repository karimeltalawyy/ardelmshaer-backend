import { STAMP_DATA_URI, QR_DATA_URI } from '../utils/document-assets';

export function passengerManifestTemplate(data: {
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
  passengers: Array<{ fullName: string; nationality: string; idNumber: string; phone: string }>;
}): string {
  const rows = data.passengers
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.fullName}</td>
        <td>${p.nationality}</td>
        <td>${p.idNumber}</td>
        <td>${p.phone || '—'}</td>
      </tr>`,
    )
    .join('');

  const stampSrc = STAMP_DATA_URI;
  const qrSrc = QR_DATA_URI;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; color: #1a1a2e; background: #fff; padding: 32px; font-size: 13px; position: relative; }

  /* ── Watermark stamp ─────────────────────────────────────────────────── */
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-20deg);
    width: 260px;
    height: 260px;
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
    margin-bottom: 24px;
    position: relative;
    z-index: 1;
  }
  .header-brand { display: flex; flex-direction: column; gap: 2px; }
  .company-name { font-size: 17px; font-weight: 700; color: #8b1a2e; }
  .company-sub { font-size: 11px; color: #555; }
  .doc-title { font-size: 18px; font-weight: 700; text-align: center; color: #1a1a2e; }
  .doc-meta { font-size: 11px; color: #666; text-align: left; }

  /* ── Sections ────────────────────────────────────────────────────────── */
  .section { margin-bottom: 20px; position: relative; z-index: 1; }
  .section-title { font-size: 13px; font-weight: 700; color: #8b1a2e; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .field label { color: #666; font-size: 11px; }
  .field p { font-weight: 600; font-size: 13px; }

  /* ── Table ───────────────────────────────────────────────────────────── */
  table { width: 100%; border-collapse: collapse; }
  th { background: #8b1a2e; color: #fff; padding: 8px 10px; font-size: 12px; text-align: right; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  tr:nth-child(even) td { background: #fdf5f5; }

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
  .footer-left { display: flex; flex-direction: column; gap: 8px; }
  .footer-copy { color: #999; font-size: 11px; }
  .footer-cr { font-size: 11px; color: #555; font-weight: 600; }
  .footer-stamp {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .footer-stamp img { width: 72px; height: 72px; object-fit: contain; }
  .footer-stamp-label { font-size: 10px; color: #888; }

  .badge { display: inline-block; background: #fdf0f0; color: #8b1a2e; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
</style>
</head>
<body>

  ${stampSrc ? `<img class="watermark" src="${stampSrc}" alt="" aria-hidden="true" />` : ''}

  <div class="header">
    <div class="header-brand">
      <span class="company-name">مؤسسة أرض المشاعر للنقل البري</span>
      <span class="company-sub">س.ت: 4031276214 — مكة المكرمة</span>
    </div>
    <div class="doc-title">كشف الركاب</div>
    <div class="doc-meta">
      <div>رقم الحجز: ${data.bookingId.slice(0, 8).toUpperCase()}</div>
      <div>تاريخ الإصدار: ${data.issuedAt}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">بيانات الرحلة</div>
    <div class="grid">
      <div class="field"><label>من</label><p>${data.trip.origin.nameAr}</p></div>
      <div class="field"><label>إلى</label><p>${data.trip.destination.nameAr}</p></div>
      <div class="field"><label>موعد الانطلاق</label><p>${data.trip.departureAt}</p></div>
      <div class="field"><label>نوع الخدمة</label><p><span class="badge">حجز مركبة</span></p></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">بيانات السائق والمركبة</div>
    <div class="grid">
      <div class="field"><label>اسم السائق</label><p>${data.trip.driver.fullName}</p></div>
      <div class="field"><label>هاتف السائق</label><p>${data.trip.driver.phone}</p></div>
      <div class="field"><label>المركبة</label><p>${data.trip.car.brand} ${data.trip.car.model}</p></div>
      <div class="field"><label>رقم اللوحة</label><p>${data.trip.car.plateNumber}</p></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">بيانات المسافر الرئيسي</div>
    <div class="grid">
      <div class="field"><label>الاسم</label><p>${data.rider.fullName}</p></div>
      <div class="field"><label>الهاتف</label><p>${data.rider.phone}</p></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">قائمة الركاب (${data.passengers.length})</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>الاسم الكامل</th>
          <th>الجنسية</th>
          <th>رقم الهوية</th>
          <th>رقم الجوال</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div class="footer">
    <div class="footer-left">
      <span class="footer-cr">س.ت: 4031276214</span>
      <span class="footer-copy">وثيقة رسمية صادرة عن مؤسسة أرض المشاعر للنقل البري • جميع الحقوق محفوظة</span>
    </div>
    ${qrSrc ? `
    <div class="footer-stamp">
      <img src="${qrSrc}" alt="رمز التحقق" />
      <span class="footer-stamp-label">رمز التحقق التجاري</span>
    </div>` : ''}
  </div>

</body>
</html>`;
}

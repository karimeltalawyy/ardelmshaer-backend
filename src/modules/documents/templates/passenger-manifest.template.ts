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
  passengers: Array<{ fullName: string; nationality: string; idNumber: string; phone: string; seatCode?: string }>;
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
        <td>${p.seatCode ?? '—'}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; color: #1a1a2e; background: #fff; padding: 32px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1a73e8; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 700; color: #1a73e8; }
  .doc-title { font-size: 18px; font-weight: 700; text-align: center; }
  .doc-meta { font-size: 11px; color: #666; text-align: left; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: 700; color: #1a73e8; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .field label { color: #666; font-size: 11px; }
  .field p { font-weight: 600; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1a73e8; color: #fff; padding: 8px 10px; font-size: 12px; text-align: right; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  tr:nth-child(even) td { background: #f8f9ff; }
  .footer { margin-top: 32px; border-top: 1px solid #e0e0e0; padding-top: 12px; text-align: center; color: #999; font-size: 11px; }
  .badge { display: inline-block; background: #e8f0fe; color: #1a73e8; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">منصة النقل</div>
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
      <div class="field"><label>نوع الحجز</label><p><span class="badge">${data.trip.bookingMode === 'per_seat' ? 'حجز مقاعد' : 'حجز كامل'}</span></p></div>
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
          <th>رقم المقعد</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div class="footer">
    وثيقة رسمية صادرة عن منصة النقل • جميع الحقوق محفوظة
  </div>
</body>
</html>`;
}

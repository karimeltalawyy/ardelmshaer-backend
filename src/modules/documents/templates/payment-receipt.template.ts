export function paymentReceiptTemplate(data: {
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
  basePrice: string;
  seasonMultiplier: string;
  platformFee: string;
  driverPayout: string;
  totalPrice: string;
  paymentMethod: string;
  paymentStatus: string;
  passengerCount: number | null;
}): string {
  const paymentLabel = data.paymentMethod === 'cash' ? 'نقدي' : data.paymentMethod === 'card' ? 'بطاقة بنكية' : 'محفظة إلكترونية';
  const statusLabel = data.paymentStatus === 'paid' ? 'مدفوع' : data.paymentStatus === 'pending' ? 'قيد الانتظار' : 'مسترد';
  const statusColor = data.paymentStatus === 'paid' ? '#22c55e' : data.paymentStatus === 'pending' ? '#f59e0b' : '#3b82f6';
  const bookingLabel = `حجز مركبة لعدد ${data.passengerCount ?? 0} ركاب`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; color: #1a1a2e; background: #fff; padding: 40px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1a73e8; padding-bottom: 16px; margin-bottom: 28px; }
  .logo { font-size: 22px; font-weight: 700; color: #1a73e8; }
  .doc-title { font-size: 18px; font-weight: 700; text-align: center; }
  .doc-meta { font-size: 11px; color: #666; text-align: left; }
  .section-title { font-size: 13px; font-weight: 700; color: #1a73e8; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin: 20px 0 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; }
  .field label { color: #666; font-size: 11px; }
  .field p { font-weight: 600; }
  .price-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .price-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
  .price-table .label { color: #555; }
  .price-table .amount { text-align: left; font-weight: 600; }
  .price-table .total-row td { background: #1a73e8; color: #fff; font-weight: 700; font-size: 15px; }
  .status-badge { display: inline-block; padding: 4px 16px; border-radius: 20px; font-weight: 700; font-size: 13px; color: #fff; background: ${statusColor}; }
  .footer { margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 12px; text-align: center; color: #999; font-size: 11px; }
  .watermark { text-align: center; margin: 24px 0; }
  .watermark .check { font-size: 48px; color: ${statusColor}; }
  .watermark .status-text { font-size: 16px; font-weight: 700; color: ${statusColor}; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">منصة النقل</div>
    <div class="doc-title">إيصال الدفع</div>
    <div class="doc-meta">
      <div>رقم الحجز: ${data.bookingId.slice(0, 8).toUpperCase()}</div>
      <div>تاريخ الإصدار: ${data.issuedAt}</div>
    </div>
  </div>

  <div class="watermark">
    <div class="check">${data.paymentStatus === 'paid' ? '✓' : data.paymentStatus === 'pending' ? '⏳' : '↩'}</div>
    <div class="status-text"><span class="status-badge">${statusLabel}</span></div>
  </div>

  <div class="section-title">بيانات المسافر</div>
  <div class="grid">
    <div class="field"><label>الاسم</label><p>${data.rider.fullName}</p></div>
    <div class="field"><label>رقم الهاتف</label><p>${data.rider.phone}</p></div>
  </div>

  <div class="section-title">تفاصيل الرحلة</div>
  <div class="grid">
    <div class="field"><label>من</label><p>${data.trip.origin.nameAr}</p></div>
    <div class="field"><label>إلى</label><p>${data.trip.destination.nameAr}</p></div>
    <div class="field"><label>موعد الانطلاق</label><p>${data.trip.departureAt}</p></div>
    <div class="field"><label>نوع الخدمة</label><p>${bookingLabel}</p></div>
    <div class="field"><label>السائق</label><p>${data.trip.driver.fullName}</p></div>
    <div class="field"><label>المركبة</label><p>${data.trip.car.brand} ${data.trip.car.model} — ${data.trip.car.plateNumber}</p></div>
  </div>

  <div class="section-title">تفاصيل المبالغ</div>
  <table class="price-table">
    <tr>
      <td class="label">السعر الأساسي</td>
      <td class="amount">${data.basePrice} ريال</td>
    </tr>
    <tr>
      <td class="label">معامل الموسم</td>
      <td class="amount">× ${data.seasonMultiplier}</td>
    </tr>
    <tr>
      <td class="label">رسوم المنصة</td>
      <td class="amount">${data.platformFee} ريال</td>
    </tr>
    <tr>
      <td class="label">طريقة الدفع</td>
      <td class="amount">${paymentLabel}</td>
    </tr>
    <tr class="total-row">
      <td>الإجمالي</td>
      <td class="amount">${data.totalPrice} ريال</td>
    </tr>
  </table>

  <div class="footer">
    إيصال رسمي صادر عن منصة النقل • ${data.issuedAt}
  </div>
</body>
</html>`;
}

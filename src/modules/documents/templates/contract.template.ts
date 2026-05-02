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

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; color: #1a1a2e; background: #fff; padding: 40px; font-size: 13px; line-height: 1.8; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1a73e8; padding-bottom: 16px; margin-bottom: 28px; }
  .logo { font-size: 22px; font-weight: 700; color: #1a73e8; }
  .doc-title { font-size: 18px; font-weight: 700; text-align: center; }
  .doc-meta { font-size: 11px; color: #666; text-align: left; }
  h3 { font-size: 14px; color: #1a73e8; margin: 20px 0 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px; margin-bottom: 12px; }
  .field label { color: #666; font-size: 11px; }
  .field p { font-weight: 600; }
  .clause { margin: 8px 0; padding-right: 12px; border-right: 3px solid #e0e0e0; color: #444; }
  .clause strong { color: #1a1a2e; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 48px; }
  .sig-box { border-top: 1px solid #ccc; padding-top: 8px; text-align: center; }
  .sig-name { font-weight: 700; margin-bottom: 4px; }
  .sig-label { font-size: 11px; color: #999; }
  .footer { margin-top: 32px; border-top: 1px solid #e0e0e0; padding-top: 12px; text-align: center; color: #999; font-size: 11px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">منصة النقل</div>
    <div class="doc-title">عقد نقل بري</div>
    <div class="doc-meta">
      <div>رقم العقد: ${data.bookingId.slice(0, 8).toUpperCase()}</div>
      <div>تاريخ الإصدار: ${today}</div>
    </div>
  </div>

  <p>بموجب هذا العقد، تم الاتفاق بين الطرفين التاليين:</p>

  <h3>الطرف الأول — المسافر</h3>
  <div class="grid">
    <div class="field"><label>الاسم</label><p>${data.rider.fullName}</p></div>
    <div class="field"><label>رقم الهاتف</label><p>${data.rider.phone}</p></div>
  </div>

  <h3>الطرف الثاني — السائق</h3>
  <div class="grid">
    <div class="field"><label>الاسم</label><p>${data.trip.driver.fullName}</p></div>
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
    <strong>٥. المسؤولية:</strong> تعتبر منصة النقل وسيطاً بين الطرفين وغير مسؤولة عن أي اتفاقات خارج المنصة.
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-name">${data.rider.fullName}</div>
      <div class="sig-label">توقيع المسافر</div>
    </div>
    <div class="sig-box">
      <div class="sig-name">${data.trip.driver.fullName}</div>
      <div class="sig-label">توقيع السائق</div>
    </div>
  </div>

  <div class="footer">
    عقد رسمي صادر عن منصة النقل • ${today}
  </div>
</body>
</html>`;
}

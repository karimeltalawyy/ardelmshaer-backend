import { STAMP_DATA_URI, QR_DATA_URI, LOGO_DATA_URI } from '../utils/document-assets';

const PRIMARY = '#0d5c42';
const COMPANY_NAME = 'مؤسسة أرض المشاعر للنقل البري';
const COMPANY_CR = '4031276214';
const COMPANY_CITY = 'مكة المكرمة';
const COMPANY_WHATSAPP = '+966 55 621 7079';

export function passengerManifestTemplate(data: {
  bookingId: string;
  referenceNumber: string;
  issuedAt: string;
  trip: {
    departureDate: string;
    departureTime: string;
    departureAt: string;
    origin: { nameAr: string };
    destination: { nameAr: string };
    driver: { fullName: string; phone: string; photo: string | null; idNumber: string };
    car: { plateNumber: string };
    bookingMode: string;
  };
  rider: { fullName: string; phone: string };
  passengers: Array<{ fullName: string; nationality: string; idNumber: string; phone: string }>;
}): string {
  const operationType = 'نقل بين المدن';

  const driverPhotoHtml = data.trip.driver.photo
    ? `<img src="${data.trip.driver.photo}" class="driver-photo" alt="صورة السائق" />`
    : `<div class="driver-photo driver-photo--placeholder"><span>لا&nbsp;صورة</span></div>`;

  const passengerRows = data.passengers
    .map(
      (p, i) =>
        `<tr><td class="tc">${i + 1}</td><td>${p.fullName}</td><td>${p.nationality || '—'}</td><td>${p.idNumber || '—'}</td></tr>`,
    )
    .join('');

  const stampSrc = STAMP_DATA_URI;
  const qrSrc = QR_DATA_URI;
  const logoSrc = LOGO_DATA_URI;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>كشف ركاب</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Cairo',sans-serif;color:#1a1a1a;background:#fff;font-size:12.5px;line-height:1.7;}

  /* ── Page layout ── */
  .page{max-width:780px;margin:0 auto;padding:22px 28px 18px;}

  /* ── Watermark ── */
  .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-20deg);width:260px;height:260px;opacity:.05;pointer-events:none;z-index:0;}

  /* ── Header ── */
  .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid ${PRIMARY};padding-bottom:10px;margin-bottom:14px;position:relative;z-index:1;}
  .header-right{text-align:right;}
  .header-right .co-name{font-size:14px;font-weight:700;color:${PRIMARY};}
  .header-right .co-sub{font-size:11px;color:#555;margin-top:2px;}
  .header-center{text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;}
  .header-center img{width:70px;height:70px;object-fit:contain;}
  .header-center .co-logo-text{font-size:10px;font-weight:600;color:${PRIMARY};text-align:center;line-height:1.4;}
  .header-left{text-align:left;font-size:11px;color:#444;line-height:1.8;}
  .header-left span{display:block;}

  /* ── Doc title ── */
  .doc-title{text-align:center;font-size:21px;font-weight:700;color:#1a1a1a;margin:14px 0 12px;position:relative;z-index:1;}
  .doc-title::after{content:'';display:block;width:160px;height:2px;background:${PRIMARY};margin:4px auto 0;}

  /* ── Two-column section ── */
  .two-col{display:grid;grid-template-columns:38% 62%;border:1px solid #b8b8b8;position:relative;z-index:1;margin-bottom:8px;}
  .col-box{padding:0;}
  .col-box + .col-box{border-right:1px solid #b8b8b8;}
  .section-hdr{background:${PRIMARY};color:#fff;font-size:12px;font-weight:700;padding:5px 10px;text-align:center;}

  /* ── Driver info column ── */
  .driver-body{padding:10px;}
  .driver-photo{display:block;width:100%;max-width:100px;height:120px;object-fit:cover;border:1px solid #ccc;border-radius:3px;margin:0 auto 10px;}
  .driver-photo--placeholder{width:100px;height:120px;border:1px dashed #ccc;border-radius:3px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;background:#f8f8f8;color:#aaa;font-size:11px;text-align:center;}
  .driver-row{font-size:12px;margin-bottom:4px;display:flex;gap:6px;}
  .driver-row .lbl{color:#555;font-size:11.5px;white-space:nowrap;}
  .driver-row .val{font-weight:600;}

  /* ── Trip info column ── */
  .trip-body{padding:0;}
  .trip-table{width:100%;border-collapse:collapse;}
  .trip-table th{background:${PRIMARY};color:#fff;font-size:11.5px;font-weight:600;padding:5px 8px;text-align:center;border-left:1px solid rgba(255,255,255,.3);}
  .trip-table td{font-size:12px;padding:6px 8px;text-align:center;border-bottom:1px solid #e8e8e8;border-left:1px solid #e8e8e8;vertical-align:middle;}
  .trip-table tr:last-child td{border-bottom:none;}

  /* ── Basic passenger row ── */
  .pax-basic{border:1px solid #b8b8b8;border-top:none;position:relative;z-index:1;margin-bottom:8px;}
  .pax-basic-table{width:100%;border-collapse:collapse;}
  .pax-basic-table th{background:${PRIMARY};color:#fff;font-size:11.5px;font-weight:600;padding:5px 8px;text-align:center;border-left:1px solid rgba(255,255,255,.3);}
  .pax-basic-table td{font-size:12px;padding:6px 8px;text-align:center;border-left:1px solid #e8e8e8;}

  /* ── Full passenger table ── */
  .pax-section{position:relative;z-index:1;margin-bottom:8px;border:1px solid #b8b8b8;}
  .pax-section .section-hdr{margin:0;}
  .pax-table{width:100%;border-collapse:collapse;}
  .pax-table th{background:#e8f4ef;color:#1a1a1a;font-size:11.5px;font-weight:700;padding:5px 8px;text-align:center;border:1px solid #b8b8b8;}
  .pax-table td{font-size:12px;padding:5px 8px;text-align:center;border:1px solid #e0e0e0;}
  .pax-table tr:nth-child(even) td{background:#f7faf8;}
  .tc{color:#555;}

  /* ── Note ── */
  .note{font-size:11px;color:#555;border:1px dashed #b8b8b8;padding:6px 10px;border-radius:3px;position:relative;z-index:1;margin-bottom:8px;}
  .note strong{color:#1a1a1a;}

  /* ── Footer ── */
  .footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #d0d0d0;padding-top:10px;margin-top:12px;position:relative;z-index:1;}
  .footer-left{display:flex;flex-direction:column;align-items:flex-start;gap:5px;}
  .footer-left img{width:56px;height:56px;object-fit:contain;}
  .footer-left .wa{font-size:11.5px;font-weight:600;color:#1a1a1a;}
  .footer-center{font-size:12px;color:#555;}
  .footer-right img{width:62px;height:62px;object-fit:contain;}
</style>
</head>
<body>
<div class="page">

  ${stampSrc ? `<img class="watermark" src="${stampSrc}" alt="" aria-hidden="true" />` : ''}

  <!-- Header -->
  <div class="header">
    <div class="header-right">
      <div class="co-name">${COMPANY_NAME}</div>
      <div class="co-sub">سجل تجاري: ${COMPANY_CR}</div>
      <div class="co-sub">${COMPANY_CITY}</div>
    </div>
    <div class="header-center">
      ${logoSrc ? `<img src="${logoSrc}" alt="شعار" />` : ''}
    </div>
    <div class="header-left">
      <span>نوع التشغيل: ${operationType}</span>
      <span>رقم المرجع: ${data.referenceNumber}</span>
      <span>تاريخ الإصدار: ${data.issuedAt}</span>
    </div>
  </div>

  <!-- Title -->
  <div class="doc-title">كشف ركاب</div>

  <!-- Two-column: Driver + Trip -->
  <div class="two-col">
    <div class="col-box">
      <div class="section-hdr">معلومات السائق</div>
      <div class="driver-body">
        ${driverPhotoHtml}
        <div class="driver-row"><span class="lbl">السائق الأساسي</span><span class="val">${data.trip.driver.fullName}</span></div>
        <div class="driver-row"><span class="lbl">رقم الهوية</span><span class="val">${data.trip.driver.idNumber || '—'}</span></div>
        <div class="driver-row"><span class="lbl">رقم الجوال</span><span class="val">${data.trip.driver.phone || '—'}</span></div>
        <div class="driver-row"><span class="lbl">رقم اللوحة</span><span class="val">${data.trip.car.plateNumber}</span></div>
      </div>
    </div>
    <div class="col-box">
      <div class="section-hdr">معلومات الرحلة</div>
      <div class="trip-body">
        <table class="trip-table">
          <tr>
            <th>من</th>
            <th>إلى</th>
            <th>تاريخ و وقت</th>
            <th>المغادرة</th>
          </tr>
          <tr>
            <td>${data.trip.origin.nameAr}</td>
            <td>${data.trip.destination.nameAr}</td>
            <td>${data.trip.departureDate}</td>
            <td></td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td>${data.trip.departureTime}</td>
            <td></td>
          </tr>
        </table>
      </div>
    </div>
  </div>

  <!-- Basic passenger row -->
  <div class="pax-basic">
    <div class="section-hdr">معلومات الركاب</div>
    <table class="pax-basic-table">
      <tr>
        <th>إسم الضيف الأساسي</th>
        <th>رقم الجوال</th>
        <th>عدد الركاب</th>
      </tr>
      <tr>
        <td>${(data.passengers[0]?.fullName || data.rider.fullName) || '—'}</td>
        <td>${(data.passengers[0]?.phone || data.rider.phone) || '—'}</td>
        <td>${data.passengers.length}</td>
      </tr>
    </table>
  </div>

  <!-- Full passenger list -->
  ${data.passengers.length > 0 ? `
  <div class="pax-section">
    <div class="section-hdr">معلومات الركاب</div>
    <table class="pax-table">
      <tr>
        <th>م</th>
        <th>اسم الضيف</th>
        <th>الجنسية</th>
        <th>رقم الهوية / الجواز</th>
      </tr>
      ${passengerRows}
    </table>
  </div>` : ''}

  <!-- Important note -->
  <div class="note">
    <strong>ملاحظة هامة:</strong> في حال عدم تطابق بيانات العميل مع الإثبات تكون عرضة للجزاء، وهذا تعهد منا بذلك — ${COMPANY_NAME}.
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      ${stampSrc ? `<img src="${stampSrc}" alt="ختم" />` : ''}
      <div class="wa">&#x1F4F1;&nbsp;${COMPANY_WHATSAPP}</div>
    </div>
    <div class="footer-center">1 / 1</div>
    <div class="footer-right">
      ${qrSrc ? `<img src="${qrSrc}" alt="QR" />` : ''}
    </div>
  </div>

</div>
</body>
</html>`;
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

export interface BookingPdfData {
  referenceNumber: string;
  riderName: string;
  riderPhone: string;
  originNameAr: string;
  destinationNameAr: string;
  departureAt: Date;
  driverName: string;
  vehiclePlate: string;
  passengers: { fullName: string; idNumber: string; nationality: string }[];
}

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private browser!: Browser;

  async onModuleInit(): Promise<void> {
    this.browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.browser?.close();
  }

  async generateBookingManifest(data: BookingPdfData): Promise<Buffer> {
    const html = this.buildHtml(data);
    const page = await this.browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private buildHtml(data: BookingPdfData): string {
    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    }).format(data.departureAt);

    const passengersRows = data.passengers.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${this.escapeHtml(p.fullName)}</td>
        <td>${this.escapeHtml(p.idNumber)}</td>
        <td>${this.escapeHtml(p.nationality)}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', 'Tahoma', Arial, sans-serif; color: #1a1a1a; padding: 40px; direction: rtl; }
    .header { text-align: center; border-bottom: 3px solid #8b1a2e; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; font-weight: 900; color: #8b1a2e; }
    .header .ref { font-size: 16px; font-weight: 700; color: #333; margin-top: 6px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 14px; font-weight: 700; color: #8b1a2e; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { font-size: 13px; }
    .info-item .label { color: #666; font-size: 11px; }
    .info-item .value { font-weight: 700; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #8b1a2e; color: white; padding: 8px; text-align: right; }
    td { padding: 7px 8px; border-bottom: 1px solid #f0f0f0; }
    tr:nth-child(even) td { background: #fafafa; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #e5e5e5; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>مؤسسة أرض المشاعر للنقل البري</h1>
    <div class="ref">وثيقة بيانات الرحلة — ${this.escapeHtml(data.referenceNumber)}</div>
  </div>

  <div class="section">
    <h2>تفاصيل الرحلة</h2>
    <div class="info-grid">
      <div class="info-item"><div class="label">المسار</div><div class="value">${this.escapeHtml(data.originNameAr)} ← ${this.escapeHtml(data.destinationNameAr)}</div></div>
      <div class="info-item"><div class="label">موعد المغادرة</div><div class="value">${dateStr}</div></div>
      <div class="info-item"><div class="label">السائق</div><div class="value">${this.escapeHtml(data.driverName)}</div></div>
      <div class="info-item"><div class="label">رقم اللوحة</div><div class="value">${this.escapeHtml(data.vehiclePlate)}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>بيانات الراكب</h2>
    <div class="info-grid">
      <div class="info-item"><div class="label">الاسم</div><div class="value">${this.escapeHtml(data.riderName)}</div></div>
      <div class="info-item"><div class="label">رقم الجوال</div><div class="value">${this.escapeHtml(data.riderPhone)}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>قائمة المسافرين (${data.passengers.length})</h2>
    <table>
      <thead><tr><th>#</th><th>الاسم</th><th>رقم الهوية</th><th>الجنسية</th></tr></thead>
      <tbody>${passengersRows}</tbody>
    </table>
  </div>

  <div class="footer">
    تم إنشاء هذه الوثيقة تلقائياً — ${new Date().toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' })}
  </div>
</body>
</html>`;
  }
}

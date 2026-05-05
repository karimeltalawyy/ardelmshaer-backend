import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly client: Twilio | null = null;
  private readonly from: string;
  private readonly adminNumber: string;

  constructor(private config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID') ?? '';
    const authToken  = this.config.get<string>('TWILIO_AUTH_TOKEN') ?? '';
    this.from        = `whatsapp:${this.config.get<string>('TWILIO_WHATSAPP_FROM') ?? ''}`;
    this.adminNumber = this.config.get<string>('ADMIN_WHATSAPP_NUMBER') ?? '';

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    } else {
      this.logger.warn('Twilio not configured — WhatsApp notifications disabled');
    }
  }

  private formatTo(phone: string): string {
    const normalized = phone.startsWith('+') ? phone : `+${phone}`;
    return `whatsapp:${normalized}`;
  }

  async sendText(to: string, body: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('WhatsApp sendText skipped — client not initialized');
      return;
    }
    const toFormatted = this.formatTo(to);
    this.logger.log(`WhatsApp sending text → from=${this.from} to=${toFormatted}`);
    try {
      const msg = await this.client.messages.create({ from: this.from, to: toFormatted, body });
      this.logger.log(`WhatsApp text sent — SID=${msg.sid} status=${msg.status}`);
    } catch (e: any) {
      this.logger.error(`WhatsApp text failed: code=${e?.code} status=${e?.status} message=${e?.message}`);
    }
  }

  async sendDocument(to: string, pdfBuffer: Buffer, filename: string, caption: string): Promise<void> {
    if (!this.client) return;
    try {
      const mediaUrl = await this.uploadPdfToCloudinary(pdfBuffer, filename);
      await this.client.messages.create({
        from: this.from,
        to: this.formatTo(to),
        body: caption,
        mediaUrl: [mediaUrl],
      });
    } catch (e) {
      this.logger.error(`WhatsApp document failed: ${(e as Error).message}`);
    }
  }

  private uploadPdfToCloudinary(buffer: Buffer, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const publicId = filename.replace(/\.pdf$/i, '');
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'whatsapp-docs', resource_type: 'raw', public_id: publicId, format: 'pdf' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }

  // ─── Notification helpers ─────────────────────────────────────────────────────

  async notifyAdminBookingRequest(params: {
    referenceNumber: string;
    contactPhone: string;
    originNameAr: string;
    destinationNameAr: string;
    requestedDate: string;
    carTypePreference: 'starex' | 'staria';
    passengerCount: number;
    passengers: Array<{ fullName: string; idNumber: string; nationality: string; phone: string }>;
  }): Promise<void> {
    if (!this.adminNumber) return;

    const carLabel = params.carTypePreference === 'starex' ? 'هيونداي ستاريكس' : 'هيونداي ستاريا';
    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Asia/Riyadh',
    }).format(new Date(params.requestedDate));

    const passengerLines = params.passengers
      .map((p, i) => `${i + 1}. ${p.fullName} | ${p.idNumber} | ${p.nationality} | ${p.phone}`)
      .join('\n');

    const body = [
      '🚗 *طلب حجز جديد*',
      '',
      `رقم الطلب: *${params.referenceNumber}*`,
      `المسار: ${params.originNameAr} ← ${params.destinationNameAr}`,
      `التاريخ المطلوب: ${dateStr}`,
      `نوع السيارة: ${carLabel}`,
      `عدد الركاب: ${params.passengerCount}`,
      `هاتف التواصل: ${params.contactPhone}`,
      '',
      '*بيانات الركاب:*',
      passengerLines,
      '',
      'يرجى التواصل مع العميل لتأكيد الرحلة.',
    ].join('\n');

    await this.sendText(this.adminNumber, body);
  }

  async notifyAdminWithManifest(params: {
    referenceNumber: string;
    riderName: string;
    riderPhone: string;
    originNameAr: string;
    destinationNameAr: string;
    departureAt: Date;
    passengerCount: number;
    pdfBuffer: Buffer;
  }): Promise<void> {
    if (!this.adminNumber) return;

    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    }).format(params.departureAt);

    const body = [
      '🚗 *حجز جديد*',
      '',
      `رقم الحجز: *${params.referenceNumber}*`,
      `الراكب: ${params.riderName}`,
      `هاتف الراكب: ${params.riderPhone}`,
      `المسار: ${params.originNameAr} ← ${params.destinationNameAr}`,
      `تاريخ المغادرة: ${dateStr}`,
      `عدد الركاب: ${params.passengerCount}`,
    ].join('\n');

    await this.sendText(this.adminNumber, body);
    await this.sendDocument(
      this.adminNumber,
      params.pdfBuffer,
      `booking-${params.referenceNumber}.pdf`,
      `كشف ركاب — ${params.referenceNumber}`,
    );
  }

  async notifyDriverWithManifest(params: {
    driverPhone: string;
    referenceNumber: string;
    originNameAr: string;
    destinationNameAr: string;
    departureAt: Date;
    pdfBuffer: Buffer;
  }): Promise<void> {
    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    }).format(params.departureAt);

    const body = [
      '📋 *كشف ركاب*',
      '',
      `رقم الحجز: *${params.referenceNumber}*`,
      `المسار: ${params.originNameAr} ← ${params.destinationNameAr}`,
      `موعد الانطلاق: ${dateStr}`,
      '',
      'يرجى مراجعة قائمة الركاب المرفقة.',
    ].join('\n');

    await this.sendText(params.driverPhone, body);
    await this.sendDocument(
      params.driverPhone,
      params.pdfBuffer,
      `manifest-${params.referenceNumber}.pdf`,
      `كشف ركاب — ${params.referenceNumber}`,
    );
  }

  async notifyRider(params: {
    riderPhone: string;
    riderName: string;
    referenceNumber: string;
    originNameAr: string;
    destinationNameAr: string;
    departureAt: Date;
    pickupAddress: string;
  }): Promise<void> {
    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    }).format(params.departureAt);

    const body = [
      '✅ *تم تأكيد حجزك!*',
      '',
      `أهلاً ${params.riderName}،`,
      '',
      `رقم الحجز: *${params.referenceNumber}*`,
      `المسار: ${params.originNameAr} ← ${params.destinationNameAr}`,
      `موعد المغادرة: ${dateStr}`,
      `عنوان الإقلاع: ${params.pickupAddress}`,
      '',
      'شكراً لاختيارك مؤسسة أرض المشاعر للنقل البري 🙏',
    ].join('\n');

    await this.sendText(params.riderPhone, body);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendTextPayload {
  to: string;
  body: string;
}

interface SendDocumentPayload {
  to: string;
  filename: string;
  caption: string;
  pdfBuffer: Buffer;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly adminNumber: string;
  private readonly phoneNumberId: string;

  constructor(private config: ConfigService) {
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') ?? '';
    this.apiUrl = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
    this.token = this.config.get<string>('WHATSAPP_TOKEN') ?? '';
    this.adminNumber = this.config.get<string>('ADMIN_WHATSAPP_NUMBER') ?? '';
  }

  async sendText(payload: SendTextPayload): Promise<void> {
    if (!this.token || !this.phoneNumberId || !payload.to) {
      this.logger.warn('WhatsApp not configured or recipient missing — skipping');
      return;
    }
    if (!/^\+\d{7,15}$/.test(payload.to)) {
      this.logger.warn(`WhatsApp: invalid recipient format, skipping`);
      return;
    }
    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: payload.to,
          type: 'text',
          text: { body: payload.body },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`WhatsApp text send failed [${res.status}]: ${err.slice(0, 200)}`);
      }
    } catch (e) {
      this.logger.error(`WhatsApp network error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async sendDocument(payload: SendDocumentPayload): Promise<void> {
    if (!this.token || !this.phoneNumberId || !payload.to) {
      this.logger.warn('WhatsApp not configured — skipping document send');
      return;
    }
    try {
      // Step 1: Upload media to Meta
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', new Blob([new Uint8Array(payload.pdfBuffer)], { type: 'application/pdf' }), payload.filename);

      const uploadRes = await fetch(
        `https://graph.facebook.com/v19.0/${this.phoneNumberId}/media`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.token}` },
          body: formData,
        },
      );

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        this.logger.error(`WhatsApp media upload failed [${uploadRes.status}]: ${err.slice(0, 200)}`);
        return;
      }

      const { id: mediaId } = (await uploadRes.json()) as { id: string };

      // Step 2: Send document message
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: payload.to,
          type: 'document',
          document: { id: mediaId, filename: payload.filename, caption: payload.caption },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`WhatsApp document send failed [${res.status}]: ${err.slice(0, 200)}`);
      }
    } catch (e) {
      this.logger.error(`WhatsApp document send error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async notifyAdmin(params: {
    referenceNumber: string;
    riderName: string;
    riderPhone: string;
    originNameAr: string;
    destinationNameAr: string;
    departureAt: Date;
    passengerCount: number;
    pdfBuffer: Buffer;
  }): Promise<void> {
    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    }).format(params.departureAt);

    const body = `🚗 *حجز جديد*\n\nرقم الحجز: *${params.referenceNumber}*\nالراكب: ${params.riderName}\nهاتف الراكب: ${params.riderPhone}\nالمسار: ${params.originNameAr} \u200E←\u200E ${params.destinationNameAr}\nتاريخ المغادرة: ${dateStr}\nعدد الركاب: ${params.passengerCount}\n\nيرجى مراجعة البيانات والتواصل مع الراكب.`;

    await this.sendText({ to: this.adminNumber, body });
    await this.sendDocument({
      to: this.adminNumber,
      filename: `booking-${params.referenceNumber}.pdf`,
      caption: `قائمة ركاب — ${params.referenceNumber}`,
      pdfBuffer: params.pdfBuffer,
    });
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

    const body = `✅ *تم تأكيد حجزك!*\n\nأهلاً ${params.riderName}،\n\nرقم الحجز: *${params.referenceNumber}*\nالمسار: ${params.originNameAr} \u200E←\u200E ${params.destinationNameAr}\nموعد المغادرة: ${dateStr}\nعنوان الإقلاع: ${params.pickupAddress}\n\nشكراً لاختيارك مؤسسة أرض المشاعر للنقل البري 🙏`;

    await this.sendText({ to: params.riderPhone, body });
  }

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

    await this.sendText({ to: this.adminNumber, body });
  }
}

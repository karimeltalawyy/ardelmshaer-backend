import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { v2 as cloudinary } from 'cloudinary';

type WhatsappProvider = 'meta' | 'twilio' | 'wapilot';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly provider: WhatsappProvider;
  private readonly enabled: boolean;

  private readonly client: Twilio | null = null;
  private readonly from: string;
  private readonly adminNumber: string;
  private readonly metaToken: string;
  private readonly metaPhoneNumberId: string;
  private readonly metaApiVersion: string;

  private readonly wapilotBaseUrl: string;
  private readonly wapilotToken: string;
  private readonly wapilotInstanceId: string;

  constructor(private config: ConfigService) {
    this.provider = (this.config.get<string>('WHATSAPP_PROVIDER') ?? 'meta') as WhatsappProvider;
    this.enabled = this.config.get<string>('WHATSAPP_NOTIFICATIONS_ENABLED') !== 'false';
    this.adminNumber = this.config.get<string>('ADMIN_WHATSAPP_NUMBER') ?? '';

    this.metaToken = this.config.get<string>('META_WHATSAPP_ACCESS_TOKEN') ?? '';
    this.metaPhoneNumberId = this.config.get<string>('META_WHATSAPP_PHONE_NUMBER_ID') ?? '';
    this.metaApiVersion = this.config.get<string>('META_WHATSAPP_API_VERSION') ?? 'v22.0';

    this.wapilotBaseUrl = (this.config.get<string>('WAPILOT_BASE_URL') ?? 'https://api.wapilot.net/api/v2').replace(/\/+$/, '');
    this.wapilotToken = this.config.get<string>('WAPILOT_API_TOKEN') ?? '';
    this.wapilotInstanceId = this.config.get<string>('WAPILOT_INSTANCE_ID') ?? '';

    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID') ?? '';
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN') ?? '';
    this.from = `whatsapp:${this.config.get<string>('TWILIO_WHATSAPP_FROM') ?? ''}`;

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    }

    if (!this.enabled) {
      this.logger.warn('WhatsApp notifications disabled — set WHATSAPP_NOTIFICATIONS_ENABLED=true to enable');
      return;
    }

    if (this.provider === 'meta') {
      if (!this.metaToken || !this.metaPhoneNumberId) {
        this.logger.warn('Meta WhatsApp selected but not fully configured — notifications disabled');
      } else {
        this.logger.log('WhatsApp provider set to Meta Cloud API');
      }
      return;
    }

    if (this.provider === 'twilio') {
      if (!this.client || !this.from || this.from === 'whatsapp:') {
        this.logger.warn('Twilio WhatsApp selected but not fully configured — notifications disabled');
      } else {
        this.logger.log('WhatsApp provider set to Twilio');
      }
      return;
    }

    if (this.provider === 'wapilot') {
      if (!this.wapilotToken || !this.wapilotInstanceId) {
        this.logger.warn('Wapilot WhatsApp selected but not fully configured — set WAPILOT_API_TOKEN and WAPILOT_INSTANCE_ID. Notifications disabled');
      } else {
        this.logger.log(`WhatsApp provider set to Wapilot (instance=${this.wapilotInstanceId})`);
      }
      return;
    }

    this.logger.warn(
      `Unknown WHATSAPP_PROVIDER="${this.provider}" — expected "meta", "twilio" or "wapilot". Notifications disabled`,
    );
  }

  private formatTwilioTo(phone: string): string {
    let normalized = phone.trim();
    if (normalized.startsWith('+')) return `whatsapp:${normalized}`;
    if (normalized.startsWith('00')) normalized = '+' + normalized.slice(2);
    else if (normalized.startsWith('0')) normalized = '+966' + normalized.slice(1);
    else normalized = '+' + normalized;
    return `whatsapp:${normalized}`;
  }

  private formatMetaTo(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }

  /** Normalize any phone to a Wapilot chat id: international digits + "@c.us". Saudi local 0X → 966X. */
  private formatWapilotChatId(phone: string): string {
    let n = phone.trim().replace(/[\s()+-]/g, '');
    if (n.startsWith('00')) n = n.slice(2);
    else if (n.startsWith('0')) n = '966' + n.slice(1);
    n = n.replace(/[^\d]/g, '');
    return `${n}@c.us`;
  }

  private canSendWapilot(): boolean {
    return !!this.wapilotToken && !!this.wapilotInstanceId;
  }

  private async sendWapilotText(to: string, text: string): Promise<void> {
    const chatId = this.formatWapilotChatId(to);
    const url = `${this.wapilotBaseUrl}/${this.wapilotInstanceId}/send-message`;
    this.logger.log(`WhatsApp (Wapilot) sending text → chat_id=${chatId}`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { token: this.wapilotToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      const result = (await res.json().catch(() => ({}))) as Record<string, any>;
      if (!res.ok || result?.success === false) {
        this.logger.error(`WhatsApp (Wapilot) text failed — HTTP ${res.status}: ${JSON.stringify(result)}`);
        return;
      }
      this.logger.log(`WhatsApp (Wapilot) text queued — id=${result?.message_id ?? result?.data?.message_id ?? 'n/a'}`);
    } catch (e) {
      this.logger.error(`WhatsApp (Wapilot) text error: ${(e as Error).message}`);
    }
  }

  private async sendWapilotFile(to: string, pdfBuffer: Buffer, filename: string, caption: string): Promise<void> {
    const chatId = this.formatWapilotChatId(to);
    const url = `${this.wapilotBaseUrl}/${this.wapilotInstanceId}/send-file`;
    this.logger.log(`WhatsApp (Wapilot) sending file → chat_id=${chatId} file=${filename}`);
    try {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', caption);
      form.append('media', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), filename);
      // Do NOT set Content-Type — fetch sets the multipart boundary automatically.
      const res = await fetch(url, {
        method: 'POST',
        headers: { token: this.wapilotToken },
        body: form,
      });
      const result = (await res.json().catch(() => ({}))) as Record<string, any>;
      if (!res.ok || result?.success === false) {
        this.logger.error(`WhatsApp (Wapilot) file failed — HTTP ${res.status}: ${JSON.stringify(result)}`);
        return;
      }
      this.logger.log(`WhatsApp (Wapilot) file queued — id=${result?.message_id ?? result?.data?.message_id ?? 'n/a'}`);
    } catch (e) {
      this.logger.error(`WhatsApp (Wapilot) file error: ${(e as Error).message}`);
    }
  }

  private canSendMeta(): boolean {
    return !!this.metaToken && !!this.metaPhoneNumberId;
  }

  private canSendTwilio(): boolean {
    return !!this.client && !!this.from && this.from !== 'whatsapp:';
  }

  private getMetaMessagesEndpoint(): string {
    return `https://graph.facebook.com/${this.metaApiVersion}/${this.metaPhoneNumberId}/messages`;
  }

  private async sendMetaTemplate(
    to: string,
    templateName: string,
    bodyParams: string[],
  ): Promise<void> {
    await this.sendMetaMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatMetaTo(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'ar' },
        components: bodyParams.length
          ? [{ type: 'body', parameters: bodyParams.map(text => ({ type: 'text', text })) }]
          : [],
      },
    });
  }

  private async sendMetaMessage(payload: Record<string, unknown>): Promise<void> {
    if (!this.canSendMeta()) {
      throw new Error('WhatsApp Meta client not configured — check META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID');
    }

    const response = await fetch(this.getMetaMessagesEndpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.metaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const msg = `Meta API HTTP ${response.status}: ${errorText}`;
      this.logger.error(`Meta WhatsApp send failed — ${msg}`);
      throw new Error(msg);
    }

    const result = (await response.json()) as { messages?: Array<{ id?: string }> };
    this.logger.log(`Meta WhatsApp sent — messageId=${result.messages?.[0]?.id ?? 'n/a'}`);
  }

  async sendText(to: string, body: string): Promise<void> {
    if (!this.enabled) return;
    if (this.provider === 'meta') {
      const toFormatted = this.formatMetaTo(to);
      await this.sendMetaMessage({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toFormatted,
        type: 'text',
        text: {
          preview_url: false,
          body,
        },
      });
      return;
    }

    if (this.provider === 'wapilot') {
      if (!this.canSendWapilot()) {
        this.logger.warn('WhatsApp Wapilot sendText skipped — not configured');
        return;
      }
      await this.sendWapilotText(to, body);
      return;
    }

    if (!this.canSendTwilio()) {
      this.logger.warn('WhatsApp Twilio sendText skipped — client not initialized');
      return;
    }

    const toFormatted = this.formatTwilioTo(to);
    this.logger.log(`WhatsApp (Twilio) sending text → from=${this.from} to=${toFormatted}`);
    try {
      const msg = await this.client!.messages.create({ from: this.from, to: toFormatted, body });
      this.logger.log(`WhatsApp (Twilio) text sent — SID=${msg.sid} status=${msg.status}`);
    } catch (e: any) {
      this.logger.error(
        `WhatsApp (Twilio) text failed: code=${e?.code} status=${e?.status} message=${e?.message}`,
      );
    }
  }

  async sendDocument(to: string, pdfBuffer: Buffer, filename: string, caption: string, preUploadedUrl?: string): Promise<void> {
    if (!this.enabled) return;
    if (this.provider === 'meta') {
      const mediaUrl = preUploadedUrl ?? await this.uploadPdfToCloudinary(pdfBuffer, filename);
      await this.sendMetaMessage({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatMetaTo(to),
        type: 'document',
        document: {
          link: mediaUrl,
          filename,
          caption,
        },
      });
      return;
    }

    if (this.provider === 'wapilot') {
      if (!this.canSendWapilot()) return;
      await this.sendWapilotFile(to, pdfBuffer, filename, caption);
      return;
    }

    if (!this.canSendTwilio()) return;

    try {
      const mediaUrl = preUploadedUrl ?? await this.uploadPdfToCloudinary(pdfBuffer, filename);
      await this.client!.messages.create({
        from: this.from,
        to: this.formatTwilioTo(to),
        body: caption,
        mediaUrl: [mediaUrl],
      });
    } catch (e) {
      this.logger.error(`WhatsApp (Twilio) document failed: ${(e as Error).message}`);
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
    if (!this.enabled) return;
    if (!this.adminNumber) {
      this.logger.warn('notifyAdminBookingRequest skipped — ADMIN_WHATSAPP_NUMBER not set');
      return;
    }

    const carLabel = params.carTypePreference === 'starex' ? 'هيونداي ستاريكس' : 'هيونداي ستاريا';
    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Asia/Riyadh',
    }).format(new Date(params.requestedDate));

    if (this.provider === 'meta') {
      await this.sendMetaTemplate(this.adminNumber, 'ams_booking_request', [
        params.referenceNumber,
        params.originNameAr,
        params.destinationNameAr,
        dateStr,
        carLabel,
        String(params.passengerCount),
        params.contactPhone,
      ]);
      return;
    }

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
    fileUrl?: string;
  }): Promise<void> {
    if (!this.enabled) return;
    if (!this.adminNumber) {
      this.logger.warn('notifyAdminWithManifest skipped — ADMIN_WHATSAPP_NUMBER not set');
      return;
    }

    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    }).format(params.departureAt);

    if (this.provider === 'meta') {
      await this.sendMetaTemplate(
        this.adminNumber,
        'ams_trip_manifest',
        [params.referenceNumber, params.originNameAr, params.destinationNameAr, dateStr],
      );
      await this.sendDocument(
        this.adminNumber,
        params.pdfBuffer,
        `booking-${params.referenceNumber}.pdf`,
        `كشف ركاب — ${params.referenceNumber}`,
      );
      return;
    }

    // Mirrors the approved Meta template `ams_trip_manifest` verbatim (sent as the PDF caption).
    const body = [
      'كشف ركاب 📋',
      '',
      `رقم الحجز: ${params.referenceNumber}`,
      `المسار: ${params.originNameAr} ← ${params.destinationNameAr}`,
      `موعد الانطلاق: ${dateStr}`,
      '',
      'يرجى مراجعة قائمة الركاب المرفقة.',
    ].join('\n');

    await this.sendDocument(
      this.adminNumber,
      params.pdfBuffer,
      `booking-${params.referenceNumber}.pdf`,
      body,
      params.fileUrl,
    );
  }

  async notifyDriverWithManifest(params: {
    driverPhone: string;
    referenceNumber: string;
    originNameAr: string;
    destinationNameAr: string;
    departureAt: Date;
    pdfBuffer: Buffer;
    fileUrl?: string;
  }): Promise<void> {
    if (!this.enabled) return;
    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    }).format(params.departureAt);

    if (this.provider === 'meta') {
      await this.sendMetaTemplate(
        params.driverPhone,
        'ams_trip_manifest',
        [params.referenceNumber, params.originNameAr, params.destinationNameAr, dateStr],
      );
      await this.sendDocument(
        params.driverPhone,
        params.pdfBuffer,
        `manifest-${params.referenceNumber}.pdf`,
        `كشف ركاب — ${params.referenceNumber}`,
      );
      return;
    }

    // Mirrors the approved Meta template `ams_trip_manifest` verbatim (sent as the PDF caption).
    const body = [
      'كشف ركاب 📋',
      '',
      `رقم الحجز: ${params.referenceNumber}`,
      `المسار: ${params.originNameAr} ← ${params.destinationNameAr}`,
      `موعد الانطلاق: ${dateStr}`,
      '',
      'يرجى مراجعة قائمة الركاب المرفقة.',
    ].join('\n');

    await this.sendDocument(
      params.driverPhone,
      params.pdfBuffer,
      `manifest-${params.referenceNumber}.pdf`,
      body,
      params.fileUrl,
    );
  }

  async notifyDriverWithContract(params: {
    driverPhone: string;
    referenceNumber: string;
    originNameAr: string;
    destinationNameAr: string;
    departureAt: Date;
    pdfBuffer: Buffer;
    fileUrl?: string;
  }): Promise<void> {
    if (!this.enabled) return;
    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    }).format(params.departureAt);

    if (this.provider === 'meta') {
      await this.sendMetaTemplate(
        params.driverPhone,
        'ams_transport_contract',
        [params.referenceNumber, params.originNameAr, params.destinationNameAr, dateStr],
      );
      await this.sendDocument(
        params.driverPhone,
        params.pdfBuffer,
        `contract-${params.referenceNumber}.pdf`,
        `عقد نقل — ${params.referenceNumber}`,
      );
      return;
    }

    // Same house-style as the manifest template (sent as the PDF caption).
    const body = [
      'عقد نقل 📄',
      '',
      `رقم العقد: ${params.referenceNumber}`,
      `المسار: ${params.originNameAr} ← ${params.destinationNameAr}`,
      `موعد الانطلاق: ${dateStr}`,
      '',
      'يرجى مراجعة العقد المرفق.',
    ].join('\n');

    await this.sendDocument(
      params.driverPhone,
      params.pdfBuffer,
      `contract-${params.referenceNumber}.pdf`,
      body,
      params.fileUrl,
    );
  }

  async notifyAdminWithContract(params: {
    referenceNumber: string;
    riderName: string;
    riderPhone: string;
    originNameAr: string;
    destinationNameAr: string;
    departureAt: Date;
    passengerCount: number;
    pdfBuffer: Buffer;
    fileUrl?: string;
  }): Promise<void> {
    if (!this.enabled) return;
    if (!this.adminNumber) {
      this.logger.warn('notifyAdminWithContract skipped — ADMIN_WHATSAPP_NUMBER not set');
      return;
    }

    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    }).format(params.departureAt);

    if (this.provider === 'meta') {
      await this.sendMetaTemplate(
        this.adminNumber,
        'ams_transport_contract',
        [params.referenceNumber, params.originNameAr, params.destinationNameAr, dateStr],
      );
      await this.sendDocument(
        this.adminNumber,
        params.pdfBuffer,
        `contract-${params.referenceNumber}.pdf`,
        `عقد نقل — ${params.referenceNumber}`,
      );
      return;
    }

    // Same house-style as the manifest template (sent as the PDF caption).
    const body = [
      'عقد نقل 📄',
      '',
      `رقم العقد: ${params.referenceNumber}`,
      `المسار: ${params.originNameAr} ← ${params.destinationNameAr}`,
      `موعد الانطلاق: ${dateStr}`,
      '',
      'يرجى مراجعة العقد المرفق.',
    ].join('\n');

    await this.sendDocument(
      this.adminNumber,
      params.pdfBuffer,
      `contract-${params.referenceNumber}.pdf`,
      body,
      params.fileUrl,
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
    if (!this.enabled) return;
    const dateStr = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Riyadh',
    }).format(params.departureAt);

    if (this.provider === 'meta') {
      await this.sendMetaTemplate(params.riderPhone, 'ams_booking_confirmed', [
        params.riderName,
        params.referenceNumber,
        params.originNameAr,
        params.destinationNameAr,
        dateStr,
        params.pickupAddress,
      ]);
      return;
    }

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

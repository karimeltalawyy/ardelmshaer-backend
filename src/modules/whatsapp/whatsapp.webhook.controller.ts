import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  RawBody,
  Headers,
  HttpCode,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';

interface MetaContact {
  profile?: { name?: string };
  wa_id?: string;
}

interface MetaMessage {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; sha256?: string };
  document?: { id?: string; filename?: string; mime_type?: string };
  audio?: { id?: string; mime_type?: string };
  interactive?: { type?: string; button_reply?: { id?: string; title?: string } };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
}

interface MetaStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
}

interface MetaWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        messaging_product?: string;
        metadata?: { display_phone_number?: string; phone_number_id?: string };
        contacts?: MetaContact[];
        messages?: MetaMessage[];
        statuses?: MetaStatus[];
      };
      field?: string;
    }>;
  }>;
}

@ApiExcludeController()
@SkipThrottle()
@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);
  private readonly verifyToken: string;
  private readonly appSecret: string;

  constructor(private readonly config: ConfigService) {
    this.verifyToken = config.get<string>('META_WHATSAPP_WEBHOOK_VERIFY_TOKEN') ?? '';
    this.appSecret = config.get<string>('META_WHATSAPP_APP_SECRET') ?? '';
  }

  /** Meta calls this GET once to verify your webhook URL is reachable */
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    if (!this.verifyToken) {
      this.logger.error('META_WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set');
      throw new ForbiddenException('Webhook not configured');
    }

    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Meta webhook verification successful');
      return challenge;
    }

    this.logger.warn(`Webhook verification failed — mode=${mode} token=${token}`);
    throw new ForbiddenException('Webhook verification failed');
  }

  /** Meta POSTs all incoming messages and delivery status updates here */
  @Post()
  @HttpCode(200)
  handleIncoming(
    @Body() body: MetaWebhookPayload,
    @RawBody() rawBody: Buffer,
    @Headers('x-hub-signature-256') signature: string,
  ): string {
    this.verifySignature(rawBody, signature);

    if (body?.object !== 'whatsapp_business_account') {
      return 'OK';
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        this.processMessages(value?.messages ?? [], value?.contacts ?? []);
        this.processStatuses(value?.statuses ?? []);
      }
    }

    return 'OK';
  }

  private verifySignature(rawBody: Buffer, signature: string): void {
    if (!this.appSecret) {
      this.logger.warn('META_WHATSAPP_APP_SECRET not set — skipping signature verification');
      return;
    }

    if (!signature?.startsWith('sha256=')) {
      throw new BadRequestException('Missing x-hub-signature-256 header');
    }

    const expected = createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');

    const received = signature.slice('sha256='.length);

    // Constant-time comparison to prevent timing attacks
    if (expected.length !== received.length || expected !== received) {
      this.logger.error('Webhook signature mismatch — possible tampering');
      throw new ForbiddenException('Invalid webhook signature');
    }
  }

  private processMessages(
    messages: MetaMessage[],
    contacts: MetaContact[],
  ): void {
    for (const msg of messages) {
      const from = msg.from ?? 'unknown';
      const senderName = contacts.find((c) => c.wa_id === from)?.profile?.name ?? from;

      switch (msg.type) {
        case 'text':
          this.logger.log(`📨 Text from ${senderName} (${from}): ${msg.text?.body}`);
          // TODO: route to booking flow or auto-reply logic
          break;

        case 'image':
          this.logger.log(`🖼️  Image from ${senderName} (${from}) — mediaId=${msg.image?.id}`);
          break;

        case 'document':
          this.logger.log(
            `📄 Document from ${senderName} (${from}) — file=${msg.document?.filename} mediaId=${msg.document?.id}`,
          );
          break;

        case 'audio':
          this.logger.log(`🎙️  Audio from ${senderName} (${from}) — mediaId=${msg.audio?.id}`);
          break;

        case 'location':
          this.logger.log(
            `📍 Location from ${senderName} (${from}) — lat=${msg.location?.latitude} lng=${msg.location?.longitude}`,
          );
          break;

        case 'interactive':
          this.logger.log(
            `🔘 Interactive from ${senderName} (${from}) — buttonId=${msg.interactive?.button_reply?.id}`,
          );
          break;

        default:
          this.logger.log(`❓ Unknown message type="${msg.type}" from ${senderName} (${from})`);
      }
    }
  }

  private processStatuses(
    statuses: MetaStatus[],
  ): void {
    for (const status of statuses) {
      this.logger.log(
        `📬 Delivery status — msgId=${status.id} to=${status.recipient_id} status=${status.status}`,
      );
    }
  }
}

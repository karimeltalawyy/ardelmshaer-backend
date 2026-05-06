import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappWebhookController } from './whatsapp.webhook.controller';

@Module({
  controllers: [WhatsappWebhookController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}

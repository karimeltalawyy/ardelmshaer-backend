import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappWebhookController } from './whatsapp.webhook.controller';
import { WhatsappSchedulerService } from './whatsapp.scheduler';

@Module({
  controllers: [WhatsappWebhookController],
  providers: [WhatsappService, WhatsappSchedulerService],
  exports: [WhatsappService],
})
export class WhatsappModule {}

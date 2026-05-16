import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';

@Injectable()
export class WhatsappSchedulerService {
  private readonly logger = new Logger(WhatsappSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  // Twilio sandbox sessions expire after 72h of inactivity — ping all active drivers
  // daily at 8am Riyadh so they never need to re-join the sandbox.
  @Cron('0 8 * * *', { timeZone: 'Asia/Riyadh' })
  async keepTwilioSessionsAlive(): Promise<void> {
    const provider = this.config.get<string>('WHATSAPP_PROVIDER') ?? 'meta';
    if (provider !== 'twilio') return;

    const enabled = this.config.get<string>('WHATSAPP_NOTIFICATIONS_ENABLED') !== 'false';
    if (!enabled) return;

    const drivers = await this.prisma.user.findMany({
      where: { role: 'driver', status: 'active', phone: { not: null } },
      select: { id: true, fullName: true, phone: true },
    });

    if (!drivers.length) {
      this.logger.log('Twilio keep-alive: no active drivers with phone');
      return;
    }

    this.logger.log(`Twilio keep-alive: pinging ${drivers.length} driver(s)`);

    const message =
      '🌅 صباح الخير من أرض المشاعر للنقل البري\nنتمنى لكم يوماً موفقاً وعملاً مباركاً.';

    let sent = 0;
    let failed = 0;

    for (const driver of drivers) {
      try {
        await this.whatsapp.sendText(driver.phone!, message);
        sent++;
      } catch {
        failed++;
        this.logger.warn(`Twilio keep-alive failed for driver ${driver.id}`);
      }
    }

    this.logger.log(`Twilio keep-alive done — sent=${sent} failed=${failed}`);
  }
}

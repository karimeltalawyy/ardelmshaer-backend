import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const maxRetries = 6;
    const baseDelayMs = 3000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (err) {
        if (attempt === maxRetries) throw err;
        const delay = baseDelayMs * attempt;
        this.logger.warn(
          `DB connect attempt ${attempt}/${maxRetries} failed — retrying in ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function isTemplateDatabaseUrl(url?: string): boolean {
  if (!url) {
    return false;
  }

  return /USER|PASSWORD|ep-XXXX|REGION/.test(url);
}

function resolveRuntimeDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;

  if (databaseUrl && !isTemplateDatabaseUrl(databaseUrl)) {
    return databaseUrl;
  }

  if (directDatabaseUrl && !isTemplateDatabaseUrl(directDatabaseUrl)) {
    console.warn(
      '[Prisma] Falling back to DIRECT_DATABASE_URL because DATABASE_URL is missing or looks like a template value.',
    );
    return directDatabaseUrl;
  }

  throw new Error(
    '[Prisma] Missing valid database connection string. Configure DATABASE_URL (preferred) or DIRECT_DATABASE_URL.',
  );
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: resolveRuntimeDatabaseUrl(),
        },
      },
    });
  }

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
          `DB connect attempt ${attempt}/${maxRetries} failed — retrying in ${delay}ms (Neon cold start?)`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
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
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

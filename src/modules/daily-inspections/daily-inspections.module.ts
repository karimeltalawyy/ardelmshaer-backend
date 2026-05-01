import { Module } from '@nestjs/common';
import { DailyInspectionsController } from './daily-inspections.controller';
import { DailyInspectionsService } from './daily-inspections.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DailyInspectionsController],
  providers: [DailyInspectionsService],
})
export class DailyInspectionsModule {}

import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { DocumentsModule } from '../documents/documents.module';
import { PdfModule } from '../pdf/pdf.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [DocumentsModule, PdfModule, WhatsappModule],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}

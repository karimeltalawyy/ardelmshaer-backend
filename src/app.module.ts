import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { S3Module } from './common/s3/s3.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { CarsModule } from './modules/cars/cars.module';
import { DestinationsModule } from './modules/destinations/destinations.module';
import { RoutesModule } from './modules/routes/routes.module';
import { SeasonsModule } from './modules/seasons/seasons.module';
import { TripsModule } from './modules/trips/trips.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { CompanyBranchesModule } from './modules/company-branches/company-branches.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { DailyInspectionsModule } from './modules/daily-inspections/daily-inspections.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    S3Module,
    AuthModule,
    UsersModule,
    DriversModule,
    CarsModule,
    DestinationsModule,
    RoutesModule,
    SeasonsModule,
    TripsModule,
    BookingsModule,
    DocumentsModule,
    PaymentsModule,
    AdminModule,
    CompanyBranchesModule,
    PdfModule,
    WhatsappModule,
    DailyInspectionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

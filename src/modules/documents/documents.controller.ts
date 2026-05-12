import {
  Controller,
  Get,
  Header,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentsService, DocumentType, slugToDocumentType } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(['bookings/:bookingId/documents', 'admin/bookings/:bookingId/documents'])
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all generated PDF documents for a booking' })
  findAll(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.findByBooking(bookingId, user.id);
  }

  /** Accepts `{}` — matches transport-frontend admin document generation. */
  @Post(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate and upload a booking PDF document (manifest or contract)' })
  @ApiParam({
    name: 'slug',
    enum: ['passenger-manifest', 'contract'],
    description: 'Document type slug (hyphen form in URL; stored type uses underscores)',
  })
  generateBySlug(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('slug') slug: string,
    @CurrentUser() user: any,
    @Body() _body?: Record<string, unknown>,
  ) {
    const docType: DocumentType = slugToDocumentType(slug);
    return this.documentsService.generate(bookingId, user.id, docType);
  }

  @Post(':slug/notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend WhatsApp notifications for a document (passenger manifest only)' })
  @ApiParam({ name: 'slug', enum: ['passenger-manifest'] })
  notifyBySlug(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('slug') slug: string,
    @CurrentUser() user: any,
  ) {
    const docType = slugToDocumentType(slug);
    if (docType !== 'passenger_manifest') {
      throw new BadRequestException('WhatsApp notification is only available for passenger-manifest');
    }
    return this.documentsService.notifyManifest(bookingId, user.id);
  }

  @Get(':slug/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Return the raw HTML for a booking document (for browser print)' })
  @ApiParam({
    name: 'slug',
    enum: ['passenger-manifest', 'contract'],
  })
  getHtmlBySlug(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('slug') slug: string,
    @CurrentUser() user: any,
  ) {
    const docType = slugToDocumentType(slug);
    return this.documentsService.getHtml(bookingId, user.id, docType);
  }
}

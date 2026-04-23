import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('passenger-manifest')
  @ApiOperation({ summary: 'Generate passenger manifest PDF (كشف الركاب)' })
  generateManifest(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.generate(bookingId, user.id, 'passenger_manifest');
  }

  @Post('contract')
  @ApiOperation({ summary: 'Generate transport contract PDF (عقد النقل)' })
  generateContract(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.generate(bookingId, user.id, 'contract');
  }

  @Post('payment-receipt')
  @ApiOperation({ summary: 'Generate payment receipt PDF (إيصال الدفع)' })
  generateReceipt(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.generate(bookingId, user.id, 'payment_receipt');
  }

  @Get()
  @ApiOperation({ summary: 'List all generated documents for a booking' })
  findAll(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.findByBooking(bookingId, user.id);
  }
}

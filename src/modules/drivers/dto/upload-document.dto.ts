import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class UploadDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  docType: DocumentType;
}

import {
  IsArray, IsDateString, IsEnum, IsInt, IsString,
  IsUUID, Min, MinLength, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GuestPassengerDto {
  @ApiProperty({ example: 'محمد عبدالله' })
  @IsString() @MinLength(2)
  fullName: string;

  @ApiProperty({ example: '1234567890' })
  @IsString() @MinLength(5)
  idNumber: string;

  @ApiProperty({ example: 'مصري' })
  @IsString() @MinLength(2)
  nationality: string;

  @ApiProperty({ example: '0501234567' })
  @IsString() @MinLength(7)
  phone: string;
}

export class CreateGuestBookingDto {
  @ApiProperty({ example: 'uuid-of-origin-city' })
  @IsUUID()
  originId: string;

  @ApiProperty({ example: 'uuid-of-destination-city' })
  @IsUUID()
  destinationId: string;

  @ApiProperty({ example: '2026-04-25' })
  @IsDateString()
  requestedDate: string;

  @ApiProperty({ enum: ['starex', 'staria'] })
  @IsEnum(['starex', 'staria'] as const)
  carTypePreference: 'starex' | 'staria';

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt() @Min(1)
  passengerCount: number;

  @ApiProperty({ example: '0554517253' })
  @IsString() @MinLength(7)
  contactPhone: string;

  @ApiProperty({ type: [GuestPassengerDto] })
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GuestPassengerDto)
  passengers: GuestPassengerDto[];
}

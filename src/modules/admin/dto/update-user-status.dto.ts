import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserStatusAction {
  active = 'active',
  suspended = 'suspended',
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatusAction })
  @IsEnum(UserStatusAction)
  status: UserStatusAction;
}

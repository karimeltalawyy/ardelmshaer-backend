import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AssignableRole {
  rider = 'rider',
  driver = 'driver',
  admin = 'admin',
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: AssignableRole })
  @IsEnum(AssignableRole)
  role: AssignableRole;
}

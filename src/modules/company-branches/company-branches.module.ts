import { Module } from '@nestjs/common';
import { CompanyBranchesController } from './company-branches.controller';
import { CompanyBranchesService } from './company-branches.service';

@Module({
  controllers: [CompanyBranchesController],
  providers: [CompanyBranchesService],
})
export class CompanyBranchesModule {}


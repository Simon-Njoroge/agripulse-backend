import { Module } from '@nestjs/common';
import { FieldUpdatesService } from './field-updates.service';
import { FieldUpdatesController } from './field-updates.controller';

@Module({
  controllers: [FieldUpdatesController],
  providers: [FieldUpdatesService],
})
export class FieldUpdatesModule {}

import { Module } from '@nestjs/common';
import { MathService } from './math.service';

@Module({
  providers: [MathService]
})
export class MathModule {}

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/dev')
  getDev(): string {
    return this.appService.getDev();
  }

  @Get('/test')
  getTest(): string {
    return this.appService.getTest();
  }

  @Get('/test2')
  getTest2(): string {
    return this.appService.getTest2();
  }
}

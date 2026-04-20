import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getDev(): string {
    return 'Hello dev!';
  }

  getTest(): string {
    return 'Hello test!';
  }

  getTest2(): string {
    return 'Hello test2!';
  }
}

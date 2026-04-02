import { Injectable } from '@nestjs/common';
import { envs } from './config/envs.config';

@Injectable()
export class AppService {
  getStatus(): { status: string; apiName: string } {
    return {
      status: 'ONLINE',
      apiName: envs.package_name,
    };
  }
}

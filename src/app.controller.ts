import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'API status' })
  @ApiOkResponse({
    description: 'Current API status.',
    schema: {
      example: {
        status: 'ONLINE',
        apiName: 'logistics-api',
      },
    },
  })
  @Get('status')
  getStatus(): { status: string; apiName: string } {
    return this.appService.getStatus();
  }
}

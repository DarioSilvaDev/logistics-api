import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envs } from './config/envs.config';

@Module({
  imports: [
    MongooseModule.forRoot(envs.db.url),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

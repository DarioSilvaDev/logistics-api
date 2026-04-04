import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Auth, AuthSchema } from '../auth/schemas/auth.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { USER_REPOSITORY } from './repositories/user.repository.token';
import { UserRepository } from './repositories/user.repository';
import { AUTH_REPOSITORY } from '../auth/repositories/auth.repository.token';
import { AuthRepository } from '../auth/repositories/auth.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Auth.name, schema: AuthSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: AUTH_REPOSITORY,
      useClass: AuthRepository,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}

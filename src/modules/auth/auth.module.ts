import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Auth, AuthSchema } from './schemas/auth.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AUTH_REPOSITORY } from './repositories/auth.repository.token';
import { AuthRepository } from './repositories/auth.repository';
import { USER_REPOSITORY } from '../users/repositories/user.repository.token';
import { UserRepository } from '../users/repositories/user.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { envs } from 'src/config/envs.config';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: envs.jwt.access_secret,
      signOptions: {
        algorithm: 'HS256',
      },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Auth.name, schema: AuthSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: AUTH_REPOSITORY,
      useClass: AuthRepository,
    },
  ],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}

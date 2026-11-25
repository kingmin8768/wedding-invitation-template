import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { ConfigService } from './services/config.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthBootstrap } from './auth.bootstrap';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  providers: [
    AuthService,
    ConfigService,
    JwtAuthGuard,
    RolesGuard,
    AuthBootstrap,
  ],
  controllers: [AuthController],
  exports: [AuthService, ConfigService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}

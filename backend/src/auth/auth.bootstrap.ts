import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from './services/config.service';

@Injectable()
export class AuthBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthBootstrap.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    this.configService.validateRequiredConfiguration();
    await this.authService.bootstrapAdmin();

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        `Dev admin ready: ${this.configService.adminEmail} / ${this.configService.adminPassword}`,
      );
    }
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../assets/asset.entity';
import { AssetsModule } from '../assets/assets.module';
import { AuthModule } from '../auth/auth.module';
import { InvitationMediaController } from './invitation-media.controller';
import { InvitationMediaItem } from './invitation-media.entity';
import { InvitationMediaService } from './invitation-media.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvitationMediaItem, Asset]),
    AuthModule,
    AssetsModule,
  ],
  providers: [InvitationMediaService],
  controllers: [InvitationMediaController],
  exports: [InvitationMediaService],
})
export class InvitationMediaModule {}

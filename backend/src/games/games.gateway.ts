import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import { ACCESS_TOKEN_COOKIE, readCookie } from '../auth/auth-cookie.utils';
import { ConfigService } from '../auth/services/config.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UserRole } from '../users/user.entity';
import { GamesService } from './games.service';

const ROOM_EVENT_NAME = 'lazygyu-room';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/games',
})
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private subscription: Subscription | null = null;
  private hostSocketId: string | null = null;

  constructor(
    private readonly gamesService: GamesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.subscription = this.gamesService.observeEvents().subscribe((event) => {
      this.server?.to(ROOM_EVENT_NAME).emit(event.type, event.data);
    });
  }

  async handleConnection(client: Socket) {
    client.join(ROOM_EVENT_NAME);
    client.emit('state_sync', {
      gameSlug: 'lazygyu',
      state: await this.gamesService.getPublicState(),
    });
    client.emit('stream_host_changed', {
      hostAvailable: Boolean(this.hostSocketId),
      hostSocketId: this.hostSocketId,
    });
  }

  handleDisconnect(client: Socket) {
    client.leave(ROOM_EVENT_NAME);
    if (client.id === this.hostSocketId) {
      this.hostSocketId = null;
      this.server.to(ROOM_EVENT_NAME).emit('stream_host_changed', {
        hostAvailable: false,
        hostSocketId: null,
      });
      return;
    }

    if (this.hostSocketId) {
      this.server.to(this.hostSocketId).emit('viewer_disconnected', {
        viewerSocketId: client.id,
      });
    }
  }

  @SubscribeMessage('host_register')
  async handleHostRegister(@ConnectedSocket() client: Socket) {
    const user = await this.resolveHostUser(client);

    if (!user || user.role !== UserRole.ADMIN) {
      client.emit('stream_error', {
        message: '관리자만 호스트 모드를 시작할 수 있습니다.',
      });
      return;
    }

    if (this.hostSocketId && this.hostSocketId !== client.id) {
      client.emit('stream_error', {
        message: '이미 다른 호스트가 보드를 송출 중입니다.',
      });
      return;
    }

    this.hostSocketId = client.id;
    this.server.to(ROOM_EVENT_NAME).emit('stream_host_changed', {
      hostAvailable: true,
      hostSocketId: client.id,
    });
  }

  @SubscribeMessage('host_unregister')
  handleHostUnregister(@ConnectedSocket() client: Socket) {
    if (this.hostSocketId !== client.id) {
      return;
    }

    this.hostSocketId = null;
    this.server.to(ROOM_EVENT_NAME).emit('stream_host_changed', {
      hostAvailable: false,
      hostSocketId: null,
    });
  }

  @SubscribeMessage('viewer_request_stream')
  handleViewerRequestStream(@ConnectedSocket() client: Socket) {
    if (!this.hostSocketId) {
      client.emit('stream_host_changed', {
        hostAvailable: false,
        hostSocketId: null,
      });
      return;
    }

    this.server.to(this.hostSocketId).emit('viewer_request_stream', {
      viewerSocketId: client.id,
    });
  }

  @SubscribeMessage('webrtc_offer')
  handleWebRtcOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { targetSocketId?: string; description?: RTCSessionDescriptionInit },
  ) {
    if (!body.targetSocketId || !body.description) {
      return;
    }

    this.server.to(body.targetSocketId).emit('webrtc_offer', {
      fromSocketId: client.id,
      description: body.description,
    });
  }

  @SubscribeMessage('webrtc_answer')
  handleWebRtcAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { targetSocketId?: string; description?: RTCSessionDescriptionInit },
  ) {
    if (!body.targetSocketId || !body.description) {
      return;
    }

    this.server.to(body.targetSocketId).emit('webrtc_answer', {
      fromSocketId: client.id,
      description: body.description,
    });
  }

  @SubscribeMessage('webrtc_ice_candidate')
  handleWebRtcIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { targetSocketId?: string; candidate?: RTCIceCandidateInit | null },
  ) {
    if (!body.targetSocketId) {
      return;
    }

    this.server.to(body.targetSocketId).emit('webrtc_ice_candidate', {
      fromSocketId: client.id,
      candidate: body.candidate || null,
    });
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }

  private async resolveUser(client: Socket) {
    const authHeader =
      typeof client.handshake.headers.authorization === 'string'
        ? client.handshake.headers.authorization
        : '';
    const bearerToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    const cookieHeader =
      typeof client.handshake.headers.cookie === 'string'
        ? client.handshake.headers.cookie
        : undefined;
    const cookieToken = readCookie(cookieHeader, ACCESS_TOKEN_COOKIE);
    const token = bearerToken || cookieToken;

    if (!token) {
      return null;
    }

    try {
      return await this.jwtService.verifyAsync<AuthenticatedUser>(token, {
        secret: this.configService.accessTokenSecret,
      });
    } catch {
      return null;
    }
  }

  private async resolveHostUser(client: Socket) {
    const hostToken =
      typeof client.handshake.auth?.hostToken === 'string'
        ? client.handshake.auth.hostToken
        : typeof client.handshake.query?.hostToken === 'string'
          ? client.handshake.query.hostToken
          : null;

    if (hostToken) {
      try {
        const payload = await this.jwtService.verifyAsync<
          AuthenticatedUser & { scope?: string }
        >(hostToken, {
          secret: this.configService.accessTokenSecret,
        });

        if (payload.scope === 'lazygyu-host') {
          return payload;
        }
      } catch {
        // Fall through to cookie/bearer auth resolution.
      }
    }

    return this.resolveUser(client);
  }
}

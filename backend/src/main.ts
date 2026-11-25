import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { LazygyuRoomService } from './lazygyu/lazygyu-room.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  await configureApp(app);

  await app.listen(port, host);
  app.get(LazygyuRoomService).attachFrameSocketServer(app.getHttpServer());
  console.log(`🚀 Backend server running on http://${host}:${port}`);
}
bootstrap();

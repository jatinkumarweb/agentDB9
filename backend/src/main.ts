import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('AgentDB9 API')
    .setDescription('Backend API for AgentDB9 Coding Agent')
    .setVersion('2.0.0')
    .addTag('agents', 'Agent management endpoints')
    .addTag('conversations', 'Conversation management endpoints')
    .addTag('projects', 'Project management endpoints')
    .addTag('health', 'Health and monitoring endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 8000;
  await app.listen(port);
  
  console.log(`🚀 NestJS Backend server running on port ${port}`);
  console.log(`📚 API Documentation available at http://localhost:${port}/api/docs`);
}
bootstrap();

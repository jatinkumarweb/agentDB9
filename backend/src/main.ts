import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLoggerService } from './common/logger/logger.service';
import { AppConfigService } from './config/config.service';
import helmet from 'helmet';
import compression from 'compression';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLoggerService(),
  });

  const configService = app.get(AppConfigService);

  // Validate required configuration
  const configValidation = configService.validateRequiredConfig();
  if (!configValidation.valid) {
    console.error('❌ Configuration validation failed:');
    configValidation.missing.forEach(missing => {
      console.error(`   - ${missing}`);
    });
    process.exit(1);
  }

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Enable CORS
  if (configService.isCorsEnabled) {
    app.enableCors({
      origin: configService.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    });
  }

  // Configure Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global validation pipe (now handled by CommonModule)
  // app.useGlobalPipes(new ValidationPipe({
  //   transform: true,
  //   whitelist: true,
  //   forbidNonWhitelisted: true,
  // }));

  // Swagger documentation
  if (configService.isSwaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle(configService.appName + ' API')
      .setDescription(`Backend API for ${configService.appName} Coding Agent`)
      .setVersion(configService.appVersion)
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('agents', 'Agent management endpoints')
      .addTag('conversations', 'Conversation management endpoints')
      .addTag('projects', 'Project management endpoints')
      .addTag('health', 'Health and monitoring endpoints')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.port;
  await app.listen(port);
  
  console.log(`🚀 ${configService.appName} v${configService.appVersion} running on port ${port}`);
  console.log(`🌍 Environment: ${configService.environment}`);
  
  if (configService.isSwaggerEnabled) {
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
  
  // Log configuration status
  const apiKeys = configService.getApiKeyStatus();
  console.log('🔑 API Keys configured:', Object.entries(apiKeys)
    .map(([key, configured]) => `${key}: ${configured ? '✅' : '❌'}`)
    .join(', '));
  
  const services = configService.getServiceUrls();
  console.log('🔗 Service URLs:', Object.entries(services)
    .map(([key, url]) => `${key}: ${url}`)
    .join(', '));
  
  console.log('🎛️  Features enabled:', Object.entries(configService.featuresConfig)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key)
    .join(', '));
}
bootstrap();

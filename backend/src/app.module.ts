import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AgentsModule } from './agents/agents.module';
import { ProjectsModule } from './projects/projects.module';
import { ConversationsModule } from './conversations/conversations.module';
import { HealthModule } from './health/health.module';
import { WebSocketModule } from './websocket/websocket.module';
import { ModelsModule } from './models/models.module';
import { ProvidersModule } from './providers/providers.module';
import { MCPModule } from './mcp/mcp.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { KnowledgeModule } from './knowledge/knowledge.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL?.startsWith('sqlite:')
        ? {
            type: 'sqlite',
            database: process.env.DATABASE_URL.replace('sqlite:', ''),
            autoLoadEntities: true,
            synchronize: true,
            logging: true,
          }
        : {
            type: 'postgres',
            host: process.env.DB_HOST || 'postgres',
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'coding_agent',
            autoLoadEntities: true,
            synchronize: process.env.DB_SYNCHRONIZE === 'true',
            logging: true,
          }
    ),
    CommonModule,
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    AgentsModule,
    ProjectsModule,
    ConversationsModule,
    HealthModule,
    WebSocketModule,
    ModelsModule,
    ProvidersModule,
    MCPModule,
    EvaluationModule,
    KnowledgeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { User } from '../entities/user.entity';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => ModelsModule),
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
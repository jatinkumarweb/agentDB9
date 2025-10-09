import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContextService } from './context.service';
import { ContextController } from './context.controller';
import { FilesystemScannerService } from './scanner/filesystem-scanner.service';
import { FrameworkExtractorService } from './extractors/framework-extractor.service';
import { LanguageExtractorService } from './extractors/language-extractor.service';
import { StructureAnalyzerService } from './analyzers/structure-analyzer.service';
import { ProjectContextEntity } from '../entities/project-context.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectContextEntity])],
  controllers: [ContextController],
  providers: [
    ContextService,
    FilesystemScannerService,
    FrameworkExtractorService,
    LanguageExtractorService,
    StructureAnalyzerService,
  ],
  exports: [ContextService],
})
export class ContextModule {}

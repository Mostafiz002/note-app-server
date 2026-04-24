import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiProvider } from './gemini.provider';

@Module({
  controllers: [AiController],
  providers: [AiService, GeminiProvider, PrismaService],
})
export class AiModule {}

import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { FolderController } from './folder.controller';
import { FolderService } from './folder.service';

@Module({
  controllers: [FolderController],
  providers: [FolderService, PrismaService],
})
export class FolderModule {}

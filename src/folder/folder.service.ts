import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { Folder } from '../../generated/prisma/client';

@Injectable()
export class FolderService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createFolderDto: CreateFolderDto, userId: number) {
    if (createFolderDto.parentId) {
      await this.ensureOwnership(createFolderDto.parentId, userId);
    }

    return this.prismaService.folder.create({
      data: {
        name: createFolderDto.name.trim(),
        parentId: createFolderDto.parentId,
        userId,
      },
    });
  }

  async findAll(userId: number) {
    return this.prismaService.folder.findMany({
      where: { userId },
      include: { parent: true, children: true },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: number, userId: number) {
    await this.ensureOwnership(id, userId);
    return this.prismaService.folder.findFirst({
      where: { id, userId },
      include: {
        parent: true,
        children: true,
        notes: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async update(id: number, updateFolderDto: UpdateFolderDto, userId: number) {
    await this.ensureOwnership(id, userId);

    if (updateFolderDto.parentId) {
      if (updateFolderDto.parentId === id) {
        throw new BadRequestException('Folder cannot be its own parent');
      }

      await this.ensureOwnership(updateFolderDto.parentId, userId);
      await this.ensureNoCircularReference(id, updateFolderDto.parentId, userId);
    }

    return this.prismaService.folder.update({
      where: { id },
      data: {
        name: updateFolderDto.name?.trim(),
        parentId: updateFolderDto.parentId,
      },
    });
  }

  async remove(id: number, userId: number) {
    await this.ensureOwnership(id, userId);
    await this.prismaService.folder.delete({ where: { id } });
    return 'Folder deleted successfully';
  }

  private async ensureOwnership(id: number, userId: number): Promise<Folder> {
    const folder = await this.prismaService.folder.findFirst({ where: { id } });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.userId !== userId) throw new ForbiddenException('Not allowed');
    return folder;
  }

  private async ensureNoCircularReference(
    folderId: number,
    parentId: number,
    userId: number,
  ) {
    let currentParentId: number | null | undefined = parentId;

    while (currentParentId) {
      if (currentParentId === folderId) {
        throw new BadRequestException('Circular folder hierarchy is not allowed');
      }

      const parent = await this.prismaService.folder.findFirst({
        where: { id: currentParentId, userId },
        select: { parentId: true },
      });

      if (!parent) break;
      currentParentId = parent.parentId;
    }
  }
}

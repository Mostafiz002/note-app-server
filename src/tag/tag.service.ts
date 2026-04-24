import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Prisma, Tag } from '../../generated/prisma/client';

@Injectable()
export class TagService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createTagDto: CreateTagDto, userId: number) {
    try {
      return await this.prismaService.tag.create({
        data: {
          name: createTagDto.name.trim(),
          color: createTagDto.color,
          userId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Tag name already exists for this user');
      }
      throw error;
    }
  }

  async findAll(userId: number) {
    return this.prismaService.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, userId: number) {
    const tag = await this.ensureOwnership(id, userId);
    return tag;
  }

  async update(id: number, updateTagDto: UpdateTagDto, userId: number) {
    await this.ensureOwnership(id, userId);

    try {
      return await this.prismaService.tag.update({
        where: { id },
        data: {
          name: updateTagDto.name?.trim(),
          color: updateTagDto.color,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Tag name already exists for this user');
      }
      throw error;
    }
  }

  async remove(id: number, userId: number) {
    await this.ensureOwnership(id, userId);
    await this.prismaService.tag.delete({ where: { id } });
    return 'Tag deleted successfully';
  }

  private async ensureOwnership(id: number, userId: number): Promise<Tag> {
    const tag = await this.prismaService.tag.findFirst({ where: { id } });

    if (!tag) throw new NotFoundException('Tag not found');
    if (tag.userId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    return tag;
  }
}

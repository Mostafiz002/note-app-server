import { PrismaService } from './../prisma.service';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NoteService {
  private logger = new Logger(NoteService.name);
  constructor(private readonly prismaService: PrismaService) {}

  async create(createNoteDto: CreateNoteDto, userId: number) {
    const note = await this.prismaService.note.create({
      data: {
        title: createNoteDto.title,
        body: createNoteDto.body,
        userId,
      },
    });

    this.logger.log('New note has been created');
    return note;
  }

  async findAll(
    { take, skip }: { take: number; skip: number },
    userId: number,
  ) {
    const notes = await this.prismaService.note.findMany({
      where: {
        userId,
      },
      skip: skip,
      take: take,
    });

    return notes;
  }

  async findOne(id: number, userId: number) {
    const note = await this.prismaService.note.findFirst({
      where: {
        id,
      },
    });

    if (!note) throw new NotFoundException('Note not Found');

    if (note?.userId !== userId) {
      throw new ForbiddenException('Not Allowed!');
    }

    return note;
  }

  async update(id: number, updateNoteDto: UpdateNoteDto, userId: number) {
    const note = await this.prismaService.note.findFirst({ where: { id } });

    if (!note) throw new NotFoundException('Note not Found');

    if (note?.userId !== userId) {
      throw new ForbiddenException('Not Allowed!');
    }

    const updated = await this.prismaService.note.update({
      where: { id },
      data: updateNoteDto,
    });

    return updated;
  }

  remove(id: number) {
    return `This action removes a #${id} note`;
  }
}

import { PrismaService } from './../prisma.service';
import { Injectable, Logger } from '@nestjs/common';
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

  findOne(id: number) {
    return `This action returns a #${id} note`;
  }

  update(id: number, updateNoteDto: UpdateNoteDto) {
    return `This action updates a #${id} note`;
  }

  remove(id: number) {
    return `This action removes a #${id} note`;
  }
}

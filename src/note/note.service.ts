import { PrismaService } from './../prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note, NoteContentType, Prisma } from '../../generated/prisma/client';
import { ListNotesDto } from './dto/list-notes.dto';
import { MoveNoteFolderDto } from './dto/move-note-folder.dto';
import { SearchNotesDto } from './dto/search-notes.dto';

@Injectable()
export class NoteService {
  private logger = new Logger(NoteService.name);
  constructor(private readonly prismaService: PrismaService) {}

  async create(createNoteDto: CreateNoteDto, userId: number) {
    const contentType = createNoteDto.contentType ?? NoteContentType.MARKDOWN;
    this.validateNoteContent(createNoteDto, contentType);
    if (createNoteDto.folderId) {
      await this.ensureFolderOwnership(createNoteDto.folderId, userId);
    }
    const data: Prisma.NoteUncheckedCreateInput = {
      title: createNoteDto.title,
      contentType,
      userId,
      folderId: createNoteDto.folderId,
    };

    if (contentType === NoteContentType.MARKDOWN) {
      data.markdownContent = createNoteDto.markdownContent;
      data.body = createNoteDto.markdownContent;
      data.jsonContent = Prisma.JsonNull;
    } else {
      data.body = null;
      data.markdownContent = null;
      data.jsonContent = createNoteDto.jsonContent as Prisma.InputJsonValue;
    }

    const note = await this.prismaService.note.create({
      data,
    });

    this.logger.log('New note has been created');
    return note;
  }

  async findAll(query: ListNotesDto, userId: number) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const where = this.buildListWhereInput(query, userId);

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.note.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          folder: true,
          noteTags: {
            include: { tag: true },
          },
        },
      }),
      this.prismaService.note.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async search(query: SearchNotesDto, userId: number) {
    const term = query.q?.trim();
    if (!term) throw new BadRequestException('q is required for search');

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const pattern = `%${term.toLowerCase()}%`;
    const where = this.buildRawSearchWhereSql(query, userId, pattern);

    const [items, countRows] = await this.prismaService.$transaction([
      this.prismaService.$queryRaw<SearchResultRow[]>(Prisma.sql`
        SELECT
          n.id,
          n.title,
          n.contentType,
          n.markdownContent,
          n.archivedAt,
          n.deletedAt,
          n.createdAt,
          n.updatedAt,
          n.userId,
          n.folderId,
          (
            CASE WHEN lower(n.title) LIKE ${pattern} THEN 3 ELSE 0 END +
            CASE WHEN lower(coalesce(n.markdownContent, '')) LIKE ${pattern} THEN 1 ELSE 0 END
          ) AS score
        FROM "Note" n
        ${where}
        ORDER BY score DESC, n.updatedAt DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `),
      this.prismaService.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*) as total
        FROM "Note" n
        ${where}
      `),
    ]);

    const total = Number(countRows[0]?.total ?? 0);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      search: {
        mode: 'keyword',
        semantic: {
          ready: false,
          provider: null,
          nextStep: 'Plug embeddings + vector index in AI module',
        },
      },
    };
  }

  async findOne(id: number, userId: number) {
    const note = await this.ensureOwnership(id, userId);
    return note;
  }

  async update(id: number, updateNoteDto: UpdateNoteDto, userId: number) {
    const note = await this.ensureOwnership(id, userId);
    const contentType = updateNoteDto.contentType ?? note.contentType;
    this.validateNoteContent(
      {
        markdownContent: updateNoteDto.markdownContent ?? note.markdownContent,
        jsonContent: updateNoteDto.jsonContent ?? note.jsonContent,
      },
      contentType,
    );
    if (updateNoteDto.folderId) {
      await this.ensureFolderOwnership(updateNoteDto.folderId, userId);
    }
    const data: Prisma.NoteUncheckedUpdateInput = {
      title: updateNoteDto.title,
      contentType,
      folderId: updateNoteDto.folderId,
    };

    if (contentType === NoteContentType.MARKDOWN) {
      data.markdownContent =
        updateNoteDto.markdownContent ?? note.markdownContent;
      data.body = updateNoteDto.markdownContent ?? note.markdownContent;
      data.jsonContent = Prisma.JsonNull;
    } else {
      data.body = null;
      data.markdownContent = null;
      data.jsonContent = (updateNoteDto.jsonContent ??
        note.jsonContent) as Prisma.InputJsonValue;
    }

    const updated = await this.prismaService.note.update({
      where: { id },
      data,
    });

    return updated;
  }

  async archive(id: number, userId: number) {
    await this.ensureOwnership(id, userId);
    return this.prismaService.note.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async unarchive(id: number, userId: number) {
    await this.ensureOwnership(id, userId);
    return this.prismaService.note.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async moveToFolder(
    noteId: number,
    moveNoteFolderDto: MoveNoteFolderDto,
    userId: number,
  ) {
    await this.ensureOwnership(noteId, userId);
    if (moveNoteFolderDto.folderId) {
      await this.ensureFolderOwnership(moveNoteFolderDto.folderId, userId);
    }

    return this.prismaService.note.update({
      where: { id: noteId },
      data: { folderId: moveNoteFolderDto.folderId ?? null },
      include: {
        folder: true,
        noteTags: { include: { tag: true } },
      },
    });
  }

  async remove(id: number, userId: number) {
    await this.ensureOwnership(id, userId);
    await this.prismaService.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return 'Moved to trash';
  }

  async restore(id: number, userId: number) {
    await this.ensureOwnership(id, userId);
    return this.prismaService.note.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async attachTag(noteId: number, tagId: number, userId: number) {
    await this.ensureOwnership(noteId, userId);
    await this.ensureTagOwnership(tagId, userId);

    await this.prismaService.noteTag.upsert({
      where: { noteId_tagId: { noteId, tagId } },
      update: {},
      create: { noteId, tagId },
    });

    return this.findOneWithTags(noteId, userId);
  }

  async getLinks(noteId: number, userId: number) {
    await this.ensureOwnership(noteId, userId);

    const [outgoing, incoming] = await this.prismaService.$transaction([
      this.prismaService.noteLink.findMany({
        where: { sourceNoteId: noteId },
        include: {
          targetNote: {
            select: {
              id: true,
              title: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      this.prismaService.noteLink.findMany({
        where: { targetNoteId: noteId },
        include: {
          sourceNote: {
            select: {
              id: true,
              title: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
    ]);

    return { outgoing, incoming };
  }

  async linkNote(sourceNoteId: number, targetNoteId: number, userId: number) {
    if (sourceNoteId === targetNoteId) {
      throw new BadRequestException('A note cannot be linked to itself');
    }

    await this.ensureOwnership(sourceNoteId, userId);
    await this.ensureOwnership(targetNoteId, userId);

    await this.prismaService.noteLink.upsert({
      where: { sourceNoteId_targetNoteId: { sourceNoteId, targetNoteId } },
      update: {},
      create: { sourceNoteId, targetNoteId },
    });

    return this.getLinks(sourceNoteId, userId);
  }

  async unlinkNote(sourceNoteId: number, targetNoteId: number, userId: number) {
    await this.ensureOwnership(sourceNoteId, userId);
    await this.ensureOwnership(targetNoteId, userId);

    await this.prismaService.noteLink.deleteMany({
      where: { sourceNoteId, targetNoteId },
    });

    return this.getLinks(sourceNoteId, userId);
  }

  async detachTag(noteId: number, tagId: number, userId: number) {
    await this.ensureOwnership(noteId, userId);
    await this.ensureTagOwnership(tagId, userId);

    await this.prismaService.noteTag.deleteMany({
      where: { noteId, tagId },
    });

    return this.findOneWithTags(noteId, userId);
  }

  private async ensureOwnership(id: number, userId: number): Promise<Note> {
    const note = await this.prismaService.note.findFirst({
      where: { id },
      include: {
        folder: true,
        noteTags: {
          include: { tag: true },
        },
        outgoingLinks: {
          include: {
            targetNote: {
              select: { id: true, title: true },
            },
          },
        },
        incomingLinks: {
          include: {
            sourceNote: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    if (!note) throw new NotFoundException('Note not Found');
    if (note.userId !== userId) throw new ForbiddenException('Not Allowed!');

    return note;
  }

  private async findOneWithTags(id: number, userId: number) {
    const note = await this.prismaService.note.findFirst({
      where: { id, userId },
      include: {
        folder: true,
        noteTags: {
          include: { tag: true },
        },
        outgoingLinks: {
          include: {
            targetNote: {
              select: { id: true, title: true },
            },
          },
        },
        incomingLinks: {
          include: {
            sourceNote: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    if (!note) throw new NotFoundException('Note not Found');
    return note;
  }

  private async ensureTagOwnership(tagId: number, userId: number) {
    const tag = await this.prismaService.tag.findFirst({
      where: { id: tagId },
    });
    if (!tag) throw new NotFoundException('Tag not found');
    if (tag.userId !== userId) throw new ForbiddenException('Not Allowed!');
  }

  private async ensureFolderOwnership(folderId: number, userId: number) {
    const folder = await this.prismaService.folder.findFirst({
      where: { id: folderId },
    });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.userId !== userId) throw new ForbiddenException('Not Allowed!');
  }

  private buildListWhereInput(
    query: ListNotesDto,
    userId: number,
  ): Prisma.NoteWhereInput {
    const includeArchived = query.includeArchived ?? false;
    const includeTrashed = query.includeTrashed ?? false;
    const search = query.search?.trim();

    return {
      userId,
      archivedAt: includeArchived ? undefined : null,
      deletedAt: includeTrashed ? undefined : null,
      contentType: query.contentType,
      folderId: query.folderId,
      OR: search
        ? [
            { title: { contains: search } },
            { markdownContent: { contains: search } },
          ]
        : undefined,
    };
  }

  private validateNoteContent(
    dto: { markdownContent?: string | null; jsonContent?: unknown },
    contentType: NoteContentType,
  ) {
    if (contentType === NoteContentType.MARKDOWN && !dto.markdownContent) {
      throw new BadRequestException(
        'markdownContent is required when contentType is MARKDOWN',
      );
    }

    if (contentType === NoteContentType.JSON && !dto.jsonContent) {
      throw new BadRequestException(
        'jsonContent is required when contentType is JSON',
      );
    }
  }

  private buildRawSearchWhereSql(
    query: SearchNotesDto,
    userId: number,
    pattern: string,
  ) {
    const filters: Prisma.Sql[] = [
      Prisma.sql`n.userId = ${userId}`,
      Prisma.sql`(lower(n.title) LIKE ${pattern} OR lower(coalesce(n.markdownContent, '')) LIKE ${pattern})`,
    ];

    if (!query.includeArchived) filters.push(Prisma.sql`n.archivedAt IS NULL`);
    if (!query.includeTrashed) filters.push(Prisma.sql`n.deletedAt IS NULL`);
    if (query.contentType)
      filters.push(Prisma.sql`n.contentType = ${query.contentType}`);
    if (query.folderId)
      filters.push(Prisma.sql`n.folderId = ${query.folderId}`);

    return Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;
  }
}

type SearchResultRow = {
  id: number;
  title: string;
  contentType: NoteContentType;
  markdownContent: string | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  folderId: number | null;
  score: number;
};

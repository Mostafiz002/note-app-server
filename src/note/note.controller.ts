import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { NoteService } from './note.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { ListNotesDto } from './dto/list-notes.dto';
import { MoveNoteFolderDto } from './dto/move-note-folder.dto';
import { LinkNoteDto } from './dto/link-note.dto';
import { SearchNotesDto } from './dto/search-notes.dto';

@Controller('api/v1/notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(
    @Body() createNoteDto: CreateNoteDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.create(createNoteDto, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll(
    @Request() req: { user: { sub: number } },
    @Query() query: ListNotesDto,
  ) {
    return this.noteService.findAll(query, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Get('search')
  search(
    @Request() req: { user: { sub: number } },
    @Query() query: SearchNotesDto,
  ) {
    return this.noteService.search(query, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.findOne(id, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNoteDto: UpdateNoteDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.update(id, updateNoteDto, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/folder')
  moveToFolder(
    @Param('id', ParseIntPipe) id: number,
    @Body() moveNoteFolderDto: MoveNoteFolderDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.moveToFolder(id, moveNoteFolderDto, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/archive')
  archive(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.archive(id, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/unarchive')
  unarchive(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.unarchive(id, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/restore')
  restore(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.restore(id, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/tags/:tagId')
  attachTag(
    @Param('id', ParseIntPipe) id: number,
    @Param('tagId', ParseIntPipe) tagId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.attachTag(id, tagId, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Get(':id/links')
  getLinks(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.getLinks(id, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/links')
  linkNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() linkNoteDto: LinkNoteDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.linkNote(id, linkNoteDto.targetNoteId, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Delete(':id/links/:targetId')
  unlinkNote(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.unlinkNote(id, targetId, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Delete(':id/tags/:tagId')
  detachTag(
    @Param('id', ParseIntPipe) id: number,
    @Param('tagId', ParseIntPipe) tagId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.detachTag(id, tagId, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.noteService.remove(id, req.user.sub);
  }
}

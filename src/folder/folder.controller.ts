import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { FolderService } from './folder.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Controller('api/v1/folders')
@UseGuards(AuthGuard)
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  create(
    @Body() createFolderDto: CreateFolderDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.folderService.create(createFolderDto, req.user.sub);
  }

  @Get()
  findAll(@Request() req: { user: { sub: number } }) {
    return this.folderService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.folderService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFolderDto: UpdateFolderDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.folderService.update(id, updateFolderDto, req.user.sub);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.folderService.remove(id, req.user.sub);
  }
}

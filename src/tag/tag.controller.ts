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
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Controller('api/v1/tags')
@UseGuards(AuthGuard)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  create(
    @Body() createTagDto: CreateTagDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.tagService.create(createTagDto, req.user.sub);
  }

  @Get()
  findAll(@Request() req: { user: { sub: number } }) {
    return this.tagService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.tagService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTagDto: UpdateTagDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.tagService.update(id, updateTagDto, req.user.sub);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.tagService.remove(id, req.user.sub);
  }
}

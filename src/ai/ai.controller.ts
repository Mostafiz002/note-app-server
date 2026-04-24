import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { AiService } from './ai.service';
import { AiNoteRequestDto } from './dto/ai-note-request.dto';

@Controller('api/v1/ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('summarize')
  summarize(
    @Body() dto: AiNoteRequestDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.aiService.summarizeNote(dto, req.user.sub);
  }

  @Post('rewrite')
  rewrite(
    @Body() dto: AiNoteRequestDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.aiService.rewriteNote(dto, req.user.sub);
  }

  @Post('generate-title')
  generateTitle(
    @Body() dto: AiNoteRequestDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.aiService.generateTitle(dto, req.user.sub);
  }

  @Post('key-points')
  keyPoints(
    @Body() dto: AiNoteRequestDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.aiService.extractKeyPoints(dto, req.user.sub);
  }
}

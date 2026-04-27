import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AiNoteRequestDto } from './dto/ai-note-request.dto';
import { GeminiProvider } from './gemini.provider';

type AiOutput = {
  summary?: string;
  rewrittenContent?: string;
  title?: string;
  keyPoints?: string[];
};

@Injectable()
export class AiService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly geminiProvider: GeminiProvider,
  ) {}

  async summarizeNote(dto: AiNoteRequestDto, userId: number) {
    const note = await this.getOwnedNote(dto.noteId, userId);
    const prompt = this.buildPrompt('summarize', note.title, this.getContent(note), dto.instruction);
    const result = await this.geminiProvider.generateJson<AiOutput>(prompt);
    console.log("AI RESULT:", result);

    const summary = result.summary ?? '';
    if (summary) {
      await this.prismaService.note.update({
        where: { id: note.id },
        data: { summary },
      });
    }

    return {
      noteId: note.id,
      summary,
    };
  }

  async rewriteNote(dto: AiNoteRequestDto, userId: number) {
    const note = await this.getOwnedNote(dto.noteId, userId);
    const prompt = this.buildPrompt('rewrite', note.title, this.getContent(note), dto.instruction);
    const result = await this.geminiProvider.generateJson<AiOutput>(prompt);

    return {
      noteId: note.id,
      rewrittenContent: result.rewrittenContent ?? '',
    };
  }

  async generateTitle(dto: AiNoteRequestDto, userId: number) {
    const note = await this.getOwnedNote(dto.noteId, userId);
    const prompt = this.buildPrompt(
      'generate_short_title',
      note.title,
      this.getContent(note),
      dto.instruction,
    );
    const result = await this.geminiProvider.generateJson<AiOutput>(prompt);

    return {
      noteId: note.id,
      title: result.title ?? '',
    };
  }

  async extractKeyPoints(dto: AiNoteRequestDto, userId: number) {
    const note = await this.getOwnedNote(dto.noteId, userId);
    const prompt = this.buildPrompt(
      'extract_key_points',
      note.title,
      this.getContent(note),
      dto.instruction,
    );
    const result = await this.geminiProvider.generateJson<AiOutput>(prompt);

    const keyPoints = result.keyPoints ?? [];
    if (keyPoints.length > 0) {
      await this.prismaService.note.update({
        where: { id: note.id },
        data: { keyPoints },
      });
    }

    return {
      noteId: note.id,
      keyPoints,
    };
  }

  private getContent(note: { markdownContent: string | null; jsonContent: unknown }) {
    if (note.markdownContent) return note.markdownContent;
    if (note.jsonContent) return JSON.stringify(note.jsonContent);
    return '';
  }

  private buildPrompt(
    task: 'summarize' | 'rewrite' | 'generate_short_title' | 'extract_key_points',
    title: string,
    content: string,
    instruction?: string,
  ) {
    return JSON.stringify({
      task,
      instruction: instruction ?? null,
      input: {
        title,
        content,
      },
      outputSchema: {
        summary: 'string',
        rewrittenContent: 'string',
        title: 'string',
        keyPoints: ['string'],
      },
      rules: [
        'Return valid JSON only.',
        'Do not include markdown fences.',
        'Keep output concise and useful.',
      ],
    });
  }

  private async getOwnedNote(noteId: number, userId: number) {
    const note = await this.prismaService.note.findFirst({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.userId !== userId) throw new ForbiddenException('Not allowed');
    return note;
  }
}

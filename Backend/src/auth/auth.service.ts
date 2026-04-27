import { UserService } from './../user/user.service';
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from 'src/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.userService.getUserByEmail(registerDto.email);

    if (user) {
      throw new ConflictException('Email already taken');
    }

    const saltRound = 10;

    const hashedPassword = await bcrypt.hash(registerDto.password, saltRound);

    const newUser = await this.userService.createUser({
      ...registerDto,
      password: hashedPassword,
    });

    const folder = await this.prismaService.folder.create({
      data: {
        name: 'General',
        userId: newUser.id,
      },
    });

    await this.prismaService.note.create({
      data: {
        title: 'Getting Started',
        markdownContent: '# Welcome to Think Note AI!\n\nThis is your first note. You can edit it, delete it, or create new ones using the sidebar.\n\nEnjoy using Think Note AI!',
        userId: newUser.id,
        folderId: folder.id,
      },
    });

    this.logger.log(`New user has been created: ${newUser.id}`);

    const otp = this.generateOtp();
    const codeHash = await bcrypt.hash(otp, saltRound);
    await this.prismaService.emailOtp.create({
      data: {
        email: newUser.email,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.mailService.sendOtpEmail({ to: newUser.email, otp });

    return { ok: true };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.getUserByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Email or Password is incorrect');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Email is not verified');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email or Password is incorrect');
    }

    return await this.issueTokens(user.id, user.name ?? '');
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const user = await this.userService.getUserByEmail(verifyOtpDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid verification request');
    }

    const otps = await this.prismaService.emailOtp.findMany({
      where: {
        email: verifyOtpDto.email,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const match = await this.findMatchingOtp(otps.map((o) => o.codeHash), verifyOtpDto.otp);
    if (!match) {
      throw new UnauthorizedException('OTP is invalid or expired');
    }

    await this.userService.markEmailVerified(verifyOtpDto.email);
    await this.prismaService.emailOtp.deleteMany({ where: { email: verifyOtpDto.email } });

    return await this.issueTokens(user.id, user.name ?? '');
  }

  async resendOtp(email: string) {
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.emailVerified) {
      throw new ConflictException('Email is already verified');
    }

    const saltRound = 10;
    const otp = this.generateOtp();
    const codeHash = await bcrypt.hash(otp, saltRound);
    await this.prismaService.emailOtp.create({
      data: {
        email: user.email,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.mailService.sendOtpEmail({ to: user.email, otp });

    return { ok: true };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const token = refreshTokenDto.refresh_token;
    let payload: { sub: number; type?: string; username?: string };
    try {
      payload = (await this.jwtService.verifyAsync(token)) as {
        sub: number;
        type?: string;
        username?: string;
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prismaService.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const ok = await bcrypt.compare(token, user.refreshTokenHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return await this.issueTokens(user.id, user.name ?? '');
  }

  private generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private async findMatchingOtp(codeHashes: string[], otp: string) {
    for (const h of codeHashes) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await bcrypt.compare(otp, h);
      if (ok) return true;
    }
    return false;
  }

  private async issueTokens(userId: number, username: string) {
    const accessPayload = { sub: userId, username };
    const refreshPayload = { sub: userId, username, type: 'refresh' };

    const access_token = await this.jwtService.signAsync(accessPayload, {
      expiresIn: '30m',
    });
    const refresh_token = await this.jwtService.signAsync(refreshPayload, {
      expiresIn: '30d',
    });

    const refreshTokenHash = await bcrypt.hash(refresh_token, 10);
    await this.userService.setRefreshTokenHash(userId, refreshTokenHash);

    return { access_token, refresh_token };
  }
}

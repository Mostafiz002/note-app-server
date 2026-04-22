import { UserService } from './../user/user.service';
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
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

    this.logger.log(`New user has been created: ${newUser.id}`);

    const payload = { sub: newUser.id, username: newUser.name };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.getUserByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Email or Password is incorrect');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email or Password is incorrect');
    }

    const payload = { sub: user.id, username: user.name };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}

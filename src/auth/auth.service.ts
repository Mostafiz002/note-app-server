import { UserService } from './../user/user.service';
import { Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  register(registerDto: RegisterDto) {
    const user = this.userService.getUserByEmail(registerDto.email);
    return user;
  }
}

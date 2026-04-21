import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  getUserByEmail(email: string) {
    return {
      email,
    };
  }
}

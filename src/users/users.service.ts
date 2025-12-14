import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateUserDto, UserResponseDto } from './dto/create-user.dto';
import { UsersRepository } from './users.repository';
import { IUser } from '../common/interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  public async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const lastUser = await this.usersRepository.findLastUser();
    const newId = lastUser ? lastUser.userId + 1 : 1;

    const savedUser: IUser = await this.usersRepository.create(newId, createUserDto.username);

    return this.mapToDto(savedUser);
  }

  public async findOne(userId: number): Promise<UserResponseDto> {
    const user: IUser | null = await this.usersRepository.findOne(userId);

    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    return this.mapToDto(user);
  }

  private mapToDto(user: IUser): UserResponseDto {
    return {
      userId: user.userId,
      username: user.username,
    };
  }
}

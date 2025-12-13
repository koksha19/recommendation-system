import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UserResponseDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  public async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const lastUser = await this.userModel.findOne().sort({ userId: -1 }).exec();
    const newId = lastUser ? lastUser.userId + 1 : 1;

    const newUser = new this.userModel({
      userId: newId,
      username: createUserDto.username,
    });

    const savedUser = await newUser.save();

    return this.mapToDto(savedUser);
  }

  public async findOne(userId: number): Promise<UserResponseDto> {
    const user = await this.userModel.findOne({ userId }).exec();

    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    return this.mapToDto(user);
  }

  public async exists(userId: number): Promise<boolean> {
    const count = await this.userModel.countDocuments({ userId }).exec();
    return count > 0;
  }

  private mapToDto(user: UserDocument): UserResponseDto {
    return {
      userId: user.userId,
      username: user.username,
    };
  }
}

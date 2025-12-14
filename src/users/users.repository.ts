import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { IUser } from '../common/interfaces/user.interface';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  public create(userId: number, username: string): Promise<IUser> {
    const newUser = new this.userModel({ userId, username });
    return newUser.save();
  }

  public findOne(userId: number): Promise<IUser | null> {
    return this.userModel.findOne({ userId }).lean().exec();
  }

  public findLastUser(): Promise<IUser | null> {
    return this.userModel.findOne().sort({ userId: -1 }).lean().exec();
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from './users.service';
import { User, UserDocument } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  let model: Model<UserDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: class MockUserModel {
            constructor(private data: Partial<User>) {
              Object.assign(this, data);
            }
            save = jest.fn().mockResolvedValue({ userId: 2, username: 'Test' });
            static findOne = jest.fn();
            static countDocuments = jest.fn();
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get<Model<UserDocument>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      const sortMock = jest.fn().mockReturnValue({ exec: execMock });

      jest.spyOn(model, 'findOne').mockReturnValue({
        sort: sortMock,
      } as any);

      const result = await service.create({ username: 'Neo' });

      expect(result).toEqual({ userId: 2, username: 'Test' });

      expect(model.findOne).toHaveBeenCalled();
    });
  });
});

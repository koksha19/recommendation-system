import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn().mockImplementation((dto: CreateUserDto) => {
      return Promise.resolve({ userId: 1, ...dto });
    }),
    findOne: jest.fn().mockImplementation((id: number) => {
      return Promise.resolve({ userId: id, username: 'Test User' });
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a user', async () => {
    const dto: CreateUserDto = { username: 'Trinity' };
    const result = await controller.create(dto);

    expect(result).toEqual({ userId: 1, username: 'Trinity' });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should find a user', async () => {
    const result = await controller.findOne(1);
    expect(result).toEqual({ userId: 1, username: 'Test User' });
    expect(service.findOne).toHaveBeenCalledWith(1);
  });
});

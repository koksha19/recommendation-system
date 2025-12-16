import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;
  let repository: any;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findLastUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create the first user with id = 1 when DB is empty', async () => {
      repository.findLastUser.mockResolvedValue(null);
      repository.create.mockResolvedValue({ userId: 1, username: 'alice' });

      const result = await service.create({ username: 'alice' });

      expect(repository.findLastUser).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(1, 'alice');
      expect(result).toEqual({ userId: 1, username: 'alice' });
    });

    it('should increment userId based on last user', async () => {
      repository.findLastUser.mockResolvedValue({
        userId: 42,
        username: 'previous',
      });

      repository.create.mockResolvedValue({
        userId: 43,
        username: 'bob',
      });

      const result = await service.create({ username: 'bob' });

      expect(repository.create).toHaveBeenCalledWith(43, 'bob');
      expect(result.userId).toBe(43);
    });

    it('should call repository.create exactly once', async () => {
      repository.findLastUser.mockResolvedValue(null);
      repository.create.mockResolvedValue({ userId: 1, username: 'user' });

      await service.create({ username: 'user' });

      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('should propagate repository errors', async () => {
      repository.findLastUser.mockResolvedValue(null);
      repository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create({ username: 'fail' }),
      ).rejects.toThrow('DB error');
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      repository.findOne.mockResolvedValue({
        userId: 10,
        username: 'john',
      });

      const result = await service.findOne(10);

      expect(repository.findOne).toHaveBeenCalledWith(10);
      expect(result).toEqual({ userId: 10, username: 'john' });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include userId in NotFoundException message', async () => {
      repository.findOne.mockResolvedValue(null);

      try {
        await service.findOne(123);
      } catch (e: any) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect(e.message).toContain('123');
      }
    });

    it('should not swallow repository errors', async () => {
      repository.findOne.mockRejectedValue(new Error('DB crash'));

      await expect(service.findOne(1)).rejects.toThrow('DB crash');
    });
  });

  describe('scenarios', () => {
    it('Scenario: rapid user creation (ID consistency)', async () => {
      repository.findLastUser
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ userId: 1 });

      repository.create
        .mockResolvedValueOnce({ userId: 1, username: 'u1' })
        .mockResolvedValueOnce({ userId: 2, username: 'u2' });

      const u1 = await service.create({ username: 'u1' });
      const u2 = await service.create({ username: 'u2' });

      expect(u1.userId).toBe(1);
      expect(u2.userId).toBe(2);
    });

    it('Scenario: repository returns malformed user (defensive mapping)', async () => {
      repository.findOne.mockResolvedValue({
        userId: 5,
        username: 'x',
        extra: 'ignored',
      });

      const result = await service.findOne(5);

      expect(result).toEqual({
        userId: 5,
        username: 'x',
      });
    });
  });
});

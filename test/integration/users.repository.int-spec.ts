import { Test } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UsersRepository } from '../../src/users/users.repository';
import { User, UserSchema } from '../../src/users/schemas/user.schema';
import { connect, Connection, Model } from 'mongoose';

describe('UsersRepository (Integration)', () => {
  let repository: UsersRepository;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let userModel: Model<User>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [UsersRepository],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    userModel = module.get(getModelToken(User.name));
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  describe('create & findOne', () => {
    it('should create a user and retrieve it exactly', async () => {
      const created = await repository.create(1, 'neo');

      expect(created.userId).toBe(1);
      expect(created.username).toBe('neo');
      expect(created).toHaveProperty('_id');

      const found = await repository.findOne(1);
      expect(found).toBeDefined();
      expect(found?.username).toBe('neo');
    });

    it('should return null if user does not exist', async () => {
      const found = await repository.findOne(999);
      expect(found).toBeNull();
    });

    it('should return lean object (performance check)', async () => {
      await repository.create(10, 'lean_user');
      const found = await repository.findOne(10);

      expect(found).not.toHaveProperty('save');
    });

    it('should prevent duplicate userIds (Schema Constraint)', async () => {
      await repository.create(1, 'Original');

      try {
        await repository.create(1, 'Duplicate');
        fail('Should have thrown duplicate key error');
      } catch (e) {
        expect(e.code).toBe(11000);
      }
    });
  });

  describe('findLastUser', () => {
    it('should return null if database is empty (Cold Start)', async () => {
      const last = await repository.findLastUser();
      expect(last).toBeNull();
    });

    it('should return the user with highest ID, regardless of insertion order', async () => {
      await repository.create(10, 'User 10');
      await repository.create(50, 'User 50');
      await repository.create(5, 'User 5');

      const last = await repository.findLastUser();

      expect(last).toBeDefined();
      expect(last?.userId).toBe(50);
      expect(last?.username).toBe('User 50');
    });

    it('should handle gaps in IDs correctly', async () => {
      await repository.create(1, 'A');
      await repository.create(100, 'Z');

      const last = await repository.findLastUser();
      expect(last?.userId).toBe(100);
    });
  });
});

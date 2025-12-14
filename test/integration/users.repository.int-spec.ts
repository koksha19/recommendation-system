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

  it('should create a user and retrieve it', async () => {
    const created = await repository.create(1, 'testuser');
    expect(created.userId).toBe(1);
    expect(created.username).toBe('testuser');

    const found = await repository.findOne(1);
    expect(found).toBeDefined();
    expect(found?.username).toBe('testuser');
  });

  it('should find the last user correctly (for auto-increment)', async () => {
    await repository.create(1, 'user1');
    await repository.create(5, 'user5'); // Gap in IDs
    await repository.create(2, 'user2');

    const last = await repository.findLastUser();
    expect(last?.userId).toBe(5); // Should find max ID, not last inserted
  });

  it('should prevent duplicates if schema enforces it (Schema Test)', async () => {
    // Assuming schema has unique index on userId
    await repository.create(1, 'A');
    try {
      await repository.create(1, 'B');
      fail('Should have thrown error');
    } catch (e) {
      expect(e.code).toBe(11000); // Duplicate key error code
    }
  });
});

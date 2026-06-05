import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: any;

process.env.NODE_ENV = 'test';
process.env.ENABLE_AFIP_QUEUE = 'false';

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 }
  });
  
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

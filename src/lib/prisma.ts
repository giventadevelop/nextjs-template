import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.POOLED_URL
      }
    },
    log: ['error'],
    errorFormat: 'pretty',
  }).$extends(withAccelerate());
};

declare global {
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;

// Ensure disconnection
if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}
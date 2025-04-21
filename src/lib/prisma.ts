import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function getPrismaClient() {
  try {
    if (!prisma) {
      throw new Error('Prisma client is not initialized')
    }
    return prisma
  } catch (error) {
    console.error('Error getting Prisma client:', error)
    throw new Error('Database connection failed')
  }
}
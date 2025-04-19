'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().optional().nullable(),
})

export async function createTask(formData: FormData) {
  const { userId } = auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const validatedFields = TaskSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    status: formData.get('status'),
    priority: formData.get('priority'),
    dueDate: formData.get('dueDate'),
  })

  if (!validatedFields.success) {
    throw new Error('Invalid fields')
  }

  const { dueDate, ...otherFields } = validatedFields.data

  // Convert date string to ISO string if it exists
  const formattedDate = dueDate ? new Date(dueDate + 'T00:00:00Z').toISOString() : null

  await db.task.create({
    data: {
      ...otherFields,
      dueDate: formattedDate,
      userId,
      completed: otherFields.status === 'completed',
    },
  })

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}

export async function updateTask(taskId: string, formData: FormData) {
  const { userId } = auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const task = await db.task.findUnique({
    where: { id: taskId, userId },
  })

  if (!task) {
    throw new Error('Task not found')
  }

  const validatedFields = TaskSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    status: formData.get('status'),
    priority: formData.get('priority'),
    dueDate: formData.get('dueDate'),
  })

  if (!validatedFields.success) {
    throw new Error('Invalid fields')
  }

  const { dueDate, ...otherFields } = validatedFields.data

  // Convert date string to ISO string if it exists
  const formattedDate = dueDate ? new Date(dueDate + 'T00:00:00Z').toISOString() : null

  await db.task.update({
    where: { id: taskId },
    data: {
      ...otherFields,
      dueDate: formattedDate,
      completed: otherFields.status === 'completed',
    },
  })

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}

export async function deleteTask(taskId: string) {
  const { userId } = auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const task = await db.task.findUnique({
    where: { id: taskId, userId },
  })

  if (!task) {
    throw new Error('Task not found')
  }

  await db.task.delete({
    where: { id: taskId },
  })

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}

export async function toggleTaskCompletion(taskId: string) {
  const { userId } = auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const task = await db.task.findUnique({
    where: { id: taskId, userId },
  })

  if (!task) {
    throw new Error('Task not found')
  }

  const newStatus = !task.completed ? 'completed' : 'pending'

  await db.task.update({
    where: { id: taskId },
    data: {
      completed: !task.completed,
      status: newStatus,
    },
  })

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}
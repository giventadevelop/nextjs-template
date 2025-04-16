'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.string().default('pending'),
  priority: z.string().default('medium'),
  dueDate: z.string().optional().nullable(),
})

export async function createTask(formData: FormData) {
  const { userId } = auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const validatedFields = TaskSchema.parse({
    title: formData.get('title'),
    description: formData.get('description'),
    status: formData.get('status'),
    priority: formData.get('priority'),
    dueDate: formData.get('dueDate'),
  })

  await db.task.create({
    data: {
      ...validatedFields,
      userId,
      dueDate: validatedFields.dueDate ? new Date(validatedFields.dueDate) : null,
    },
  })

  revalidatePath('/tasks')
  return { success: true }
}

export async function updateTask(taskId: string, formData: FormData) {
  const { userId } = auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
  })

  if (!task || task.userId !== userId) {
    throw new Error('Task not found or unauthorized')
  }

  const validatedFields = TaskSchema.parse({
    title: formData.get('title'),
    description: formData.get('description'),
    status: formData.get('status'),
    priority: formData.get('priority'),
    dueDate: formData.get('dueDate'),
  })

  await db.task.update({
    where: { id: taskId },
    data: {
      ...validatedFields,
      dueDate: validatedFields.dueDate ? new Date(validatedFields.dueDate) : null,
    },
  })

  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteTask(taskId: string) {
  const { userId } = auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
  })

  if (!task || task.userId !== userId) {
    throw new Error('Task not found or unauthorized')
  }

  await db.task.delete({
    where: { id: taskId },
  })

  revalidatePath('/tasks')
  return { success: true }
}

export async function toggleTaskCompletion(taskId: string) {
  const { userId } = auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
  })

  if (!task || task.userId !== userId) {
    throw new Error('Task not found or unauthorized')
  }

  await db.task.update({
    where: { id: taskId },
    data: { completed: !task.completed },
  })

  revalidatePath('/tasks')
  return { success: true }
}
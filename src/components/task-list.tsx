'use client'

import { useRouter } from 'next/navigation'
import { deleteTask, toggleTaskCompletion } from '@/lib/actions/task'

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  dueDate?: Date | null
  completed: boolean
  createdAt: Date
}

interface TaskListProps {
  tasks: Task[]
}

export function TaskList({ tasks }: TaskListProps) {
  const router = useRouter()

  async function handleDelete(taskId: string) {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId)
      router.refresh()
    }
  }

  async function handleToggleCompletion(taskId: string) {
    await toggleTaskCompletion(taskId)
    router.refresh()
  }

  function getPriorityColor(priority: string) {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-600 bg-red-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleCompletion(task.id)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <h3
                  className={`text-lg font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                    {task.status}
                  </span>
                  {task.dueDate && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      Due {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => router.push(`/tasks/${task.id}/edit`)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
      {tasks.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-gray-500">No tasks found. Create your first task!</p>
        </div>
      )}
    </div>
  )
}
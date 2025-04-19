'use client';

import Link from "next/link";
import { Pagination } from "./Pagination";
import { useSearchParams } from "next/navigation";

interface Task {
  id: string;
  title: string;
  status: string;
  completed: boolean;
  priority: string;
}

interface DashboardContentProps {
  tasks: Task[];
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    highPriority: number;
  };
}

const PAGE_SIZE = 3;

export function DashboardContent({ tasks = [], stats }: DashboardContentProps) {
  const searchParams = useSearchParams();
  const currentPage = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedTasks = tasks.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8">
      {/* Dashboard Content */}
      <div className="space-y-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Welcome back!</h2>
            <h1 className="text-2xl font-bold text-gray-900">Your Dashboard</h1>
          </div>
          <Link
            href="/tasks/new"
            className="rounded-md bg-[#39E079] px-6 py-2 text-sm font-medium text-[#141414] hover:bg-[#32c96d] focus:outline-none focus:ring-2 focus:ring-[#39E079] focus:ring-offset-2"
          >
            Create Task
          </Link>
        </div>

        {/* Task Statistics */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Tasks</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Completed</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">{stats.inProgress}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Pending</h3>
            <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">High Priority</h3>
            <p className="mt-2 text-3xl font-bold text-red-600">{stats.highPriority}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/tasks"
              className="flex items-center justify-center rounded-lg border border-gray-200 p-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View All Tasks
            </Link>
            <Link
              href="/tasks/new"
              className="flex items-center justify-center rounded-lg border border-gray-200 p-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Create New Task
            </Link>
            <Link
              href="/tasks?status=in_progress"
              className="flex items-center justify-center rounded-lg border border-gray-200 p-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View In Progress
            </Link>
            <Link
              href="/tasks?priority=high"
              className="flex items-center justify-center rounded-lg border border-gray-200 p-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              High Priority Tasks
            </Link>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Tasks</h2>
            <Link
              href="/tasks"
              className="text-sm font-medium text-[#39E079] hover:text-[#32c96d]"
            >
              View All
            </Link>
          </div>
          <div className="mt-4 divide-y divide-gray-200">
            {tasks.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">No tasks found.</p>
                <Link
                  href="/tasks/new"
                  className="mt-2 inline-block text-sm font-medium text-[#39E079] hover:text-[#32c96d]"
                >
                  Create your first task
                </Link>
              </div>
            ) : (
              <>
                {paginatedTasks.map((task: Task) => (
                  <div key={task.id} className="flex items-center justify-between py-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        readOnly
                        className="h-4 w-4 rounded border-gray-300 text-[#39E079]"
                      />
                      <span
                        className={`ml-3 text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'
                          }`}
                      >
                        {task.title}
                      </span>
                      <span
                        className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${task.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : task.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                          }`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <Link
                      href={`/tasks/${task.id}/edit`}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Edit
                    </Link>
                  </div>
                ))}
                <Pagination
                  totalItems={tasks.length}
                  pageSize={PAGE_SIZE}
                  currentPage={currentPage}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
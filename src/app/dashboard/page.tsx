import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { DashboardContent } from "@/components/DashboardContent";

interface Task {
  id: string;
  title: string;
  status: string;
  completed: boolean;
  priority: string;
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const tasks = await db.task.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      status: true,
      completed: true,
      priority: true,
    },
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter((task: Task) => task.status === 'completed').length,
    inProgress: tasks.filter((task: Task) => task.status === 'in_progress').length,
    pending: tasks.filter((task: Task) => task.status === 'pending').length,
    highPriority: tasks.filter((task: Task) => task.priority === "high").length,
  };

  return (
    <>
      <Navbar />
      <DashboardContent tasks={tasks} stats={stats} />
    </>
  );
}

import { getUserAuth } from "@/lib/auth/utils";
import { publicProcedure, router } from "@/lib/server/trpc";
export const accountRouter = router({
  getUser: publicProcedure.query(async () => {
    const { session } = await getUserAuth();
    return session;
  }),
});

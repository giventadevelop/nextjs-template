"use client";

import { appRouter } from "@/lib/server/routers/_app";
import { env } from "@/lib/env.mjs";

import {
  createTRPCProxyClient,
  loggerLink,
  TRPCClientError,
  httpBatchLink,
} from "@trpc/client";
import { callTRPCProcedure } from "@trpc/server";
import { type TRPCErrorResponse } from "@trpc/server/rpc";
import { observable } from "@trpc/server/observable";
import { cache } from "react";
import { cookies } from "next/headers";
import SuperJSON from "superjson";
import { auth } from "@clerk/nextjs";

export async function createContext(opts: { headers: Headers }) {
  const { userId } = auth();
  return {
    headers: opts.headers,
    userId,
  };
}

const createContextInner = cache(() => {
  return createContext({
    headers: new Headers({
      cookie: cookies().toString(),
      "x-trpc-source": "rsc",
    }),
  });
});

export const api = createTRPCProxyClient<typeof appRouter>({
  links: [
    loggerLink({
      enabled: (op) =>
        env.NODE_ENV === "development" ||
        (op.direction === "down" && op.result instanceof Error),
    }),
    httpBatchLink({
      url: "/api/trpc",
      transformer: SuperJSON,
    }),
    () =>
      ({ op }) =>
        observable((observer) => {
          createContextInner()
            .then((ctx) => {
              return callTRPCProcedure({
                router: appRouter,
                path: op.path,
                input: op.input,
                ctx,
                type: op.type,
                getRawInput: () => Promise.resolve(op.input),
                signal: new AbortController().signal,
              });
            })
            .then((data) => {
              observer.next({ result: { data } });
              observer.complete();
            })
            .catch((cause: TRPCErrorResponse) => {
              observer.error(TRPCClientError.from(cause));
            });
        }),
  ],
});

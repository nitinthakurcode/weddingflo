export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-server');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./instrumentation-edge');
  }

  // Client-side instrumentation is handled by instrumentation-client.ts
}

export const onRequestError = async (
  err: Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
  }
) => {
  // This is only called on the server
  const Sentry = await import('@sentry/nextjs');

  Sentry.captureException(err, {
    contexts: {
      request: {
        method: request.method,
        url: request.path,
      },
      nextjs: {
        router_kind: context.routerKind,
        route_path: context.routePath,
        route_type: context.routeType,
      },
    },
  });
};

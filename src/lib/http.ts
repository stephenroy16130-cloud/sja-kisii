import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Wraps a route handler so thrown errors become clean JSON responses
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        return Response.json(
          { error: "Validation failed", issues: e.issues.map((i) => ({ field: i.path.join("."), message: i.message })) },
          { status: 400 }
        );
      }
      console.error(e);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

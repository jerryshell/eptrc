import { createMiddleware } from "hono/factory";
import { apiKey } from "./constants";

export const auth = createMiddleware(async (c, next) => {
  const providedApiKey = c.req.header("X-API-KEY");
  if (!providedApiKey) {
    return c.json(
      {
        code: "api.key.missing",
        message: "Missing X-API-KEY header",
      },
      401,
    );
  }

  if (providedApiKey !== apiKey) {
    return c.json(
      {
        code: "api.key.invalid",
        message: "Invalid API key",
      },
      401,
    );
  }

  await next();
});

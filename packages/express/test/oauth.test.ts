import { describe, expect, it } from "vitest";
import { createReverseHttpOAuth } from "../src/index.js";

describe("@reverse-http/express", () => {
  it("creates the start and callback middleware", () => {
    const oauth = createReverseHttpOAuth({
      providerUrl: "https://oauth.example.com",
      clientId: "example-client",
      clientSecret: "client-secret-that-is-at-least-32-bytes",
      callbackUrl: "https://api.example.com/oauth/callback",
      stateCookieSecret: "state-secret-that-is-at-least-32-bytes",
    });

    expect(oauth.start()).toBeTypeOf("function");
    expect(oauth.callback({ onAuthenticated: () => undefined })).toBeTypeOf("function");
  });
});

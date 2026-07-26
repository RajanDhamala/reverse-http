import { fireEvent, render, screen } from "@testing-library/react";
import type { MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { buildOAuthStartUrl, OAuthButton } from "../src/index.js";

describe("@reverse-http/react", () => {
  it("builds only the consuming backend start URL", () => {
    expect(buildOAuthStartUrl("https://api.example.com", "google"))
      .toBe("https://api.example.com/oauth/start/google");
    expect(buildOAuthStartUrl("https://api.example.com/base/", "github", "/oauth/start"))
      .toBe("https://api.example.com/base/oauth/start/github");
  });

  it("renders a style-neutral button and respects prevented navigation", () => {
    const onClick = vi.fn((event: MouseEvent<HTMLButtonElement>) => event.preventDefault());
    render(
      <OAuthButton backendUrl="https://api.example.com" provider="google" className="consumer-style" onClick={onClick}>
        Continue with Google
      </OAuthButton>,
    );

    const button = screen.getByRole("button", { name: "Continue with Google" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toContain("consumer-style");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports HTTP backends and rejects malformed start URLs", () => {
    expect(() => buildOAuthStartUrl("not-a-url", "google")).toThrow();
    expect(() => buildOAuthStartUrl("https://api.example.com", "google", "/oauth/start?secret=value")).toThrow();
    expect(() => buildOAuthStartUrl("http://api.example.com", "google")).not.toThrow();
    expect(() => buildOAuthStartUrl("ftp://api.example.com", "google")).toThrow();
  });
});

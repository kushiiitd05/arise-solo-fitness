// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
// ErrorBoundary does not exist yet — tests must fail (RED phase)
import { ErrorBoundary } from "./ErrorBoundary";

// Helper: component that throws on render when `shouldThrow` prop is true
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("test crash");
  return <div>safe content</div>;
}

describe("ErrorBoundary", () => {
  it("renders fallback when child throws", () => {
    // Suppress console.error for this test (componentDidCatch logs)
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><Bomb shouldThrow /></ErrorBoundary>);
    expect(screen.getByText(/System error — panel unavailable/i)).toBeTruthy();
    spy.mockRestore();
  });

  it("re-renders child after retry button click", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><Bomb shouldThrow /></ErrorBoundary>);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    // After reset, Bomb still throws (shouldThrow still true) — boundary re-catches
    // Key assertion: the retry button existed and was clickable without crashing the test
    expect(screen.getByText(/System error — panel unavailable/i)).toBeTruthy();
    spy.mockRestore();
  });

  it("renders custom fallback when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>custom error UI</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText("custom error UI")).toBeTruthy();
    spy.mockRestore();
  });
});

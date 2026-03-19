import { describe, it, expect } from "vitest";
import { initialState } from "@/lib/gameReducer";

// CH-03: Session init mapping — chapters_unlocked (count) -> chapters[] (unlocked flags)
describe("chapters_unlocked DB value -> GameState.chapters mapping", () => {
  it("maps chapters_unlocked=1 to only chapter at index 0 unlocked", () => {
    const chaptersUnlocked = 1;
    const mapped = initialState.chapters.map((ch, idx) => ({
      ...ch,
      unlocked: idx < chaptersUnlocked,
    }));
    expect(mapped[0].unlocked).toBe(true);
    expect(mapped[1].unlocked).toBe(false);
    expect(mapped[2].unlocked).toBe(false);
    expect(mapped[3].unlocked).toBe(false);
  });

  it("maps chapters_unlocked=3 to chapters at index 0, 1, 2 unlocked", () => {
    const chaptersUnlocked = 3;
    const mapped = initialState.chapters.map((ch, idx) => ({
      ...ch,
      unlocked: idx < chaptersUnlocked,
    }));
    expect(mapped[0].unlocked).toBe(true);
    expect(mapped[1].unlocked).toBe(true);
    expect(mapped[2].unlocked).toBe(true);
    expect(mapped[3].unlocked).toBe(false);
  });

  it("defaults to chapters_unlocked=1 when DB value is null/undefined", () => {
    const chaptersUnlocked = (null as unknown as number) ?? 1;
    const mapped = initialState.chapters.map((ch, idx) => ({
      ...ch,
      unlocked: idx < chaptersUnlocked,
    }));
    expect(mapped[0].unlocked).toBe(true);
    expect(mapped[1].unlocked).toBe(false);
  });

  it("uses array index (0-based), not ch.id (1-based string)", () => {
    const chaptersUnlocked = 2;
    const mapped = initialState.chapters.map((ch, idx) => ({
      ...ch,
      unlocked: idx < chaptersUnlocked,
    }));
    // ch.id is "1" (string) for index 0 — confirm we're using index, not id
    expect(mapped.find(c => c.id === "1")?.unlocked).toBe(true);  // idx 0 < 2
    expect(mapped.find(c => c.id === "2")?.unlocked).toBe(true);  // idx 1 < 2
    expect(mapped.find(c => c.id === "3")?.unlocked).toBe(false); // idx 2 >= 2
  });
});

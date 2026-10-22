import { describe, expect, it } from "vitest";
import { dcgAt5, mean, ndcgAt5, precisionAt5 } from "./evaluation";

describe("recommendation evaluation metrics", () => {
  it("computes Precision@5 using the documented relevant threshold and result count", () => {
    expect(precisionAt5([2, 1, 0, 2, 0, 2])).toBe(0.4);
    expect(precisionAt5([2])).toBe(1);
    expect(precisionAt5([])).toBe(0);
  });

  it("uses graded exponential gain with logarithmic rank discount for DCG@5", () => {
    expect(dcgAt5([2, 1])).toBeCloseTo(3 + 1 / Math.log2(3), 10);
    expect(dcgAt5([2, 1, 0, 2, 1, 2])).toBe(dcgAt5([2, 1, 0, 2, 1]));
  });

  it("returns 1 for the ideal ranking and a lower score for a less relevant order", () => {
    expect(ndcgAt5([2, 1, 0])).toBe(1);
    expect(ndcgAt5([0, 1, 2])).toBeLessThan(1);
    expect(ndcgAt5([0, 0, 0])).toBe(0);
  });

  it("calculates an arithmetic mean and safely handles an empty group", () => {
    expect(mean([0.25, 0.75])).toBe(0.5);
    expect(mean([])).toBe(0);
  });
});

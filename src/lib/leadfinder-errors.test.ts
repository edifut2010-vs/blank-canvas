import { describe, it, expect } from "vitest";
import { describeProviderError } from "./leadfinder-errors";
describe("describeProviderError", () => {
  it("maps 429 to quota message", () =>
    expect(describeProviderError("google", 429, {})).toContain("429"));
  it("maps 401 to invalid key", () =>
    expect(describeProviderError("ai", 401, {})).toContain("inválida"));
});

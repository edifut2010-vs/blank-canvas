import { describe, it, expect } from "vitest";
import { describeProviderError } from "./leadfinder-errors";
describe("describeProviderError", () => {
  it("maps 429 to quota message", () =>
    expect(describeProviderError("google", 429, {})).toContain("429"));
  it("maps 401 to invalid key", () =>
    expect(describeProviderError("ai", 401, {})).toContain("inválida"));
});
import { diagnoseMapsKey } from "./leadfinder-errors";
describe("diagnoseMapsKey", () => {
  it("ok on 200", () => expect(diagnoseMapsKey(200, {}).ok).toBe(true));
  it("invalid key", () => expect(diagnoseMapsKey(400, { error: { details: [{ reason: "API_KEY_INVALID" }] } }).title).toBe("Chave inválida"));
  it("service disabled", () => expect(diagnoseMapsKey(403, { error: { details: [{ reason: "SERVICE_DISABLED" }] } }).title).toContain("não está ativa"));
  it("missing key", () => expect(diagnoseMapsKey(0, {}).ok).toBe(false));
});

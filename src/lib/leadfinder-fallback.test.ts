import { describe, expect, it } from "vitest";
import { generateOfflineContent, isAiRateLimitError } from "./leadfinder-fallback";

const lead = {
  id: "abc",
  name: "Café Central",
  category: "Café",
  address: "Lisboa, Portugal",
  phone: "+351 210 000 000",
  rating: 4.5,
  reviews: 120,
  website: null,
  mapsUrl: "https://maps.google.com",
  hours: [],
};

describe("offline AI fallback", () => {
  it("creates a factual analysis and marks what was not inspected", () => {
    const result = generateOfflineContent({ task: "analysis", lead });
    expect(result).toContain("Café Central");
    expect(result).toContain("Não foi feita uma inspeção visual");
    expect(result).toContain("Não inventes");
  });

  it("creates a detailed website brief from the lead data", () => {
    const result = generateOfflineContent({ task: "website", lead });
    expect(result).toContain("CRITÉRIOS DE ACEITAÇÃO");
    expect(result).toContain("Lisboa, Portugal");
    expect(result).toContain("RGPD");
  });

  it("creates an outreach message in the selected language", () => {
    const result = generateOfflineContent({
      task: "outreach",
      lead,
      language: "Português de Portugal",
      channel: "Email",
      tone: "Profissional",
    });
    expect(result).toContain("GUIÃO DE CONVERSA");
    expect(result).toContain("Café Central");
    expect(result).toContain("RESPOSTAS A OBJEÇÕES");
    expect(result).toContain("SEGUIMENTO");
    expect(result).toContain("website");
  });

  it("recognizes rate limit errors", () => {
    expect(isAiRateLimitError(new Error("HTTP 429 quota exceeded"))).toBe(true);
    expect(isAiRateLimitError(new Error("Network error"))).toBe(false);
  });
});

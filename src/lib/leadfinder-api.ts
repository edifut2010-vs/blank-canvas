import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { describeProviderError, diagnoseMapsKey } from "./leadfinder-errors";

// Secrets are read ONLY inside .handler() bodies. On Cloudflare Workers (nodejs_compat)
// the runtime populates process.env per request; locally Vite loads .env. Never use VITE_ for these.
type EnvKey = "LOVABLE_API_KEY" | "GOOGLE_MAPS_API_KEY" | "AI_API_KEY" | "AI_BASE_URL" | "AI_MODEL";
function readEnv(key: EnvKey, fallback = ""): string {
  const v = typeof process !== "undefined" ? process.env?.[key] : undefined;
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

const SearchSchema = z.object({
  country: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  region: z.string().trim().max(80).optional(),
  niche: z.string().trim().min(1).max(100),
  withoutWebsite: z.boolean().optional(),
  phoneOnly: z.boolean().optional(),
  minRating: z.number().min(0).max(5).optional(),
  minReviews: z.number().min(0).max(1e6).optional(),
});
const AiSchema = z.object({
  task: z.enum(["analysis", "website", "outreach", "translate"]),
  lead: z.record(z.string(), z.unknown()),
  context: z.string().max(8000).optional(),
  tone: z.string().max(100).optional(),
  channel: z.string().max(100).optional(),
  language: z.string().max(60).optional(),
});

const PLACES_URL = "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText";
function mapsHeaders(fieldMask: string): Record<string, string> | null {
  const lovable = readEnv("LOVABLE_API_KEY"), conn = readEnv("GOOGLE_MAPS_API_KEY");
  if (!lovable || !conn) return null;
  return { "Content-Type": "application/json", Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": conn, "X-Goog-FieldMask": fieldMask };
}
async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export const getIntegrationStatus = createServerFn({ method: "GET" }).handler(async () => ({
  // The Lovable connector requires both the project gateway key and its Maps connection key.
  googleMaps: Boolean(readEnv("LOVABLE_API_KEY") && readEnv("GOOGLE_MAPS_API_KEY")),
  ai: Boolean(readEnv("AI_API_KEY")),
  aiModel: readEnv("AI_MODEL", "gpt-4o-mini"),
}));

const FIELD_MASK =
  "places.id,places.displayName,places.primaryTypeDisplayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.regularOpeningHours.weekdayDescriptions,places.location";

export const searchPlaces = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SearchSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const headers = mapsHeaders(FIELD_MASK);
      if (!headers) {
        return {
          ok: false as const,
          error: "A ligação Google Maps não está totalmente configurada. Confirma os Secrets LOVABLE_API_KEY e GOOGLE_MAPS_API_KEY no alojamento.",
          leads: [],
          total: 0,
        };
      }
      const query = `${data.niche} em ${data.city}${data.region ? ", " + data.region : ""}, ${data.country}`;
      const res = await fetch(PLACES_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ textQuery: query, pageSize: 20, languageCode: "pt-PT" }),
      });
      const body = await safeJson(res);
      if (!res.ok) {
        console.error(`Places error ${res.status}: ${JSON.stringify(body).slice(0, 1500)}`);
        return {
          ok: false as const,
          error: describeProviderError("google", res.status, body),
          leads: [],
          total: 0,
        };
      }
      const places: any[] = Array.isArray(body.places) ? body.places : [];
      const leads = places.map((p) => ({
        id: p.id,
        name: p.displayName?.text || "Nome não identificado",
        category: p.primaryTypeDisplayName?.text || data.niche,
        address: p.formattedAddress || "Morada não identificada",
        phone: p.nationalPhoneNumber || "",
        rating: typeof p.rating === "number" ? p.rating : null,
        reviews: p.userRatingCount || 0,
        website: p.websiteUri || null,
        mapsUrl: p.googleMapsUri || "https://www.google.com/maps",
        hours: p.regularOpeningHours?.weekdayDescriptions || [],
        location: p.location,
      }));
      const filtered = leads.filter(
        (l) =>
          (!data.withoutWebsite || !l.website) &&
          (!data.phoneOnly || Boolean(l.phone)) &&
          (l.rating || 0) >= (data.minRating || 0) &&
          l.reviews >= (data.minReviews || 0),
      );
      return { ok: true as const, leads: filtered, total: filtered.length };
    } catch (error) {
      console.error("Places search failed:", error);
      return {
        ok: false as const,
        error: error instanceof Error
          ? `Não foi possível concluir a pesquisa Google Places: ${error.message}`
          : "Não foi possível contactar o Google Places. Verifica a ligação e tenta novamente.",
        leads: [],
        total: 0,
      };
    }
  });

const INSTRUCTIONS: Record<z.infer<typeof AiSchema>["task"], string> = {
  analysis:
    "Analisa este negócio: identidade comercial, contactos, presença digital, identidade visual inferível, reputação, público-alvo provável, oportunidades e funcionalidades recomendadas para website. Distingue factos de inferências. Usa 'Não identificado' para lacunas. Nunca inventes dados.",
  website:
    "Cria um prompt extremamente detalhado e pronto a colar no Lovable, Bolt, v0 ou Replit para construir o website deste negócio. Inclui contexto, objetivos, identidade visual, páginas, secções, conteúdo, funcionalidades, SEO, acessibilidade, responsividade, segurança e critérios de aceitação. Só utiliza factos fornecidos e marca o que deve ser confirmado.",
  outreach:
    "Escreve uma abordagem comercial natural, curta e personalizada para propor a criação de um website. Não pareça spam. Não afirmes que não existe website; usa 'não encontrei um website associado no Google Maps' quando aplicável.",
  translate:
    "Traduz e adapta a mensagem fornecida para o idioma pedido, preservando intenção, tom e naturalidade. Devolve apenas a mensagem final.",
};

export const generateWithAI = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AiSchema.parse(d))
  .handler(async ({ data }) => {
    const key = readEnv("AI_API_KEY");
    if (!key) throw new Error("AI_API_KEY não está configurada nos Secrets do projeto.");
    const base = readEnv("AI_BASE_URL", "https://api.openai.com/v1").replace(/\/$/, "");
    const res = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model: readEnv("AI_MODEL", "gpt-4o-mini"),
        temperature: data.task === "website" ? 0.65 : 0.45,
        messages: [
          {
            role: "system",
            content:
              "És consultor sénior de prospeção comercial e estratégia digital. Responde em português de Portugal, salvo indicação contrária. " +
              INSTRUCTIONS[data.task],
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                negocio: data.lead,
                contexto: data.context,
                tom: data.tone,
                canal: data.channel,
                idioma: data.language,
              },
              null,
              2,
            ),
          },
        ],
      }),
    });
    const body = await safeJson(res);
    if (!res.ok) {
      console.error(`AI error ${res.status}`);
      throw new Error(describeProviderError("ai", res.status, body));
    }
    const text = body.choices?.[0]?.message?.content;
    if (!text) throw new Error("A IA não devolveu texto.");
    return { text };
  });

export const validateGoogleMaps = createServerFn({ method: "POST" }).handler(async () => {
  const headers = mapsHeaders("places.id");
  if (!headers) return diagnoseMapsKey(0, {});
  try {
    const res = await fetch(PLACES_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ textQuery: "café Lisboa", pageSize: 1 }),
    });
    const r = diagnoseMapsKey(res.status, await safeJson(res));
    if (!r.ok) console.error(`Maps validation ${res.status}: ${r.title}`);
    return r;
  } catch {
    return { ok: false, title: "Sem ligação ao Google", steps: ["Não foi possível contactar o Google Maps. Tenta novamente."] };
  }
});

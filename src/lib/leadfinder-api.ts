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
  pageToken: z.string().min(1).max(4096).optional(),
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
  "places.id,places.displayName,places.primaryTypeDisplayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.regularOpeningHours.weekdayDescriptions,places.location,places.photos.name,places.photos.authorAttributions,nextPageToken";

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
          nextPageToken: null,
          hasMore: false,
        };
      }
      const query = `${data.niche} em ${data.city}${data.region ? ", " + data.region : ""}, ${data.country}`;
      const res = await fetch(PLACES_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ textQuery: query, pageSize: 20, languageCode: "pt-PT", ...(data.pageToken ? { pageToken: data.pageToken } : {}) }),
      });
      const body = await safeJson(res);
      if (!res.ok) {
        console.error(`Places error ${res.status}: ${JSON.stringify(body).slice(0, 1500)}`);
        return {
          ok: false as const,
          error: describeProviderError("google", res.status, body),
          leads: [],
          total: 0,
          nextPageToken: null,
          hasMore: false,
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
        photos: Array.isArray(p.photos) ? p.photos.slice(0, 4).map((photo: any) => ({ name: photo.name, attributions: photo.authorAttributions || [] })) : [],
      }));
      const filtered = leads.filter(
        (l) =>
          (!data.withoutWebsite || !l.website) &&
          (!data.phoneOnly || Boolean(l.phone)) &&
          (l.rating || 0) >= (data.minRating || 0) &&
          l.reviews >= (data.minReviews || 0),
      );
      return { ok: true as const, leads: filtered, total: filtered.length, nextPageToken: body.nextPageToken || null, hasMore: Boolean(body.nextPageToken) };
    } catch (error) {
      console.error("Places search failed:", error);
      return {
        ok: false as const,
        error: error instanceof Error
          ? `Não foi possível concluir a pesquisa Google Places: ${error.message}`
          : "Não foi possível contactar o Google Places. Verifica a ligação e tenta novamente.",
        leads: [],
        total: 0,
        nextPageToken: null,
        hasMore: false,
      };
    }
  });

const INSTRUCTIONS: Record<z.infer<typeof AiSchema>["task"], string> = {
  analysis: "Analisa este negócio de forma específica ao setor: identidade, presença digital, reputação, público-alvo, produtos e serviços visíveis nas fotografias. Examina cada imagem. Em restaurantes/cafés/pastelarias identifica pratos, bebidas, apresentação, estilo gastronómico e ambiente; não afirmes ingredientes ou alergénios sem evidência. Em oficinas identifica veículos, elevadores, ferramentas, pneus, motores e trabalhos visíveis; distingue serviços confirmados de hipóteses a confirmar. Em salões observa cortes e tratamentos; em ginásios equipamentos e espaços; em clínicas descreve apenas instalações/equipamentos sem inferir diagnósticos ou especialidades. Distingue factos, observações visuais e hipóteses. Nunca inventes.",
  website: "Cria um prompt extremamente detalhado pronto a colar num construtor de websites. Analisa visualmente todas as fotografias anexadas e transforma observações em conteúdo, secções e direção visual. Restaurantes: menu e galeria com pratos/bebidas realmente visíveis, sem inventar preços, ingredientes ou alergénios. Oficinas: propõe páginas de serviços com base em equipamentos e trabalhos visíveis, mas marca como a confirmar tudo o que não esteja explicitamente comprovado. Adapta estrutura e funcionalidades ao setor. Inclui contexto, identidade visual, páginas, conteúdo, funcionalidades, SEO, acessibilidade, responsividade, segurança e critérios de aceitação. Não inventes factos.",
  outreach: "Cria um GUIÃO COMERCIAL COMPLETO, humano e personalizado, como uma conversa real com o proprietário, com início, meio e fim. Não devolvas apenas um parágrafo. NÃO incluas secções de descoberta do negócio, blocos de perguntas sobre menu, produtos, serviços, equipamentos, preços ou especialidades, nem campos para registar respostas/detalhes do cliente. Estrutura a conversa assim: (1) primeira mensagem curta e natural para abrir contacto e confirmar que falas com o responsável; (2) ligação consultiva à presença online, sem presumir problemas ou necessidades; (3) apresentação clara e breve de como um website pode complementar os canais existentes; (4) proposta concreta do próximo passo, oferecendo preparar um conceito visual e estrutura e depois apresentar âmbito, prazo e preço transparentes; (5) fecho com uma pergunta simples e opção de chamada breve ou envio de exemplos; (6) respostas naturais a pelo menos cinco objeções comuns, sem pressão; (7) mensagem de seguimento após 2-3 dias e último seguimento educado. Inclui falas naturais do vendedor e respostas possíveis do cliente apenas nas objeções, sem criar um questionário de descoberta. Adapta canal, tom, setor e idioma sem acrescentar perguntas específicas sobre os produtos ou serviços do negócio. Personaliza apenas com dados reais do lead; nunca inventes serviços, avaliações, resultados, preços, ausência de website ou problemas. Devolve somente o guião comercial pronto a usar.",
  translate: "Traduz integralmente o GUIÃO/MENSAGEM fornecido no contexto para o idioma selecionado. Preserva todas as secções, perguntas, respostas a objeções, chamadas à ação, placeholders e a estrutura de conversa. Não resumas, não substituas por uma nova abordagem e não alteres factos. Usa linguagem natural e adequada ao canal e ao país de destino. Devolve apenas a versão traduzida.",
};
function sectorInstructions(category: string): string {
  const c = category.toLocaleLowerCase("pt-PT");
  if (/restaurante|café|pastelaria|pizzaria|hamburg|padaria|bar|comida/.test(c)) return "SETOR ALIMENTAR: prioriza pratos, bebidas, apresentação, ambiente, menu visual, reservas ou takeaway apenas se confirmados.";
  if (/oficina|automóvel|mecânic|pneus|auto repair/.test(c)) return "SETOR AUTOMÓVEL: examina veículos, boxes, elevadores, ferramentas e equipamentos. Revisão, diagnóstico, travões, pneus, chapa/pintura ou eletrónica só são serviços confirmados se houver evidência explícita; caso contrário escreve a confirmar.";
  if (/cabeleire|barbear|salão|estética/.test(c)) return "SETOR BELEZA: observa cortes, penteados, unhas, tratamentos e ambiente; sugere galeria de trabalhos e marcação apenas se aplicável.";
  if (/clínica|dent|médic|fisioter|saúde/.test(c)) return "SETOR SAÚDE: não diagnostiques nem infiras especialidades; descreve apenas espaço e equipamentos visíveis.";
  if (/ginásio|fitness|crossfit|yoga|pilates/.test(c)) return "SETOR FITNESS: observa equipamentos, zonas de treino e ambiente; não inventes modalidades nem horários.";
  return "Adapta a análise ao setor real. Usa imagens para observar produtos, serviços, instalações, equipamentos e ambiente, distinguindo observações de hipóteses.";
}

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

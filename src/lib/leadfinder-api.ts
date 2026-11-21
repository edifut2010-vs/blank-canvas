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


const MENU_TERMS = /menu|menus|carta|cardapio|cardápio|ementa|food|drink|bebida|cocktail|vinho|wine|dessert|sobremesa|entrada|starter|main.?course|prato|pizza|sushi|brunch|breakfast|lunch|dinner|almoço|jantar|gelado|ice.?cream/i;
function safePublicWebsiteUrl(raw: string, base?: string): URL | null {
  try {
    const u = new URL(raw, base);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return null;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") ||
        h === "0.0.0.0" || h === "::1" || h.startsWith("127.") || h.startsWith("10.") ||
        h.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
        h.startsWith("169.254.") || h === "metadata.google.internal") return null;
    return u;
  } catch { return null; }
}
function htmlToReadableText(html: string): string {
  return html.replace(/<(script|style|noscript|svg|iframe|form)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/section|\/article)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&euro;|&#8364;/gi, "€").replace(/&pound;|&#163;/gi, "£").replace(/&dollar;|&#36;/gi, "$")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();
}
function extractMenuLinks(html: string, pageUrl: URL): URL[] {
  const found: URL[] = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && found.length < 30) {
    if (!MENU_TERMS.test(htmlToReadableText(m[2]).slice(0, 160) + " " + m[1])) continue;
    const u = safePublicWebsiteUrl(m[1], pageUrl.href);
    if (u && u.hostname === pageUrl.hostname && !/\.(pdf|jpg|jpeg|png|webp|svg|zip)(\?|$)/i.test(u.pathname)) {
      u.hash = "";
      if (!found.some(x => x.href === u.href)) found.push(u);
    }
  }
  return found;
}
async function researchBusinessMenu(rawWebsite: unknown): Promise<string> {
  if (typeof rawWebsite !== "string" || !rawWebsite.trim()) return "PESQUISA DO MENU: não existe website oficial indicado pelo Google Maps.";
  const start = safePublicWebsiteUrl(rawWebsite.trim());
  if (!start) return "PESQUISA DO MENU: o endereço do website não pôde ser validado como endereço público HTTP/HTTPS.";
  const visited = new Set<string>();
  const queue: URL[] = [start];
  const reports: string[] = [];
  while (queue.length && visited.size < 8) {
    const url = queue.shift()!;
    if (visited.has(url.href)) continue;
    visited.add(url.href);
    try {
      const response = await fetch(url.href, { headers: { "User-Agent": "LeadFinderAI-MenuResearch/1.0", Accept: "text/html,application/xhtml+xml" }, redirect: "error", signal: AbortSignal.timeout(7000) });
      if (!response.ok || !/text\/html|application\/xhtml\+xml/i.test(response.headers.get("content-type") || "")) continue;
      const length = Number(response.headers.get("content-length") || 0);
      if (length > 1500000) continue;
      const html = (await response.text()).slice(0, 1500000);
      const readable = htmlToReadableText(html);
      const links = extractMenuLinks(html, url);
      for (const link of links) if (!visited.has(link.href) && queue.length + visited.size < 8) queue.push(link);
      if (MENU_TERMS.test(url.pathname + " " + url.search + " " + readable.slice(0, 5000)) || url.href === start.href) {
        const prices = [...readable.matchAll(/(?:€|EUR\s*)\s?\d{1,4}(?:[.,]\d{2})?|\d{1,4}(?:[.,]\d{2})?\s?(?:€|EUR)\b/gi)]
          .map(x => x[0]).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 80);
        reports.push("PÁGINA: " + url.href + "\nTEXTO EXTRAÍDO: " + readable.slice(0, 4200) + "\nPREÇOS DETETADOS (confirmar no contexto da página): " + (prices.join(", ") || "Nenhum preço explícito detetado"));
      }
    } catch { /* Website unavailable, blocked, non-HTML or timeout: keep the Maps data. */ }
  }
  if (!reports.length) return "PESQUISA DO MENU: foi tentado o website " + start.href + ", mas não foi possível extrair páginas HTML públicas com menu. Não inventes produtos nem preços.";
  return "PESQUISA DO WEBSITE E MENU (" + visited.size + " página(s) visitada(s)):\n" + reports.join("\n\n").slice(0, 15000) + "\n\nNOTA: os preços e produtos acima são texto recolhido das páginas indicadas; confirma disponibilidade, moeda, variantes e atualização antes de os apresentar como atuais.";
}

const INSTRUCTIONS: Record<z.infer<typeof AiSchema>["task"], string> = {
  analysis: "Analisa este negócio de forma específica ao setor: identidade, presença digital, reputação, público-alvo e produtos/serviços. Analisa websiteMenuResearch: identifica abas e subabas reais (Menu, Drinks, Bebidas, Entradas, Pratos principais, Sobremesas, Cocktails, Vinhos), produtos, descrições e preços exatamente como publicados; associa cada preço ao produto correto, indica os URLs de origem e assinala o que não foi encontrado. Não assumes que os preços estão atualizados. Distingue factos, observações e hipóteses. Em restaurantes/cafés/pastelarias identifica pratos, bebidas, apresentação, estilo gastronómico e ambiente; não afirmes ingredientes ou alergénios sem evidência. Em oficinas identifica veículos, elevadores, ferramentas, pneus, motores e trabalhos visíveis; distingue serviços confirmados de hipóteses a confirmar. Em salões observa cortes e tratamentos; em ginásios equipamentos e espaços; em clínicas descreve apenas instalações/equipamentos sem inferir diagnósticos ou especialidades. Nunca inventes.",
  website: "Cria um prompt extremamente detalhado pronto a colar num construtor de websites. Analisa visualmente todas as fotografias anexadas e transforma observações em conteúdo, secções e direção visual. Usa websiteMenuResearch e a análise anterior quando fornecidos: replica a hierarquia real de abas/subabas do menu, categorias, nomes de pratos/bebidas/produtos, descrições e preços publicados, mantendo a associação correta entre produto e preço e indicando o que precisa de confirmação. Não inventes preços, ingredientes ou alergénios. Se não houver menu público encontrado, cria uma estrutura editável e assinala o conteúdo como pendente de confirmação. Oficinas: propõe páginas de serviços com base em equipamentos e trabalhos visíveis, mas marca como a confirmar tudo o que não esteja explicitamente comprovado. Adapta estrutura e funcionalidades ao setor. Inclui contexto, identidade visual, páginas, conteúdo, funcionalidades, SEO, acessibilidade, responsividade, segurança e critérios de aceitação. Não inventes factos.",
  outreach: "Cria um GUIÃO COMERCIAL COMPLETO, humano e personalizado, como uma conversa real com o proprietário. Não devolvas apenas um parágrafo. Organiza obrigatoriamente: (1) primeira mensagem curta para abrir contacto e confirmar que falas com o responsável; (2) BLOCO DE PERGUNTAS SOBRE SERVIÇOS/PRODUTOS, integrado no diálogo logo após a abertura e antes da proposta: faz perguntas naturais e específicas ao nicho para conhecer em detalhe o menu e pratos/bebidas/especialidades (restauração), serviços e tipos de reparação/equipamentos (oficinas), cortes/tratamentos (beleza), especialidades e serviços (clínicas), modalidades/planos (ginásios) ou catálogo e serviços (lojas/outros); pergunta também quais são os serviços mais procurados, diferenças, opções, preços/menu atualizado e como funciona a marcação/encomenda/orçamento quando aplicável. Inclui falas do vendedor e respostas possíveis do cliente, sem transformar a conversa num interrogatório; (3) perguntas abertas sobre como chegam clientes e como recebem pedidos; (4) resposta consultiva que liga as necessidades que o proprietário revelar a um website, sem presumir problemas; (5) proposta concreta do próximo passo, explicando que podes preparar conceito visual e estrutura e depois apresentar âmbito, prazo e preço transparentes; (6) fecho com pergunta simples e duas opções de reunião ou envio de exemplos; (7) respostas naturais a pelo menos cinco objeções comuns, sem pressão; (8) mensagem de seguimento após 2-3 dias e último seguimento educado; (9) notas para personalizar. Inclui falas do vendedor e respostas possíveis do cliente, com início, meio e fim. Adapta canal, tom, setor e idioma. Personaliza com dados reais do lead, mas nunca inventes serviços, avaliações, resultados, preços, ausência de website ou problemas. Se faltar informação, faz perguntas em vez de afirmar.",
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
    const menuResearch = data.task === "analysis" ? await researchBusinessMenu(data.lead.website) : "";
    const enrichedLead = data.task === "analysis" ? { ...data.lead, websiteMenuResearch: menuResearch } : data.lead;
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
              INSTRUCTIONS[data.task] + (data.task === "analysis" ? " Examina a pesquisa do website/menu incluída nos dados e apresenta categorias, subcategorias, produtos e preços recolhidos, com a origem. Se não houver informação, declara isso claramente." : data.task === "website" ? " Inclui os menus, abas, subabas, produtos, descrições e preços presentes na análise anterior ou nos dados de pesquisa do website, sem inventar." : ""),
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                negocio: enrichedLead,
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

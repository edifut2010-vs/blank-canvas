export type OfflineTask = "analysis" | "website" | "outreach" | "translate";

export type OfflineLead = {
  name?: string;
  category?: string;
  address?: string;
  phone?: string;
  rating?: number | null;
  reviews?: number;
  website?: string | null;
  mapsUrl?: string;
  hours?: string[];
};

type OfflineInput = {
  task: OfflineTask;
  lead: OfflineLead;
  context?: string;
  tone?: string;
  channel?: string;
  language?: string;
};

const clean = (value: unknown, fallback = "Não identificado") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

function outreachInLanguage(lead: OfflineLead, language: string, channel: string, tone: string) {
  const name = clean(lead.name, "a sua empresa");
  const business = clean(lead.category, "negócio local");
  const contact = channel === "Email" ? "Olá" : "Olá";
  const templates: Record<string, string> = {
    "Português de Portugal": `${contact}, ${name}! Estive a conhecer a presença online do vosso negócio de ${business}. Gostava de vos apresentar uma proposta para um website profissional, rápido e adaptado a telemóveis, pensado para mostrar melhor os vossos serviços e facilitar os contactos de novos clientes. Teriam disponibilidade para uma breve conversa, sem compromisso?`,
    "Português do Brasil": `Olá, ${name}! Estive conhecendo a presença online do negócio de vocês (${business}) e gostaria de apresentar uma proposta para um site profissional, rápido e adaptado para celulares, pensado para destacar seus serviços e facilitar o contato de novos clientes. Podemos conversar rapidamente, sem compromisso?`,
    "English": `Hello, ${name}! I came across your ${business} business and would love to show you an idea for a professional, mobile-friendly website that presents your services clearly and makes it easier for new customers to get in touch. Would you be open to a brief, no-obligation conversation?`,
    "Español": `¡Hola, ${name}! He conocido vuestro negocio de ${business} y me gustaría presentaros una propuesta para una página web profesional, rápida y adaptada a móviles, que muestre mejor vuestros servicios y facilite el contacto de nuevos clientes. ¿Tendríais disponibilidad para una breve conversación, sin compromiso?`,
    "Français": `Bonjour, ${name} ! J'ai découvert votre activité de ${business} et j'aimerais vous présenter une proposition de site web professionnel, rapide et adapté aux mobiles, afin de mieux présenter vos services et de faciliter le contact avec de nouveaux clients. Seriez-vous disponible pour un bref échange, sans engagement ?`,
    "Deutsch": `Hallo, ${name}! Ich bin auf Ihr Unternehmen im Bereich ${business} aufmerksam geworden und würde Ihnen gerne eine Idee für eine professionelle, mobilfreundliche Website vorstellen, die Ihre Leistungen präsentiert und die Kontaktaufnahme erleichtert. Hätten Sie Zeit für ein kurzes, unverbindliches Gespräch?`,
    "Italiano": `Ciao, ${name}! Ho scoperto la vostra attività di ${business} e vorrei presentarvi una proposta per un sito web professionale, veloce e ottimizzato per dispositivi mobili, pensato per valorizzare i vostri servizi e facilitare i contatti con nuovi clienti. Sareste disponibili per una breve conversazione senza impegno?`,
    "Holandês": `Hallo, ${name}! Ik heb uw ${business}-bedrijf ontdekt en zou graag een voorstel doen voor een professionele, mobielvriendelijke website die uw diensten duidelijk presenteert en nieuwe klanten helpt contact op te nemen. Heeft u tijd voor een kort, vrijblijvend gesprek?`,
  };
  const message = templates[language] ?? templates["Português de Portugal"];
  return tone === "Muito curto" ? message.split(/[.!?]/).slice(0, 2).join(".").trim() + "." : message;
}

export function generateOfflineContent(input: OfflineInput): string {
  const lead = input.lead;
  const name = clean(lead.name);
  const category = clean(lead.category);
  const address = clean(lead.address);
  const phone = clean(lead.phone);
  const website = clean(lead.website, "Não foi devolvido qualquer website pelo Google Places");
  const rating = typeof lead.rating === "number" ? `${lead.rating.toFixed(1)}/5` : "Não identificado";
  const reviews = typeof lead.reviews === "number" ? String(lead.reviews) : "Não identificado";

  if (input.task === "analysis") {
    return [
      `ANÁLISE DO NEGÓCIO — ${name}`,
      "",
      "1. IDENTIFICAÇÃO",
      `• Nome: ${name}`,
      `• Atividade/categoria: ${category}`,
      `• Morada: ${address}`,
      `• Telefone: ${phone}`,
      `• Website devolvido pelo Google Maps: ${website}`,
      "",
      "2. REPUTAÇÃO E PROVA SOCIAL",
      `• Avaliação Google: ${rating}`,
      `• Número de avaliações: ${reviews}`,
      "• As avaliações e o seu conteúdo não foram recolhidos nesta análise; não devem ser presumidos.",
      "",
      "3. PRESENÇA DIGITAL E IDENTIDADE VISUAL",
      "• A informação disponível nesta pesquisa provém dos dados do Google Places.",
      "• Não foi feita uma inspeção visual do website nem das redes sociais nesta execução.",
      "• Logótipo, paleta cromática, tipografia, estilo fotográfico e consistência da marca: por confirmar.",
      "",
      "4. OPORTUNIDADES A VALIDAR",
      "• Criar uma página inicial clara com proposta de valor, serviços e chamadas à ação.",
      "• Apresentar morada, horário, telefone e mapa, depois de confirmar os dados.",
      "• Incluir testemunhos reais apenas com autorização e fonte verificável.",
      "• Melhorar SEO local com páginas e metadados específicos da atividade e localização.",
      "• Garantir experiência mobile, acessibilidade, rapidez e formulários protegidos.",
      "",
      "5. LIMITAÇÕES",
      "Esta análise foi gerada localmente porque o serviço de IA está temporariamente indisponível/limitado. Não substitui uma auditoria ao website, redes sociais ou avaliações. Confirma os dados com o proprietário antes de os usar numa proposta.",
    ].join("\n");
  }

  if (input.task === "website") {
    return [
      `PROMPT DE CRIAÇÃO DE WEBSITE — ${name}`,
      "",
      "Assume o papel de diretor criativo, UX/UI designer, especialista em SEO local e programador full-stack. Cria um website profissional, rápido, acessível e totalmente responsivo para o negócio abaixo.",
      "",
      "CONTEXTO DO NEGÓCIO",
      `• Nome: ${name}`,
      `• Categoria: ${category}`,
      `• Localização: ${address}`,
      `• Telefone: ${phone}`,
      `• Website atual: ${website}`,
      `• Avaliação Google: ${rating} (${reviews} avaliações)`,
      "",
      "OBJETIVO",
      "Transformar visitantes locais em contactos e clientes. Tornar imediatamente claro o que a empresa oferece, onde opera e como pode ser contactada. Não inventes serviços, preços, certificações, prémios, testemunhos ou horários: usa campos editáveis e assinala informação por confirmar.",
      "",
      "DIREÇÃO VISUAL",
      "Desenvolve uma identidade visual coerente com o setor, contemporânea e distinta. Define uma paleta acessível, tipografia legível, grelha consistente, espaçamento generoso, ícones coerentes e fotografia autêntica relacionada com a atividade. Não copies marcas concorrentes. Se não existir referência visual fornecida, apresenta uma proposta inicial e identifica-a como sugestão, não como identidade atual da empresa.",
      "",
      "ESTRUTURA E PÁGINAS",
      "1. Início: hero com proposta de valor clara, localização e CTA de contacto.",
      "2. Serviços: cartões e páginas/descrições detalhadas, preenchidos apenas após confirmação dos serviços reais.",
      "3. Sobre: apresentação da empresa, equipa e experiência com conteúdo a validar.",
      "4. Galeria/portefólio: imagens otimizadas, legendas e texto alternativo.",
      "5. Testemunhos: apenas avaliações reais autorizadas e verificáveis; caso contrário, omitir.",
      "6. Contactos: telefone clicável, formulário, morada, mapa e horários confirmados.",
      "7. Privacidade e cookies: informação adequada ao RGPD e às ferramentas efetivamente usadas.",
      "",
      "FUNCIONALIDADES",
      "• Navegação simples, menu mobile e CTAs persistentes sem intrusão.",
      "• Formulário com validação, estados de envio/erro e proteção anti-spam.",
      "• Botão de chamada e, se aplicável, ligação WhatsApp com número confirmado.",
      "• Mapa incorporado apenas se necessário e com atenção à privacidade.",
      "• CMS ou estrutura simples para atualizar textos, serviços e imagens.",
      "",
      "SEO, DESEMPENHO E ACESSIBILIDADE",
      "• HTML semântico, títulos hierárquicos, metadados únicos e Open Graph.",
      "• SEO local e dados estruturados LocalBusiness apenas com dados confirmados.",
      "• Imagens WebP/AVIF, lazy loading, fontes otimizadas e Core Web Vitals.",
      "• Contraste WCAG AA, navegação por teclado, foco visível e labels em formulários.",
      "• Layout testado em telemóvel, tablet e desktop.",
      "",
      "ENTREGA E CRITÉRIOS DE ACEITAÇÃO",
      "Entrega o website funcional, sem links mortos, sem conteúdo fictício e sem erros na consola. Verifica formulários, links, responsividade, acessibilidade básica e SEO técnico. Antes de publicar, pede confirmação dos serviços, contactos, horários, fotografias, logótipo e textos institucionais.",
      "",
      "NOTA DE EXECUÇÃO",
      "Este briefing foi criado localmente porque o fornecedor de IA está temporariamente indisponível/limitado. Os dados listados são os únicos factos fornecidos; confirma-os com o negócio antes da publicação.",
    ].join("\n");
  }

  if (input.task === "outreach" || input.task === "translate") {
    return outreachInLanguage(lead, input.language ?? "Português de Portugal", input.channel ?? "WhatsApp", input.tone ?? "Profissional");
  }

  return "Não foi possível gerar este conteúdo localmente.";
}

export function isAiRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /\b429\b|rate.?limit|quota|limite de pedidos/i.test(message);
}

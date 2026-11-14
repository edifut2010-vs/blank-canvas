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
  const address = clean(lead.address, "localização não confirmada");
  const title = channel === "Email" ? "Assunto: Uma ideia para a presença online da empresa" : "GUIÃO DE CONVERSA — primeira mensagem até ao seguimento";
  if (language === "Inglês" || language === "English") {
    return [
      "Subject: An idea to strengthen your business online", "",
      "1. OPENING",
      "Hello! Am I speaking with the person responsible for " + name + "? My name is [YOUR NAME]. I came across your " + business + " business in " + address + ". Is this a good time for a quick minute?", "",
      "2. DISCOVERY",
      "How do most new customers find you today — Google, social media, referrals or walk-ins? When someone wants to check your services, see examples of your work or make an enquiry outside business hours, how do they do that? Is there a service you would particularly like to promote?", "",
      "3. CONNECT TO THEIR NEED",
      "A professional website could bring essential information together, highlight the services you actually provide, show genuine photos, answer common questions and make mobile enquiries easier. It should complement what already works for you, not replace it.", "",
      "4. PROPOSAL",
      "I can prepare an initial visual concept and page structure tailored to your business. If you like the direction, I will provide a written proposal with scope, features, timeline and transparent pricing before you commit.", "",
      "5. CLOSE",
      "Would a 10-minute call be convenient, or would you prefer that I send a few examples and an initial idea first?", "",
      "6. COMMON OBJECTIONS",
      "We already use social media — That is great. A website would complement your social channels, organise information and give customers one dedicated place to find you.",
      "How much does it cost? — It depends on the scope. I would first understand what you need and then send a clear, no-obligation quote.",
      "Send me information — Of course. What is the best email or contact? May I follow up next week?",
      "Not interested — Understood. Thank you for your time, and I wish you continued success.", "",
      "7. FOLLOW-UP",
      "After 2–3 days: Hello, this is [YOUR NAME] following up on my idea for a website. Would it help if I sent a short summary for you to review when convenient?",
      "Final follow-up: I do not want to bother you, so this will be my last message. If a more complete online presence becomes relevant in the future, I would be happy to talk. Thank you.", "",
      "PERSONALISE: replace [YOUR NAME], confirm you are speaking to the right person, never invent services, prices or results, and adapt each message to the owner's replies."
    ].join("\n");
  }
  if (language === "Espanhol" || language === "Español") {
    return [
      "GUIÓN DE CONVERSACIÓN — primer contacto y seguimiento", "",
      "1. APERTURA",
      "¡Hola! ¿Hablo con la persona responsable de " + name + "? Me llamo [TU NOMBRE]. He encontrado vuestro negocio de " + business + " en " + address + ". ¿Es buen momento para hablar un minuto?", "",
      "2. DESCUBRIMIENTO",
      "¿Cómo suelen encontraros los nuevos clientes: Google, redes sociales, recomendaciones o clientes habituales? ¿Dónde pueden consultar vuestros servicios y contactar fuera del horario? ¿Hay algún servicio que queráis promocionar especialmente?", "",
      "3. PROPUESTA ADAPTADA",
      "Una web profesional podría reunir la información, presentar los servicios reales, mostrar fotografías auténticas y facilitar consultas desde el móvil. Complementaría vuestra presencia actual, sin sustituir lo que ya funciona.", "",
      "4. SIGUIENTE PASO",
      "Puedo preparar una primera idea visual y una estructura de páginas sin compromiso. Si os gusta, enviaré una propuesta clara con alcance, plazo y precio antes de tomar ninguna decisión.", "",
      "5. CIERRE",
      "¿Os vendría bien una llamada de 10 minutos o preferís que os envíe primero algunos ejemplos?", "",
      "6. OBJECIONES",
      "Ya usamos redes sociales — Perfecto; la web las complementaría y reuniría la información en un espacio propio.",
      "¿Cuánto cuesta? — Depende del alcance. Primero conocería vuestras necesidades y después enviaría un presupuesto claro.",
      "Envíame información — Por supuesto. ¿Cuál es el mejor correo o contacto? ¿Puedo volver a escribiros la próxima semana?",
      "No nos interesa — Lo entiendo. Gracias por vuestro tiempo y mucho éxito.", "",
      "7. SEGUIMIENTO",
      "A los 2–3 días: Hola, soy [TU NOMBRE]. Solo quería saber si habéis podido revisar mi idea. Si os ayuda, puedo enviar un resumen breve.",
      "Último mensaje: No quiero molestar, así que este será mi último mensaje. Si en el futuro os interesa mejorar vuestra presencia online, estaré encantado de hablar.", "",
      "Personaliza [TU NOMBRE], confirma los datos y no inventes servicios, precios ni resultados. Adapta cada mensaje a las respuestas."
    ].join("\n");
  }
  return [
    title, "",
    "1. ABERTURA — primeira mensagem",
    "Olá! Estou a falar com a pessoa responsável pela " + name + "? Chamo-me [O TEU NOME]. Encontrei o vosso negócio de " + business + " em " + address + " e queria partilhar uma ideia que pode ser útil. É uma boa altura para falar durante um minuto?", "",
    "2. DESCOBERTA — ouvir antes de apresentar",
    "Como é que a maioria dos novos clientes vos encontra atualmente: Google, redes sociais, recomendações ou passagem na rua?",
    "Quando alguém quer conhecer os vossos serviços, ver exemplos do vosso trabalho ou pedir informações fora do horário, como costuma fazê-lo?",
    "Há algum serviço, produto ou tipo de cliente que gostassem de promover mais?", "",
    "3. LIGAÇÃO À NECESSIDADE — responder ao que o cliente disser",
    "Percebo. Um website poderia reunir a informação essencial, destacar os serviços que realmente disponibilizam, mostrar fotografias reais, responder a dúvidas frequentes e facilitar pedidos de contacto através do telemóvel.",
    "Não quero partir do princípio de que precisam disto: o objetivo é perceber se um canal próprio complementa aquilo que já fazem nas redes sociais e no Google.", "",
    "4. PROPOSTA DE VALOR",
    "Posso preparar uma primeira ideia visual e uma estrutura de páginas adaptadas ao negócio. Se gostarem da direção, apresento uma proposta escrita com páginas, funcionalidades, prazo e preço — tudo claro antes de assumirem qualquer compromisso.", "",
    "5. FECHO — pergunta simples e sem pressão",
    "Faria sentido marcarmos uma chamada de 10 minutos? Se preferir, posso primeiro enviar alguns exemplos e uma ideia inicial por mensagem. Qual das opções lhe dá mais jeito?", "",
    "6. RESPOSTAS A OBJEÇÕES",
    "Já temos Instagram/Facebook — Ótimo. O website não substitui as redes; complementa-as, organiza a informação e dá aos clientes um endereço próprio para consultarem os serviços.",
    "Já temos clientes suficientes — Compreendo. Talvez a prioridade seja facilitar o acesso à informação e reduzir perguntas repetidas. Se não for necessário, não há problema.",
    "Quanto custa? — Depende do que fizer sentido incluir. Primeiro percebo as necessidades e depois envio um orçamento discriminado, sem compromisso.",
    "Não temos tempo — Percebo. Numa conversa recolho a informação essencial e envio uma proposta organizada para validarem quando puderem.",
    "Envie informação — Claro. Qual é o melhor email ou contacto? Posso voltar a falar consigo na próxima semana?",
    "Não temos interesse — Sem problema. Agradeço a sinceridade e o tempo. Desejo-vos continuação de bom trabalho.", "",
    "7. SEGUIMENTO — após 2–3 dias sem resposta",
    "Olá! Daqui fala [O TEU NOME]. Estou só a retomar a mensagem sobre a ideia de website para a " + name + ". Faz sentido que lhe envie um pequeno resumo para consultar quando tiver disponibilidade?",
    "Último seguimento: Não quero incomodar, por isso esta será a minha última mensagem. Se um dia fizer sentido explorar uma presença online mais completa, terei todo o gosto em conversar. Obrigado e continuação de bom trabalho.", "",
    "8. PERSONALIZAÇÃO",
    "Substitui [O TEU NOME], confirma que estás a falar com o responsável e adapta as perguntas às respostas reais. Não inventes serviços, resultados, clientes, preços, prazos ou problemas. Envia uma mensagem de cada vez; não envies o guião inteiro ao cliente.",
    "Estilo: " + tone + ". Canal: " + channel + "."
  ].join("\n");
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

  if (input.task === "outreach") {
    return outreachInLanguage(lead, input.language ?? "Português de Portugal", input.channel ?? "WhatsApp", input.tone ?? "Profissional");
  }
  if (input.task === "translate") {
    return "A tradução requer uma ligação funcional ao serviço de IA. A abordagem original foi preservada; tenta novamente quando a IA estiver disponível.";
  }

  return "Não foi possível gerar este conteúdo localmente.";
}

export function isAiRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /\b429\b|rate.?limit|quota|limite de pedidos/i.test(message);
}

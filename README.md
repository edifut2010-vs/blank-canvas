# LeadFinder AI

Plataforma privada de prospeção comercial para descobrir negócios locais, analisar presença digital e preparar propostas de websites personalizadas.

## Stack
- React 19 + TypeScript + TanStack Start
- Tailwind CSS v4 + Lucide React
- Google Places API (New)
- Fornecedor de IA compatível com Chat Completions

## Executar
```bash
npm install
cp .env.example .env
npm run dev
```

## Integrações
Preenche o .env local (não publiques chaves reais):
```env
GOOGLE_MAPS_API_KEY=
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```
A pesquisa Google usa o conector Google Maps do Lovable (sem chave própria). No Lovable, define os valores em **Project Settings → Secrets** (nunca no chat, no código ou em commits). Não uses prefixo VITE_ para credenciais. As chaves são lidas só dentro das funções de servidor e nunca chegam ao browser.

Testar: abre **Definições** (ambas devem mostrar "Configurada"), faz uma pesquisa em **Encontrar Leads** e experimenta **Analisar IA** e **Gerar website**. Se o fornecedor de IA falhar ou devolver 429, a aplicação apresenta conteúdo de recurso local, sem o apresentar como análise visual real. O conteúdo IA completo depende de chave, modelo e quota válidos.

## Funcionalidades
- Pesquisa real via Google Places API (New), com localização, nicho, website, telefone e avaliações.
- Análise de negócio, geração de prompt detalhado para website, abordagem comercial e mensagens em vários idiomas.
- Fallback local para análise, briefing e abordagem quando o fornecedor de IA estiver indisponível ou atingir a quota; o conteúdo local identifica claramente os dados não verificados.
- Leads e histórico guardados localmente no navegador.
- Exportação Markdown, cópia de texto e ligação manual para WhatsApp.
- Credenciais processadas no servidor; a interface informa quando falta configuração.

**Nota:** “Sem website identificado no Google Maps” significa apenas que o Google Places não devolveu websiteUri. Não prova que a empresa não tenha website.

Respeita quotas, atribuições e políticas Google Maps Platform, RGPD e regras de comunicações comerciais. A aplicação é pessoal, sem pagamentos ou subscrições.

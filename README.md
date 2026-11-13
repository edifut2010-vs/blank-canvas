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
Ativa Places API (New) no Google Cloud. Em produção, guarda estas variáveis nos Secrets do alojamento. Não uses prefixo VITE_ para credenciais secretas.

## Funcionalidades
- Pesquisa real via Google Places API (New), com localização, nicho, website, telefone e avaliações.
- Análise IA, geração de prompt para website, abordagem comercial e tradução.
- Leads e histórico guardados localmente no navegador.
- Exportação Markdown, cópia de texto e ligação manual para WhatsApp.
- Credenciais processadas no servidor; a interface informa quando falta configuração.

**Nota:** “Sem website identificado no Google Maps” significa apenas que o Google Places não devolveu websiteUri. Não prova que a empresa não tenha website.

Respeita quotas, atribuições e políticas Google Maps Platform, RGPD e regras de comunicações comerciais. A aplicação é pessoal, sem pagamentos ou subscrições.

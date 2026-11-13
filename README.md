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
Ativa **Places API (New)** no Google Cloud e restringe a chave a essa API. No Lovable, define os valores em **Project Settings → Secrets** (nunca no chat, no código ou em commits). Não uses prefixo VITE_ para credenciais. As chaves são lidas só dentro das funções de servidor e nunca chegam ao browser.

Testar: abre **Definições** (ambas devem mostrar "Configurada"), faz uma pesquisa em **Encontrar Leads** e gera uma análise IA. Erros 401/403/429 aparecem com mensagem clara.

## Funcionalidades
- Pesquisa real via Google Places API (New), com localização, nicho, website, telefone e avaliações.
- Análise IA, geração de prompt para website, abordagem comercial e tradução.
- Leads e histórico guardados localmente no navegador.
- Exportação Markdown, cópia de texto e ligação manual para WhatsApp.
- Credenciais processadas no servidor; a interface informa quando falta configuração.

**Nota:** “Sem website identificado no Google Maps” significa apenas que o Google Places não devolveu websiteUri. Não prova que a empresa não tenha website.

Respeita quotas, atribuições e políticas Google Maps Platform, RGPD e regras de comunicações comerciais. A aplicação é pessoal, sem pagamentos ou subscrições.

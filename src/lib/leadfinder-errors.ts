// Pure helpers (no secrets) — safe to unit test and import anywhere.
export function describeProviderError(
  provider: "google" | "ai",
  status: number,
  body: unknown,
): string {
  const msg = (body as { error?: { message?: string } })?.error?.message ?? "";
  const name = provider === "google" ? "Google Places" : "fornecedor de IA";
  if (status === 401)
    return `Chave do ${name} inválida ou revogada. Atualiza o secret nas definições do projeto.`;
  if (status === 403)
    return `Acesso negado pelo ${name} (403). Confirma que a API está ativa e as restrições da chave.${msg ? " Detalhe: " + msg : ""}`;
  if (status === 429)
    return `Limite de pedidos/quota do ${name} atingido (429). Tenta mais tarde ou revê a faturação.`;
  if (status >= 500) return `O ${name} está indisponível (${status}). Tenta novamente.`;
  return `Erro do ${name} (${status})${msg ? ": " + msg : "."}`;
}

export type MapsCheck = { ok: boolean; title: string; steps: string[] };
// Translate a Places API (New) probe result into a diagnosis with fix steps.
export function diagnoseMapsKey(status: number, body: unknown): MapsCheck {
  const err = (body as { error?: { message?: string; status?: string; details?: { reason?: string }[] } })?.error;
  const reason = err?.details?.find((d) => d.reason)?.reason ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  if (status === 0) return { ok: false, title: "Chave não configurada", steps: ["Liga o conector Google Maps ao projeto em Conectores."] };
  if (status >= 200 && status < 300) return { ok: true, title: "Places API (New) acessível", steps: ["A chave é válida e a pesquisa de leads está pronta a usar."] };
  if (reason === "API_KEY_INVALID" || status === 401 || msg.includes("api key not valid"))
    return { ok: false, title: "Chave inválida", steps: ["Cria uma chave em Google Cloud → APIs e serviços → Credenciais → Criar credenciais → Chave de API (começa por AIza).", "Substitui o valor de GOOGLE_MAPS_API_KEY nos Secrets do projeto."] };
  if (reason === "SERVICE_DISABLED" || msg.includes("has not been used") || msg.includes("disabled"))
    return { ok: false, title: "Places API (New) não está ativa", steps: ["Em Google Cloud → APIs e serviços → Biblioteca, ativa \"Places API (New)\" no mesmo projeto da chave.", "Aguarda alguns minutos e valida novamente."] };
  if (reason === "BILLING_DISABLED" || msg.includes("billing"))
    return { ok: false, title: "Faturação desativada", steps: ["Associa uma conta de faturação ao projeto Google Cloud (obrigatório mesmo no nível gratuito)."] };
  if (reason === "API_KEY_HTTP_REFERRER_BLOCKED")
    return { ok: false, title: "Chave restrita a websites", steps: ["Nas restrições da chave, muda \"Restrições de aplicação\" para \"Nenhuma\" ou \"Endereços IP\" — o pedido é feito pelo servidor, não pelo browser."] };
  if (reason === "API_KEY_SERVICE_BLOCKED")
    return { ok: false, title: "Chave não autoriza a Places API", steps: ["Nas restrições de API da chave, adiciona \"Places API (New)\" à lista permitida."] };
  if (status === 403) return { ok: false, title: "Acesso negado (403)", steps: ["Confirma que Places API (New) está ativa, a faturação ligada e as restrições da chave permitem pedidos do servidor."] };
  if (status === 429) return { ok: false, title: "Quota excedida (429)", steps: ["Revê as quotas da Places API (New) no Google Cloud ou tenta mais tarde."] };
  return { ok: false, title: `Erro inesperado (${status})`, steps: ["Tenta novamente. Se persistir, verifica o estado do Google Cloud."] };
}

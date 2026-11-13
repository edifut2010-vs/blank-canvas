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

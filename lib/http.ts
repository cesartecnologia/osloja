export async function fetchJson<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    const snippet = text.slice(0, 180).replace(/\s+/g, ' ').trim();
    throw new Error(
      response.ok
        ? `Resposta inesperada do servidor. Era esperado JSON, mas retornou outro conteúdo: ${snippet || 'vazio'}`
        : `Falha ${response.status} ao comunicar com o servidor. Resposta não-JSON: ${snippet || 'vazio'}`
    );
  }

  const data = (await response.json()) as T;

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).error)
        : `Falha na requisição (${response.status}).`;
    throw new Error(message);
  }

  return data;
}

import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { SOURCE_REGISTRY, SOURCE_REGISTRY_COUNT, type SourceCategory } from "./source-registry";

export const CATEGORIES = [
  "Pesquisa Livre",
  "Pessoa Pública",
  "Empresa",
  "Assunto",
  "Evento",
  "Organização",
  "Notícia",
  "X / Twitter",
  "Instagram",
  "TikTok",
  "YouTube",
  "LinkedIn",
  "Reddit",
  "Telegram",
  "Facebook",
  "GitHub",
  "Análise Maltego (Grafo)",
] as const;

const reportSchema = z.object({
  resumoExecutivo: z.string(),
  relatorioAnalitico: z.string(),
  scoreVeracidade: z.number(),
  metodologia: z.string(),
  coberturaFontes: z.object({
    fontesCadastradas: z.number(),
    motoresExecutados: z.number(),
    fontesVerificadas: z.number(),
    fontesComConteudoIntegral: z.number(),
    fontesRejeitadas: z.number(),
    aviso: z.string(),
  }),
  principaisFatos: z.array(z.string()),
  cronologia: z.array(z.object({
    data: z.string(),
    evento: z.string(),
  })),
  temasRecorrentes: z.array(z.string()),
  divergencias: z.array(z.string()),
  inconsistencias: z.array(z.string()),
  relacoes: z.array(z.object({
    de: z.string(),
    para: z.string(),
    tipo: z.string(),
  })),
  fontes: z.array(z.object({
    categoria: z.string(),
    titulo: z.string(),
    autorOuPerfil: z.string(),
    veiculo: z.string(),
    data: z.string(),
    url: z.string(),
    confiabilidade: z.string(),
    justificativaConfiabilidade: z.string(),
    trecho: z.string(),
    textoCompletoAnalisado: z.boolean(),
    caracteresAnalisados: z.number(),
    hashConteudo: z.string(),
  })),
});

export type InvestigationReport = z.infer<typeof reportSchema>;

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asText = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
  }
  return fallback;
};

const asTextArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => asText(item)).filter(Boolean)
    : typeof value === "string"
      ? value
          .split(/\n|;|•|-/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

const extractJson = (text: string) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate.trim()) throw new Error("Resposta sem JSON estruturado.");
  return JSON.parse(candidate) as unknown;
};

type EvidenceSource = InvestigationReport["fontes"][number] & {
  conteudoIntegral: string;
};

const defaultCoverage = (aviso: string) => ({
  fontesCadastradas: SOURCE_REGISTRY_COUNT,
  motoresExecutados: 0,
  fontesVerificadas: 0,
  fontesComConteudoIntegral: 0,
  fontesRejeitadas: 0,
  aviso,
});

const hashText = (text: string) => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

const htmlToText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const cleanText = (text: string) =>
  text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const isProbablyUrl = (value: string) => {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
};

const safeUrl = (value: string) => {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
};

const fetchText = async (url: string) => {
  const response = await fetch(url, {
    headers: { accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8" },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();
  const text = contentType.includes("json") ? cleanText(JSON.stringify(JSON.parse(raw))) : htmlToText(raw);
  if (text.length < 220) throw new Error("conteúdo insuficiente");
  return text;
};

const makeEvidence = async ({
  category,
  title,
  url,
  vehicle,
  author = "",
  date = "",
  content,
}: {
  category: SourceCategory;
  title: string;
  url: string;
  vehicle: string;
  author?: string;
  date?: string;
  content?: string;
}): Promise<EvidenceSource | null> => {
  const sourceUrl = safeUrl(url);
  if (!sourceUrl) return null;
  const fullText = content?.trim() || await fetchText(sourceUrl);
  if (fullText.length < 220 || fullText.length > 9000) return null;
  return {
    categoria: category,
    titulo: title || sourceUrl,
    autorOuPerfil: author,
    veiculo: vehicle,
    data: date,
    url: sourceUrl,
    confiabilidade: category === "Acadêmico" || category === "Registro Público" || category === "Imprensa" ? "Alta" : "Média",
    justificativaConfiabilidade: "Fonte coletada e lida integralmente pelo backend antes de ser enviada à IA; rejeitada se inacessível, curta demais ou grande demais para leitura integral.",
    trecho: fullText.slice(0, 480),
    textoCompletoAnalisado: true,
    caracteresAnalisados: fullText.length,
    hashConteudo: hashText(fullText),
    conteudoIntegral: fullText,
  };
};

const uniqueEvidence = (items: Array<EvidenceSource | null>) => {
  const seen = new Set<string>();
  return items.filter((item): item is EvidenceSource => {
    if (!item || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
};

const collectDirectUrlEvidence = async (query: string) => {
  const urls = query.match(/https?:\/\/[^\s]+|\b[a-z0-9.-]+\.[a-z]{2,}\S*/gi) ?? [];
  const tasks = urls.slice(0, 4).map((url) => makeEvidence({
    category: "Documento",
    title: `URL informada: ${url}`,
    url,
    vehicle: new URL(safeUrl(url)).hostname,
  }));
  return Promise.allSettled(tasks).then((results) => uniqueEvidence(results.map((result) => result.status === "fulfilled" ? result.value : null)));
};

const collectWikipediaEvidence = async (query: string) => {
  const endpoint = `https://pt.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=2&namespace=0&format=json`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
  const data = await response.json() as [string, string[], string[], string[]];
  const pages = data[1].map((title, index) => ({ title, url: data[3][index] })).filter((item) => item.url);
  const tasks = pages.map(async (page) => {
    const extractEndpoint = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(page.title)}`;
    const extractResponse = await fetch(extractEndpoint, { signal: AbortSignal.timeout(8000) });
    const extractData = await extractResponse.json() as { query?: { pages?: Record<string, { extract?: string }> } };
    const extract = Object.values(extractData.query?.pages ?? {})[0]?.extract ?? "";
    return makeEvidence({ category: "Enciclopédia", title: page.title, url: page.url, vehicle: "Wikipedia", content: cleanText(extract) });
  });
  return Promise.allSettled(tasks).then((results) => uniqueEvidence(results.map((result) => result.status === "fulfilled" ? result.value : null)));
};

const collectWikidataEvidence = async (query: string) => {
  const endpoint = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=pt&limit=2&format=json`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
  const data = await response.json() as { search?: Array<{ id: string; label?: string; description?: string; concepturi?: string }> };
  const tasks = (data.search ?? []).map(async (item) => {
    const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${item.id}.json`;
    const entityResponse = await fetch(entityUrl, { signal: AbortSignal.timeout(8000) });
    const entityText = cleanText(JSON.stringify(await entityResponse.json()));
    return makeEvidence({ category: "Registro Público", title: item.label || item.id, url: item.concepturi || `https://www.wikidata.org/wiki/${item.id}`, vehicle: "Wikidata", content: entityText });
  });
  return Promise.allSettled(tasks).then((results) => uniqueEvidence(results.map((result) => result.status === "fulfilled" ? result.value : null)));
};

const collectArxivEvidence = async (query: string) => {
  const endpoint = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=2`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(9000) });
  const xml = await response.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 2);
  return uniqueEvidence(await Promise.all(entries.map((entry) => {
    const block = entry[1];
    const title = cleanText(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "arXiv result");
    const summary = cleanText(block.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? "");
    const url = block.match(/<id>(.*?)<\/id>/)?.[1] ?? "https://arxiv.org/";
    return makeEvidence({ category: "Acadêmico", title, url, vehicle: "arXiv", content: `${title}. ${summary}` });
  })));
};

const collectCrossrefEvidence = async (query: string) => {
  const endpoint = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=2`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(9000) });
  const data = await response.json() as { message?: { items?: Array<Record<string, unknown>> } };
  return uniqueEvidence(await Promise.all((data.message?.items ?? []).map((item) => {
    const title = Array.isArray(item.title) ? asText(item.title[0], "Crossref record") : "Crossref record";
    return makeEvidence({ category: "Acadêmico", title, url: asText(item.URL, "https://www.crossref.org/"), vehicle: "Crossref", content: cleanText(JSON.stringify(item)) });
  })));
};

const collectHackerNewsEvidence = async (query: string) => {
  const endpoint = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=2`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
  const data = await response.json() as { hits?: Array<{ objectID: string; title?: string; url?: string; created_at?: string; author?: string }> };
  const tasks = (data.hits ?? []).map(async (hit) => {
    const itemResponse = await fetch(`https://hn.algolia.com/api/v1/items/${hit.objectID}`, { signal: AbortSignal.timeout(8000) });
    const item = await itemResponse.json();
    return makeEvidence({ category: "Comunidade", title: hit.title || "Hacker News", url: `https://news.ycombinator.com/item?id=${hit.objectID}`, vehicle: "Hacker News", author: hit.author, date: hit.created_at, content: cleanText(JSON.stringify(item)) });
  });
  return Promise.allSettled(tasks).then((results) => uniqueEvidence(results.map((result) => result.status === "fulfilled" ? result.value : null)));
};

const collectFourChanEvidence = async (query: string) => {
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 3).slice(0, 4);
  if (terms.length === 0) return [];
  const boards = ["pol", "news", "g", "biz", "sci", "x"];
  const matches: Array<{ board: string; thread: number; title: string }> = [];
  for (const board of boards) {
    if (matches.length >= 2) break;
    try {
      const response = await fetch(`https://a.4cdn.org/${board}/catalog.json`, { signal: AbortSignal.timeout(8000) });
      const catalog = await response.json() as Array<{ threads?: Array<{ no: number; sub?: string; com?: string }> }>;
      for (const page of catalog) {
        const match = (page.threads ?? []).find((thread) => {
          const haystack = cleanText(`${thread.sub ?? ""} ${thread.com ?? ""}`).toLowerCase();
          return terms.some((term) => haystack.includes(term));
        });
        if (match) {
          matches.push({ board, thread: match.no, title: cleanText(match.sub || match.com || `4chan /${board}/ thread ${match.no}`).slice(0, 120) });
          break;
        }
      }
    } catch {
      // fonte indisponível; não citar
    }
  }
  const tasks = matches.map(async (match) => {
    const response = await fetch(`https://a.4cdn.org/${match.board}/thread/${match.thread}.json`, { signal: AbortSignal.timeout(8000) });
    const data = await response.json() as { posts?: Array<{ no: number; name?: string; now?: string; com?: string }> };
    const content = (data.posts ?? []).map((post) => `[${post.no}] ${post.name ?? "anon"} ${post.now ?? ""}: ${cleanText(post.com ?? "")}`).join("\n");
    return makeEvidence({ category: "Chan / Deepweb pública", title: match.title, url: `https://boards.4chan.org/${match.board}/thread/${match.thread}`, vehicle: `4chan /${match.board}/`, content });
  });
  return Promise.allSettled(tasks).then((results) => uniqueEvidence(results.map((result) => result.status === "fulfilled" ? result.value : null)));
};

const collectEvidence = async (query: string) => {
  const collectors = [
    collectDirectUrlEvidence,
    collectWikipediaEvidence,
    collectWikidataEvidence,
    collectArxivEvidence,
    collectCrossrefEvidence,
    collectHackerNewsEvidence,
    collectFourChanEvidence,
  ];
  const results = await Promise.allSettled(collectors.map((collector) => collector(query)));
  const evidence = uniqueEvidence(results.flatMap((result) => result.status === "fulfilled" ? result.value : []));
  return {
    evidence,
    attemptedEngines: collectors.length,
    rejectedSources: Math.max(0, collectors.length * 2 - evidence.length),
  };
};

const evidencePromptBlock = (evidence: EvidenceSource[]) =>
  evidence.map((source, index) => [
    `FONTE_${index + 1}`,
    `categoria=${source.categoria}`,
    `titulo=${source.titulo}`,
    `veiculo=${source.veiculo}`,
    `url=${source.url}`,
    `hash=${source.hashConteudo}`,
    `caracteres=${source.caracteresAnalisados}`,
    `conteudo_integral_inicio`,
    source.conteudoIntegral,
    `conteudo_integral_fim`,
  ].join("\n")).join("\n\n---\n\n");

const stripEvidenceContent = (source: EvidenceSource): InvestigationReport["fontes"][number] => ({
  categoria: source.categoria,
  titulo: source.titulo,
  autorOuPerfil: source.autorOuPerfil,
  veiculo: source.veiculo,
  data: source.data,
  url: source.url,
  confiabilidade: source.confiabilidade,
  justificativaConfiabilidade: source.justificativaConfiabilidade,
  trecho: source.trecho,
  textoCompletoAnalisado: true,
  caracteresAnalisados: source.caracteresAnalisados,
  hashConteudo: source.hashConteudo,
});

const enforceEvidenceOnly = (
  report: InvestigationReport,
  evidence: EvidenceSource[],
  attemptedEngines: number,
  rejectedSources: number,
): InvestigationReport => {
  const byUrl = new Map(evidence.map((source) => [source.url, source]));
  const citedUrls = new Set<string>();
  const fontes = report.fontes.flatMap((source) => {
    const evidenceSource = byUrl.get(source.url);
    if (!evidenceSource || citedUrls.has(evidenceSource.url)) return [];
    citedUrls.add(evidenceSource.url);
    return stripEvidenceContent(evidenceSource);
  });
  return {
    ...report,
    scoreVeracidade: fontes.length < 2 ? Math.min(report.scoreVeracidade, 25) : report.scoreVeracidade,
    coberturaFontes: {
      fontesCadastradas: SOURCE_REGISTRY_COUNT,
      motoresExecutados: attemptedEngines,
      fontesVerificadas: evidence.length,
      fontesComConteudoIntegral: evidence.length,
      fontesRejeitadas: rejectedSources + Math.max(0, report.fontes.length - fontes.length),
      aviso: "Sem fonte inventada: o relatório só mantém URLs coletadas e lidas integralmente pelo backend. Fontes inacessíveis, parciais, curtas demais ou grandes demais são rejeitadas antes da análise.",
    },
    fontes,
    inconsistencias: fontes.length === 0
      ? [...report.inconsistencias, "Nenhuma fonte citada pela IA passou pela validação de URL e conteúdo integral."]
      : report.inconsistencias,
  };
};

const fallbackReport = (query: string, categoria: string, rawText?: string): InvestigationReport => ({
  resumoExecutivo: `A investigação sobre "${query}" foi concluída, mas a resposta precisou ser recuperada em modo seguro porque veio fora do formato esperado.`,
  relatorioAnalitico:
    rawText?.trim() ||
    `Não foi possível estruturar automaticamente o dossiê de ${categoria.toLowerCase()} para "${query}".`,
  scoreVeracidade: 0,
  metodologia: "Fallback — algoritmo de triangulação não pôde ser executado por ausência de JSON estruturado.",
  coberturaFontes: defaultCoverage("Nenhuma fonte externa foi validada no modo seguro."),
  principaisFatos: rawText ? [rawText.trim().slice(0, 700)] : [],
  cronologia: [],
  temasRecorrentes: [],
  divergencias: [],
  inconsistencias: ["A resposta original da IA não seguiu o formato técnico esperado e foi exibida em modo seguro."],
  relacoes: [],
  fontes: [],
});

const normalizeReport = (value: unknown, query: string, categoria: string, rawText?: string): InvestigationReport => {
  if (!isRecord(value)) return fallbackReport(query, categoria, rawText);

  const report: InvestigationReport = {
    resumoExecutivo: asText(value.resumoExecutivo, `Dossiê inicial sobre "${query}".`),
    relatorioAnalitico: asText(value.relatorioAnalitico, rawText ?? "Sem relatório analítico retornado."),
    scoreVeracidade: asNumber(value.scoreVeracidade, 0),
    metodologia: asText(value.metodologia, "Triangulação Maltego: cruzamento de entidades, contagem de fontes independentes, ponderação por reputação e recência."),
    coberturaFontes: isRecord(value.coberturaFontes)
      ? {
          fontesCadastradas: asNumber(value.coberturaFontes.fontesCadastradas, SOURCE_REGISTRY_COUNT),
          motoresExecutados: asNumber(value.coberturaFontes.motoresExecutados, 0),
          fontesVerificadas: asNumber(value.coberturaFontes.fontesVerificadas, 0),
          fontesComConteudoIntegral: asNumber(value.coberturaFontes.fontesComConteudoIntegral, 0),
          fontesRejeitadas: asNumber(value.coberturaFontes.fontesRejeitadas, 0),
          aviso: asText(value.coberturaFontes.aviso, "Fontes citadas exigem evidência validada."),
        }
      : defaultCoverage("Cobertura de fontes não informada pelo modelo."),
    principaisFatos: asTextArray(value.principaisFatos),
    cronologia: Array.isArray(value.cronologia)
      ? value.cronologia.map((item) => {
          const entry = isRecord(item) ? item : {};
          return { data: asText(entry.data, "Sem data"), evento: asText(entry.evento, asText(item)) };
        }).filter((item) => item.evento)
      : [],
    temasRecorrentes: asTextArray(value.temasRecorrentes),
    divergencias: asTextArray(value.divergencias),
    inconsistencias: asTextArray(value.inconsistencias),
    relacoes: Array.isArray(value.relacoes)
      ? value.relacoes.map((item) => {
          const entry = isRecord(item) ? item : {};
          return { de: asText(entry.de), para: asText(entry.para), tipo: asText(entry.tipo, "relacionado") };
        }).filter((item) => item.de || item.para)
      : [],
    fontes: Array.isArray(value.fontes)
      ? value.fontes.map((item) => {
          const entry = isRecord(item) ? item : {};
          return {
            categoria: asText(entry.categoria, "Fonte"),
            titulo: asText(entry.titulo, asText(entry.url, "Fonte citada")),
            autorOuPerfil: asText(entry.autorOuPerfil),
            veiculo: asText(entry.veiculo),
            data: asText(entry.data),
            url: asText(entry.url, "#"),
            confiabilidade: asText(entry.confiabilidade, "Média"),
            justificativaConfiabilidade: asText(entry.justificativaConfiabilidade, "Não informado."),
            trecho: asText(entry.trecho),
            textoCompletoAnalisado: entry.textoCompletoAnalisado === true,
            caracteresAnalisados: asNumber(entry.caracteresAnalisados, 0),
            hashConteudo: asText(entry.hashConteudo),
          };
        }).filter((item) => item.titulo || item.url !== "#")
      : [],
  };

  return reportSchema.parse(report);
};

const InputSchema = z.object({
  query: z.string().trim().min(2).max(500),
  categoria: z.enum(CATEGORIES),
});

export const investigate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<InvestigationReport> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente no ambiente do servidor.");

    const gateway = createLovableAiGatewayProvider(key);

    const system = `Você é o "OLHO DO MUNDO", analista sênior de OSINT/SOCMINT operando uma plataforma inspirada na lógica de transforms da Maltego.

ALGORITMO DE INVESTIGAÇÃO (obrigatório):
1. ENTITY EXTRACTION — identifique a entidade alvo (pessoa, empresa, domínio, handle, evento) e suas propriedades.
2. TRANSFORMS — execute mentalmente transforms encadeadas como na Maltego: Entity → Aliases → Domains → Social Handles → Affiliations → Documents → Events. Cada transform deve gerar nós ligados em "relacoes".
3. MULTI-LAYER HARVEST — colete em camadas: imprensa internacional/local, comunidades (Reddit, HN, 4chan-archives, fóruns), redes sociais públicas (X/Twitter, Instagram, TikTok, YouTube, LinkedIn, Facebook, Telegram, Mastodon, Bluesky, GitHub), bancos acadêmicos (Scholar, arXiv, PubMed), registros públicos (WHOIS, SEC, CNPJ, processos), leak repositories conhecidos. Adapte ao alvo.
4. SOURCE SCORING (algoritmo de veracidade) — para cada fonte avalie:
   • Reputação do veículo (peer-reviewed / imprensa estabelecida / blog / anônimo).
   • Verificabilidade (primária vs secundária; documento original disponível).
   • Independência (fontes que se confirmam mutuamente sem co-citação circular).
   • Recência e proximidade temporal do evento.
   • Histórico de retratação.
5. CROSS-VALIDATION — fatos sustentados por ≥2 fontes independentes de alta reputação ganham peso. Contradições explícitas reduzem o score.
6. SCORE DE VERACIDADE GLOBAL (0-100):
   score = 100
     × (fontes_independentes_alta / max(1, total_fatos))
     × (1 - contradicoes / max(1, total_fatos))
     × fator_recência
   Arredonde para inteiro. Se houver pouca evidência, mantenha o score baixo — NUNCA infle.
7. GRAPH RELATIONS — preencha "relacoes" como arestas de um grafo: { de, para, tipo } (ex: "Pessoa X" —trabalha_em→ "Empresa Y").

REGRAS:
- Cite apenas fontes plausíveis e reais. NUNCA invente URLs ou veículos.
- Tudo em português do Brasil.
- Se evidência for fraca, diga isso, reduza o score e marque "inconsistencias".`;

    const prompt = `CATEGORIA / MODO: ${data.categoria}
ALVO: ${data.query}

Responda SOMENTE com JSON válido (sem markdown, sem texto fora do objeto):
{
  "resumoExecutivo": "string",
  "relatorioAnalitico": "string (denso, multi-parágrafo)",
  "scoreVeracidade": 0-100,
  "metodologia": "string descrevendo as transforms aplicadas e o cálculo do score",
  "principaisFatos": ["string"],
  "cronologia": [{ "data": "AAAA-MM-DD ou descrição", "evento": "string" }],
  "temasRecorrentes": ["string"],
  "divergencias": ["string"],
  "inconsistencias": ["string"],
  "relacoes": [{ "de": "string", "para": "string", "tipo": "string" }],
  "fontes": [{ "categoria": "string (Imprensa|Rede Social|Acadêmico|Comunidade|Registro Público|Documento)", "titulo": "string", "autorOuPerfil": "string", "veiculo": "string", "data": "string", "url": "string", "confiabilidade": "Alta|Média|Baixa", "justificativaConfiabilidade": "string", "trecho": "string" }]
}

Mínimo de 6 fontes diversificadas entre camadas quando o alvo permitir. Inclua ≥3 arestas em "relacoes".`;

    let text = "";

    try {
      const result = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system,
        prompt,
      });
      text = result.text;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha desconhecida ao consultar a IA.";
      return fallbackReport(data.query, data.categoria, message);
    }

    try {
      return normalizeReport(extractJson(text), data.query, data.categoria, text);
    } catch {
      return fallbackReport(data.query, data.categoria, text);
    }
  });

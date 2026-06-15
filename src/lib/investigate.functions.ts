import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { SOURCE_REGISTRY_COUNT } from "./source-registry";

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

const defaultCoverage = (aviso: string) => ({
  fontesCadastradas: SOURCE_REGISTRY_COUNT,
  motoresExecutados: 0,
  fontesVerificadas: 0,
  fontesComConteudoIntegral: 0,
  fontesRejeitadas: 0,
  aviso,
});

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

import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export const CATEGORIES = [
  "Pessoa Pública",
  "Empresa",
  "Assunto",
  "Evento",
  "Organização",
  "Notícia",
  "Pesquisa Livre",
] as const;

const reportSchema = z.object({
  resumoExecutivo: z.string(),
  relatorioAnalitico: z.string(),
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
  })),
});

export type InvestigationReport = z.infer<typeof reportSchema>;

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asText = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

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

const fallbackReport = (query: string, categoria: string, rawText?: string): InvestigationReport => ({
  resumoExecutivo: `A investigação sobre "${query}" foi concluída, mas a resposta precisou ser recuperada em modo seguro porque veio fora do formato esperado.`,
  relatorioAnalitico:
    rawText?.trim() ||
    `Não foi possível estruturar automaticamente o dossiê de ${categoria.toLowerCase()} para "${query}". Tente refinar o alvo ou repetir a investigação.`,
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

    const system = `Você é o "Olho do Mundo", um analista sênior de OSINT/SOCMINT.
Sua tarefa: produzir um dossiê investigativo profundo, factual e estruturado sobre o alvo informado.

Regras inegociáveis:
- TODA afirmação relevante deve vir acompanhada de pelo menos uma fonte na lista "fontes".
- Cite SOMENTE fontes que existam de verdade (veículos reais, perfis reais, URLs plausíveis). NUNCA invente URLs.
- Diversifique camadas: imprensa internacional, imprensa local, comunidades (Reddit/HN/fóruns), redes sociais públicas (X, TikTok, Instagram, YouTube, Telegram), acadêmico (Scholar/arXiv/PubMed) — quando aplicável ao alvo.
- Classifique cada fonte como Alta/Média/Baixa confiabilidade, com justificativa (reputação, verificabilidade, confirmações independentes, proximidade do evento).
- Sinalize divergências e inconsistências explicitamente.
- Construa uma cronologia objetiva.
- Tudo em português do Brasil.
- Se houver poucas evidências, diga isso e baixe a confiança — não fabrique.`;

    const prompt = `CATEGORIA: ${data.categoria}
ALVO DA INVESTIGAÇÃO: ${data.query}

Responda SOMENTE com um objeto JSON válido, sem markdown, sem texto antes/depois.
Campos obrigatórios:
{
  "resumoExecutivo": "string",
  "relatorioAnalitico": "string",
  "principaisFatos": ["string"],
  "cronologia": [{ "data": "string", "evento": "string" }],
  "temasRecorrentes": ["string"],
  "divergencias": ["string"],
  "inconsistencias": ["string"],
  "relacoes": [{ "de": "string", "para": "string", "tipo": "string" }],
  "fontes": [{ "categoria": "string", "titulo": "string", "autorOuPerfil": "string", "veiculo": "string", "data": "string", "url": "string", "confiabilidade": "Alta|Média|Baixa", "justificativaConfiabilidade": "string", "trecho": "string" }]
}

Cubra contexto, principais fatos, linha do tempo, atores relacionados, controvérsias e fontes diversificadas com avaliação de confiabilidade.`;

    const { text } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      system,
      prompt,
    });

    try {
      return normalizeReport(extractJson(text), data.query, data.categoria, text);
    } catch {
      return fallbackReport(data.query, data.categoria, text);
    }
  });

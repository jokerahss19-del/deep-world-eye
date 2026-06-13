import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
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

const SourceCategoryEnum = z.enum([
  "Notícias",
  "Artigos Científicos",
  "Reddit",
  "X (Twitter)",
  "TikTok",
  "Instagram",
  "YouTube",
  "Telegram",
  "Blogs",
  "Fóruns",
  "Outros",
]);

const ConfidenceEnum = z.enum(["Alta", "Média", "Baixa"]);

const reportSchema = z.object({
  resumoExecutivo: z.string().describe("Síntese curta em 2-3 parágrafos"),
  relatorioAnalitico: z.string().describe("Relatório detalhado em markdown, vários parágrafos"),
  principaisFatos: z.array(z.string()).describe("Bullets dos fatos centrais"),
  cronologia: z.array(z.object({
    data: z.string().describe("Data ou período (ISO ou texto curto)"),
    evento: z.string(),
  })),
  temasRecorrentes: z.array(z.string()),
  divergencias: z.array(z.string()).describe("Pontos onde fontes discordam"),
  inconsistencias: z.array(z.string()),
  relacoes: z.array(z.object({
    de: z.string(),
    para: z.string(),
    tipo: z.string().describe("Tipo de relação: colega, financiador, opositor, etc"),
  })),
  fontes: z.array(z.object({
    categoria: SourceCategoryEnum,
    titulo: z.string(),
    autorOuPerfil: z.string().optional(),
    veiculo: z.string().optional(),
    data: z.string().optional(),
    url: z.string(),
    confiabilidade: ConfidenceEnum,
    justificativaConfiabilidade: z.string(),
    trecho: z.string().describe("Citação ou resumo do que a fonte traz"),
  })),
});

export type InvestigationReport = z.infer<typeof reportSchema>;

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

Produza o dossiê completo respeitando o schema. Cubra contexto, principais fatos, linha do tempo, atores relacionados, controvérsias e fontes diversificadas com avaliação de confiabilidade.`;

    const { experimental_output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt,
      experimental_output: Output.object({ schema: reportSchema }),
    });

    return experimental_output;
  });

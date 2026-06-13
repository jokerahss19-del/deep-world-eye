import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  investigate,
  CATEGORIES,
  type InvestigationReport,
} from "@/lib/investigate.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Eye,
  Search,
  Loader2,
  AlertTriangle,
  Clock,
  Network,
  FileText,
  Link as LinkIcon,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Olho do Mundo V0.02 Beta — Motor de Investigação OSINT" },
      {
        name: "description",
        content:
          "Motor de pesquisa profunda em múltiplas camadas: imprensa, comunidades, redes sociais, acadêmico. Cada fato com sua fonte.",
      },
      { property: "og:title", content: "Olho do Mundo V0.02 Beta" },
      {
        property: "og:description",
        content: "Investigação profunda OSINT com correlação e avaliação de confiabilidade.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const investigateFn = useServerFn(investigate);
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] =
    useState<(typeof CATEGORIES)[number]>("Pesquisa Livre");

  const mutation = useMutation({
    mutationFn: (vars: { query: string; categoria: (typeof CATEGORIES)[number] }) =>
      investigateFn({ data: vars }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2 || mutation.isPending) return;
    mutation.mutate({ query: query.trim(), categoria });
  };

  return (
    <main className="min-h-screen grid-bg">
      <header className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-20 bg-background/70">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Eye className="size-6 text-primary" />
              <span className="absolute inset-0 blur-md bg-primary/40 -z-10 rounded-full" />
            </div>
            <div className="font-display text-sm tracking-widest text-foreground">
              OLHO DO MUNDO
              <span className="ml-2 text-muted-foreground text-[10px]">V0.02 BETA</span>
            </div>
          </div>
          <div className="text-[10px] font-display text-muted-foreground hidden sm:block">
            OSINT · SOCMINT · DEEP RESEARCH
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl sm:text-5xl text-foreground">
            O que vamos investigar?
          </h1>
          <p className="mt-4 text-muted-foreground text-sm max-w-xl mx-auto">
            Motor de pesquisa profunda em múltiplas camadas. Imprensa, comunidades,
            redes sociais e produção acadêmica. Cada afirmação com sua origem.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-scan border border-border rounded-lg p-4 shadow-panel"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, empresa, evento, tema, URL..."
              className="h-12 bg-input/60 border-border text-base font-display placeholder:text-muted-foreground/60"
              maxLength={500}
            />
            <Select
              value={categoria}
              onValueChange={(v) => setCategoria(v as (typeof CATEGORIES)[number])}
            >
              <SelectTrigger className="h-12 sm:w-56 bg-input/60 border-border font-display text-xs uppercase tracking-wider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="font-display text-xs uppercase tracking-wider">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            disabled={mutation.isPending || query.trim().length < 2}
            className="mt-3 w-full h-12 font-display tracking-widest uppercase text-sm shadow-glow"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Investigando...
              </>
            ) : (
              <>
                <Search className="size-4" /> Investigar
              </>
            )}
          </Button>
        </form>

        {mutation.isError && (
          <Card className="mt-6 p-4 border-destructive/60 bg-destructive/10 text-destructive-foreground">
            <div className="flex gap-2 items-start text-sm">
              <AlertTriangle className="size-4 mt-0.5 text-destructive" />
              <div>
                <div className="font-display text-destructive">Falha na investigação</div>
                <div className="text-muted-foreground mt-1">
                  {(mutation.error as Error)?.message ?? "Erro desconhecido"}
                </div>
              </div>
            </div>
          </Card>
        )}

        {mutation.isPending && <PendingState />}
      </section>

      {mutation.data && (
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <ReportView report={mutation.data} query={query} categoria={categoria} />
        </section>
      )}

      {!mutation.data && !mutation.isPending && (
        <footer className="max-w-3xl mx-auto px-6 pb-16 text-center">
          <p className="text-[11px] font-display text-muted-foreground/70 uppercase tracking-widest">
            Beta · Resultados gerados por IA · Sempre verifique as fontes citadas
          </p>
        </footer>
      )}
    </main>
  );
}

function PendingState() {
  const steps = [
    "Camada 1 — Busca direta (Google, Bing, DuckDuckGo, Brave)",
    "Camada 2 — Imprensa internacional e local",
    "Camada 3 — Comunidades (Reddit, HN, fóruns)",
    "Camada 4 — Redes sociais públicas",
    "Camada 5 — Pesquisa acadêmica",
    "Camada 6 — Correlação e grafo de relações",
    "IA Analista — síntese, cronologia, divergências",
  ];
  return (
    <Card className="mt-6 p-6 border-border bg-card/60 shadow-panel">
      <div className="font-display text-xs uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
        <Loader2 className="size-3 animate-spin" /> Coletando inteligência
      </div>
      <ul className="space-y-2 text-sm">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
            <span className="font-display text-xs">{s}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ConfidenceBadge({ level }: { level: "Alta" | "Média" | "Baixa" }) {
  const map = {
    Alta: "bg-confidence-high/15 text-confidence-high border-confidence-high/40",
    "Média": "bg-confidence-medium/15 text-confidence-medium border-confidence-medium/40",
    Baixa: "bg-confidence-low/15 text-confidence-low border-confidence-low/40",
  } as const;
  return (
    <Badge variant="outline" className={`font-display text-[10px] uppercase tracking-wider ${map[level]}`}>
      <ShieldCheck className="size-3" /> {level}
    </Badge>
  );
}

function ReportView({
  report,
  query,
  categoria,
}: {
  report: InvestigationReport;
  query: string;
  categoria: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="font-display text-[10px] uppercase tracking-widest text-primary mb-1">
            Dossiê · {categoria}
          </div>
          <h2 className="font-display text-2xl text-foreground">{query}</h2>
        </div>
        <div className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
          {report.fontes.length} fontes · {report.cronologia.length} eventos · {report.relacoes.length} relações
        </div>
      </div>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="bg-card/60 border border-border h-auto p-1 flex flex-wrap">
          <TabsTrigger value="resumo" className="font-display text-xs uppercase tracking-wider">
            <FileText className="size-3" /> Resumo
          </TabsTrigger>
          <TabsTrigger value="analitico" className="font-display text-xs uppercase tracking-wider">
            Analítico
          </TabsTrigger>
          <TabsTrigger value="cronologia" className="font-display text-xs uppercase tracking-wider">
            <Clock className="size-3" /> Cronologia
          </TabsTrigger>
          <TabsTrigger value="relacoes" className="font-display text-xs uppercase tracking-wider">
            <Network className="size-3" /> Relações
          </TabsTrigger>
          <TabsTrigger value="fontes" className="font-display text-xs uppercase tracking-wider">
            <LinkIcon className="size-3" /> Fontes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4 space-y-4">
          <Card className="p-6 bg-scan border-border shadow-panel">
            <SectionTitle>Resumo executivo</SectionTitle>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {report.resumoExecutivo}
            </p>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5 border-border">
              <SectionTitle>Principais fatos</SectionTitle>
              <ul className="space-y-2 text-sm">
                {report.principaisFatos.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary font-display">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5 border-border">
              <SectionTitle>Temas recorrentes</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {report.temasRecorrentes.map((t) => (
                  <Badge key={t} variant="secondary" className="font-display text-[11px]">
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card className="p-5 border-border">
              <SectionTitle>Divergências encontradas</SectionTitle>
              {report.divergencias.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma divergência relevante.</p>
              ) : (
                <ul className="space-y-2 text-sm text-foreground/90 list-disc pl-4">
                  {report.divergencias.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </Card>

            <Card className="p-5 border-border">
              <SectionTitle>Possíveis inconsistências</SectionTitle>
              {report.inconsistencias.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma inconsistência detectada.</p>
              ) : (
                <ul className="space-y-2 text-sm text-foreground/90 list-disc pl-4">
                  {report.inconsistencias.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analitico" className="mt-4">
          <Card className="p-6 border-border">
            <SectionTitle>Relatório analítico</SectionTitle>
            <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {report.relatorioAnalitico}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="cronologia" className="mt-4">
          <Card className="p-6 border-border">
            <SectionTitle>Linha do tempo</SectionTitle>
            <ol className="relative border-l border-border/80 ml-2 space-y-5">
              {report.cronologia.map((ev, i) => (
                <li key={i} className="ml-6">
                  <span className="absolute -left-1.5 size-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="font-display text-[11px] uppercase tracking-widest text-primary">
                    {ev.data}
                  </div>
                  <div className="text-sm text-foreground/90 mt-1">{ev.evento}</div>
                </li>
              ))}
            </ol>
          </Card>
        </TabsContent>

        <TabsContent value="relacoes" className="mt-4">
          <Card className="p-6 border-border">
            <SectionTitle>Mapa de relações</SectionTitle>
            {report.relacoes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma relação identificada.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {report.relacoes.map((r, i) => (
                  <div
                    key={i}
                    className="border border-border rounded-md p-3 bg-card/60 flex items-center justify-between gap-3"
                  >
                    <span className="font-display text-xs text-foreground">{r.de}</span>
                    <span className="text-[10px] font-display uppercase tracking-widest text-primary px-2 py-1 border border-primary/30 rounded">
                      {r.tipo}
                    </span>
                    <span className="font-display text-xs text-foreground text-right">{r.para}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="fontes" className="mt-4 space-y-3">
          {report.fontes.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma fonte retornada.</p>
          )}
          {report.fontes.map((s, i) => (
            <Card key={i} className="p-4 border-border hover:border-primary/40 transition-colors">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="outline" className="font-display text-[10px] uppercase tracking-wider border-primary/40 text-primary">
                  {s.categoria}
                </Badge>
                <ConfidenceBadge level={(["Alta","Média","Baixa"].includes(s.confiabilidade) ? s.confiabilidade : "Média") as "Alta" | "Média" | "Baixa"} />
                {s.data && (
                  <span className="font-display text-[10px] text-muted-foreground uppercase tracking-wider">
                    {s.data}
                  </span>
                )}
              </div>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm font-medium text-foreground hover:text-primary"
              >
                {s.titulo}
              </a>
              <div className="text-[11px] font-display text-muted-foreground mt-1">
                {[s.veiculo, s.autorOuPerfil].filter(Boolean).join(" · ")}
              </div>
              <p className="text-xs text-foreground/80 mt-2 leading-relaxed">{s.trecho}</p>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                Confiabilidade: {s.justificativaConfiabilidade}
              </p>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-display text-primary/80 hover:text-primary break-all mt-1 inline-block"
              >
                {s.url}
              </a>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-[10px] uppercase tracking-widest text-primary mb-3">
      {children}
    </h3>
  );
}

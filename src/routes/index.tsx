import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { investigate, CATEGORIES, type InvestigationReport } from "@/lib/investigate.functions";
import { useHistory, type HistoryEntry } from "@/hooks/use-history";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  History,
  Trash2,
  X,
  GitBranch,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OLHO DO MUNDO V0.04 — OSINT/SOCMINT BRUTAL ENGINE" },
      {
        name: "description",
        content:
          "Motor de investigação OSINT multi-camadas com transforms estilo Maltego, score de veracidade algorítmico e harvest em redes sociais.",
      },
      { property: "og:title", content: "OLHO DO MUNDO V0.04" },
      {
        property: "og:description",
        content:
          "Investigação profunda com algoritmo Maltego de triangulação e score de veracidade.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const investigateFn = useServerFn(investigate);
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIES)[number]>("Pesquisa Livre");
  const [activeEntry, setActiveEntry] = useState<HistoryEntry | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { entries, add, remove, clear } = useHistory();

  const mutation = useMutation({
    mutationFn: (vars: { query: string; categoria: (typeof CATEGORIES)[number] }) =>
      investigateFn({ data: vars }),
  });

  // Salvar no histórico quando concluir
  useEffect(() => {
    if (mutation.data && mutation.variables) {
      const entry = add({
        query: mutation.variables.query,
        categoria: mutation.variables.categoria,
        report: mutation.data,
      });
      setActiveEntry(entry);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.data]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2 || mutation.isPending) return;
    setActiveEntry(null);
    mutation.mutate({ query: query.trim(), categoria });
  };

  const openEntry = (entry: HistoryEntry) => {
    setActiveEntry(entry);
    setQuery(entry.query);
    setCategoria(entry.categoria as (typeof CATEGORIES)[number]);
    setHistoryOpen(false);
  };

  return (
    <main className="min-h-screen grid-bg scanlines">
      <header className="border-b-2 border-border sticky top-0 z-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="size-5 text-primary" />
            <div className="font-display text-xs tracking-widest text-foreground">
              [OLHO_DO_MUNDO]
              <span className="ml-2 text-muted-foreground">V0.04</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-display text-muted-foreground hidden sm:block">
              OSINT · SOCMINT · MALTEGO_ALGO · EVIDENCE_LOCK
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen((s) => !s)}
              className="h-8 font-display text-[10px] uppercase tracking-widest border-2"
            >
              <History className="size-3" /> Hist [{entries.length}]
            </Button>
          </div>
        </div>
      </header>

      {historyOpen && (
        <HistoryPanel
          entries={entries}
          onOpen={openEntry}
          onRemove={remove}
          onClear={clear}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      <section className="max-w-3xl mx-auto px-4 pt-12 pb-8">
        <div className="mb-6 border-2 border-border bg-card p-4">
          <div className="font-display text-[10px] uppercase tracking-widest text-primary mb-2">
            &gt; SYSTEM_READY // INPUT TARGET
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground leading-tight">
            O QUE VAMOS INVESTIGAR?
          </h1>
          <p className="mt-3 text-muted-foreground text-xs font-display uppercase tracking-wide">
            100+ fontes cadastradas · leitura integral · fontes inventadas bloqueadas
          </p>
        </div>

        <form onSubmit={onSubmit} className="border-2 border-border bg-card p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="alvo: nome, @handle, dominio.com, evento, url..."
              className="h-11 bg-input border-2 border-border text-sm font-display placeholder:text-muted-foreground/60"
              maxLength={500}
              disabled={mutation.isPending}
            />
            <Select
              value={categoria}
              onValueChange={(v) => setCategoria(v as (typeof CATEGORIES)[number])}
              disabled={mutation.isPending}
            >
              <SelectTrigger className="h-11 sm:w-64 bg-input border-2 border-border font-display text-[11px] uppercase tracking-wider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-2 border-border">
                {CATEGORIES.map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                    className="font-display text-[11px] uppercase tracking-wider"
                  >
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            disabled={mutation.isPending || query.trim().length < 2}
            className="mt-2 w-full h-11 font-display tracking-widest uppercase text-xs border-2 border-primary"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> &gt; EXECUTANDO_TRANSFORMS...
              </>
            ) : (
              <>
                <Search className="size-4" /> &gt; INVESTIGAR
              </>
            )}
          </Button>
          {mutation.isPending && (
            <div className="mt-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground">
              ! modo de pesquisa bloqueado durante execução
            </div>
          )}
        </form>

        {mutation.isError && (
          <Card className="mt-4 p-3 border-2 border-destructive bg-destructive/10">
            <div className="flex gap-2 items-start text-xs">
              <AlertTriangle className="size-4 mt-0.5 text-destructive" />
              <div>
                <div className="font-display text-destructive uppercase">
                  [ERROR] Falha na investigação
                </div>
                <div className="text-muted-foreground mt-1">
                  {(mutation.error as Error)?.message ?? "Erro desconhecido"}
                </div>
              </div>
            </div>
          </Card>
        )}

        {mutation.isPending && <PendingState categoria={categoria} />}
      </section>

      {activeEntry && (
        <section className="max-w-6xl mx-auto px-4 pb-24">
          <ReportView
            report={activeEntry.report}
            query={activeEntry.query}
            categoria={activeEntry.categoria}
          />
        </section>
      )}

      {!activeEntry && !mutation.isPending && (
        <footer className="max-w-3xl mx-auto px-4 pb-12 text-center">
          <p className="text-[10px] font-display text-muted-foreground uppercase tracking-widest">
            // beta · sem fonte validada não há relatório factual
          </p>
        </footer>
      )}
    </main>
  );
}

function HistoryPanel({
  entries,
  onOpen,
  onRemove,
  onClear,
  onClose,
}: {
  entries: HistoryEntry[];
  onOpen: (e: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="border-b-2 border-border bg-card">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-display text-[10px] uppercase tracking-widest text-primary">
            &gt; HISTÓRICO_LOCAL [{entries.length}]
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-7 font-display text-[10px] uppercase tracking-widest text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3" /> Limpar
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 font-display text-[10px] uppercase tracking-widest"
            >
              <X className="size-3" />
            </Button>
          </div>
        </div>
        {entries.length === 0 ? (
          <div className="text-[11px] font-display uppercase tracking-wider text-muted-foreground py-2">
            // nenhuma investigação salva ainda
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-auto">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="border-2 border-border bg-background p-2 flex flex-col gap-1 hover:border-primary transition-colors"
              >
                <button type="button" onClick={() => onOpen(entry)} className="text-left">
                  <div className="font-display text-[10px] uppercase tracking-widest text-primary truncate">
                    [{entry.categoria}]
                  </div>
                  <div className="font-display text-xs text-foreground truncate">{entry.query}</div>
                  <div className="text-[10px] text-muted-foreground font-display">
                    {new Date(entry.timestamp).toLocaleString("pt-BR")} · score{" "}
                    {entry.report.scoreVeracidade ?? 0}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  className="self-end text-[10px] font-display uppercase tracking-widest text-destructive/80 hover:text-destructive"
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PendingState({ categoria }: { categoria: string }) {
  const steps = [
    "T1 :: entity_extraction()",
    "T2 :: transform → aliases / handles / dominios",
    "T3 :: harvest imprensa (global + local)",
    "T4 :: harvest social (X · IG · TikTok · YT · LinkedIn · Reddit · Telegram)",
    "T5 :: harvest acadêmico (Scholar · arXiv · PubMed)",
    "T6 :: cross_validation() + graph_build()",
    "T7 :: source_scoring() + truth_score()",
  ];
  return (
    <Card className="mt-4 p-4 border-2 border-border bg-card">
      <div className="font-display text-[10px] uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
        <Loader2 className="size-3 animate-spin" /> &gt; pipeline_em_execução :: modo={categoria}
      </div>
      <ul className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-muted-foreground">
            <span className="text-primary font-display text-[10px]">
              [{String(i + 1).padStart(2, "0")}]
            </span>
            <span className="font-display text-[11px] uppercase tracking-wider">{s}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ConfidenceBadge({ level }: { level: "Alta" | "Média" | "Baixa" }) {
  const map = {
    Alta: "bg-confidence-high/15 text-confidence-high border-confidence-high",
    Média: "bg-confidence-medium/15 text-confidence-medium border-confidence-medium",
    Baixa: "bg-confidence-low/15 text-confidence-low border-confidence-low",
  } as const;
  return (
    <Badge
      variant="outline"
      className={`font-display text-[10px] uppercase tracking-wider border-2 ${map[level]}`}
    >
      <ShieldCheck className="size-3" /> {level}
    </Badge>
  );
}

function TruthScore({ score }: { score: number }) {
  const color =
    score >= 70
      ? "text-confidence-high border-confidence-high"
      : score >= 40
        ? "text-confidence-medium border-confidence-medium"
        : "text-confidence-low border-confidence-low";
  return (
    <div className={`border-2 ${color} p-3 bg-card flex flex-col items-center min-w-[110px]`}>
      <div className="font-display text-[9px] uppercase tracking-widest text-muted-foreground">
        truth_score
      </div>
      <div className={`font-display text-3xl ${color.split(" ")[0]}`}>{score}</div>
      <div className="font-display text-[9px] uppercase tracking-widest text-muted-foreground">
        / 100
      </div>
    </div>
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-stretch justify-between gap-3 border-2 border-border bg-card p-3">
        <div className="flex-1 min-w-[200px]">
          <div className="font-display text-[10px] uppercase tracking-widest text-primary mb-1">
            // dossiê :: [{categoria}]
          </div>
          <h2 className="font-display text-xl text-foreground break-words">{query}</h2>
          <div className="font-display text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            {report.fontes.length} fontes · {report.cronologia.length} eventos ·{" "}
            {report.relacoes.length} arestas
          </div>
        </div>
        <TruthScore score={report.scoreVeracidade ?? 0} />
      </div>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="bg-card border-2 border-border h-auto p-1 flex flex-wrap">
          <TabsTrigger value="resumo" className="font-display text-[11px] uppercase tracking-wider">
            <FileText className="size-3" /> Resumo
          </TabsTrigger>
          <TabsTrigger
            value="analitico"
            className="font-display text-[11px] uppercase tracking-wider"
          >
            Analítico
          </TabsTrigger>
          <TabsTrigger value="metodo" className="font-display text-[11px] uppercase tracking-wider">
            <GitBranch className="size-3" /> Método
          </TabsTrigger>
          <TabsTrigger
            value="cronologia"
            className="font-display text-[11px] uppercase tracking-wider"
          >
            <Clock className="size-3" /> Cronologia
          </TabsTrigger>
          <TabsTrigger
            value="relacoes"
            className="font-display text-[11px] uppercase tracking-wider"
          >
            <Network className="size-3" /> Grafo
          </TabsTrigger>
          <TabsTrigger value="fontes" className="font-display text-[11px] uppercase tracking-wider">
            <LinkIcon className="size-3" /> Fontes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-3 space-y-3">
          <Card className="p-4 bg-card border-2 border-border">
            <SectionTitle>resumo_executivo</SectionTitle>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {report.resumoExecutivo}
            </p>
          </Card>

          <div className="grid md:grid-cols-2 gap-3">
            <Card className="p-4 border-2 border-border">
              <SectionTitle>principais_fatos</SectionTitle>
              <ul className="space-y-1.5 text-sm">
                {report.principaisFatos.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary font-display text-xs">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4 border-2 border-border">
              <SectionTitle>temas_recorrentes</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {report.temasRecorrentes.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="font-display text-[10px] border-2 border-border uppercase"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card className="p-4 border-2 border-border">
              <SectionTitle>divergências</SectionTitle>
              {report.divergencias.length === 0 ? (
                <p className="text-[11px] font-display uppercase text-muted-foreground">
                  // nenhuma
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm text-foreground/90 list-disc pl-4">
                  {report.divergencias.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-4 border-2 border-border">
              <SectionTitle>inconsistências</SectionTitle>
              {report.inconsistencias.length === 0 ? (
                <p className="text-[11px] font-display uppercase text-muted-foreground">
                  // nenhuma
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm text-foreground/90 list-disc pl-4">
                  {report.inconsistencias.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analitico" className="mt-3">
          <Card className="p-4 border-2 border-border">
            <SectionTitle>relatório_analítico</SectionTitle>
            <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {report.relatorioAnalitico}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="metodo" className="mt-3">
          <Card className="p-4 border-2 border-border mb-3">
            <SectionTitle>metodologia_maltego</SectionTitle>
            <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {report.metodologia}
            </div>
          </Card>
          <Card className="p-4 border-2 border-border">
            <SectionTitle>evidence_lock</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Metric label="fontes_cadastradas" value={report.coberturaFontes.fontesCadastradas} />
              <Metric label="motores_exec" value={report.coberturaFontes.motoresExecutados} />
              <Metric label="fontes_validadas" value={report.coberturaFontes.fontesVerificadas} />
              <Metric
                label="lidas_inteiras"
                value={report.coberturaFontes.fontesComConteudoIntegral}
              />
              <Metric label="rejeitadas" value={report.coberturaFontes.fontesRejeitadas} />
            </div>
            <p className="mt-3 text-[10px] font-display uppercase tracking-wider text-muted-foreground">
              // {report.coberturaFontes.aviso}
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="cronologia" className="mt-3">
          <Card className="p-4 border-2 border-border">
            <SectionTitle>linha_do_tempo</SectionTitle>
            <ol className="relative border-l-2 border-border ml-2 space-y-4">
              {report.cronologia.map((ev, i) => (
                <li key={i} className="ml-4">
                  <span className="absolute -left-1.5 size-3 bg-primary" />
                  <div className="font-display text-[10px] uppercase tracking-widest text-primary">
                    {ev.data}
                  </div>
                  <div className="text-sm text-foreground/90 mt-1">{ev.evento}</div>
                </li>
              ))}
            </ol>
          </Card>
        </TabsContent>

        <TabsContent value="relacoes" className="mt-3">
          <Card className="p-4 border-2 border-border">
            <SectionTitle>grafo_de_entidades</SectionTitle>
            {report.relacoes.length === 0 ? (
              <p className="text-[11px] font-display uppercase text-muted-foreground">
                // sem arestas
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {report.relacoes.map((r, i) => (
                  <div
                    key={i}
                    className="border-2 border-border p-2 bg-background flex items-center justify-between gap-2"
                  >
                    <span className="font-display text-[11px] text-foreground">[{r.de}]</span>
                    <span className="text-[9px] font-display uppercase tracking-widest text-primary px-1.5 border-2 border-primary/60">
                      {r.tipo}
                    </span>
                    <span className="font-display text-[11px] text-foreground text-right">
                      [{r.para}]
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="fontes" className="mt-3 space-y-2">
          {report.fontes.length === 0 && (
            <p className="text-[11px] font-display uppercase text-muted-foreground">
              // sem fontes retornadas
            </p>
          )}
          {report.fontes.map((s, i) => (
            <Card
              key={i}
              className="p-3 border-2 border-border hover:border-primary transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className="font-display text-[10px] uppercase tracking-wider border-2 border-primary/60 text-primary"
                >
                  {s.categoria}
                </Badge>
                <ConfidenceBadge
                  level={
                    (["Alta", "Média", "Baixa"].includes(s.confiabilidade)
                      ? s.confiabilidade
                      : "Média") as "Alta" | "Média" | "Baixa"
                  }
                />
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
              <div className="text-[10px] font-display text-muted-foreground mt-1 uppercase tracking-wider">
                {[s.veiculo, s.autorOuPerfil].filter(Boolean).join(" · ")}
              </div>
              <p className="text-xs text-foreground/80 mt-2 leading-relaxed">{s.trecho}</p>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                // confiabilidade: {s.justificativaConfiabilidade}
              </p>
              <p className="text-[10px] font-display text-muted-foreground mt-2 uppercase tracking-wider">
                // inteiro={String(s.textoCompletoAnalisado)} · chars={s.caracteresAnalisados} ·
                hash={s.hashConteudo}
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
    <h3 className="font-display text-[10px] uppercase tracking-widest text-primary mb-2 border-b border-border pb-1">
      &gt; {children}
    </h3>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-2 border-border bg-background p-2">
      <div className="font-display text-[9px] uppercase tracking-widest text-muted-foreground break-words">
        {label}
      </div>
      <div className="font-display text-xl text-primary">{value}</div>
    </div>
  );
}

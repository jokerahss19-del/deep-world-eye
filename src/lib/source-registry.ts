export type SourceCategory =
  | "Imprensa"
  | "Rede Social"
  | "Comunidade"
  | "Chan / Deepweb pública"
  | "Acadêmico"
  | "Registro Público"
  | "Documento"
  | "Código / Segurança"
  | "Enciclopédia"
  | "Arquivo";

export type SourceDefinition = {
  id: string;
  name: string;
  category: SourceCategory;
  url: string;
};

const makeSources = (
  category: SourceCategory,
  rows: Array<[string, string]>,
): SourceDefinition[] =>
  rows.map(([name, url]) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name,
    category,
    url,
  }));

export const SOURCE_REGISTRY: SourceDefinition[] = [
  ...makeSources("Imprensa", [
    ["Reuters", "https://www.reuters.com/"], ["Associated Press", "https://apnews.com/"], ["BBC", "https://www.bbc.com/"], ["The Guardian", "https://www.theguardian.com/"],
    ["Financial Times", "https://www.ft.com/"], ["Bloomberg", "https://www.bloomberg.com/"], ["NPR", "https://www.npr.org/"], ["Al Jazeera", "https://www.aljazeera.com/"],
    ["Deutsche Welle", "https://www.dw.com/"], ["France 24", "https://www.france24.com/"], ["Euronews", "https://www.euronews.com/"], ["CBC", "https://www.cbc.ca/news"],
    ["ABC News", "https://abcnews.go.com/"], ["CBS News", "https://www.cbsnews.com/"], ["NBC News", "https://www.nbcnews.com/"], ["PBS", "https://www.pbs.org/newshour/"],
    ["Folha de S.Paulo", "https://www.folha.uol.com.br/"], ["Estadão", "https://www.estadao.com.br/"], ["O Globo", "https://oglobo.globo.com/"], ["Agência Brasil", "https://agenciabrasil.ebc.com.br/"],
    ["G1", "https://g1.globo.com/"], ["UOL Notícias", "https://noticias.uol.com.br/"], ["Poder360", "https://www.poder360.com.br/"], ["Nexo Jornal", "https://www.nexojornal.com.br/"],
    ["The Intercept Brasil", "https://www.intercept.com.br/"], ["Aos Fatos", "https://www.aosfatos.org/"], ["Lupa", "https://lupa.uol.com.br/"], ["Politifact", "https://www.politifact.com/"],
    ["Snopes", "https://www.snopes.com/"], ["Full Fact", "https://fullfact.org/"], ["Bellingcat", "https://www.bellingcat.com/"], ["ProPublica", "https://www.propublica.org/"],
  ]),
  ...makeSources("Rede Social", [
    ["X / Twitter", "https://x.com/search"], ["Instagram", "https://www.instagram.com/"], ["TikTok", "https://www.tiktok.com/search"], ["YouTube", "https://www.youtube.com/"],
    ["LinkedIn", "https://www.linkedin.com/"], ["Facebook", "https://www.facebook.com/"], ["Threads", "https://www.threads.net/"], ["Bluesky", "https://bsky.app/"],
    ["Mastodon.social", "https://mastodon.social/"], ["Telegram", "https://t.me/"], ["Reddit", "https://www.reddit.com/search/"], ["Tumblr", "https://www.tumblr.com/search"],
    ["Pinterest", "https://www.pinterest.com/search/"], ["Twitch", "https://www.twitch.tv/"], ["Discord public indexes", "https://discord.com/"], ["Medium", "https://medium.com/search"],
  ]),
  ...makeSources("Comunidade", [
    ["Hacker News", "https://news.ycombinator.com/"], ["Lobsters", "https://lobste.rs/"], ["Product Hunt", "https://www.producthunt.com/"], ["Slashdot", "https://slashdot.org/"],
    ["Stack Overflow", "https://stackoverflow.com/"], ["Stack Exchange", "https://stackexchange.com/"], ["Quora", "https://www.quora.com/"], ["Ask Ubuntu", "https://askubuntu.com/"],
    ["MetaFilter", "https://www.metafilter.com/"], ["LessWrong", "https://www.lesswrong.com/"], ["Kialo", "https://www.kialo.com/"], ["Discourse public forums", "https://www.discourse.org/"],
  ]),
  ...makeSources("Chan / Deepweb pública", [
    ["4chan", "https://www.4chan.org/"], ["4chan API", "https://github.com/4chan/4chan-API"], ["4plebs", "https://archive.4plebs.org/"], ["Archived.moe", "https://archived.moe/"],
    ["Desuarchive", "https://desuarchive.org/"], ["Warosu", "https://warosu.org/"], ["8kun", "https://8kun.top/"], ["Endchan", "https://endchan.net/"],
    ["Lainchan", "https://lainchan.org/"], ["Wizardchan", "https://wizardchan.org/"], ["Anon.cafe", "https://anon.cafe/"], ["Raddle", "https://raddle.me/"],
  ]),
  ...makeSources("Acadêmico", [
    ["Google Scholar", "https://scholar.google.com/"], ["arXiv", "https://arxiv.org/"], ["PubMed", "https://pubmed.ncbi.nlm.nih.gov/"], ["Crossref", "https://www.crossref.org/"],
    ["OpenAlex", "https://openalex.org/"], ["Semantic Scholar", "https://www.semanticscholar.org/"], ["CORE", "https://core.ac.uk/"], ["DOAJ", "https://doaj.org/"],
    ["SSRN", "https://www.ssrn.com/"], ["ResearchGate", "https://www.researchgate.net/"], ["JSTOR", "https://www.jstor.org/"], ["SciELO", "https://scielo.org/"],
    ["Europe PMC", "https://europepmc.org/"], ["bioRxiv", "https://www.biorxiv.org/"], ["medRxiv", "https://www.medrxiv.org/"], ["IEEE Xplore", "https://ieeexplore.ieee.org/"],
  ]),
  ...makeSources("Registro Público", [
    ["Wikidata", "https://www.wikidata.org/"], ["Wikipedia", "https://www.wikipedia.org/"], ["Internet Archive", "https://archive.org/"], ["Wayback Machine", "https://web.archive.org/"],
    ["SEC EDGAR", "https://www.sec.gov/edgar"], ["OpenCorporates", "https://opencorporates.com/"], ["Receita Federal CNPJ", "https://www.gov.br/receitafederal/"], ["CVM", "https://www.gov.br/cvm/"],
    ["TSE", "https://www.tse.jus.br/"], ["Diário Oficial da União", "https://www.in.gov.br/"], ["Portal da Transparência", "https://portaldatransparencia.gov.br/"], ["Dados.gov.br", "https://dados.gov.br/"],
    ["CourtListener", "https://www.courtlistener.com/"], ["Justia", "https://www.justia.com/"], ["USPTO", "https://www.uspto.gov/"], ["EUIPO", "https://www.euipo.europa.eu/"],
    ["WIPO", "https://www.wipo.int/"], ["ICANN Lookup", "https://lookup.icann.org/"], ["RIPEstat", "https://stat.ripe.net/"], ["ARIN", "https://www.arin.net/"],
  ]),
  ...makeSources("Código / Segurança", [
    ["GitHub", "https://github.com/"], ["GitLab", "https://gitlab.com/"], ["Bitbucket", "https://bitbucket.org/"], ["SourceForge", "https://sourceforge.net/"],
    ["NVD", "https://nvd.nist.gov/"], ["CVE.org", "https://www.cve.org/"], ["MITRE ATT&CK", "https://attack.mitre.org/"], ["Exploit-DB", "https://www.exploit-db.com/"],
    ["Vulners", "https://vulners.com/"], ["OSV", "https://osv.dev/"], ["Snyk Advisories", "https://security.snyk.io/"], ["CISA KEV", "https://www.cisa.gov/known-exploited-vulnerabilities-catalog"],
  ]),
  ...makeSources("Enciclopédia", [
    ["Britannica", "https://www.britannica.com/"], ["Encyclopaedia.com", "https://www.encyclopedia.com/"], ["Ballotpedia", "https://ballotpedia.org/"], ["Fandom", "https://www.fandom.com/"],
    ["Wiktionary", "https://www.wiktionary.org/"], ["DBpedia", "https://www.dbpedia.org/"], ["Wikinews", "https://www.wikinews.org/"], ["Wikisource", "https://www.wikisource.org/"],
  ]),
  ...makeSources("Arquivo", [
    ["Archive.today", "https://archive.today/"], ["Library of Congress", "https://www.loc.gov/"], ["National Archives", "https://www.archives.gov/"], ["HathiTrust", "https://www.hathitrust.org/"],
    ["Open Library", "https://openlibrary.org/"], ["Project Gutenberg", "https://www.gutenberg.org/"], ["GDELT", "https://www.gdeltproject.org/"], ["Common Crawl", "https://commoncrawl.org/"],
  ]),
];

export const SOURCE_REGISTRY_COUNT = SOURCE_REGISTRY.length;
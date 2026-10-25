import { normalizeTerm } from "./keywords";

/**
 * Canonical term → surface variants a job post or resume might use.
 * Deliberately limited to unambiguous skill names; see `MIN_VARIANT_LENGTH`.
 */
export const SKILL_VARIANTS: Record<string, string[]> = {
  // Languages
  javascript: ["javascript", "js", "ecmascript"],
  typescript: ["typescript", "ts"],
  python: ["python", "python3"],
  java: ["java"],
  kotlin: ["kotlin"],
  swift: ["swift", "swiftui"],
  go: ["golang", "go"],
  rust: ["rust"],
  ruby: ["ruby", "ruby on rails", "rails"],
  php: ["php", "laravel"],
  csharp: ["c#", "csharp", "c sharp", ".net", "dotnet"],
  cplusplus: ["c++", "cpp"],
  sql: ["sql", "ansi sql"],
  bash: ["bash", "shell scripting", "shell script"],

  // Frontend
  react: ["react", "react.js", "reactjs", "react js"],
  nextjs: ["next.js", "nextjs", "next js"],
  vue: ["vue", "vue.js", "vuejs", "nuxt"],
  angular: ["angular", "angularjs"],
  svelte: ["svelte", "sveltekit"],
  redux: ["redux", "redux toolkit"],
  tailwind: ["tailwind", "tailwindcss", "tailwind css"],
  html: ["html", "html5"],
  cssmodules: ["css", "css3", "scss", "sass", "less"],
  webpack: ["webpack", "vite", "rollup", "esbuild"],
  accessibility: ["accessibility", "a11y", "wcag", "aria"],

  // Backend / platform
  node: ["node", "node.js", "nodejs", "node js"],
  express: ["express", "express.js", "expressjs"],
  django: ["django", "django rest framework", "drf"],
  flask: ["flask", "fastapi"],
  spring: ["spring", "spring boot"],
  graphql: ["graphql", "apollo"],
  grpc: ["grpc", "protobuf", "protocol buffers"],
  rest: ["rest", "restful", "rest api", "rest apis"],
  microservices: ["microservices", "microservice", "service oriented architecture"],
  websockets: ["websocket", "websockets", "socket.io"],

  // Data
  postgres: ["postgres", "postgresql", "psql"],
  mysql: ["mysql", "mariadb"],
  mongodb: ["mongodb", "mongo"],
  redis: ["redis", "memcached"],
  elasticsearch: ["elasticsearch", "opensearch", "elk"],
  kafka: ["kafka", "apache kafka", "confluent"],
  spark: ["spark", "apache spark", "pyspark"],
  airflow: ["airflow", "apache airflow", "dbt"],
  hadoop: ["hadoop", "hdfs", "mapreduce"],
  snowflake: ["snowflake", "bigquery", "redshift"],
  etl: ["etl", "elt", "data pipeline", "data pipelines"],
  pandas: ["pandas", "numpy", "polars"],

  // Cloud / ops
  aws: ["aws", "amazon web services"],
  azure: ["azure", "microsoft azure"],
  gcp: ["gcp", "google cloud", "google cloud platform"],
  docker: ["docker", "containers", "containerization", "containerisation"],
  kubernetes: ["kubernetes", "k8s", "helm", "eks", "gke"],
  terraform: ["terraform", "opentofu", "infrastructure as code", "iac"],
  ansible: ["ansible", "puppet", "chef"],
  jenkins: ["jenkins", "github actions", "gitlab ci", "circleci"],
  cicd: ["ci/cd", "cicd", "continuous integration", "continuous delivery", "continuous deployment"],
  linux: ["linux", "unix", "ubuntu", "debian"],
  nginx: ["nginx", "apache http server", "load balancer", "load balancing"],
  observability: ["observability", "monitoring", "prometheus", "grafana", "datadog", "opentelemetry"],

  // ML / data science
  machinelearning: ["machine learning", "ml", "supervised learning", "unsupervised learning"],
  deeplearning: ["deep learning", "neural network", "neural networks", "cnn", "rnn"],
  nlp: ["nlp", "natural language processing", "llm", "llms", "large language model"],
  tensorflow: ["tensorflow", "tf"],
  pytorch: ["pytorch", "torch"],
  scikitlearn: ["scikit-learn", "sklearn", "scikit learn"],
  statistics: ["statistics", "statistical analysis", "statistical modeling", "statistical modelling"],
  abtesting: ["a/b testing", "ab testing", "split testing", "experimentation"],

  // Design
  figma: ["figma", "sketch", "adobe xd"],
  prototyping: ["prototyping", "prototype", "wireframing", "wireframes"],
  designsystems: ["design system", "design systems", "component library"],
  userresearch: ["user research", "usability testing", "user interviews", "ux research"],
  ux: ["ux", "user experience"],
  ui: ["ui", "user interface"],
  photoshop: ["photoshop", "illustrator", "indesign", "adobe creative suite"],
  motion: ["motion design", "after effects", "animation", "animations"],

  // Product / project
  agile: ["agile", "scrum", "kanban", "sprint planning"],
  jira: ["jira", "confluence", "asana", "trello", "linear"],
  roadmap: ["roadmap", "roadmapping", "product roadmap"],
  stakeholder: ["stakeholder", "stakeholders", "stakeholder management"],
  analytics: ["analytics", "google analytics", "amplitude", "mixpanel", "product analytics"],
  sqlbi: ["power bi", "tableau", "looker", "superset"],
  productmanagement: ["product management", "product manager", "product owner"],
  projectmanagement: ["project management", "program management", "pmp"],

  // Business / soft skills
  okr: ["okr", "okrs", "objectives and key results"],
  kpi: ["kpi", "kpis", "metrics"],
  communication: ["communication", "communicating", "written communication"],
  leadership: ["leadership", "leading", "team lead", "people management"],
  mentoring: ["mentoring", "mentorship", "coaching"],
  negotiation: ["negotiation", "negotiating"],
  documentation: ["documentation", "technical writing", "runbook", "runbooks"],
  troubleshooting: ["troubleshooting", "debugging", "root cause analysis"],
  testing: ["testing", "unit testing", "integration testing", "test automation"],
  security: ["security", "application security", "owasp", "penetration testing"],
};

/** Variants shorter than this are too ambiguous to expand (`ts`, `js`, `ml`, `ui`). */
export const MIN_VARIANT_LENGTH = 3;

const VARIANT_TO_CANONICAL = new Map<string, string>();
for (const [canonical, variants] of Object.entries(SKILL_VARIANTS)) {
  for (const variant of variants) {
    const key = normalizeTerm(variant);
    if (key.length >= MIN_VARIANT_LENGTH) VARIANT_TO_CANONICAL.set(key, canonical);
  }
  VARIANT_TO_CANONICAL.set(canonical, canonical);
}

/** Whether a term is known to the lexicon in any form. */
export function hasVariant(term: string): boolean {
  return VARIANT_TO_CANONICAL.has(normalizeTerm(term));
}

/** Map a term to its canonical skill id, or return it normalized unchanged. */
export function canonicalize(term: string): string {
  const key = normalizeTerm(term);
  if (!key) return "";
  return VARIANT_TO_CANONICAL.get(key) ?? key;
}

/** Canonical form of a multi-word phrase, falling back to per-token mapping. */
export function canonicalizePhrase(term: string): string {
  const key = normalizeTerm(term);
  const whole = VARIANT_TO_CANONICAL.get(key);
  if (whole) return whole;
  return key
    .split(" ")
    .filter(Boolean)
    .map((token) => VARIANT_TO_CANONICAL.get(token) ?? token)
    .join(" ");
}

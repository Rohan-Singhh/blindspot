export type Severity = "critical" | "high" | "medium" | "low";

export interface Finding {
  ruleId: string;
  severity: Severity;
  message: string;
  files?: string[];
  recommendation?: string;
  evidence?: string[];
}

export interface RepositoryStack {
  // Node / JS ecosystem
  node?: boolean;
  typescript?: boolean;
  javascript?: boolean;
  docker?: boolean;
  githubActions?: boolean;
  prisma?: boolean;
  nextjs?: boolean;
  express?: boolean;
  packageManager?: "npm" | "pnpm" | "yarn";
  // New ecosystems
  kubernetes?: boolean;
  terraform?: boolean;
  python?: boolean;
  golang?: boolean;
  java?: boolean;
  rust?: boolean;
  // New CI platforms
  gitlabCi?: boolean;
  azurePipelines?: boolean;
  circleCi?: boolean;
}

export interface RepositoryContext {
  rootDir: string;
  /** Paths relative to rootDir, using POSIX separators. */
  files: string[];
  stack: RepositoryStack;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  category: string;
  defaultSeverity: Severity;
  check(context: RepositoryContext): Promise<Finding[]> | Finding[];
}

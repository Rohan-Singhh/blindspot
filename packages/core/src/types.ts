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
  node?: boolean; typescript?: boolean; javascript?: boolean; docker?: boolean;
  githubActions?: boolean; prisma?: boolean; nextjs?: boolean; express?: boolean;
  packageManager?: "npm" | "pnpm" | "yarn";
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

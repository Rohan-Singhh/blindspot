export type Severity = "critical" | "high" | "medium" | "low";

export interface Finding {
  ruleId: string;
  severity: Severity;
  message: string;
  files?: string[];
  recommendation?: string;
}

export interface RepositoryContext {
  rootDir: string;
  /** Paths relative to rootDir, using POSIX separators. */
  files: string[];
}

export interface Rule {
  id: string;
  severity: Severity;
  description: string;
  check(context: RepositoryContext): Promise<Finding[]> | Finding[];
}

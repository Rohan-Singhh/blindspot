import type { Finding, Rule } from "@blindspot/core";
import { envTemplates, readRepositoryFile } from "../utils.js";

// Config-like files that shouldn't contain plain http:// production URLs
const PROD_CONFIG_PATTERNS = [
  /^config(?:\/.*)?\.(?:json|ya?ml|toml)$/,
  /^\.env(?:\..+)?\.(?:example|sample|template)$/,
  /^app\.(?:json|ya?ml|toml|config)$/,
];

function isProdConfigFile(file: string): boolean {
  const basename = file.split("/").at(-1) ?? file;
  // Skip obvious dev/test files
  if (/(?:dev|test|local|development)/.test(basename)) return false;
  return PROD_CONFIG_PATTERNS.some((p) => p.test(file) || p.test(basename));
}

export const httpBaseUrlRule: Rule = {
  id: "security/http-base-url",
  title: "Plain HTTP URL in production config",
  category: "security",
  defaultSeverity: "high",
  description: "Detects http:// (non-TLS) URLs hardcoded in production env templates or config files.",
  async check(context) {
    const candidates = [
      ...envTemplates(context),
      ...context.files.filter(isProdConfigFile),
    ];
    const uniqueCandidates = [...new Set(candidates)];

    const evidence: string[] = [];
    const affectedFiles: string[] = [];

    for (const file of uniqueCandidates) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match http:// but not http://localhost or http://127.
        if (/\bhttp:\/\/(?!localhost\b)(?!127\.)(?!0\.0\.0\.0\b)/.test(line)) {
          evidence.push(`${file}:${i + 1}: ${line.trim()}`);
          if (!affectedFiles.includes(file)) affectedFiles.push(file);
        }
      }
    }

    if (evidence.length === 0) return [];
    return [{
      ruleId: "security/http-base-url",
      severity: "high",
      message: "Plain http:// URL(s) found in production configuration. Traffic will be unencrypted.",
      files: affectedFiles,
      evidence,
      recommendation: "Replace http:// with https:// for all non-localhost URLs in production configuration.",
    }];
  },
};

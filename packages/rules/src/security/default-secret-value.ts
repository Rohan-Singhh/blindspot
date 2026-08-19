import type { Finding, Rule } from "@blindspot/core";
import { envTemplates, readRepositoryFile } from "../utils.js";

// Variable name patterns that suggest a secret
const SECRET_VAR_PATTERN = /(?:SECRET|PASSWORD|PASSWD|TOKEN|API_KEY|APIKEY|PRIVATE_KEY|AUTH|CREDENTIALS?|SIGNING)/i;

// Placeholder values that look like real secrets or unsafe defaults
const WEAK_VALUES = new Set([
  "secret", "password", "changeme", "changeit", "change_me", "change-me",
  "admin", "root", "12345", "123456", "qwerty", "letmein", "welcome",
  "test", "example", "default", "placeholder", "replace_me", "replace-me",
  "todo", "fixme", "your_secret_here", "your-secret-here",
  "abc123", "mysecret", "mypassword", "mytoken", "supersecret",
]);

export const defaultSecretValueRule: Rule = {
  id: "security/default-secret-value",
  title: "Env template contains a weak default secret value",
  category: "security",
  defaultSeverity: "high",
  description: "Detects environment templates where a secret-like variable is set to a recognisable weak or placeholder value.",
  async check(context) {
    const evidence: string[] = [];
    const affectedFiles: string[] = [];

    for (const file of envTemplates(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("#")) continue;
        const eqIdx = line.indexOf("=");
        if (eqIdx === -1) continue;

        const varName = line.slice(0, eqIdx).trim();
        const rawValue = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");

        if (SECRET_VAR_PATTERN.test(varName) && rawValue && WEAK_VALUES.has(rawValue.toLowerCase())) {
          evidence.push(`${file}:${i + 1}: ${varName}=<weak default>`);
          if (!affectedFiles.includes(file)) affectedFiles.push(file);
        }
      }
    }

    if (evidence.length === 0) return [];
    return [{
      ruleId: "security/default-secret-value",
      severity: "high",
      message: "Env template contains secret variable(s) with weak or placeholder default values.",
      files: affectedFiles,
      evidence,
      recommendation: "Replace weak default values with empty strings or clearly marked placeholders (e.g. CHANGE_ME_<description>). Document the required format in a comment.",
    }];
  },
};

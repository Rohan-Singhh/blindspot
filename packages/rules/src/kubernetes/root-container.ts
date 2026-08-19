import type { Finding, Rule } from "@blindspot/core";
import { kubernetesManifests, readRepositoryFile } from "../utils.js";

const WORKLOAD_KINDS = new Set(["Deployment", "StatefulSet", "DaemonSet", "Job", "CronJob"]);

export const rootContainerRule: Rule = {
  id: "kubernetes/root-container",
  title: "Container may run as root",
  category: "kubernetes",
  defaultSeverity: "high",
  description: "Detects containers where runAsNonRoot is not set to true or runAsUser is explicitly 0.",
  async check(context) {
    if (!context.stack.kubernetes) return [];
    const findings: Finding[] = [];

    for (const file of kubernetesManifests(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;

      const docs = content.split(/^---\s*$/m);
      for (const doc of docs) {
        const kindMatch = /^\s*kind\s*:\s*(\w+)/m.exec(doc);
        if (!kindMatch || !WORKLOAD_KINDS.has(kindMatch[1])) continue;

        // Check for explicit runAsUser: 0
        if (/^\s*runAsUser\s*:\s*0\b/m.test(doc)) {
          findings.push({
            ruleId: "kubernetes/root-container",
            severity: "high",
            message: "Container is explicitly configured to run as root (runAsUser: 0).",
            files: [file],
            evidence: [`${file}: runAsUser: 0`],
            recommendation: "Set runAsNonRoot: true and choose an unprivileged UID (e.g. runAsUser: 1000) in the container securityContext.",
          });
          break;
        }

        // Check that runAsNonRoot: true is present in the spec securityContext
        const hasNonRoot = /\brunAsNonRoot\s*:\s*true\b/m.test(doc);
        if (!hasNonRoot) {
          findings.push({
            ruleId: "kubernetes/root-container",
            severity: "high",
            message: "Container securityContext does not set runAsNonRoot: true — the container may run as root.",
            files: [file],
            evidence: [`${file}: runAsNonRoot not set to true`],
            recommendation: "Add securityContext.runAsNonRoot: true (and runAsUser: <non-zero>) to each container spec.",
          });
          break;
        }
      }
    }
    return findings;
  },
};

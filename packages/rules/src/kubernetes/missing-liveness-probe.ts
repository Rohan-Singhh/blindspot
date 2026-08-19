import type { Finding, Rule } from "@blindspot/core";
import { kubernetesManifests, readRepositoryFile } from "../utils.js";

const WORKLOAD_KINDS = new Set(["Deployment", "StatefulSet", "DaemonSet"]);

export const missingLivenessProbeRule: Rule = {
  id: "kubernetes/missing-liveness-probe",
  title: "Container missing liveness probe",
  category: "kubernetes",
  defaultSeverity: "medium",
  description: "Detects long-running Kubernetes workloads whose containers have no livenessProbe defined.",
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

        const containersSectionMatch = /\bcontainers\s*:\s*\n([\s\S]*?)(?=\n\s{0,4}\w|\n---|\s*$)/m.exec(doc);
        if (!containersSectionMatch) continue;

        const section = containersSectionMatch[1];
        const entries = section.split(/(?=\n\s+-\s+(?:name|image)\s*:)/);
        let missingProbe = false;
        for (const entry of entries) {
          if (!entry.trim()) continue;
          if (!/\blivenessProbe\s*:/m.test(entry)) {
            missingProbe = true;
            break;
          }
        }

        if (missingProbe) {
          findings.push({
            ruleId: "kubernetes/missing-liveness-probe",
            severity: "medium",
            message: `${kindMatch[1]} in ${file} has containers without a livenessProbe.`,
            files: [file],
            evidence: [`${file}: kind: ${kindMatch[1]} — no livenessProbe`],
            recommendation: "Add a livenessProbe to every container so Kubernetes can restart stuck processes automatically.",
          });
          break;
        }
      }
    }
    return findings;
  },
};

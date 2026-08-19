import type { Finding, Rule } from "@blindspot/core";
import { kubernetesManifests, readRepositoryFile } from "../utils.js";

const WORKLOAD_KINDS = new Set(["Deployment", "StatefulSet", "DaemonSet", "Job", "CronJob", "Pod"]);

export const hostNetworkRule: Rule = {
  id: "kubernetes/host-network",
  title: "Workload uses host network",
  category: "kubernetes",
  defaultSeverity: "high",
  description: "Detects Kubernetes workloads with hostNetwork: true, which bypasses network isolation.",
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

        if (/^\s*hostNetwork\s*:\s*true\b/m.test(doc)) {
          findings.push({
            ruleId: "kubernetes/host-network",
            severity: "high",
            message: `${kindMatch[1]} in ${file} uses hostNetwork: true, bypassing pod network isolation.`,
            files: [file],
            evidence: [`${file}: hostNetwork: true`],
            recommendation: "Remove hostNetwork: true unless this workload explicitly requires node-level network access (e.g. a CNI plugin or monitoring agent).",
          });
          break;
        }
      }
    }
    return findings;
  },
};

import type { Finding, Rule } from "@blindspot/core";
import { kubernetesManifests, readRepositoryFile } from "../utils.js";

const WORKLOAD_KINDS = new Set(["Deployment", "StatefulSet", "DaemonSet", "Job", "CronJob"]);

/**
 * Parse container blocks from a Kubernetes workload manifest (line-based, no YAML dep).
 * Returns the list of container names missing cpu or memory limits.
 */
function containersWithoutLimits(content: string): boolean {
  // Check if this is a workload manifest
  const kindMatch = /^\s*kind\s*:\s*(\w+)/m.exec(content);
  if (!kindMatch || !WORKLOAD_KINDS.has(kindMatch[1])) return false;

  // Find containers: sections — if any container block lacks a limits: sub-section we flag it
  // Strategy: split on "- name:" inside a containers: block and look for limits:
  const containersSectionMatch = /\bcontainers\s*:\s*\n([\s\S]*?)(?=\n[ \t]{0,4}\w|\n---|$(?![\s\S]))/m.exec(content);
  if (!containersSectionMatch) return false;
  const section = containersSectionMatch[1];

  // Split on container entries
  const entries = section.split(/(?=\n[ \t]+-\s+(?:name|image)\s*:)/);
  for (const entry of entries) {
    if (!entry.trim()) continue;
    if (!/\blimits\s*:/m.test(entry)) return true; // found a container without limits
  }
  return false;
}

export const missingResourceLimitsRule: Rule = {
  id: "kubernetes/missing-resource-limits",
  title: "Container missing resource limits",
  category: "kubernetes",
  defaultSeverity: "high",
  description: "Detects Kubernetes workload containers that do not declare CPU or memory limits.",
  async check(context) {
    if (!context.stack.kubernetes) return [];
    const findings: Finding[] = [];
    for (const file of kubernetesManifests(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      // Handle multi-document YAML (---)
      const docs = content.split(/^---\s*$/m);
      for (const doc of docs) {
        if (containersWithoutLimits(doc)) {
          findings.push({
            ruleId: "kubernetes/missing-resource-limits",
            severity: "high",
            message: "One or more containers in this manifest do not declare resource limits.",
            files: [file],
            recommendation: "Add resources.limits.cpu and resources.limits.memory to every container spec to prevent noisy-neighbour resource exhaustion.",
            evidence: [`${file}: missing resources.limits`],
          });
          break; // one finding per file
        }
      }
    }
    return findings;
  },
};

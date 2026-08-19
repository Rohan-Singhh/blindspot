import type { Finding, Rule } from "@blindspot/core";
import { kubernetesManifests, readRepositoryFile } from "../utils.js";

const WORKLOAD_KINDS = new Set(["Deployment", "StatefulSet", "DaemonSet", "Job", "CronJob"]);

export const latestImageTagRule: Rule = {
  id: "kubernetes/latest-image-tag",
  title: "Container image uses latest tag",
  category: "kubernetes",
  defaultSeverity: "medium",
  description: "Detects container images using the :latest tag or no tag, which makes deployments non-deterministic.",
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

        const badImages: string[] = [];
        for (const match of doc.matchAll(/^\s+image\s*:\s*["']?([^\s"'#]+)/gm)) {
          const image = match[1].trim();
          // Flag if: ends with :latest, has no colon (no tag), or has colon but only digest-less latest
          const colonIdx = image.lastIndexOf(":");
          if (colonIdx === -1 || image.slice(colonIdx + 1) === "latest") {
            badImages.push(image);
          }
        }

        if (badImages.length > 0) {
          findings.push({
            ruleId: "kubernetes/latest-image-tag",
            severity: "medium",
            message: "Container image(s) use :latest or no tag — deployments are non-deterministic.",
            files: [file],
            evidence: badImages.map((img) => `${file}: image: ${img}`),
            recommendation: "Pin every container image to an explicit version tag or digest (e.g. node:20.12.0 or node@sha256:...).",
          });
          break;
        }
      }
    }
    return findings;
  },
};

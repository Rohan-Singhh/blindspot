import type { Finding, Rule, Severity } from "@blindspot/core";

// SARIF 2.1.0 minimal emitter — no external dependencies.
// Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html

const SCHEMA = "https://json.schemastore.org/sarif-2.1.0.json";
const SARIF_VERSION = "2.1.0";

type SarifLevel = "error" | "warning" | "note" | "none";

function severityToLevel(severity: Severity): SarifLevel {
  switch (severity) {
    case "critical": return "error";
    case "high": return "error";
    case "medium": return "warning";
    case "low": return "note";
  }
}

interface SarifArtifactLocation { uri: string; uriBaseId?: string; }
interface SarifRegion { startLine: number; }
interface SarifPhysicalLocation { artifactLocation: SarifArtifactLocation; region?: SarifRegion; }
interface SarifLocation { physicalLocation?: SarifPhysicalLocation; message?: { text: string }; }
interface SarifResult {
  ruleId: string;
  level: SarifLevel;
  message: { text: string };
  locations: SarifLocation[];
  partialFingerprints?: Record<string, string>;
}
interface SarifReportingDescriptor {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  defaultConfiguration: { level: SarifLevel };
  properties?: { tags?: string[] };
}
interface SarifToolDriver {
  name: string;
  version: string;
  informationUri: string;
  rules: SarifReportingDescriptor[];
}
interface SarifRun {
  tool: { driver: SarifToolDriver };
  results: SarifResult[];
  originalUriBaseIds?: Record<string, SarifArtifactLocation>;
}
interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

export function buildSarif(
  findings: readonly Finding[],
  rules: readonly Rule[],
  toolVersion: string,
): SarifLog {
  // Build a map of rule metadata for the driver
  const ruleMap = new Map(rules.map((r) => [r.id, r]));

  // Collect only the rules that actually produced findings (plus all rules for the driver)
  const driverRules: SarifReportingDescriptor[] = rules.map((rule) => ({
    id: rule.id,
    name: rule.id.replace(/[^a-zA-Z0-9]/g, "_"),
    shortDescription: { text: rule.title },
    fullDescription: { text: rule.description },
    defaultConfiguration: { level: severityToLevel(rule.defaultSeverity) },
    properties: { tags: [rule.category] },
  }));

  const results: SarifResult[] = findings.map((finding) => {
    const rule = ruleMap.get(finding.ruleId);
    const level = severityToLevel(finding.severity);

    // Build locations from finding.files; if no files, use a sentinel location
    const locations: SarifLocation[] = finding.files && finding.files.length > 0
      ? finding.files.map((file) => ({
          physicalLocation: {
            artifactLocation: {
              uri: file.replace(/\\/g, "/"),
              uriBaseId: "%SRCROOT%",
            },
          },
        }))
      : [{ message: { text: "Repository-level finding — see message for details." } }];

    // Stable fingerprint: ruleId + sorted files
    const filesKey = [...(finding.files ?? [])].sort().join("|");
    const fingerprint = `${finding.ruleId}:${filesKey}`;

    return {
      ruleId: finding.ruleId,
      level,
      message: {
        text: [
          finding.message,
          finding.evidence?.length ? `\nEvidence:\n${finding.evidence.map((e) => `  - ${e}`).join("\n")}` : "",
          finding.recommendation ? `\nRecommendation: ${finding.recommendation}` : "",
        ].filter(Boolean).join(""),
      },
      locations,
      partialFingerprints: { primaryLocationLineHash: fingerprint },
    };
  });

  return {
    $schema: SCHEMA,
    version: SARIF_VERSION,
    runs: [{
      tool: {
        driver: {
          name: "Blindspot",
          version: toolVersion,
          informationUri: "https://github.com/Rohan-Singhh/blindspot",
          rules: driverRules,
        },
      },
      results,
      originalUriBaseIds: {
        "%SRCROOT%": { uri: "./" },
      },
    }],
  };
}

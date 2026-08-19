import type { Finding, Rule } from "@blindspot/core";
import { dockerfiles, readRepositoryFile, workflows } from "../utils.js";

function javaVersionNum(value: string): string | undefined {
  // Handle "17", "17.0.2", "1.17", "java-17-openjdk", "temurin-17"
  const m = /(?:^|[-_])(?:1\.)?(\d{1,2})(?:\b|\.|\s|$)/.exec(value);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  // Java 8 is sometimes expressed as 1.8
  return n >= 8 && n <= 25 ? String(n) : undefined;
}

export const javaVersionMismatchRule: Rule = {
  id: "java/version-mismatch",
  title: "Java version mismatch across tooling",
  category: "java",
  defaultSeverity: "high",
  description: "Detects inconsistent Java versions across pom.xml/build.gradle, Dockerfiles, and CI workflows.",
  async check(context) {
    if (!context.stack.java) return [];
    const evidence: string[] = [];

    // pom.xml: <maven.compiler.source>17</maven.compiler.source> or <java.version>17</java.version>
    if (context.files.includes("pom.xml")) {
      const content = await readRepositoryFile(context, "pom.xml");
      if (content) {
        const patterns: [RegExp, string][] = [
          [/<maven\.compiler\.source>\s*(\S+?)\s*</, "pom.xml: maven.compiler.source"],
          [/<java\.version>\s*(\S+?)\s*</, "pom.xml: java.version"],
          [/<release>\s*(\S+?)\s*</, "pom.xml: release"],
        ];
        for (const [re, label] of patterns) {
          const m = re.exec(content);
          if (m && javaVersionNum(m[1])) { evidence.push(`${label}: ${m[1]}`); break; }
        }
      }
    }

    // build.gradle: sourceCompatibility = '17' or JavaVersion.VERSION_17
    for (const gradleFile of ["build.gradle", "build.gradle.kts"].filter((f) => context.files.includes(f))) {
      const content = await readRepositoryFile(context, gradleFile);
      if (!content) continue;
      const m = /(?:sourceCompatibility|targetCompatibility|jvmTarget)\s*[=:]\s*["']?([^\s"',)]+)/.exec(content);
      if (m && javaVersionNum(m[1])) { evidence.push(`${gradleFile}: sourceCompatibility: ${m[1]}`); break; }
    }

    // Dockerfiles FROM eclipse-temurin:17 / openjdk:17 / amazoncorretto:17
    for (const file of dockerfiles(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      for (const match of content.matchAll(/^\s*FROM\s+(?:eclipse-temurin|openjdk|amazoncorretto|azul\/zulu-openjdk(?:-\w+)?|sapmachine):([^\s@\-]+)/gim)) {
        const v = javaVersionNum(match[1]);
        if (v) evidence.push(`${file}: FROM *:${match[1]}`);
      }
    }

    // GitHub Actions java-version: '17'
    for (const file of workflows(context)) {
      const content = await readRepositoryFile(context, file);
      if (!content) continue;
      for (const match of content.matchAll(/java-version\s*:\s*["']?([^\s"'#]+)/gi)) {
        const v = javaVersionNum(match[1]);
        if (v) evidence.push(`${file}: java-version: ${match[1]}`);
      }
    }

    if (evidence.length < 2) return [];
    const versions = new Set(evidence.map((e) => javaVersionNum(e.slice(e.lastIndexOf(":") + 1).trim())).filter(Boolean));
    if (versions.size < 2) return [];

    return [{
      ruleId: "java/version-mismatch",
      severity: "high",
      message: "Java versions are inconsistent across tooling.",
      evidence,
      files: [...new Set(evidence.map((e) => e.split(":")[0]))],
      recommendation: "Align the Java version across pom.xml/build.gradle, Dockerfiles, and CI workflows.",
    }];
  },
};

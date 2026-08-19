import type { Finding, Rule } from "@blindspot/core";

export const javaWrapperMissingRule: Rule = {
  id: "java/wrapper-missing",
  title: "Build tool wrapper not committed",
  category: "java",
  defaultSeverity: "medium",
  description: "Detects Java projects using Maven or Gradle without a committed wrapper script (mvnw/gradlew), requiring a local tool install to build.",
  async check(context) {
    if (!context.stack.java) return [];

    const hasPom = context.files.includes("pom.xml");
    const hasGradle = context.files.some((f) => f === "build.gradle" || f === "build.gradle.kts");

    const hasMvnw = context.files.some((f) => f === "mvnw" || f === ".mvn/wrapper/maven-wrapper.jar");
    const hasGradlew = context.files.some((f) => f === "gradlew" || f === "gradle/wrapper/gradle-wrapper.jar");

    const missing: string[] = [];
    if (hasPom && !hasMvnw) missing.push("mvnw (Maven wrapper)");
    if (hasGradle && !hasGradlew) missing.push("gradlew (Gradle wrapper)");

    if (missing.length === 0) return [];

    const buildFiles = [hasPom && "pom.xml", hasGradle && "build.gradle"].filter(Boolean) as string[];
    return [{
      ruleId: "java/wrapper-missing",
      severity: "medium",
      message: `Build tool wrapper missing: ${missing.join(", ")}. Contributors and CI must have the exact tool version installed locally.`,
      files: buildFiles,
      evidence: missing.map((w) => `missing: ${w}`),
      recommendation: "Commit the Maven wrapper (mvnw + .mvn/) or Gradle wrapper (gradlew + gradle/wrapper/) so builds are self-contained and version-pinned.",
    }];
  },
};

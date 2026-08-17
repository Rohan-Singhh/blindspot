import type { Rule } from "@blindspot/core";
import { rootUserRule } from "./docker/root-user.js";
import { missingExampleVariableRule } from "./env/missing-example-variable.js";
import { trackedEnvRule } from "./git/tracked-env.js";
import { nodeVersionMismatchRule } from "./runtime/node-version-mismatch.js";
import { packageManagerMismatchRule } from "./runtime/package-manager-mismatch.js";
import { testsNotRunRule } from "./ci/tests-not-run.js";
import { nonDeterministicInstallRule } from "./ci/non-deterministic-install.js";

export { rootUserRule, missingExampleVariableRule, trackedEnvRule, nodeVersionMismatchRule, packageManagerMismatchRule, testsNotRunRule, nonDeterministicInstallRule };
export const builtInRules: readonly Rule[] = [trackedEnvRule, rootUserRule, missingExampleVariableRule, nodeVersionMismatchRule, packageManagerMismatchRule, testsNotRunRule, nonDeterministicInstallRule];

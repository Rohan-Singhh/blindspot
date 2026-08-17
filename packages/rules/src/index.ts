import type { Rule } from "@blindspot/core";
import { rootUserRule } from "./docker/root-user.js";
import { missingExampleVariableRule } from "./env/missing-example-variable.js";
import { trackedEnvRule } from "./git/tracked-env.js";

export { rootUserRule, missingExampleVariableRule, trackedEnvRule };
export const builtInRules: readonly Rule[] = [trackedEnvRule, rootUserRule, missingExampleVariableRule];

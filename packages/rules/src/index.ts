import type { Rule } from "@blindspot/core";
import { rootUserRule } from "./docker/root-user.js";
import { missingExampleVariableRule } from "./env/missing-example-variable.js";
import { trackedEnvRule } from "./git/tracked-env.js";
import { nodeVersionMismatchRule } from "./runtime/node-version-mismatch.js";
import { packageManagerMismatchRule } from "./runtime/package-manager-mismatch.js";
import { testsNotRunRule } from "./ci/tests-not-run.js";
import { nonDeterministicInstallRule } from "./ci/non-deterministic-install.js";
import { cachePackageManagerMismatchRule, scriptCommandMissingRule } from "./ci/repository-contracts.js";
import { workingDirectoryMissingRule } from "./ci/working-directory-missing.js";
import { cacheLockfilePathMissingRule } from "./ci/cache-lockfile-path-missing.js";
import { envFileCopiedRule, npmInstallWithLockfileRule } from "./docker/repository-contracts.js";
import { lockfileNotCopiedRule } from "./docker/lockfile-not-copied.js";
import { packageManifestNotCopiedRule } from "./docker/package-manifest-not-copied.js";
import { duplicateTemplateVariableRule } from "./env/duplicate-template-variable.js";
import { dependencyDirectoryCommittedRule, ignoredLockfileRule, trackedPrivateKeyRule } from "./git/repository-contracts.js";
import { monorepoEngineDriftRule, monorepoMultipleLockfilesRule, monorepoPackageManagerDriftRule } from "./monorepo/repository-contracts.js";
import { npmFilesExcludesRuntimeRule, npmFilesIncludesSecretRule, publishPrivatePackageRule } from "./release/repository-contracts.js";
import { missingLockfileRule, multipleLockfilesRule, packageManagerFieldDriftRule } from "./runtime/repository-contracts.js";
import { buildOutputMismatchRule } from "./runtime/build-output-mismatch.js";
import { templateWorkspaceDriftRule } from "./env/template-workspace-drift.js";
import { duplicatePackageNameRule } from "./monorepo/duplicate-package-name.js";
import { workspaceScriptMissingRule } from "./monorepo/workspace-script-missing.js";
import { internalDependencyVersionDriftRule } from "./monorepo/internal-dependency-version-drift.js";
import { trackedServiceAccountRule } from "./git/tracked-service-account.js";
import { trackedAuthConfigRule } from "./git/tracked-auth-config.js";
import { publishWorkspaceMismatchRule } from "./release/publish-workspace-mismatch.js";
import { missingResourceLimitsRule } from "./kubernetes/missing-resource-limits.js";
import { latestImageTagRule } from "./kubernetes/latest-image-tag.js";
import { missingLivenessProbeRule } from "./kubernetes/missing-liveness-probe.js";
import { rootContainerRule } from "./kubernetes/root-container.js";
import { hostNetworkRule } from "./kubernetes/host-network.js";
import { missingRequiredVersionRule } from "./terraform/missing-required-version.js";
import { providerVersionUnpinnedRule } from "./terraform/provider-version-unpinned.js";
import { stateFileCommittedRule } from "./terraform/state-file-committed.js";
import { terraformLockfileMissingRule } from "./terraform/lockfile-missing.js";
import { terraformLockfileGitignore } from "./terraform/lockfile-gitignored.js";
import { gitlabTestsNotRunRule, gitlabNonDeterministicInstallRule, gitlabNodeVersionMismatchRule, gitlabCacheKeyMissingRule } from "./ci/gitlab.js";
import { azureTestsNotRunRule, azureNonDeterministicInstallRule, azureNodeVersionMismatchRule } from "./ci/azure.js";
import { circleciTestsNotRunRule, circleciNonDeterministicInstallRule, circleciNodeVersionMismatchRule } from "./ci/circleci.js";
import { pythonVersionMismatchRule } from "./python/version-mismatch.js";
import { pythonMissingLockfileRule } from "./python/missing-lockfile.js";
import { pythonLockfileNotInstalledRule } from "./python/lockfile-not-installed.js";
import { devRequirementsInProductionRule } from "./python/dev-requirements-in-production.js";
import { goVersionMismatchRule } from "./golang/version-mismatch.js";
import { goSumFileMissingRule } from "./golang/sum-file-missing.js";
import { goModulePathMismatchRule } from "./golang/module-path-mismatch.js";
import { goMissingBuildTargetRule } from "./golang/missing-build-target.js";
import { javaVersionMismatchRule } from "./java/version-mismatch.js";
import { javaWrapperMissingRule } from "./java/wrapper-missing.js";
import { javaSnapshotInProductionRule } from "./java/snapshot-in-production.js";
import { rustLockfileGitignored } from "./rust/lockfile-gitignored.js";
import { rustEditionMissingRule } from "./rust/edition-missing.js";
import { rustVersionMismatchRule } from "./rust/version-mismatch.js";
import { httpBaseUrlRule } from "./security/http-base-url.js";
import { debugModeInProductionRule } from "./security/debug-mode-in-production.js";
import { defaultSecretValueRule } from "./security/default-secret-value.js";
import { privilegedCiPermissionsRule } from "./security/privileged-ci-permissions.js";
import { thirdPartyActionUnpinnedRule } from "./security/third-party-action-unpinned.js";

export { rootUserRule, missingExampleVariableRule, trackedEnvRule, nodeVersionMismatchRule, packageManagerMismatchRule, testsNotRunRule, nonDeterministicInstallRule, cachePackageManagerMismatchRule, scriptCommandMissingRule, workingDirectoryMissingRule, cacheLockfilePathMissingRule, envFileCopiedRule, npmInstallWithLockfileRule, lockfileNotCopiedRule, packageManifestNotCopiedRule, duplicateTemplateVariableRule, dependencyDirectoryCommittedRule, ignoredLockfileRule, trackedPrivateKeyRule, monorepoEngineDriftRule, monorepoMultipleLockfilesRule, monorepoPackageManagerDriftRule, npmFilesExcludesRuntimeRule, npmFilesIncludesSecretRule, publishPrivatePackageRule, missingLockfileRule, multipleLockfilesRule, packageManagerFieldDriftRule, buildOutputMismatchRule, templateWorkspaceDriftRule, duplicatePackageNameRule, workspaceScriptMissingRule, internalDependencyVersionDriftRule, trackedServiceAccountRule, trackedAuthConfigRule, publishWorkspaceMismatchRule };
export const builtInRules: readonly Rule[] = [
  trackedEnvRule, dependencyDirectoryCommittedRule, ignoredLockfileRule, trackedPrivateKeyRule, trackedServiceAccountRule, trackedAuthConfigRule,
  rootUserRule, envFileCopiedRule, npmInstallWithLockfileRule, lockfileNotCopiedRule, packageManifestNotCopiedRule,
  missingExampleVariableRule, duplicateTemplateVariableRule, templateWorkspaceDriftRule,
  nodeVersionMismatchRule, packageManagerMismatchRule, missingLockfileRule, multipleLockfilesRule, packageManagerFieldDriftRule, buildOutputMismatchRule,
  testsNotRunRule, nonDeterministicInstallRule, cachePackageManagerMismatchRule, scriptCommandMissingRule, workingDirectoryMissingRule, cacheLockfilePathMissingRule,
  gitlabTestsNotRunRule, gitlabNonDeterministicInstallRule, gitlabNodeVersionMismatchRule, gitlabCacheKeyMissingRule,
  azureTestsNotRunRule, azureNonDeterministicInstallRule, azureNodeVersionMismatchRule,
  circleciTestsNotRunRule, circleciNonDeterministicInstallRule, circleciNodeVersionMismatchRule,
  monorepoEngineDriftRule, monorepoMultipleLockfilesRule, monorepoPackageManagerDriftRule, duplicatePackageNameRule, workspaceScriptMissingRule, internalDependencyVersionDriftRule,
  npmFilesExcludesRuntimeRule, npmFilesIncludesSecretRule, publishPrivatePackageRule, publishWorkspaceMismatchRule,
  missingResourceLimitsRule, latestImageTagRule, missingLivenessProbeRule, rootContainerRule, hostNetworkRule,
  missingRequiredVersionRule, providerVersionUnpinnedRule, stateFileCommittedRule, terraformLockfileMissingRule, terraformLockfileGitignore,
  pythonVersionMismatchRule, pythonMissingLockfileRule, pythonLockfileNotInstalledRule, devRequirementsInProductionRule,
  goVersionMismatchRule, goSumFileMissingRule, goModulePathMismatchRule, goMissingBuildTargetRule,
  javaVersionMismatchRule, javaWrapperMissingRule, javaSnapshotInProductionRule,
  rustLockfileGitignored, rustEditionMissingRule, rustVersionMismatchRule,
  httpBaseUrlRule, debugModeInProductionRule, defaultSecretValueRule, privilegedCiPermissionsRule, thirdPartyActionUnpinnedRule,
];

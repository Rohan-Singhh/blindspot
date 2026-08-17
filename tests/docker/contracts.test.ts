import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { envFileCopiedRule, lockfileNotCopiedRule, npmInstallWithLockfileRule } from "@blindspot/rules";
import { createFixture } from "../helpers.js";

const check = async (rule: typeof envFileCopiedRule, files: Record<string, string>) => rule.check(await createRepositoryContext(await createFixture(files)));

describe("Docker contract rules", () => {
  it("detects COPY-all exposing an env file", async () => expect(await check(envFileCopiedRule, { Dockerfile: "FROM node:22\nCOPY . .", ".env": "TOKEN=x" })).toHaveLength(1));
  it("accepts an env file excluded by .dockerignore", async () => expect(await check(envFileCopiedRule, { Dockerfile: "FROM node:22\nCOPY . .", ".env": "TOKEN=x", ".dockerignore": ".env*\n" })).toEqual([]));
  it("recognizes the common .env.* dockerignore pattern", async () => expect(await check(envFileCopiedRule, { Dockerfile: "FROM node:22\nCOPY . .", ".env.production": "TOKEN=x", ".dockerignore": ".env.*\n" })).toEqual([]));
  it("detects npm install with package-lock in Docker", async () => expect(await check(npmInstallWithLockfileRule, { Dockerfile: "FROM node:22\nRUN npm install", "package-lock.json": "{}" })).toHaveLength(1));
  it("accepts npm ci with package-lock in Docker", async () => expect(await check(npmInstallWithLockfileRule, { Dockerfile: "FROM node:22\nRUN npm ci", "package-lock.json": "{}" })).toEqual([]));
  it("detects npm ci before the lockfile is copied", async () => expect(await check(lockfileNotCopiedRule, { Dockerfile: "FROM node:22\nCOPY package.json ./\nRUN npm ci", "package.json": "{}", "package-lock.json": "{}" })).toHaveLength(1));
  it("accepts npm ci after an explicit lockfile copy", async () => expect(await check(lockfileNotCopiedRule, { Dockerfile: "FROM node:22\nCOPY package*.json ./\nRUN npm ci", "package.json": "{}", "package-lock.json": "{}" })).toEqual([]));
  it("accepts npm ci after COPY-all", async () => expect(await check(lockfileNotCopiedRule, { Dockerfile: "FROM node:22\nCOPY . .\nRUN npm ci", "package-lock.json": "{}" })).toEqual([]));
  it("accepts a BuildKit lockfile bind mount", async () => expect(await check(lockfileNotCopiedRule, { Dockerfile: "FROM node:22\nRUN --mount=type=bind,source=package-lock.json,target=package-lock.json npm ci", "package-lock.json": "{}" })).toEqual([]));
});

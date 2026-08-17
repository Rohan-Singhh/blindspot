import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { envFileCopiedRule, npmInstallWithLockfileRule } from "@blindspot/rules";
import { createFixture } from "../helpers.js";

const check = async (rule: typeof envFileCopiedRule, files: Record<string, string>) => rule.check(await createRepositoryContext(await createFixture(files)));

describe("Docker contract rules", () => {
  it("detects COPY-all exposing an env file", async () => expect(await check(envFileCopiedRule, { Dockerfile: "FROM node:22\nCOPY . .", ".env": "TOKEN=x" })).toHaveLength(1));
  it("accepts an env file excluded by .dockerignore", async () => expect(await check(envFileCopiedRule, { Dockerfile: "FROM node:22\nCOPY . .", ".env": "TOKEN=x", ".dockerignore": ".env*\n" })).toEqual([]));
  it("recognizes the common .env.* dockerignore pattern", async () => expect(await check(envFileCopiedRule, { Dockerfile: "FROM node:22\nCOPY . .", ".env.production": "TOKEN=x", ".dockerignore": ".env.*\n" })).toEqual([]));
  it("detects npm install with package-lock in Docker", async () => expect(await check(npmInstallWithLockfileRule, { Dockerfile: "FROM node:22\nRUN npm install", "package-lock.json": "{}" })).toHaveLength(1));
  it("accepts npm ci with package-lock in Docker", async () => expect(await check(npmInstallWithLockfileRule, { Dockerfile: "FROM node:22\nRUN npm ci", "package-lock.json": "{}" })).toEqual([]));
});

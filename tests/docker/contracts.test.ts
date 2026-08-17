import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "@blindspot/core";
import { envFileCopiedRule, missingNodeEnvRule, npmStartEntrypointRule, npmInstallWithLockfileRule } from "@blindspot/rules";
import { createFixture } from "../helpers.js";

const check = async (rule: any, files: Record<string, string>, stack: any = {}) => rule.check({ ...await createRepositoryContext(await createFixture(files)), stack });

describe("Docker contract rules", () => {
  it("detects COPY-all exposing an env file", async () => expect(await check(envFileCopiedRule, { Dockerfile: "FROM node:22\nCOPY . .", ".env": "TOKEN=x" })).toHaveLength(1));
  it("accepts an env file excluded by .dockerignore", async () => expect(await check(envFileCopiedRule, { Dockerfile: "FROM node:22\nCOPY . .", ".env": "TOKEN=x", ".dockerignore": ".env*\n" })).toEqual([]));
  it("recognizes the common .env.* dockerignore pattern", async () => expect(await check(envFileCopiedRule, { Dockerfile: "FROM node:22\nCOPY . .", ".env.production": "TOKEN=x", ".dockerignore": ".env.*\n" })).toEqual([]));
  it("detects npm install with package-lock in Docker", async () => expect(await check(npmInstallWithLockfileRule, { Dockerfile: "FROM node:22\nRUN npm install", "package-lock.json": "{}" })).toHaveLength(1));
  it("accepts npm ci with package-lock in Docker", async () => expect(await check(npmInstallWithLockfileRule, { Dockerfile: "FROM node:22\nRUN npm ci", "package-lock.json": "{}" })).toEqual([]));

  describe("missingNodeEnvRule", () => {
    it("detects missing NODE_ENV in Dockerfile for node apps", async () => {
      expect(await check(missingNodeEnvRule, { Dockerfile: "FROM node:22\nCMD [\"node\", \"server.js\"]" }, { node: true })).toHaveLength(1);
    });
    it("accepts Dockerfile with ENV NODE_ENV=production", async () => {
      expect(await check(missingNodeEnvRule, { Dockerfile: "FROM node:22\nENV NODE_ENV=production\nCMD [\"node\", \"server.js\"]" }, { node: true })).toEqual([]);
    });
    it("ignores missing NODE_ENV if not a node project", async () => {
      expect(await check(missingNodeEnvRule, { Dockerfile: "FROM nginx:latest" }, { node: false, javascript: false, typescript: false })).toEqual([]);
    });
  });

  describe("npmStartEntrypointRule", () => {
    it("detects CMD [\"npm\", \"start\"]", async () => {
      expect(await check(npmStartEntrypointRule, { Dockerfile: "FROM node:22\nCMD [\"npm\", \"start\"]" })).toHaveLength(1);
    });
    it("detects CMD npm start", async () => {
      expect(await check(npmStartEntrypointRule, { Dockerfile: "FROM node:22\nCMD npm start" })).toHaveLength(1);
    });
    it("detects ENTRYPOINT [\"npm\", \"start\"]", async () => {
      expect(await check(npmStartEntrypointRule, { Dockerfile: "FROM node:22\nENTRYPOINT [\"npm\", \"start\"]" })).toHaveLength(1);
    });
    it("accepts CMD [\"node\", \"server.js\"]", async () => {
      expect(await check(npmStartEntrypointRule, { Dockerfile: "FROM node:22\nCMD [\"node\", \"server.js\"]" })).toEqual([]);
    });
  });
});

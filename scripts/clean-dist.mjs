import { rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
for (const packageName of ["core", "rules", "cli"]) {
  const packageRoot = path.join(root, "packages", packageName);
  await rm(path.join(packageRoot, "dist"), { recursive: true, force: true });
  await rm(path.join(packageRoot, "tsconfig.tsbuildinfo"), { force: true });
}

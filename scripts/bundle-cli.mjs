import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const vendorRoot = path.join(root, "packages", "cli", "dist", "node_modules", "@blindspot");
await mkdir(vendorRoot, { recursive: true });

for (const packageName of ["core", "rules"]) {
  const source = path.join(root, "packages", packageName);
  const target = path.join(vendorRoot, packageName);
  await cp(path.join(source, "dist"), path.join(target, "dist"), { recursive: true, force: true });
  await cp(path.join(source, "package.json"), path.join(target, "package.json"), { force: true });
}

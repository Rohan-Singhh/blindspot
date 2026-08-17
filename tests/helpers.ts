import { cp, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const fixturePath = (name: string): string => path.resolve("fixtures", name);

export async function copyFixture(name: string): Promise<string> {
  const target = await mkdtemp(path.join(tmpdir(), "blindspot-"));
  await cp(fixturePath(name), target, { recursive: true, force: true });
  return target;
}

export async function createFixture(files: Record<string, string>): Promise<string> {
  const target = await mkdtemp(path.join(tmpdir(), "blindspot-case-"));
  await Promise.all(Object.entries(files).map(async ([file, contents]) => {
    const destination = path.join(target, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }));
  return target;
}

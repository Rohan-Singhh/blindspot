import { cp, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const fixturePath = (name: string): string => path.resolve("fixtures", name);

export async function copyFixture(name: string): Promise<string> {
  // Use a parent temp dir and copy into a non-existent child path so that
  // fs.cp creates the destination itself — this ensures dotfiles are copied
  // correctly on all Node 20+ platforms (Node 20 fs.cp omits dotfiles when
  // copying into an already-existing directory on Linux).
  const parent = await mkdtemp(path.join(tmpdir(), "blindspot-"));
  const target = path.join(parent, "fixture");
  await cp(fixturePath(name), target, { recursive: true });
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

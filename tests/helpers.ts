import { cp, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const fixturePath = (name: string): string => path.resolve("fixtures", name);

export async function copyFixture(name: string): Promise<string> {
  const target = await mkdtemp(path.join(tmpdir(), "blindspot-"));
  await cp(fixturePath(name), target, { recursive: true, force: true });
  return target;
}

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import pc from "picocolors";

const NPM_PACKAGE = "@swumao/skill-manager";
const REGISTRY_URL = `https://registry.npmjs.org/${NPM_PACKAGE}/latest`;

export interface VersionInfo {
  current: string;
  latest: string;
  isOutdated: boolean;
}

export function getCurrentVersion(): string {
  const pkg = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf-8")
  ) as { version: string };
  return pkg.version;
}

export async function checkVersion(current: string): Promise<VersionInfo | null> {
  try {
    const res = await fetch(REGISTRY_URL, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json() as { version: string };
    const latest = data.version;
    return { current, latest, isOutdated: latest !== current };
  } catch {
    return null;
  }
}

export function printVersionWarning(info: VersionInfo): void {
  console.error(
    pc.yellow("⚡"),
    `最新版本 ${pc.bold(info.latest)} 可用，当前版本 ${pc.dim(info.current)}`
  );
  console.error(`   ${pc.cyan("skill update")} 升级到最新版`);
}

export async function doUpdate(): Promise<void> {
  const current = getCurrentVersion();

  console.log(pc.cyan("⟳"), "正在检查最新版本...");
  const info = await checkVersion(current);
  if (!info) {
    console.error(pc.red("✗"), "无法检查版本更新（网络不可用）");
    process.exit(1);
  }

  if (!info.isOutdated) {
    console.log(pc.green("✓"), `当前已是最新版本 ${pc.bold(current)}`);
    return;
  }

  console.log(`  当前: ${pc.dim(current)} → 最新: ${pc.bold(info.latest)}`);
  console.log(pc.cyan("⟳"), `正在执行 ${pc.bold(`npm install -g ${NPM_PACKAGE}@latest`)} ...`);

  execSync(`npm install -g ${NPM_PACKAGE}@latest`, { stdio: "inherit" });

  const newVersion = getCurrentVersion();
  console.log(pc.green("\n✓"), `已升级到 ${pc.bold(newVersion)}`);
}

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { SkillManagerConfig, SkillManagerConfigSchema } from "../types.js";

const DEFAULT_CONFIG_DIR = join(homedir(), ".config", "skill-manager");
const CONFIG_FILE = "config.json";

export class ConfigStore {
  private configDir: string;
  private configPath: string;
  private cached: SkillManagerConfig | null = null;

  constructor(configDir?: string) {
    this.configDir = configDir ?? DEFAULT_CONFIG_DIR;
    this.configPath = join(this.configDir, CONFIG_FILE);
  }

  get repositoryPath(): string {
    return this.cached?.globalRepository ?? "";
  }

  async load(): Promise<SkillManagerConfig> {
    if (this.cached) return this.cached;

    if (!existsSync(this.configPath)) {
      const defaultConfig: SkillManagerConfig = {
        globalRepository: join(this.configDir, "repository"),
        defaultApplyMode: "symlink",
        defaultIncludeSelf: true,
        presets: {},
        agents: {},
      };
      this.cached = defaultConfig;
      return defaultConfig;
    }

    const raw = await readFile(this.configPath, "utf-8");
    const parsed = JSON.parse(raw);
    this.cached = SkillManagerConfigSchema.parse(parsed);
    return this.cached;
  }

  async save(): Promise<void> {
    if (!existsSync(this.configDir)) {
      await mkdir(this.configDir, { recursive: true });
    }
    await writeFile(this.configPath, JSON.stringify(this.cached, null, 2), "utf-8");
  }

  async update(mutate: (cfg: SkillManagerConfig) => void): Promise<void> {
    const cfg = await this.load();
    mutate(cfg);
    this.cached = cfg;
    await this.save();
  }
}

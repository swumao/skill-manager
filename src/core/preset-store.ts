import { Preset } from "../types.js";
import { ConfigStore } from "./config-store.js";

export class PresetStore {
  constructor(private config: ConfigStore) {}

  async list(): Promise<Preset[]> {
    const cfg = await this.config.load();
    return Object.values(cfg.presets);
  }

  async get(name: string): Promise<Preset | null> {
    const cfg = await this.config.load();
    return cfg.presets[name] ?? null;
  }

  async create(name: string, description: string, skills: string[]): Promise<Preset> {
    if (await this.get(name)) {
      throw new Error(`Preset "${name}" already exists`);
    }
    const preset: Preset = { name, description, skills };
    await this.config.update((cfg) => {
      cfg.presets[name] = preset;
    });
    return preset;
  }

  async update(name: string, data: Partial<Omit<Preset, "name">>): Promise<Preset> {
    const existing = await this.get(name);
    if (!existing) throw new Error(`Preset "${name}" not found`);

    const updated: Preset = {
      name,
      description: data.description ?? existing.description,
      skills: data.skills ?? existing.skills,
    };

    await this.config.update((cfg) => {
      cfg.presets[name] = updated;
    });
    return updated;
  }

  async delete(name: string): Promise<void> {
    if (!(await this.get(name))) {
      throw new Error(`Preset "${name}" not found`);
    }
    await this.config.update((cfg) => {
      delete cfg.presets[name];
    });
  }
}

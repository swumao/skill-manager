#!/usr/bin/env node

import { Command } from "commander";
import pc from "picocolors";
import { ConfigStore } from "./core/config-store.js";
import { SkillStore } from "./core/skill-store.js";
import { PresetStore } from "./core/preset-store.js";
import { Applier } from "./core/applier.js";
import { registerSkillCommands } from "./commands/skill.js";
import { registerPresetCommands } from "./commands/preset.js";
import { registerApplyCommands } from "./commands/apply.js";
import { registerConfigCommands } from "./commands/config.js";
import { registerInitCommand } from "./commands/init.js";
import { registerInstallCommand } from "./commands/install.js";

const program = new Command();

program
  .name("skill")
  .description("AI Agent Skill 管理工具")
  .version("0.1.0");

async function main() {
  const configStore = new ConfigStore();

  const cfg = await configStore.load();
  const skillStore = new SkillStore(cfg.globalRepository);
  const presetStore = new PresetStore(configStore);
  const applier = new Applier(skillStore);

  registerSkillCommands(program, skillStore);
  registerPresetCommands(program, presetStore, skillStore, configStore);
  registerApplyCommands(program, applier, skillStore, presetStore);
  registerConfigCommands(program, configStore);
  registerInitCommand(program, configStore);
  registerInstallCommand(program, configStore);

  program.parse(process.argv);
}

main().catch((e) => {
  console.error(pc.red("Fatal:"), (e as Error).message);
  process.exit(1);
});

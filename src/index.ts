#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { Command } from "commander";
import pc from "picocolors";
import { ConfigStore } from "./core/config-store.js";
import { SkillStore } from "./core/skill-store.js";
import { PresetStore } from "./core/preset-store.js";
import { Applier } from "./core/applier.js";
import { checkVersion, printVersionWarning } from "./core/updater.js";
import { registerSkillCommands } from "./commands/skill.js";
import { registerPresetCommands } from "./commands/preset.js";
import { registerApplyCommands } from "./commands/apply.js";
import { registerConfigCommands } from "./commands/config.js";
import { registerInitCommand } from "./commands/init.js";
import { registerInstallCommand } from "./commands/install.js";
import { registerUpdateCommand } from "./commands/update.js";

const program = new Command();

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));

program
  .name("skill")
  .description("AI Agent Skill 管理工具")
  .version(version);

async function main() {
  const configStore = new ConfigStore();

  const cfg = await configStore.load();
  const skillStore = new SkillStore(cfg.globalRepository);
  const presetStore = new PresetStore(configStore);
  const applier = new Applier(skillStore);

  registerSkillCommands(program, skillStore, presetStore);
  registerPresetCommands(program, presetStore, skillStore, configStore);
  registerApplyCommands(program, applier, skillStore, presetStore);
  registerConfigCommands(program, configStore);
  registerInitCommand(program, configStore);
  registerInstallCommand(program, configStore);
  registerUpdateCommand(program);

  const isVersionCmd = process.argv.includes("--version") || process.argv.includes("-V");
  const isUpdateCmd = process.argv.includes("update");

  if (!isVersionCmd && !isUpdateCmd) {
    checkVersion(version).then((info) => {
      if (info?.isOutdated) printVersionWarning(info);
    });
  }

  program.parse(process.argv);
}

main().catch((e) => {
  console.error(pc.red("Fatal:"), (e as Error).message);
  process.exit(1);
});

import { Command } from "commander";
import { ConfigStore } from "../core/config-store.js";
import pc from "picocolors";

export function registerConfigCommands(program: Command, configStore: ConfigStore): void {
  const configCmd = program.command("config").description("查看/修改配置");

  configCmd
    .command("show")
    .description("显示当前配置")
    .action(async () => {
      const cfg = await configStore.load();
      console.log(JSON.stringify(cfg, null, 2));
    });

  configCmd
    .command("set-repo")
    .description("设置全局 Skill 仓库路径")
    .argument("<path>", "仓库路径")
    .action(async (path: string) => {
      await configStore.update((cfg) => {
        cfg.globalRepository = path;
      });
      console.log(pc.green("✓"), `全局仓库路径已设为 ${pc.cyan(path)}`);
    });

  configCmd
    .command("set-include-self")
    .description("设置 Preset 创建时是否默认包含 skill-manager")
    .argument("<boolean>", "true 或 false")
    .action(async (val: string) => {
      const bool = val === "true" || val === "yes" || val === "1";
      await configStore.update((cfg) => {
        cfg.defaultIncludeSelf = bool;
      });
      console.log(pc.green("✓"), `defaultIncludeSelf 已设为 ${pc.cyan(String(bool))}`);
    });
}

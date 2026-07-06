import { Command } from "commander";
import { Applier } from "../core/applier.js";
import { PresetStore } from "../core/preset-store.js";
import { SkillStore } from "../core/skill-store.js";
import pc from "picocolors";

export function registerApplyCommands(
  program: Command,
  applier: Applier,
  skillStore: SkillStore,
  presetStore: PresetStore
): void {
  const applyCmd = program.command("apply").description("应用 Skill 到指定 Agent 目录");

  applyCmd
    .command("preset")
    .description("应用 Preset 中的 skill 到 Agent")
    .argument("<agent-path>", "Agent 项目路径")
    .argument("<preset-name>", "Preset 名称")
    .option("-m, --mode <mode>", "应用模式: symlink | copy", "symlink")
    .action(async (agentPath: string, presetName: string, options: { mode: string }) => {
      try {
        const mode = options.mode === "copy" ? "copy" as const : "symlink" as const;
        const preset = await presetStore.get(presetName);
        if (!preset) {
          console.error(pc.red("✗"), `Preset "${presetName}" 不存在`);
          process.exit(1);
        }

        await applier.apply(agentPath, preset.skills, mode, presetName);
        console.log(
          pc.green("✓"),
          `Preset "${pc.bold(presetName)}" (${mode}) 已应用到 ${pc.cyan(agentPath)}`
        );
        console.log(`  Skills: ${preset.skills.join(", ")}`);
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });

  applyCmd
    .command("skills")
    .description("直接应用 skill 列表到 Agent")
    .argument("<agent-path>", "Agent 项目路径")
    .argument("<skills...>", "skill 名称列表")
    .option("-m, --mode <mode>", "应用模式: symlink | copy", "symlink")
    .option("-p, --preset <name>", "可选：放到指定 preset 子目录下")
    .action(async (agentPath: string, skills: string[], options: { mode: string; preset?: string }) => {
      try {
        const mode = options.mode === "copy" ? "copy" as const : "symlink" as const;
        await applier.apply(agentPath, skills, mode, options.preset);
        console.log(pc.green("✓"), `Skill 已应用到 ${pc.cyan(agentPath)}`);
        console.log(`  Skills: ${skills.join(", ")}`);
        if (options.preset) console.log(`  Preset: ${options.preset}`);
        console.log(`  Mode: ${mode}`);
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });

  applyCmd
    .command("list")
    .description("查看 Agent 已应用的 skill")
    .argument("<agent-path>", "Agent 项目路径")
    .action(async (agentPath: string) => {
      try {
        const applied = await applier.listApplied(agentPath);
        if (applied.length === 0) {
          console.log("该 Agent 未应用任何 skill");
          return;
        }
        for (const { preset, skills } of applied) {
          console.log(`\n${pc.bold(preset === ".skills" ? "default" : preset)}`);
          for (const name of skills) {
            console.log(`  • ${name}`);
          }
        }
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });

  applyCmd
    .command("remove")
    .description("从 Agent 移除指定 skill")
    .argument("<agent-path>", "Agent 项目路径")
    .argument("<skills...>", "要移除的 skill 名称")
    .option("-p, --preset <name>", "从指定 preset 目录移除")
    .action(async (agentPath: string, skills: string[], options: { preset?: string }) => {
      try {
        await applier.remove(agentPath, skills, options.preset);
        console.log(pc.green("✓"), `Skill 已从 ${pc.cyan(agentPath)} 移除`);
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });
}

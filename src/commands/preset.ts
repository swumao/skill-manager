import { Command } from "commander";
import { PresetStore } from "../core/preset-store.js";
import { SkillStore } from "../core/skill-store.js";
import { ConfigStore } from "../core/config-store.js";
import pc from "picocolors";

async function validateSkills(skillStore: SkillStore, skills: string[]): Promise<void> {
  const missing = (
    await Promise.all(skills.map(async (name) => {
      const exists = await skillStore.getSkill(name);
      return exists ? null : name;
    }))
  ).filter(Boolean) as string[];

  if (missing.length > 0) {
    console.error(pc.red("✗"), `以下 Skill 在全局仓库中不存在：`);
    for (const name of missing) {
      console.error(`    ${pc.red("•")} ${name}`);
    }
    console.error(`\n  可用: ${pc.cyan("skill skill list")} 查看当前仓库中的 Skill`);
    process.exit(1);
  }
}

export function registerPresetCommands(program: Command, presetStore: PresetStore, skillStore: SkillStore, configStore: ConfigStore): void {
  const presetCmd = program.command("preset").description("管理 Preset (技能集方案)");

  const createCmd = presetCmd
    .command("create")
    .description("创建 Preset")
    .argument("<name>", "Preset 名称")
    .option("-d, --description <desc>", "Preset 描述")
    .option("-s, --skills <skills>", "要包含的 skill 名称，多个用逗号分隔（如：docx,odin-extract）")
    .showHelpAfterError(true);
  createCmd.addHelpText("after", `
Examples:
  $ skill preset create data-analysis --skills docx,odin-extract,lark-sheets
  $ skill preset create web-dev -d "Web 开发相关 skill" -s lark-im,lark-calendar
  $ skill preset create empty-test    # 创建空 Preset，后续用 update 添加 skill`);
  createCmd.action(async (name: string, options: { description?: string; skills?: string }) => {
      try {
        if (!options.skills && !options.description) {
          const { confirm } = await import("../core/prompt.js");
          const ok = await confirm(`Preset "${name}" 未指定任何 skill，是否继续创建`, false);
          if (!ok) { console.log(pc.dim("已取消")); return; }
        }
        let skills = options.skills ? options.skills.split(",").map((s: string) => s.trim()) : [];
        const cfg = await configStore.load();
        if (cfg.defaultIncludeSelf && !skills.includes("skill-manager")) {
          skills = ["skill-manager", ...skills];
        }
        if (skills.length > 0) await validateSkills(skillStore, skills);
        const preset = await presetStore.create(name, options.description || "", skills);
        if (cfg.defaultIncludeSelf && skills.includes("skill-manager") && (!options.skills || !options.skills.includes("skill-manager"))) {
          console.log(`  ${pc.dim("(已自动包含 skill-manager)")}`);
        }
        console.log(pc.green("✓"), `Preset "${pc.bold(preset.name)}" 已创建`);
        if (preset.skills.length > 0) {
          console.log(`  Skills: ${preset.skills.join(", ")}`);
        }
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });

  const updateCmd = presetCmd
    .command("update")
    .description("更新 Preset")
    .argument("<name>", "Preset 名称")
    .option("-d, --description <desc>", "新的描述")
    .option("-s, --skills <skills>", "全量替换 skill 列表，多个用逗号分隔（如：docx,odin-extract）")
    .option("--add-skills <skills>", "追加 skill，多个用逗号分隔")
    .option("--remove-skills <skills>", "移除 skill，多个用逗号分隔")
    .showHelpAfterError(true);
  updateCmd.addHelpText("after", `
Examples:
  $ skill preset update data-analysis --skills docx,lark-sheets       # 全量替换
  $ skill preset update data-analysis --add-skills odin-extract       # 追加
  $ skill preset update data-analysis --remove-skills docx            # 移除
  $ skill preset update data-analysis -d "新的描述"                   # 只改描述`);
  updateCmd.action(async (name: string, options) => {
      try {
        const data: Record<string, unknown> = {};
        if (options.description !== undefined) data.description = options.description;
        if (options.skills !== undefined) data.skills = options.skills.split(",").map((s: string) => s.trim());

        if (options.addSkills) {
          const existing = await presetStore.get(name);
          if (existing) {
            const toAdd = options.addSkills.split(",").map((s: string) => s.trim());
            data.skills = [...new Set([...existing.skills, ...toAdd])];
          }
        }

        if (options.removeSkills) {
          const existing = await presetStore.get(name);
          if (existing) {
            const toRemove = new Set(options.removeSkills.split(",").map((s: string) => s.trim()));
            data.skills = existing.skills.filter((s: string) => !toRemove.has(s));
          }
        }

        const finalSkills = (data.skills as string[] | undefined) ?? (await presetStore.get(name))?.skills ?? [];
        if (finalSkills.length > 0) await validateSkills(skillStore, finalSkills);
        const preset = await presetStore.update(name, data);
        console.log(pc.green("✓"), `Preset "${pc.bold(preset.name)}" 已更新`);
        console.log(`  Skills: ${preset.skills.join(", ") || "(空)"}`);
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });

  presetCmd
    .command("delete")
    .description("删除 Preset")
    .argument("<name>", "Preset 名称")
    .action(async (name: string) => {
      try {
        await presetStore.delete(name);
        console.log(pc.green("✓"), `Preset "${pc.bold(name)}" 已删除`);
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });

  presetCmd
    .command("list")
    .description("列出所有 Preset")
    .action(async () => {
      try {
        const presets = await presetStore.list();
        if (presets.length === 0) {
          console.log("暂无 Preset。使用 `skill preset create <name>` 创建。");
          return;
        }
        for (const p of presets) {
          console.log(`\n${pc.bold(p.name)}`);
          if (p.description) console.log(`  ${p.description}`);
          console.log(`  Skills: ${p.skills.join(", ") || "(空)"}`);
        }
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });
}

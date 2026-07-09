import { Command } from "commander";
import { SkillStore } from "../core/skill-store.js";
import { PresetStore } from "../core/preset-store.js";
import pc from "picocolors";

export function registerSkillCommands(program: Command, skillStore: SkillStore, presetStore?: PresetStore): void {
  const skillCmd = program.command("skill").description("管理全局 Skill 仓库");

  skillCmd
    .command("list")
    .description("列出仓库中所有 Skill")
    .action(async () => {
      try {
        const skills = await skillStore.listSkills();
        if (skills.length === 0) {
          console.log("仓库中暂无 Skill。使用 `skill skill add <path>` 添加。");
          return;
        }
        for (const s of skills) {
          console.log(`\n${pc.bold(s.name)}${s.version ? ` ${pc.dim(`v${s.version}`)}` : ""}`);
          if (s.description) console.log(`  ${s.description}`);
          console.log(`  ${pc.dim(s.sourcePath)}`);
        }
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });

  skillCmd
    .command("add")
    .description("将本地 Skill 目录导入到全局仓库")
    .argument("<path>", "Skill 目录路径（包含 SKILL.md）")
    .action(async (path: string) => {
      try {
        const meta = await skillStore.addSkill(path);
        console.log(pc.green("✓"), `Skill "${pc.bold(meta.name)}" 已导入仓库`);
        console.log(`  ${meta.sourcePath}`);
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });

  skillCmd
    .command("remove")
    .description("从全局仓库删除 Skill")
    .argument("<name>", "Skill 名称")
    .action(async (name: string) => {
      try {
        await skillStore.removeSkill(name);
        console.log(pc.green("✓"), `Skill "${pc.bold(name)}" 已删除`);
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });

  skillCmd
    .command("find")
    .description("查找 Skill 并显示所在 Preset")
    .argument("<name>", "Skill 名称")
    .action(async (name: string) => {
      try {
        const skill = await skillStore.getSkill(name);
        if (!skill) {
          console.log(pc.yellow("?"), `Skill "${pc.bold(name)}" 在仓库中不存在`);
          console.log(`  可用: ${pc.cyan("skill skill list")} 查看当前仓库中的 Skill`);
          return;
        }

        console.log(`\n${pc.bold(skill.name)}${skill.version ? ` ${pc.dim(`v${skill.version}`)}` : ""}`);
        if (skill.description) console.log(`  ${skill.description}`);
        console.log(`  ${pc.dim(skill.sourcePath)}`);

        if (presetStore) {
          const presets = await presetStore.list();
          const matched = presets.filter((p) => p.skills.includes(name));

          if (matched.length === 0) {
            console.log(`\n  ${pc.dim("未归属任何 Preset")}`);
          } else {
            console.log(`\n  ${pc.underline("所在 Preset:")}`);
            for (const p of matched) {
              console.log(`    ${pc.green("•")} ${pc.bold(p.name)}${p.description ? ` — ${p.description}` : ""}`);
            }
          }
        } else {
          console.log(`\n  ${pc.dim("(未加载 PresetStore，无法查询 Preset 归属)")}`);
        }
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });
}

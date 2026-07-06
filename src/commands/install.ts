import { Command } from "commander";
import { ConfigStore } from "../core/config-store.js";
import { SkillStore } from "../core/skill-store.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { readdir, mkdir, copyFile, symlink } from "node:fs/promises";
import pc from "picocolors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILTIN_SKILLS_DIR = join(__dirname, "..", "..", "skills");

export function registerInstallCommand(program: Command, configStore: ConfigStore): void {
  program
    .command("install")
    .description("安装并初始化：设置仓库、导入内置 Skill、同步到 Agent 目录")
    .option("--no-link-agent", "不同步到 ~/.agents/skills/")
    .action(async (options) => {
      try {
        const cfg = await configStore.load();
        const skillStore = new SkillStore(cfg.globalRepository);
        await skillStore.init();

        // 1. 导入内置 Skill
        let builtinCount = 0;
        if (existsSync(BUILTIN_SKILLS_DIR)) {
          const entries = await readdir(BUILTIN_SKILLS_DIR, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            try {
              await skillStore.addSkill(join(BUILTIN_SKILLS_DIR, entry.name));
              console.log(pc.green("✓"), `内置 Skill "${entry.name}" 已导入`);
              builtinCount++;
            } catch {
              console.log(pc.dim("•"), `${entry.name} 已存在，跳过`);
            }
          }
        }

        // 2. 同步 skill-manager 到 ~/.agents/skills/
        if (options.linkAgent !== false) {
          const agentSkillsDir = join(homedir(), ".agents", "skills");
          const targetDir = join(agentSkillsDir, "skill-manager");
          const builtinSkillDir = join(BUILTIN_SKILLS_DIR, "skill-manager");

          if (!existsSync(builtinSkillDir)) {
            console.log(pc.yellow("!"), "未找到内置 skill-manager 目录，跳过同步");
          } else if (existsSync(targetDir)) {
            console.log(pc.dim("•"), `~/.agents/skills/skill-manager 已存在，跳过`);
          } else {
            await mkdir(agentSkillsDir, { recursive: true });
            await mkdir(targetDir, { recursive: true });
            const entries = await readdir(builtinSkillDir, { withFileTypes: true });
            for (const entry of entries) {
              const src = join(builtinSkillDir, entry.name);
              const dest = join(targetDir, entry.name);
              if (entry.isDirectory()) {
                await mkdir(dest, { recursive: true });
                const sub = await readdir(src, { withFileTypes: true });
                for (const s of sub) {
                  if (s.isFile()) await copyFile(join(src, s.name), join(dest, s.name));
                }
              } else if (entry.isFile()) {
                await copyFile(src, dest);
              }
            }
            console.log(pc.green("✓"), `skill-manager 已同步到 ${pc.cyan(targetDir)}`);
          }
        }

        console.log(pc.bold("\n✓ 安装完成"));
        console.log(`  仓库路径: ${pc.cyan(cfg.globalRepository)}`);
        console.log(`  内置 Skill: ${builtinCount}`);
        if (options.linkAgent !== false && existsSync(join(homedir(), ".agents", "skills", "skill-manager"))) {
          console.log(`  Agent 目录: ${pc.cyan("~/.agents/skills/skill-manager")}`);
        }
        console.log(`\n  快速开始: ${pc.cyan("skill preset create my-preset --skills <name1,name2>")}`);
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });
}

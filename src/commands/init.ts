import { Command } from "commander";
import { ConfigStore } from "../core/config-store.js";
import { SkillStore } from "../core/skill-store.js";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import pc from "picocolors";
import { ask, confirm, select, multiSelect } from "../core/prompt.js";
import { ApplyModeT } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILTIN_SKILLS_DIR = join(__dirname, "..", "..", "skills");

const AGENT_SOURCE_DIRS = [
  { name: "Claude Code", path: join(homedir(), ".claude", "skills") },
  { name: "OpenCode", path: join(homedir(), ".config", "opencode", "skills") },
  { name: "Agent 通用", path: join(homedir(), ".agents", "skills") },
];

export function registerInitCommand(program: Command, configStore: ConfigStore): void {
  program
    .command("init")
    .description("交互式初始化：仓库路径 + 应用模式 + 选择 Agent 来源导入 Skill")
    .action(async () => {
      try {
        const cfg = await configStore.load();

        // ── Step 1: 仓库路径 ──
        console.log(pc.bold("\n=> 配置全局 Skill 仓库路径"));
        console.log("  所有 Skill 会集中存储在此目录下。\n");
        const defaultRepo = cfg.globalRepository;
        const answer = await ask("  仓库路径", defaultRepo);
        const repoPath = answer || defaultRepo;
        if (repoPath !== cfg.globalRepository) {
          await configStore.update((c) => {
            c.globalRepository = repoPath;
          });
        }

        const skillStore = new SkillStore(repoPath);
        await skillStore.init();

        // ── Step 2: 应用模式偏好 ──
        console.log(pc.bold("\n=> 选择 Skill 管理方式"));
        const mode = await select(
          "  应用模式：",
          [
            { name: "软链接 (symlink) - 所有 Agent 共享同一份文件", value: "symlink" },
            { name: "文件拷贝 (copy) - 每个 Agent 独立副本可修改", value: "copy" },
          ],
          cfg.defaultApplyMode
        ) as ApplyModeT;
        if (mode !== cfg.defaultApplyMode) {
          await configStore.update((c) => {
            c.defaultApplyMode = mode;
          });
        }

        // ── Step 3: 是否默认包含 skill-manager ──
        console.log(pc.bold("\n=> Preset 自动包含 skill-manager"));
        const includeSelf = await confirm(
          "  是否让每个新建的 Preset 默认包含 skill-manager（帮助 AI 理解本工具）",
          cfg.defaultIncludeSelf
        );
        if (includeSelf !== cfg.defaultIncludeSelf) {
          await configStore.update((c) => {
            c.defaultIncludeSelf = includeSelf;
          });
        }

        // ── Step 4: 导入内置 Skill ──
        let builtinCount = 0;
        if (existsSync(BUILTIN_SKILLS_DIR)) {
          const entries = await readdir(BUILTIN_SKILLS_DIR, { withFileTypes: true });
          const builtinDirs = entries.filter((e) => e.isDirectory());
          if (builtinDirs.length > 0) {
            console.log(pc.bold("\n=> 内置 Skill"));
            for (const entry of builtinDirs) {
              const skillPath = join(BUILTIN_SKILLS_DIR, entry.name);
              try {
                await skillStore.addSkill(skillPath);
                console.log(`  ${pc.green("✓")} ${entry.name} 已导入`);
                builtinCount++;
              } catch {
                console.log(`  ${pc.dim("•")} ${entry.name} 已存在，跳过`);
              }
            }
          }
        }

        // ── Step 4: 选择要导入的 Agent 来源 ──
        const sourceEntries = (
          await Promise.all(
            AGENT_SOURCE_DIRS.map(async (src) => {
              if (!existsSync(src.path)) return null;
              const entries = await readdir(src.path, { withFileTypes: true });
              const count = entries.filter((e) => e.isDirectory()).length;
              return count > 0 ? { ...src, skillCount: count } : null;
            })
          )
        ).filter(Boolean) as ({ name: string; path: string; skillCount: number })[];

        let importedCount = 0;

        if (sourceEntries.length > 0) {
          console.log(pc.bold("\n=> 选择 Skill 来源"));
          const selected = await multiSelect(
            "  选择要导入的 Agent 来源（默认全选）：",
            sourceEntries.map((s) => ({
              name: `${s.name}   ${pc.dim(`(${s.skillCount} 个 Skill)`)}`,
              checked: true,
            }))
          );

          const selectedSources = sourceEntries.filter((s) =>
            selected.some((sel) => sel.startsWith(s.name))
          );

          if (selectedSources.length > 0) {
            console.log(pc.bold("\n=> 导入 Skill"));
            const existing = await skillStore.listSkills();
            const existingNames = new Set(existing.map((s) => s.name));

            for (const src of selectedSources) {
              const entries = await readdir(src.path, { withFileTypes: true });
              for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                if (existingNames.has(entry.name)) {
                  console.log(`  ${pc.dim("•")} ${entry.name} ${pc.dim(`(${src.name})`)} 已存在，跳过`);
                  continue;
                }
                try {
                  await skillStore.addSkill(join(src.path, entry.name));
                  console.log(`  ${pc.green("✓")} ${entry.name} ${pc.dim(`(${src.name})`)} 已导入`);
                  importedCount++;
                } catch (e) {
                  console.log(`  ${pc.yellow("!")} ${entry.name} 导入失败: ${(e as Error).message}`);
                }
              }
            }
          }
        } else {
          console.log(pc.dim("\n(未找到已有的 Agent Skill 目录)"));
        }

        // ── Summary ──
        const total = builtinCount + importedCount;
        console.log(pc.bold("\n✓ 初始化完成"));
        console.log(`  仓库路径: ${pc.cyan(repoPath)}`);
        console.log(`  应用模式: ${mode}`);
        console.log(`  本次导入: ${total} 个 Skill`);
        if (total > 0) {
          console.log(`\n  提示: 使用 ${pc.cyan("skill skill list")} 查看所有 Skill`);
          console.log(`       使用 ${pc.cyan("skill preset create <name> --skills <skill1,skill2>")} 创建 Preset`);
        }
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });
}

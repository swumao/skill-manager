#!/usr/bin/env node
// postinstall: 全局安装后自动将 skill-manager 复制到 ~/.agents/skills/

import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

// 只在全局安装时执行
const isGlobal = process.env.npm_config_global === "true";
if (!isGlobal) process.exit(0);

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const skillName = "skill-manager";
const srcDir = join(projectRoot, "skills", skillName);
const agentSkillsDir = join(homedir(), ".agents", "skills");
const targetDir = join(agentSkillsDir, skillName);

if (!existsSync(srcDir)) {
  console.log(`[skill-manager] 未找到内置 ${skillName}，跳过同步`);
  process.exit(0);
}

if (existsSync(targetDir)) {
  console.log(`[skill-manager] ${targetDir} 已存在，跳过同步`);
  process.exit(0);
}

try {
  mkdirSync(targetDir, { recursive: true });
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      copyFileSync(join(srcDir, entry.name), join(targetDir, entry.name));
    }
  }
  console.log(`[skill-manager] 已复制到 ${targetDir}`);
  console.log(`[skill-manager] 运行 skill --help 开始使用`);
} catch (e) {
  console.error(`[skill-manager] 同步失败: ${e.message}`);
}

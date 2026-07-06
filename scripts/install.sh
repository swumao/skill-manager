#!/usr/bin/env bash
set -euo pipefail

SKILL_MANAGER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_SKILLS_DIR="${HOME}/.agents/skills"
BUILTIN_SKILL_DIR="${SKILL_MANAGER_DIR}/skills/skill-manager"
TARGET_DIR="${AGENT_SKILLS_DIR}/skill-manager"

echo "==> 1. 安装 skill CLI 命令"
npm link "${SKILL_MANAGER_DIR}"
echo ""

echo "==> 2. 初始化全局仓库"
skill init 2>&1 || true
echo ""

echo "==> 3. 复制内置 skill-manager 到 Agent 目录"
mkdir -p "${AGENT_SKILLS_DIR}"
if [ -e "${TARGET_DIR}" ]; then
  echo "  ${TARGET_DIR} 已存在，跳过"
else
  cp -R "${BUILTIN_SKILL_DIR}" "${TARGET_DIR}"
  echo "  ✓ skill-manager 已复制到 ${TARGET_DIR}"
fi
echo ""

echo "==> 完成"
echo "  现在你的 AI Agent 可以识别并使用 skill-manager 工具了。"
echo "  运行 skill --help 查看所有命令。"

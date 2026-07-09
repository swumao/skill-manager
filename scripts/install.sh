#!/usr/bin/env bash
set -euo pipefail

SKILL_MANAGER_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> 1. 安装依赖并编译"
cd "${SKILL_MANAGER_DIR}" && npm install
echo ""

echo "==> 2. 注册 skill CLI 命令"
npm link "${SKILL_MANAGER_DIR}"
echo ""

echo "==> 3. 初始化全局仓库并导入内置 Skill"
skill install 2>&1 || true
echo ""

echo "==> 完成"
echo "  现在你的 AI Agent 可以识别并使用 skill-manager 工具了。"
echo "  运行 skill --help 查看所有命令。"

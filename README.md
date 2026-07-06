# skill-manager

AI Agent Skill 集中化管理 CLI 工具。

## 理念

AI Agent（如 Claude Code、OpenCode 等）通过 **Skill** 获得领域知识和操作指南。随着 Skill 数量增长，管理散落在各处的 Skill 目录变得困难。

**skill-manager** 解决三个核心问题：

| 问题 | 方案 |
|------|------|
| **分散** — Skill 散落在 `~/.claude/skills/`、`~/.agents/skills/` 等不同位置 | **集中仓库** — 所有 Skill 统一导入 `GLOBAL_SKILL_REPOSITORY` |
| **重复** — 多个 Agent 需要同一组 Skill，手动复制难以同步 | **按需应用** — 通过软链接或文件拷贝，复用同一份 Skill |
| **场景** — 不同任务需要不同的 Skill 组合 | **Preset 方案** — 按场景定义命名方案，一键应用 |

## 架构

```
~/.config/skill-manager/
├── config.json               # 配置文件
└── repository/               # 全局 Skill 仓库
    ├── skill-manager/        # 内置 Skill（项目自带）
    ├── docx/
    └── ...

<project>/
└── .skills/                  # Agent 本地 Skill 挂载点
    └── <preset-name>/
        ├── skill-a/    -->   指向仓库的软链接 (symlink)
        └── skill-b/    -->   或独立副本 (copy)
```

### 核心概念

- **Skill** — 一个包含 `SKILL.md` 的目录，定义了 AI Agent 在特定领域的行为指南
- **GLOBAL_SKILL_REPOSITORY** — 所有 Skill 的集中存储目录
- **Preset** — 命名的 Skill 集合，按场景组织（如 `data-analysis`、`web-dev`）
- **Agent** — 使用 Skill 的项目目录，通过 `skill apply` 将 Preset 中的 Skill 挂载到 `.skills/` 下

## 安装

> **注意**：`dist/` 不提交到 Git，安装时会通过 `prepare` 脚本自动编译。

### 方式一：一键安装脚本

```bash
git clone https://github.com/swumao/skill-manager.git
cd skill-manager
bash scripts/install.sh
```

脚本会依次：
1. 安装依赖并编译
2. 通过 `npm link` 注册 `skill` 全局命令
3. 运行 `skill install` 非交互式初始化仓库、导入内置 Skill、并同步到 `~/.agents/skills/`

### 方式二：源码安装

```bash
git clone https://github.com/swumao/skill-manager.git
cd skill-manager
npm install               # 自动编译（prepare 脚本）
npm link                  # 注册 skill 全局命令
skill install             # 初始化全局仓库（非交互式）
```

### 方式三：从 GitHub 直接安装（无需克隆）

```bash
npm install -g git+https://github.com/swumao/skill-manager.git
skill install
```

`prepare` 脚本会自动编译，`postinstall` 会将内置 Skill 同步到 `~/.agents/skills/`。

安装后验证：

```bash
skill --version
skill --help
```

## 快速开始

```bash
# 1. 查看仓库中的 Skill
skill skill list

# 2. 导入已有的 Skill
skill skill add ~/.claude/skills/docx
skill skill add ~/.claude/skills/lark-sheets

# 3. 创建 Preset 方案
skill preset create data-analysis --skills docx,lark-sheets,odin-extract

# 4. 应用到项目
skill apply preset ./my-project data-analysis -m symlink

# 5. 查看已应用的 Skill
skill apply list ./my-project
```

## 命令参考

### `skill skill` — 管理全局 Skill 仓库

```bash
skill skill list                          # 列出仓库中所有 Skill
skill skill add <path>                    # 导入本地 Skill 目录
skill skill remove <name>                 # 从仓库删除 Skill
```

### `skill preset` — 管理 Preset 方案

```bash
skill preset create <name> --skills <s1,s2,...>    # 创建 Preset
skill preset update <name> --add-skills <s3>       # 追加 Skill
skill preset update <name> --remove-skills <s1>    # 移除 Skill
skill preset update <name> --skills <s1,s2>        # 全量替换
skill preset list                                  # 列出所有 Preset
skill preset delete <name>                         # 删除 Preset
```

### `skill apply` — 应用 Skill 到 Agent

```bash
skill apply preset <agent-path> <preset-name>      # 应用 Preset
skill apply skills <agent-path> <s1> <s2>          # 直接应用 Skill 列表
skill apply list <agent-path>                      # 查看已应用的 Skill
skill apply remove <agent-path> <s1> <s2>          # 移除 Skill
```

支持两种模式：
- `-m symlink` — 软链接（默认），所有 Agent 共享仓库文件
- `-m copy` — 文件拷贝，每个 Agent 拥有独立副本

### `skill config` — 配置管理

```bash
skill config show                                    # 查看配置
skill config set-repo <path>                         # 修改仓库路径
skill config set-include-self true|false             # preset 是否自动包含 skill-manager
```

### `skill init` — 交互式初始化

引导式设置仓库路径、应用模式、是否自动包含 skill-manager，并扫描导入已有 Skill。

### `skill install` — 自动化安装

非交互式安装，适合脚本使用。自动完成仓库初始化、内置 Skill 导入，并将 `skill-manager` 同步到 `~/.agents/skills/`。

## 配置说明

配置文件位于 `~/.config/skill-manager/config.json`：

```json
{
  "globalRepository": "~/.config/skill-manager/repository",
  "defaultApplyMode": "symlink",
  "defaultIncludeSelf": true,
  "presets": {},
  "agents": {}
}
```

### `defaultApplyMode`

新建 Preset 时默认包含 `skill-manager` 自身，确保 AI Agent 理解如何使用本工具。

### 多 Agent 场景示例

```bash
# 项目 A：数据分析
skill apply preset ./project-a data-analysis -m symlink

# 项目 B：Web 开发
skill apply preset ./project-b web-dev -m copy

# 项目 C：同时使用多个 Preset
skill apply preset ./project-c data-analysis -m symlink
skill apply preset ./project-c web-dev -m symlink

# 查看全部
skill apply list ./project-c
# => data-analysis/
#      docx, odin-extract, lark-sheets
#    web-dev/
#      lark-im, lark-calendar
```

## 技术栈

| 领域 | 选择 |
|------|------|
| 运行时 | Node.js >= 20 |
| 语言 | TypeScript |
| CLI 框架 | commander |
| 输出美化 | picocolors |
| Schema 校验 | zod |
| 配置存储 | JSON 文件 (`~/.config/skill-manager/`) |

## 开发

```bash
npm install
npm run dev       # tsx 直接运行 src/index.ts
npm run build     # 编译到 dist/
npm run typecheck # 类型检查
```

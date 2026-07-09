---
name: skill-manager
version: 0.1.0
description: "skill-manager CLI 工具使用指南 — Skill 集中化管理、Preset 方案管理、应用到 Agent, 如果没有合适的Skill，也可以用来find Skill"
---

# skill-manager

skill-manager 是 AI Agent Skill 的集中化管理 CLI 工具。它帮助你统一管理所有 skill，按 Preset（方案）组织，并应用到不同的 Agent 路径中。

## AI 工作流程：查找并使用 Skill

当收到用户需求但当前没有合适的 Skill 可用时，按以下步骤操作：

1. **查找 Skill** — 用 `skill skill find <关键词>` 在全局仓库中搜索匹配的 Skill。先用宽泛的关键词搜索，如果没有结果再换其他关键词尝试。
2. **找到后 Apply** — 如果找到了匹配的 Skill，将其应用到当前 Agent 目录：
   ```bash
   skill apply skills . <skill-name> -p auto -m symlink
   ```
   （`.` 表示当前 Agent 项目根目录，`-p auto` 指定 Preset 目录名）
3. **直接使用** — Apply 完成后，Skill 的指令和资源位于 `.skills/auto/<skill-name>/` 下，可直接按照该 Skill 的指引完成任务。

如果 `skill skill find` 没有找到合适的 Skill，告知用户当前仓库中无可用的匹配 Skill。

## 快速开始

```bash
# 查看帮助
skill --help

# 查看子命令帮助
skill skill --help
skill preset --help
skill apply --help
```

## Skill 仓库管理

Skill 存储在 `GLOBAL_SKILL_REPOSITORY`（默认 `~/.config/skill-manager/repository/`）中。

### 列出所有 Skill

```bash
skill skill list
```

输出示例：
```
docx
  Use this skill whenever the user wants to create, read, edit...
  /Users/xxx/.config/skill-manager/repository/docx

odin-extract
  从奥丁(Odin)数据报告平台提取/下载数据表...
  /Users/xxx/.config/skill-manager/repository/odin-extract
```

### 导入 Skill 到仓库

```bash
skill skill add <skill-directory-path>
```

`<skill-directory-path>` 是包含 `SKILL.md` 的本地目录。

### 查找 Skill 并查看所在 Preset

```bash
skill skill find <skill-name>
```

输出示例：
```
docx v0.1.0
  Use this skill whenever the user wants to create, read, edit...
  /Users/xxx/.config/skill-manager/repository/docx

  所在 Preset:
    • data-analysis — 数据分析相关 skill
    • writing — 写作辅助
```

### 从仓库删除 Skill

```bash
skill skill remove <skill-name>
```

## Preset 管理

Preset 是一个命名的 Skill 集合，方便按场景批量应用。

### 创建 Preset

```bash
skill preset create <name> [description] --skills <skill1,skill2,...>
```

### 查看所有 Preset

```bash
skill preset list
```

### 查看特定 Preset 的详情

```bash
skill preset list
# 或通过名称查看具体内容：
# （当前 CLI 暂不支持按名称查看单条，可通过 list 过滤）
```

### 更新 Preset

```bash
# 全量替换 skills
skill preset update <name> --skills <skill1,skill2>

# 追加 skill
skill preset update <name> --add-skills <skill3>

# 移除 skill
skill preset update <name> --remove-skills <skill1>

# 更新描述
skill preset update <name> --description "新的描述"
```

### 删除 Preset

```bash
skill preset delete <name>
```

## 应用 Skill 到 Agent

支持两种模式：**symlink**（软链接，默认）和 **copy**（文件拷贝）。

### 应用一个 Preset

```bash
skill apply preset <agent-path> <preset-name> -m symlink
```

Agent 目录下会创建 `.skills/<preset-name>/`，其中每个 skill 为指向仓库的软链接或拷贝目录。

### 应用多个 Preset

多次调用即可叠加多个 Preset：

```bash
skill apply preset ./agent-a data-analysis -m symlink
skill apply preset ./agent-a web-dev -m symlink
```

Agent 的 `.skills/` 下会存在多个 Preset 子目录。

### 直接应用 Skill 列表（不经过 Preset）

```bash
skill apply skills <agent-path> <skill1> <skill2> -m copy -p my-preset
```

`-p` 指定放到 `.skills/` 下的子目录名。

### 查看 Agent 已应用的 Skill

```bash
skill apply list <agent-path>
```

### 移除已应用的 Skill

```bash
skill apply remove <agent-path> <skill1> <skill2> -p <preset-name>
```

## 配置

```bash
# 查看当前配置
skill config show

# 修改全局仓库路径
skill config set-repo <new-path>
```

## 架构说明

```
~/.config/skill-manager/
├── config.json            # 配置文件
└── repository/            # 全局 Skill 仓库
    ├── skill-a/
    │   └── SKILL.md
    └── skill-b/
        └── SKILL.md

<agent-project>/
└── .skills/               # Agent 本地 Skill 挂载点
    ├── preset-1/
    │   ├── skill-a -> 仓库软链接
    │   └── skill-b -> 仓库软链接
    └── preset-2/
        └── skill-c -> 仓库软链接
```

## 注意事项

- `skill apply` 默认使用 `symlink` 模式，不会复制文件
- 切换 `copy` 模式会完整复制 skill 目录，Agent 可独立修改
- 如果目标 skill 已存在，`apply` 会覆盖更新
- Preset 的 `--add-skills` 和 `--remove-skills` 是增量操作，不会覆盖已有列表

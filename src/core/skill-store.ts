import { readdir, readFile, stat, mkdir, copyFile, symlink } from "node:fs/promises";
import { join, relative } from "node:path";
import { existsSync } from "node:fs";
import { SkillMeta, SkillMetaSchema } from "../types.js";

export class SkillStore {
  constructor(private repositoryPath: string) {}

  async init(): Promise<void> {
    if (!existsSync(this.repositoryPath)) {
      await mkdir(this.repositoryPath, { recursive: true });
    }
  }

  async listSkills(): Promise<SkillMeta[]> {
    await this.init();
    const entries = await readdir(this.repositoryPath, { withFileTypes: true });
    const skills: SkillMeta[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = join(this.repositoryPath, entry.name);
      const meta = await this.readSkillMeta(skillPath);
      if (meta) skills.push(meta);
    }

    return skills;
  }

  async getSkill(name: string): Promise<SkillMeta | null> {
    const skills = await this.listSkills();
    return skills.find((s) => s.name === name) ?? null;
  }

  async addSkill(sourcePath: string): Promise<SkillMeta> {
    await this.init();
    const meta = await this.readSkillMeta(sourcePath);
    if (!meta) {
      throw new Error(`No valid SKILL.md found at ${sourcePath}`);
    }
    if (await this.getSkill(meta.name)) {
      throw new Error(`Skill "${meta.name}" already exists in repository`);
    }

    const destDir = join(this.repositoryPath, meta.name);
    if (existsSync(destDir)) {
      throw new Error(`Directory ${destDir} already exists`);
    }

    await mkdir(destDir, { recursive: true });
    await this.copyDir(sourcePath, destDir);
    return meta;
  }

  async removeSkill(name: string): Promise<void> {
    const skill = await this.getSkill(name);
    if (!skill) throw new Error(`Skill "${name}" not found in repository`);

    const { rm } = await import("node:fs/promises");
    await rm(skill.sourcePath, { recursive: true, force: true });
  }

  private async readSkillMeta(skillDir: string): Promise<SkillMeta | null> {
    const skillMdPath = join(skillDir, "SKILL.md");
    if (!existsSync(skillMdPath)) return null;

    const content = await readFile(skillMdPath, "utf-8");
    const frontmatter = this.parseFrontmatter(content);
    if (!frontmatter) return null;

    const raw: Record<string, unknown> = { ...frontmatter, sourcePath: skillDir };
    const result = SkillMetaSchema.safeParse(raw);
    return result.success ? result.data : null;
  }

  private parseFrontmatter(content: string): Record<string, unknown> | null {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return null;

    const yaml = match[1];
    const result: Record<string, unknown> = {};
    let currentKey: string | null = null;
    let currentValue = "";
    let inMultiline = false;

    for (const line of yaml.split("\n")) {
      if (inMultiline) {
        if (line.startsWith("  ")) {
          currentValue += "\n" + line.slice(2);
          continue;
        }
        result[currentKey!] = currentValue.trim();
        inMultiline = false;
      }

      const keyMatch = line.match(/^(\w+):\s*(.*)/);
      if (keyMatch) {
        currentKey = keyMatch[1];
        currentValue = keyMatch[2];
        if (currentValue === "") {
          inMultiline = true;
          currentValue = "";
        } else {
          currentValue = currentValue.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
          result[currentKey] = currentValue;
        }
      }
    }

    if (inMultiline && currentKey) {
      result[currentKey] = currentValue.trim();
    }

    return result;
  }

  private async copyDir(src: string, dest: string): Promise<void> {
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      if (entry.isDirectory()) {
        await mkdir(destPath, { recursive: true });
        await this.copyDir(srcPath, destPath);
      } else if (entry.isFile()) {
        await copyFile(srcPath, destPath);
      }
    }
  }
}

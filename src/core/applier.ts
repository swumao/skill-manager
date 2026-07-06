import { join } from "node:path";
import { mkdir, symlink, readlink, rm, readdir, copyFile } from "node:fs/promises";
import { existsSync, lstatSync } from "node:fs";
import { SkillStore } from "./skill-store.js";
import { ApplyModeT } from "../types.js";

export class Applier {
  constructor(private skillStore: SkillStore) {}

  async apply(
    agentPath: string,
    skills: string[],
    mode: ApplyModeT,
    presetName?: string
  ): Promise<void> {
    const agentSkillsDir = join(agentPath, ".skills");
    if (!existsSync(agentSkillsDir)) {
      await mkdir(agentSkillsDir, { recursive: true });
    }

    const presetDir = presetName
      ? join(agentSkillsDir, presetName)
      : agentSkillsDir;

    if (!existsSync(presetDir)) {
      await mkdir(presetDir, { recursive: true });
    }

    for (const skillName of skills) {
      const skill = await this.skillStore.getSkill(skillName);
      if (!skill) {
        console.warn(`⚠ Skill "${skillName}" not found in repository, skipping`);
        continue;
      }

      const linkPath = join(presetDir, skillName);

      if (existsSync(linkPath)) {
        const existing = lstatSync(linkPath);
        if (existing.isSymbolicLink()) {
          const target = await readlink(linkPath);
          if (target === skill.sourcePath) continue;
          await rm(linkPath);
        } else if (existing.isDirectory()) {
          await rm(linkPath, { recursive: true, force: true });
        }
      }

      if (mode === "symlink") {
        await symlink(skill.sourcePath, linkPath);
      } else {
        await this.copyDir(skill.sourcePath, linkPath);
      }
    }
  }

  async listApplied(agentPath: string): Promise<{ preset: string; skills: string[] }[]> {
    const agentSkillsDir = join(agentPath, ".skills");
    if (!existsSync(agentSkillsDir)) return [];

    const entries = await readdir(agentSkillsDir, { withFileTypes: true });
    const result: { preset: string; skills: string[] }[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const presetDir = join(agentSkillsDir, entry.name);
        const skills = await readdir(presetDir);
        result.push({ preset: entry.name, skills });
      }
    }

    return result;
  }

  async remove(agentPath: string, skills: string[], presetName?: string): Promise<void> {
    const agentSkillsDir = join(agentPath, ".skills");
    if (!existsSync(agentSkillsDir)) return;

    const presetDir = presetName
      ? join(agentSkillsDir, presetName)
      : agentSkillsDir;

    if (!existsSync(presetDir)) return;

    for (const skillName of skills) {
      const linkPath = join(presetDir, skillName);
      if (existsSync(linkPath)) {
        await rm(linkPath, { recursive: true, force: true });
      }
    }
  }

  private async copyDir(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath);
      } else if (entry.isFile()) {
        await copyFile(srcPath, destPath);
      }
    }
  }
}

import { z } from "zod";

export const SkillMetaSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  description: z.string(),
  sourcePath: z.string(),
});
export type SkillMeta = z.infer<typeof SkillMetaSchema>;

export const ApplyMode = z.enum(["symlink", "copy"]);
export type ApplyModeT = z.infer<typeof ApplyMode>;

export const AgentConfigSchema = z.object({
  agentPath: z.string(),
  applyMode: ApplyMode.default("symlink"),
  skills: z.array(z.string()),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const PresetSchema = z.object({
  name: z.string().min(1, "Preset name is required"),
  description: z.string().default(""),
  skills: z.array(z.string()).default([]),
});
export type Preset = z.infer<typeof PresetSchema>;

export const SkillManagerConfigSchema = z.object({
  globalRepository: z.string(),
  defaultApplyMode: ApplyMode.default("symlink"),
  defaultIncludeSelf: z.boolean().default(true),
  presets: z.record(z.string(), PresetSchema).default({}),
  agents: z.record(z.string(), AgentConfigSchema).default({}),
});
export type SkillManagerConfig = z.infer<typeof SkillManagerConfigSchema>;

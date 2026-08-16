import type { Skill, SkillKind, SkillLevel } from "./types";

export const LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced", "expert"];

export const LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: "text-slate-500",
  intermediate: "text-sky-600",
  advanced: "text-forge-700",
  expert: "text-purple-700",
};

export function skillKindLabel(kind: SkillKind): string {
  return kind === "capability" ? "Capability" : "Tech";
}

export function skillLevelLabel(level: SkillLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/** Groups a project's skills into capability and tech buckets (preserves order). */
export function splitSkills(skills: Skill[] | undefined): { capability: Skill[]; tech: Skill[] } {
  if (!skills) return { capability: [], tech: [] };
  return {
    capability: skills.filter((s) => s.kind === "capability"),
    tech: skills.filter((s) => s.kind === "tech"),
  };
}
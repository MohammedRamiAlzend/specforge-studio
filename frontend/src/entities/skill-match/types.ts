export interface MatchedSkill {
  skill_id: string;
  name: string;
  kind: string;
  tag: string | null;
  score: number;
  reasons: string[];
}

export interface TaskSkillMatch {
  task_id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  skills: MatchedSkill[];
}

export interface SkillCoverageGap {
  skill_id: string;
  name: string;
  kind: string;
  open_matches: number;
  total_matches: number;
}

export interface SkillMatchReport {
  project_id: string;
  task_count: number;
  skill_count: number;
  matches: TaskSkillMatch[];
  unmatched_tasks: string[];
  coverage_gaps: SkillCoverageGap[];
}

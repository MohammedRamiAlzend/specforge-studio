import { BLOCK_HINTS, BLOCK_LABELS, BLOCK_ORDER, groupByBlock } from "./lib";
import type { BmcNote } from "./types";

export function businessModelJson(notes: BmcNote[], projectId: string) {
  const grouped = groupByBlock(notes);
  return JSON.stringify({
    schema: "specforge.business-model.v1",
    project_id: projectId,
    exported_at: new Date().toISOString(),
    blocks: BLOCK_ORDER.map((block) => ({
      key: block,
      label: BLOCK_LABELS[block],
      hint: BLOCK_HINTS[block],
      notes: grouped[block],
    })),
  }, null, 2);
}

export function businessModelMarkdown(notes: BmcNote[], projectId: string, projectName?: string) {
  const grouped = groupByBlock(notes);
  const title = projectName ? `# Business Model Canvas — ${projectName}` : "# Business Model Canvas";
  const lines = [
    title,
    "",
    `> Exported from SpecForge Studio for project \`${projectId}\`.`,
    "",
    "## Canvas overview",
    "",
    "| Block | Notes |",
    "| --- | ---: |",
    ...BLOCK_ORDER.map((block) => `| ${BLOCK_LABELS[block]} | ${grouped[block].length} |`),
    "",
  ];
  for (const block of BLOCK_ORDER) {
    lines.push(`## ${BLOCK_LABELS[block]}`, "", `_${BLOCK_HINTS[block]}_`, "");
    if (grouped[block].length === 0) {
      lines.push("_No notes captured yet._", "");
      continue;
    }
    for (const note of grouped[block]) {
      lines.push(`- ${note.content}`, `  - Note ID: \`${note.id}\` · Color: ${note.color ?? "yellow"} · Position: (${note.position_x ?? 0}, ${note.position_y ?? 0})`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

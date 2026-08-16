// ---------------------------------------------------------------------------
// Markdown helpers for the document generator. Output is English-only,
// portable, agent-readable, and always starts with YAML frontmatter (WS-003).
// ---------------------------------------------------------------------------

export type FrontmatterValue = string | string[] | boolean | number | null | undefined;

function yamlScalar(value: FrontmatterValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value.map((v) => `  - ${String(v).replace(/"/g, '\\"')}`).join("\n");
  }
  const s = String(value);
  // Quote when YAML would otherwise parse it as a non-string.
  if (/^[\s]*$/.test(s) || /[:#\[\]{}&*!|>'"%@`]/.test(s) || /^\d/.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

/** Builds a YAML frontmatter block (WS-003 mandatory fields). */
export function frontmatter(meta: Record<string, FrontmatterValue>): string {
  const keys = ["id", "title", "type", "status", "project", "related", "updated"];
  const ordered: Record<string, FrontmatterValue> = {};
  for (const key of keys) {
    if (meta[key] !== undefined && meta[key] !== null) ordered[key] = meta[key];
  }
  for (const [key, value] of Object.entries(meta)) {
    if (!(key in ordered)) ordered[key] = value;
  }
  const lines = ["---"];
  for (const [key, value] of Object.entries(ordered)) {
    if (value === null || value === undefined) continue;
    const rendered = yamlScalar(value);
    if (rendered === "") continue;
    if (key === "related" && Array.isArray(value)) {
      lines.push(`related:`);
      lines.push(rendered);
    } else {
      lines.push(`${key}: ${rendered}`);
    }
  }
  lines.push("---");
  return lines.join("\n") + "\n\n";
}

export function h(level: 1 | 2 | 3 | 4, text: string): string {
  return `${"#".repeat(level)} ${text}\n\n`;
}

export function p(text: string): string {
  return `${text}\n\n`;
}

export function ul(items: (string | undefined | null)[]): string {
  const filtered = items.filter((i): i is string => Boolean(i));
  if (filtered.length === 0) return "";
  return filtered.map((item) => `- ${item}`).join("\n") + "\n";
}

export function ol(items: (string | undefined | null)[]): string {
  const filtered = items.filter((i): i is string => Boolean(i));
  if (filtered.length === 0) return "";
  return filtered.map((item, index) => `${index + 1}. ${item}`).join("\n") + "\n";
}

export function codeBlock(language: string, code: string): string {
  return "```" + language + "\n" + code.replace(/\n$/, "") + "\n```\n\n";
}

/** Mermaid fenced block (generated from structured data, never hand-written). */
export function mermaidBlock(code: string): string {
  return codeBlock("mermaid", code);
}

export function table(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const headerLine = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${row.map((cell) => String(cell ?? "—")).join(" | ")} |`)
    .join("\n");
  return `${headerLine}\n${separator}\n${body}\n`;
}

export function divider(): string {
  return "---\n";
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Detects the "protected" marker that preserves manual edits on regeneration. */
export function isProtectedContent(content: string): boolean {
  return (
    content.includes("<!-- protected -->") || content.includes("\nprotected: true\n")
  );
}

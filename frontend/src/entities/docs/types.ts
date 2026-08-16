export interface DocsFileMeta {
  path: string;
  bytes: number;
}

export interface DocsFile {
  path: string;
  content: string;
  bytes: number;
}

export interface DocsExport {
  id: string;
  project_id: string;
  status: "generated" | "superseded" | "archived";
  file_count: number;
  files: DocsFileMeta[];
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface DocsExportDetail extends DocsExport {
  files: DocsFile[];
}

export interface GenerateDocsInput {
  project_id: string;
}

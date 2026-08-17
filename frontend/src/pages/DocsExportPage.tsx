import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useDeleteDocsExport,
  useDocsExport,
  useDocsExports,
  useDownloadDocsExport,
  useGenerateDocs,
} from "../entities/docs/api";
import type { DocsExport } from "../entities/docs/types";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { PageHeader } from "../shared/ui/PageHeader";
import { EmptyState, ErrorState } from "../shared/ui/States";
import { Spinner } from "../shared/ui/Spinner";
import { StatusBadge } from "../shared/ui/Badge";
import { formatDate } from "../shared/lib/format";

function FolderIcon({ open }: { open: boolean }) {
  return <span className="text-slate-400">{open ? "▾" : "▸"}</span>;
}

export function DocsExportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data: exports, isLoading, error, refetch } = useDocsExports(projectId);
  const generate = useGenerateDocs();
  const deleteExport = useDeleteDocsExport();
  const download = useDownloadDocsExport();

  const selectedDetail = useDocsExport(expandedId ?? undefined);

  if (!projectId) return <ErrorState message="Missing project id" />;

  const handleGenerate = async () => {
    const detail = await generate.mutateAsync({ project_id: projectId });
    setExpandedId(detail.id);
    setSelectedPath(detail.files[0]?.path ?? null);
  };

  const handleDownload = async (id: string) => {
    setDownloadError(null);
    try {
      await download.mutateAsync(id);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleExpand = (exp: DocsExport) => {
    if (expandedId === exp.id) {
      setExpandedId(null);
      setSelectedPath(null);
    } else {
      setExpandedId(exp.id);
      setSelectedPath(exp.files[0]?.path ?? null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Docs Export"
        description="The generated Markdown workspace for this project — English-only, with stable IDs, YAML frontmatter, and Mermaid diagrams."
        actions={
          <Button size="sm" loading={generate.isPending} onClick={() => void handleGenerate()}>
            Generate workspace
          </Button>
        }
      />

      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        Generation reads the database as source of truth and writes the folder export to the
        server. Files marked <code className="rounded bg-white px-1 font-mono text-slate-700">{"<!-- protected -->"}</code> keep manual edits on regeneration.
      </div>

      {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}

      {downloadError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          Download failed: {downloadError}
        </div>
      ) : null}

      {isLoading || !exports ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-14">
          <Spinner className="h-5 w-5 text-slate-400" />
        </div>
      ) : exports.length === 0 ? (
        <EmptyState
          title="No workspace generated yet"
          hint="Generate the full Markdown workspace: README, agent guide, planning, requirements, design (HLD/LLD/ERD/workflows/API), testing, ops, guides, governance, and agent task packs."
          actionLabel="Generate workspace"
          onAction={() => void handleGenerate()}
        />
      ) : (
        <div className="space-y-3">
          {exports.map((exp) => {
            const isOpen = expandedId === exp.id;
            const detail = selectedDetail.data;
            const files = isOpen && detail?.id === exp.id ? detail.files : null;
            const selected = files?.find((f) => f.path === selectedPath);

            return (
              <Card key={exp.id}>
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => handleExpand(exp)}>
                    <div className="flex items-center gap-2">
                      <FolderIcon open={isOpen} />
                      <span className="truncate text-sm font-medium text-slate-900 hover:text-forge-700">
                        Workspace {exp.id}
                      </span>
                      <StatusBadge status={exp.status} />
                    </div>
                    <p className="mt-0.5 pl-4 text-[11px] text-slate-400">
                      {exp.file_count} files · generated {formatDate(exp.generated_at)}
                    </p>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={download.isPending}
                    onClick={() => void handleDownload(exp.id)}
                  >
                    Download ZIP
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    loading={deleteExport.isPending}
                    onClick={() => void deleteExport.mutateAsync({ id: exp.id, projectId })}
                  >
                    Delete
                  </Button>
                </div>

                {isOpen ? (
                  <div className="grid border-t border-slate-100 md:grid-cols-[260px_1fr]">
                    <div className="max-h-[480px] overflow-y-auto border-r border-slate-100 p-2">
                      {files === null ? (
                        <div className="flex items-center justify-center py-8">
                          <Spinner className="h-4 w-4 text-slate-400" />
                        </div>
                      ) : (
                        files.map((file) => {
                          const active = file.path === selectedPath;
                          return (
                            <button
                              key={file.path}
                              type="button"
                              onClick={() => setSelectedPath(file.path)}
                              className={`block w-full truncate rounded-md px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors ${
                                active
                                  ? "bg-forge-50 text-forge-800"
                                  : "text-slate-600 hover:bg-slate-50"
                              }`}
                              title={file.path}
                            >
                              {file.path}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="min-w-0">
                      {selected ? (
                        <pre className="max-h-[480px] overflow-auto bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-200">
                          {selected.content}
                        </pre>
                      ) : (
                        <div className="flex items-center justify-center py-10 text-xs text-slate-400">
                          Select a file to view it.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

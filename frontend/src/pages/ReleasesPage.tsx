import { useState } from "react";
import { useParams } from "react-router-dom";
import { useCreateRelease, useDeleteRelease, useReleases, useUpdateRelease } from "../entities/release/api";
import { RELEASE_STATUSES, nextReleaseStatus, releaseStatusLabel } from "../entities/release/lib";
import type { Release, ReleaseStatus } from "../entities/release/types";
import { Button } from "../shared/ui/Button";
import { Card, CardHeader } from "../shared/ui/Card";
import { PageHeader } from "../shared/ui/PageHeader";
import { EmptyState } from "../shared/ui/States";
import { Spinner } from "../shared/ui/Spinner";
import { StatusBadge } from "../shared/ui/Badge";
import { formatDate } from "../shared/lib/format";
import { errorMessage } from "../shared/api/client";

const fieldClass =
  "rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

interface Draft {
  version: string;
  name: string;
  status: ReleaseStatus;
  notes: string;
}

const emptyDraft: Draft = { version: "", name: "", status: "planned", notes: "" };

export function ReleasesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: releases, isLoading, error, refetch } = useReleases(projectId);
  const createRelease = useCreateRelease(projectId);
  const updateRelease = useUpdateRelease(projectId);
  const deleteRelease = useDeleteRelease(projectId);
  const [draft, setDraft] = useState<Draft | null>(null);

  const submit = () => {
    if (!draft || !projectId || !draft.version.trim() || !draft.name.trim()) return;
    createRelease.mutate(
      {
        version: draft.version.trim(),
        name: draft.name.trim(),
        status: draft.status,
        notes: draft.notes.trim() || undefined,
        ...(draft.status === "released" ? { released_at: new Date().toISOString() } : {}),
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  const advance = (release: Release) => {
    const next = nextReleaseStatus(release.status);
    if (next) {
      updateRelease.mutate({
        id: release.id,
        status: next,
        ...(next === "released" ? { released_at: new Date().toISOString() } : {}),
      });
    }
  };

  const mutationError = createRelease.isError
    ? errorMessage(createRelease.error)
    : updateRelease.isError
      ? errorMessage(updateRelease.error)
      : deleteRelease.isError
        ? errorMessage(deleteRelease.error)
        : null;

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Releases" description="Versioned release artifacts with release notes." />
        <div className="text-sm text-rose-600">
          {error.message}
          <button className="ml-2 underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Releases"
        description="Plan, ship, and archive project releases."
        actions={
          <Button size="sm" onClick={() => setDraft((d) => (d ? null : { ...emptyDraft }))}>
            {draft ? "Cancel" : "New release"}
          </Button>
        }
      />

      {draft ? (
        <Card>
          <CardHeader title="New release" description="Create a versioned release artifact." />
          <div className="grid gap-3 px-5 py-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                className={fieldClass}
                placeholder="Version (e.g. 1.0.0)"
                value={draft.version}
                onChange={(e) => setDraft({ ...draft, version: e.target.value })}
                aria-label="Release version"
              />
              <input
                className={fieldClass}
                placeholder="Name (e.g. MVP launch)"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                aria-label="Release name"
              />
              <select
                className={fieldClass}
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as ReleaseStatus })}
                aria-label="Release status"
              >
                {RELEASE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {releaseStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className={`${fieldClass} resize-none`}
              rows={2}
              placeholder="Release notes (optional)"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              aria-label="Release notes"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                loading={createRelease.isPending}
                disabled={draft.version.trim() === "" || draft.name.trim() === ""}
                onClick={submit}
              >
                Create release
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {mutationError ? <p className="text-xs text-rose-600">{mutationError}</p> : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : !releases || releases.length === 0 ? (
        <EmptyState
          title="No releases yet"
          hint="Plan the first release of this project and track it through to shipped."
          actionLabel="New release"
          onAction={() => setDraft({ ...emptyDraft })}
        />
      ) : (
        <div className="space-y-3">
          {releases.map((release) => (
            <Card key={release.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{release.id}</span>
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs text-white">
                      v{release.version}
                    </span>
                    <StatusBadge status={release.status} />
                  </div>
                  <h3 className="mt-1.5 text-sm font-medium text-slate-900">{release.name}</h3>
                  {release.notes ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{release.notes}</p> : null}
                  <p className="mt-2 text-[11px] text-slate-400">
                    Created {formatDate(release.created_at)}
                    {release.released_at ? ` · Released ${formatDate(release.released_at)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!nextReleaseStatus(release.status)}
                    onClick={() => advance(release)}
                  >
                    {release.status === "planned" ? "Start →" : "Ship →"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteRelease.mutate(release.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

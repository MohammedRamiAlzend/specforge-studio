import { useState } from "react";
import {
  useCreateTeamMember,
  useDeleteTeamMember,
  useTeamMembers,
  useUpdateTeamMember,
} from "../../entities/team-member/api";
import type { TeamMember } from "../../entities/team-member/types";
import { Button } from "../../shared/ui/Button";
import { Card, CardHeader } from "../../shared/ui/Card";
import { Spinner } from "../../shared/ui/Spinner";
import { errorMessage } from "../../shared/api/client";

const fieldClass =
  "rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

interface Draft {
  id: string | null;
  name: string;
  email: string;
  role: string;
}

const emptyDraft: Draft = { id: null, name: "", email: "", role: "" };

export function TeamSection({ projectId }: { projectId: string }) {
  const { data: members, isLoading, error, refetch } = useTeamMembers(projectId);
  const createMember = useCreateTeamMember(projectId);
  const updateMember = useUpdateTeamMember(projectId);
  const deleteMember = useDeleteTeamMember(projectId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const mutationError = createMember.isError
    ? errorMessage(createMember.error)
    : updateMember.isError
      ? errorMessage(updateMember.error)
      : deleteMember.isError
        ? errorMessage(deleteMember.error)
        : null;

  const submit = () => {
    if (!draft || !draft.name.trim()) return;
    const input = {
      name: draft.name.trim(),
      email: draft.email.trim() || null,
      role: draft.role.trim() || null,
    };
    if (draft.id === null) {
      createMember.mutate(input, { onSuccess: () => setDraft(null) });
    } else {
      updateMember.mutate({ ...input, id: draft.id }, { onSuccess: () => setDraft(null) });
    }
  };

  const remove = (id: string) => {
    setBusyId(id);
    deleteMember.mutate(id, { onSettled: () => setBusyId(null) });
  };

  return (
    <Card>
      <CardHeader
        title="Team"
        description="Who is working on this project. Members can be assigned to tasks and issues."
        actions={
          <Button size="sm" variant="secondary" onClick={() => setDraft(emptyDraft)}>
            Add member
          </Button>
        }
      />
      {mutationError ? <p className="px-5 pt-3 text-xs text-rose-600">{mutationError}</p> : null}
      <div className="divide-y divide-slate-100 px-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        ) : error ? (
          <div className="py-6 text-center text-xs text-rose-600">
            {error.message}
            <button className="ml-2 underline" onClick={() => void refetch()}>
              Retry
            </button>
          </div>
        ) : !members || members.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            No team members yet. Add the people who will own tasks and issues.
          </p>
        ) : (
          members.map((member) => (
            <div key={member.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-400">{member.id}</span>
                  <span className="text-sm font-medium text-slate-900">{member.name}</span>
                  {member.role ? (
                    <span className="rounded-full bg-forge-50 px-2 py-0.5 text-[11px] font-medium text-forge-700">
                      {member.role}
                    </span>
                  ) : null}
                </div>
                {member.email ? (
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">{member.email}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDraft({
                      id: member.id,
                      name: member.name,
                      email: member.email ?? "",
                      role: member.role ?? "",
                    })
                  }
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" loading={busyId === member.id} onClick={() => remove(member.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
        {draft ? (
          <div className="grid gap-2 py-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                className={fieldClass}
                placeholder="Full name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                aria-label="Member name"
              />
              <input
                className={fieldClass}
                placeholder="Email (optional)"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                aria-label="Member email"
              />
              <input
                className={fieldClass}
                placeholder="Role (e.g. Frontend engineer)"
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                aria-label="Member role"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                loading={createMember.isPending || updateMember.isPending}
                disabled={draft.name.trim() === ""}
                onClick={submit}
              >
                {draft.id === null ? "Add member" : "Save changes"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

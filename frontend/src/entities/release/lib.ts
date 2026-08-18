import type { ReleaseStatus } from "./types";

export const RELEASE_STATUSES: ReleaseStatus[] = ["planned", "in_progress", "released", "archived"];

/** Next status in the release lifecycle, or null when the release is terminal. */
export function nextReleaseStatus(status: ReleaseStatus): ReleaseStatus | null {
  switch (status) {
    case "planned":
      return "in_progress";
    case "in_progress":
      return "released";
    default:
      return null;
  }
}

export function releaseStatusLabel(status: ReleaseStatus): string {
  return status.replace(/_/g, " ");
}

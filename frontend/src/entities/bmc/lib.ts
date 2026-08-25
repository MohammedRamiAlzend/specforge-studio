import type { BmcBlock, BmcNote } from "./types";

/** Canonical canvas order used for rendering and docs. */
export const BLOCK_ORDER: BmcBlock[] = [
  "key_partners",
  "key_activities",
  "key_resources",
  "value_propositions",
  "customer_relationships",
  "channels",
  "customer_segments",
  "cost_structure",
  "revenue_streams",
];

export const BLOCK_LABELS: Record<BmcBlock, string> = {
  key_partners: "Key Partners",
  key_activities: "Key Activities",
  key_resources: "Key Resources",
  value_propositions: "Value Propositions",
  customer_relationships: "Customer Relationships",
  channels: "Channels",
  customer_segments: "Customer Segments",
  cost_structure: "Cost Structure",
  revenue_streams: "Revenue Streams",
};

export const BLOCK_HINTS: Record<BmcBlock, string> = {
  key_partners: "Who helps you deliver?",
  key_activities: "What must you do well?",
  key_resources: "What assets do you need?",
  value_propositions: "Why do customers choose you?",
  customer_relationships: "How do you engage each segment?",
  channels: "How do you reach customers?",
  customer_segments: "Who are you serving?",
  cost_structure: "What drives your costs?",
  revenue_streams: "How does the business earn?",
};

/** Groups notes by block in canonical order. */
export function groupByBlock(notes: BmcNote[]): Record<BmcBlock, BmcNote[]> {
  const grouped = Object.fromEntries(
    BLOCK_ORDER.map((block) => [block, []]),
  ) as unknown as Record<BmcBlock, BmcNote[]>;
  for (const note of notes) grouped[note.block].push(note);
  return grouped;
}

/**
 * Canvas layout bands (top to bottom): partners / activities+resources /
 * value props band, relationships / channels / segments band, then the
 * costs/revenues split.
 */
export const BANDS: BmcBlock[][] = [
  ["key_partners", "key_activities", "key_resources", "value_propositions"],
  ["customer_relationships", "channels", "customer_segments"],
  ["cost_structure", "revenue_streams"],
];

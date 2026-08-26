import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";

export interface AdminOverview {
  operations: {
    database: string;
    smtp: string;
    smtp_missing: string[];
    migration_version: string;
    backup: string;
    checked_at: string;
  };
  counts: {
    users: number;
    verified_users: number;
    active_subscriptions: number;
    invoices: number;
    projects: number;
  };
  recent_audit_events: Array<{
    entity_type: string;
    entity_id: string;
    action: string;
    actor: string;
    created_at: string;
  }>;
}

export interface AdminPlan {
  id: string;
  key: string;
  name: string;
  tagline: string;
  monthly_price_cents: number;
  yearly_price_cents: number;
  features: string;
  popular: number;
  active: number;
  sort_order: number;
  updated_at: string;
}

export interface AdminInvoice {
  id: string;
  user_id: string;
  email: string;
  name: string;
  plan_key: string;
  cycle: "monthly" | "yearly";
  amount_cents: number;
  card_last4: string;
  status: "paid" | "refunded";
  description: string;
  created_at: string;
}

export interface AdminAiProviderSettings {
  id: string;
  provider: "openai" | "anthropic" | "gemini";
  model: string;
  secret_ref: string;
  managed_enabled: number;
  monthly_generations: number;
  monthly_tokens: number;
  max_context_tokens: number;
  max_output_tokens: number;
  estimated_input_cost_micros: number;
  estimated_output_cost_micros: number;
  hard_stop_micros: number;
  privacy_notice: string;
  updated_by: string | null;
  updated_at: string;
}

export interface AdminSubscription {
  id: string;
  user_id: string;
  email: string;
  name: string;
  plan_key: string;
  plan_name: string;
  cycle: "monthly" | "yearly";
  status: "active" | "canceled";
  card_last4: string;
  started_at: string;
  current_period_end: string;
  canceled_at: string | null;
}

export function useAdminOverview(enabled = true) {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => api<AdminOverview>("/admin/overview"),
    enabled,
  });
}

export function useAdminAiProvider(enabled = true) {
  return useQuery({ queryKey: ["admin", "ai-provider"], queryFn: () => api<AdminAiProviderSettings>("/admin/ai-provider"), enabled });
}

export function useAdminAiProviderUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Omit<AdminAiProviderSettings, "id" | "updated_by" | "updated_at" | "secret_ref">> & { secret_ref?: string }) => api<AdminAiProviderSettings>("/admin/ai-provider", { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "ai-provider"] }),
  });
}

export function useAdminPlans(enabled = true) {
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => api<AdminPlan[]>("/admin/plans"),
    enabled,
  });
}

export function useAdminInvoices(search = "", enabled = true) {
  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return useQuery({
    queryKey: ["admin", "invoices", search],
    queryFn: () => api<AdminInvoice[]>(`/admin/invoices${suffix}`),
    enabled,
  });
}

export function useAdminSubscriptions(filters: { search?: string; status?: string } = {}, enabled = true) {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return useQuery({
    queryKey: ["admin", "subscriptions", filters],
    queryFn: () => api<AdminSubscription[]>(`/admin/subscriptions${suffix}`),
    enabled,
  });
}

export function useAdminSubscriptionAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "cancel" | "reactivate" }) =>
      api<{ id: string; status: string }>(`/admin/subscriptions/${id}/${action}`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

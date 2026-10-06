import { apiClient } from "@/lib/api/client";

export interface PlanDefinition {
  id: "starter" | "developer" | "professional" | "business";
  name: string;
  price_idr: number;
  price_formatted: string;
  price_usd_equiv: string;
  billing_period: string;
  max_projects: number;
  max_services: number;
  memory_mb_per_service: number;
  cpu_share: number;
  highlight: string;
  is_popular: boolean;
  features: string[];
}

export interface PaymentMethodRecord {
  id: string;
  type: "card" | "qris" | "va" | "ewallet" | "other";
  brand: string;
  last4: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  plan_id: string;
  plan_name: string;
  amount_idr: number;
  amount_usd: string;
  payment_method: string;
  status: "paid" | "pending" | "failed" | "cancelled";
  paid_at?: string | null;
  period_end?: string | null;
  created_at: string;
}

export interface CheckoutResponse {
  invoice: Invoice;
  snap_token: string;
  snap_redirect_url?: string;
  client_key?: string;
  is_production: boolean;
  simulated: boolean;
}

export interface SubscriptionResponse {
  plan: PlanDefinition;
  projects_count: number;
  services_count: number;
  next_billing_date: string;
  credit_balance_idr: number;
  payment_method?: PaymentMethodRecord | null;
  pending_invoice?: Invoice | null;
  simulation_mode?: boolean;
}

export async function getPlansApi(): Promise<PlanDefinition[]> {
  return apiClient<PlanDefinition[]>("/billing/plans");
}

export async function getSubscriptionApi(): Promise<SubscriptionResponse> {
  return apiClient<SubscriptionResponse>("/billing/subscription");
}

export async function getInvoicesApi(): Promise<Invoice[]> {
  return apiClient<Invoice[]>("/billing/invoices");
}

export async function checkoutApi(data: { plan_id: string }): Promise<CheckoutResponse> {
  return apiClient<CheckoutResponse>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function simulatePaymentApi(invoiceId: string): Promise<Invoice> {
  return apiClient<Invoice>(`/billing/invoices/${invoiceId}/simulate-payment`, {
    method: "POST",
  });
}

// Safety net for missed Midtrans webhooks: ask the backend to pull the
// transaction status straight from Midtrans and settle the invoice locally.
export async function syncInvoiceStatusApi(invoiceId: string): Promise<Invoice> {
  return apiClient<Invoice>(`/billing/invoices/${invoiceId}/sync`, {
    method: "POST",
  });
}

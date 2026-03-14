/**
 * bankApi.ts
 * ----------
 * All bank-related API calls to your FastAPI backend.
 * Import from this file in every bank page/component.
 *
 * Place at: src/services/bankApi.ts  (or lib/bankApi.ts)
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────

export interface BankAccount {
  bank: "ICICI" | "SBI" | "HDFC";
  account_id: string;
  account_number: string;
  ifsc: string;
  account_type: "SAVINGS" | "CURRENT" | "SALARY";
  balance: number;
  status: string;
  holder_name: string;
}

export interface Transaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balance_after: number;
  remarks: string;
  ref_number: string;
  status: string;
  date: string;
}

export interface TransferPayload {
  to_account_number: string;
  to_ifsc: string;
  amount: number;
  remarks?: string;
}

export interface TransferResult {
  tx_id: string;
  ref_number: string;
  amount: number;
  balance_after: number;
  to_account: string;
  to_ifsc: string;
  timestamp: string;
  status: string;
}

// ── Auth helper ───────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Request failed (${res.status})`);
  }
  return res.json();
}

// ── API calls ─────────────────────────────────────────────────

/** Save user's phone number (call once after first login) */
export async function linkPhone(phone: string): Promise<void> {
  const res = await fetch(`${BASE}/api/bank/link-phone`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ phone }),
  });
  await handleResponse(res);
}

/** Fetch all accounts across ICICI, SBI, HDFC for the logged-in user */
export async function fetchAllAccounts(): Promise<BankAccount[]> {
  const res = await fetch(`${BASE}/api/bank/accounts`, {
    headers: authHeaders(),
  });
  const data = await handleResponse<{ accounts: BankAccount[] }>(res);
  return data.accounts;
}

/** Get live balance for one account */
export async function fetchBalance(
  bank: string,
  accountId: string
): Promise<{ balance: number; account_number: string; ifsc: string; account_type: string }> {
  const res = await fetch(
    `${BASE}/api/bank/accounts/${bank}/${accountId}/balance`,
    { headers: authHeaders() }
  );
  return handleResponse(res);
}

/** Get paginated transaction history */
export async function fetchTransactions(
  bank: string,
  accountId: string,
  limit = 20,
  offset = 0
): Promise<{ transactions: Transaction[]; total: number }> {
  const res = await fetch(
    `${BASE}/api/bank/accounts/${bank}/${accountId}/transactions?limit=${limit}&offset=${offset}`,
    { headers: authHeaders() }
  );
  return handleResponse(res);
}

/** Initiate a bank transfer */
export async function initiateTransfer(
  bank: string,
  accountId: string,
  payload: TransferPayload
): Promise<TransferResult> {
  const res = await fetch(
    `${BASE}/api/bank/accounts/${bank}/${accountId}/transfer`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }
  );
  const data = await handleResponse<{ success: boolean } & TransferResult>(res);
  return data;
}

// ── UI helpers ────────────────────────────────────────────────

/** Returns Tailwind classes for each bank's card color scheme */
export function bankTheme(bank: string): {
  gradient: string;
  border: string;
  hoverBorder: string;
} {
  switch (bank.toUpperCase()) {
    case "HDFC":
      return {
        gradient: "from-red-600/20 to-orange-600/20",
        border: "border-red-500/30",
        hoverBorder: "hover:border-red-500/60",
      };
    case "ICICI":
      return {
        gradient: "from-orange-600/20 to-amber-600/20",
        border: "border-orange-500/30",
        hoverBorder: "hover:border-orange-500/60",
      };
    case "SBI":
      return {
        gradient: "from-blue-600/20 to-cyan-600/20",
        border: "border-blue-500/30",
        hoverBorder: "hover:border-blue-500/60",
      };
    default:
      return {
        gradient: "from-gray-600/20 to-gray-700/20",
        border: "border-gray-500/30",
        hoverBorder: "hover:border-gray-500/60",
      };
  }
}

/** "ICIC0001234" → "XXXX 1234" */
export function maskAccountNumber(accNum: string): string {
  if (!accNum) return "XXXX XXXX";
  const last4 = accNum.slice(-4);
  return `XXXX ${last4}`;
}

/** Full mask for detail page: "XXXX XXXX XXXX 1234" */
export function maskAccountNumberFull(accNum: string): string {
  if (!accNum) return "XXXX XXXX XXXX XXXX";
  const last4 = accNum.slice(-4);
  return `XXXX XXXX XXXX ${last4}`;
}

/** 1234567.89 → "₹12,34,567" (Indian format) */
export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/** "State Bank of India" for SBI, proper names for others */
export function bankDisplayName(bank: string): string {
  switch (bank.toUpperCase()) {
    case "SBI":   return "State Bank of India";
    case "ICICI": return "ICICI Bank";
    case "HDFC":  return "HDFC Bank";
    default:      return bank;
  }
}
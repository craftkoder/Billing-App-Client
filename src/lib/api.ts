import { apiRequest, API_BASE_URL } from "./http";
import type {
  VerifyOtpResult, AuthTokens, AuthUser,
  Business, BusinessCategory, TenantMember, BusinessDashboard,
  Customer, Paginated,
  Category, Product, ProductUnit,
  Invoice, CreateInvoiceInput,
  Expense,
  SalesSeries, RevenueSummary, AdminDashboard,
} from "./types";

// ── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  sendOtp: (phone: string) =>
    apiRequest<{ message: string }>("/auth/send-otp", { method: "POST", body: { phone }, anonymous: true }),

  verifyOtp: (phone: string, otp: string) =>
    apiRequest<VerifyOtpResult>("/auth/verify-otp", { method: "POST", body: { phone, otp }, anonymous: true }),

  refresh: (refreshToken: string) =>
    apiRequest<AuthTokens>("/auth/refresh-token", { method: "POST", body: { refreshToken }, anonymous: true }),

  logout: () => apiRequest<{ message: string }>("/auth/logout", { method: "POST" }),

  me: () => apiRequest<AuthUser>("/auth/me"),
};

// ── Business ────────────────────────────────────────────────────────────────

export interface CreateBusinessInput {
  businessName: string;
  category: BusinessCategory;
  phone: string;
  gstin?: string;
  email?: string;
  city: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  address?: string;
}

export const businessApi = {
  create: (input: CreateBusinessInput) =>
    apiRequest<Business>("/business", { method: "POST", body: input }),

  getMine: () => apiRequest<Business>("/business/me"),

  update: (input: Partial<Omit<CreateBusinessInput, "phone">>) =>
    apiRequest<Business>("/business/me", { method: "PATCH", body: input }),

  dashboard: () => apiRequest<BusinessDashboard>("/business/me/dashboard"),

  inviteMember: (input: { phone: string; role: "MANAGER" | "CASHIER" | "VIEWER"; name?: string }) =>
    apiRequest<TenantMember>("/business/me/members/invite", { method: "POST", body: input }),

  listMembers: () => apiRequest<TenantMember[]>("/business/me/members"),

  removeMember: (userId: string) =>
    apiRequest<{ deleted: boolean }>(`/business/me/members/${userId}`, { method: "DELETE" }),

  updateMemberRole: (userId: string, role: "MANAGER" | "CASHIER" | "VIEWER") =>
    apiRequest<TenantMember>(`/business/me/members/${userId}/role`, { method: "PATCH", body: { role } }),
};

// ── Customers ───────────────────────────────────────────────────────────────

export interface CreateCustomerInput {
  phone: string;
  name?: string;
  email?: string;
  gstin?: string;
  address?: string;
  tags?: string[];
  notes?: string;
}

export interface CustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "name" | "createdAt" | "outstandingBalance";
  sortOrder?: "asc" | "desc";
  tag?: string;
}

export const customersApi = {
  create: (input: CreateCustomerInput) =>
    apiRequest<Customer>("/customers", { method: "POST", body: input }),

  list: (query: CustomerQuery = {}) =>
    apiRequest<Paginated<Customer>>("/customers", { query }),

  get: (id: string) => apiRequest<Customer>(`/customers/${id}`),

  getInvoices: (id: string) => apiRequest<Invoice[]>(`/customers/${id}/invoices`),

  update: (id: string, input: Partial<Omit<CreateCustomerInput, "phone">>) =>
    apiRequest<Customer>(`/customers/${id}`, { method: "PATCH", body: input }),

  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/customers/${id}`, { method: "DELETE" }),
};

// ── Products / Categories / Inventory ────────────────────────────────────────

export interface CreateProductInput {
  name: string;
  description?: string;
  categoryId?: string;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  unit?: ProductUnit;
  sellingPrice: number;
  purchasePrice?: number;
  mrp?: number;
  gstRate?: number;
  cessRate?: number;
  stockQuantity?: number;
  minStockAlert?: number;
  trackInventory?: boolean;
  isService?: boolean;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  lowStock?: boolean;
  isService?: boolean;
  sortBy?: "name" | "sellingPrice" | "stockQuantity" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export const productsApi = {
  listCategories: () => apiRequest<Category[]>("/products/categories"),

  createCategory: (input: { name: string; parentId?: string; sortOrder?: number }) =>
    apiRequest<Category>("/products/categories", { method: "POST", body: input }),

  updateCategory: (id: string, input: Partial<{ name: string; parentId?: string; sortOrder: number }>) =>
    apiRequest<Category>(`/products/categories/${id}`, { method: "PATCH", body: input }),

  deleteCategory: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/products/categories/${id}`, { method: "DELETE" }),

  lowStock: () => apiRequest<Product[]>("/products/low-stock"),

  create: (input: CreateProductInput) => apiRequest<Product>("/products", { method: "POST", body: input }),

  list: (query: ProductQuery = {}) => apiRequest<Paginated<Product>>("/products", { query }),

  get: (id: string) => apiRequest<Product>(`/products/${id}`),

  update: (id: string, input: Partial<CreateProductInput>) =>
    apiRequest<Product>(`/products/${id}`, { method: "PATCH", body: input }),

  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/products/${id}`, { method: "DELETE" }),

  adjustStock: (
    id: string,
    input: {
      adjustment: number;
      type: "PURCHASE" | "DAMAGE" | "ADJUSTMENT" | "RETURN" | "TRANSFER";
      notes?: string;
      batchNumber?: string;
      expiryDate?: string;
    },
  ) => apiRequest<Product>(`/products/${id}/adjust-stock`, { method: "POST", body: input }),

  movements: (id: string) => apiRequest<unknown[]>(`/products/${id}/movements`),
};

// ── Invoices & Payments ───────────────────────────────────────────────────────

export interface InvoiceQuery {
  page?: number;
  limit?: number;
  status?: "DRAFT" | "PENDING" | "PAID" | "PARTIAL" | "CANCELLED" | "REFUNDED";
  customerId?: string;
  from?: string;
  to?: string;
}

export const invoicesApi = {
  create: (input: CreateInvoiceInput) => apiRequest<Invoice>("/invoices", { method: "POST", body: input }),

  list: (query: InvoiceQuery = {}) => apiRequest<Paginated<Invoice>>("/invoices", { query }),

  get: (id: string) => apiRequest<Invoice>(`/invoices/${id}`),

  pdfUrl: (id: string) => `${API_BASE_URL}/invoices/${id}/pdf`,

  update: (id: string, input: { notes?: string; terms?: string; dueDate?: string }) =>
    apiRequest<Invoice>(`/invoices/${id}`, { method: "PATCH", body: input }),

  cancel: (id: string, reason: string) =>
    apiRequest<{ cancelled: boolean }>(`/invoices/${id}`, { method: "DELETE", body: { reason } }),

  recordPayment: (
    invoiceId: string,
    input: { amount: number; mode: "CASH" | "UPI" | "CARD" | "CHEQUE" | "BANK_TRANSFER"; referenceNumber?: string; notes?: string },
  ) => apiRequest<unknown>(`/invoices/${invoiceId}/payments`, { method: "POST", body: input }),

  getPayments: (invoiceId: string) => apiRequest<unknown[]>(`/invoices/${invoiceId}/payments`),

  sendReminder: (invoiceId: string, channel: "WHATSAPP" | "SMS" = "WHATSAPP") =>
    apiRequest<{ message: string }>(`/invoices/${invoiceId}/reminder`, { method: "POST", body: { channel } }),

  upiQr: (invoiceId: string) => apiRequest<{ qrData: string }>(`/invoices/${invoiceId}/upi-qr`),

  outstanding: () => apiRequest<Invoice[]>("/payments/outstanding"),
};

// ── Expenses ────────────────────────────────────────────────────────────────

export interface CreateExpenseInput {
  category: string;
  amount: number;
  description?: string;
  expenseDate: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export interface ExpenseQuery {
  page?: number;
  limit?: number;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
  isRecurring?: boolean;
  sortBy?: "expenseDate" | "amount" | "category" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export const expensesApi = {
  create: (input: CreateExpenseInput) => apiRequest<Expense>("/expenses", { method: "POST", body: input }),
  list: (query: ExpenseQuery = {}) => apiRequest<Paginated<Expense>>("/expenses", { query }),
  summary: (query: { from?: string; to?: string } = {}) =>
    apiRequest<{ totalAmount: number; totalCount: number; byCategory: { category: string; amount: number; count: number }[] }>(
      "/expenses/summary",
      { query },
    ),
  categories: () => apiRequest<string[]>("/expenses/categories"),
  get: (id: string) => apiRequest<Expense>(`/expenses/${id}`),
  update: (id: string, input: Partial<CreateExpenseInput>) =>
    apiRequest<Expense>(`/expenses/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) => apiRequest<{ deleted: boolean; id: string }>(`/expenses/${id}`, { method: "DELETE" }),
};

// ── Analytics ───────────────────────────────────────────────────────────────

export interface DateRangeQuery {
  from?: string;
  to?: string;
}

export const analyticsApi = {
  sales: (query: DateRangeQuery & { groupBy?: "day" | "week" | "month" } = {}) =>
    apiRequest<SalesSeries>("/analytics/sales", { query }),
  revenue: (query: DateRangeQuery = {}) => apiRequest<RevenueSummary>("/analytics/revenue", { query }),
  payments: (query: DateRangeQuery = {}) =>
    apiRequest<{ byMode: { mode: string; amount: number; count: number }[]; totalCollected: number }>(
      "/analytics/payments",
      { query },
    ),
  customers: (query: DateRangeQuery & { limit?: number } = {}) =>
    apiRequest<{
      newCustomers: number;
      totalCustomers: number;
      topCustomers: { customer: { name?: string; phone: string } | null; totalSpent: number; invoiceCount: number }[];
    }>("/analytics/customers", { query }),
  products: (query: DateRangeQuery & { limit?: number } = {}) =>
    apiRequest<{ topProducts: { productId: string | null; productName: string; quantitySold: number; revenue: number; timesOrdered: number }[] }>(
      "/analytics/products",
      { query },
    ),
  inventory: (query: DateRangeQuery = {}) =>
    apiRequest<{ movementsByType: { type: string; quantityChange: number; count: number }[]; lowStockCount: number; totalTrackedProducts: number }>(
      "/analytics/inventory",
      { query },
    ),
  loyalty: (query: DateRangeQuery = {}) =>
    apiRequest<{ byType: { type: string; points: number; count: number }[] }>("/analytics/loyalty", { query }),
};

// ── Admin ───────────────────────────────────────────────────────────────────

export const adminApi = {
  dashboard: () => apiRequest<AdminDashboard>("/admin/dashboard"),
  team: () => apiRequest<AdminDashboard["team"]>("/admin/team"),
  subscription: () => apiRequest<AdminDashboard["subscription"]>("/admin/subscription"),
};

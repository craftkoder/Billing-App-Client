// ── API envelope (matches src/utils/response.util.ts exactly) ──────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: { requestId: string; timestamp: string };
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; field?: string };
  meta: { requestId: string; timestamp: string };
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

export class ApiError extends Error {
  code: string;
  status: number;
  field?: string;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

// ── Auth ────────────────────────────────────────────────────────────────────

export type Role = "OWNER" | "MANAGER" | "CASHIER" | "VIEWER";

export interface AuthUser {
  id: string;
  phone: string;
  name?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface VerifyOtpResult {
  tokens: AuthTokens;
  user: AuthUser;
  tenantId?: string | null;
}

// ── Business ────────────────────────────────────────────────────────────────

export type BusinessCategory =
  | "retail" | "grocery" | "pharmacy" | "cafe" | "restaurant" | "salon"
  | "mobile_repair" | "electronics" | "clothing" | "agency" | "freelancer"
  | "distributor" | "wholesaler" | "clinic" | "auto_parts" | "stationery"
  | "home_services" | "other";

export interface Business {
  id: string;
  businessName: string;
  category: BusinessCategory;
  gstin?: string | null;
  phone: string;
  email?: string | null;
  city: string;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  address?: string | null;
  subscriptionStatus?: string;
  isActive?: boolean;
}

export interface TenantMember {
  id: string;
  userId: string;
  role: Role;
  isActive: boolean;
  acceptedAt: string | null;
  user?: { name?: string | null; phone: string };
}

export interface BusinessDashboard {
  today: { revenue: number; invoiceCount: number };
  week: { revenue: number; invoiceCount: number };
  month: { revenue: number; invoiceCount: number };
  totalCustomers: number;
  lowStockCount: number;
}

// ── Customers ───────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  outstandingBalance?: number;
  tags?: string[];
  notes?: string | null;
  createdAt: string;
}

// ── Products ────────────────────────────────────────────────────────────────

export type ProductUnit =
  | "pcs" | "kg" | "gm" | "ltr" | "ml" | "mtr" | "cm" | "box" | "pack" | "dozen" | "pair";

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  sku?: string | null;
  barcode?: string | null;
  hsnCode?: string | null;
  unit: ProductUnit;
  sellingPrice: number;
  purchasePrice?: number | null;
  mrp?: number | null;
  gstRate: number;
  cessRate: number;
  stockQuantity: number;
  minStockAlert: number;
  trackInventory: boolean;
  isService: boolean;
  isActive: boolean;
}

// ── Invoices ────────────────────────────────────────────────────────────────

export type InvoiceStatus = "DRAFT" | "PENDING" | "PAID" | "PARTIAL" | "CANCELLED" | "REFUNDED";
export type PaymentMode = "CASH" | "UPI" | "CARD" | "CHEQUE" | "BANK_TRANSFER" | "CREDIT";

export interface InvoiceItemInput {
  productId?: string;
  productName: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountAmount?: number;
  gstRate: number;
}

export interface PaymentEntryInput {
  mode: PaymentMode;
  amount: number;
  referenceNumber?: string;
}

export interface CreateInvoiceInput {
  customerId?: string;
  invoiceDate?: string;
  dueDate?: string;
  items: InvoiceItemInput[];
  invoiceDiscountAmount?: number;
  invoiceDiscountPercent?: number;
  payments?: PaymentEntryInput[];
  loyaltyPointsToRedeem?: number;
  notes?: string;
  terms?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate?: string | null;
  customerId?: string | null;
  customer?: { name?: string | null; phone: string } | null;
  subtotal: number;
  totalGst: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  createdAt: string;
}

// ── Expenses ────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string | null;
  expenseDate: string;
  receiptUrl?: string | null;
  isRecurring: boolean;
  recurrenceRule?: string | null;
  createdAt: string;
}

// ── Analytics / Admin ───────────────────────────────────────────────────────

export interface SalesSeries {
  groupBy: "day" | "week" | "month";
  series: { period: string; revenue: number; invoiceCount: number }[];
  totals: { revenue: number; invoiceCount: number };
}

export interface RevenueSummary {
  totalRevenue: number;
  totalCollected: number;
  invoiceCount: number;
  averageInvoiceValue: number;
  byStatus: { status: string; amount: number; count: number }[];
}

export interface AdminDashboard {
  business: { businessName: string; category: string; subscriptionStatus: string; isActive: boolean };
  team: { totalMembers: number; pendingInvites: number; byRole: { role: string; count: number }[] };
  subscription: {
    plan: { name: string; slug: string } | null;
    subscriptionStatus: string;
    usage: Record<string, { used: number; limit: number | null; unlimited: boolean }>;
  };
  expensesThisMonth: { total: number; count: number };
  alerts: { lowStockCount: number };
}

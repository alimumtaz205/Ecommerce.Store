export type Row = Record<string, unknown> & { id: number };
export interface Image {
  id: number;
  url: string;
  alt: string;
}
export interface Category {
  id: number;
  name: string;
  slug: string;
}
export interface Product extends Row {
  name: string;
  slug: string;
  summary: string;
  description: string;
  category_id: number;
  category_name: string;
  origin: string;
  ingredients: string;
  allergens: string;
  storage: string;
  images: Image[];
  min_price: number | null;
  featured: boolean | number;
}
export interface Variant {
  id: number;
  label: string;
  sku: string;
  price: number;
  netWeightKg: number;
  available: number;
}
export interface ProductDetail {
  product: Product;
  variants: Variant[];
}
export interface Content extends Row {
  type: "Page" | "Programme" | "Story" | "Event" | "Policy";
  slug: string;
  title: string;
  summary: string;
  body: string;
  programme_status: "Planned" | "Active" | "Completed";
  event_date: string | null;
  updated_at: string;
  images: Image[];
}
export interface Shipping {
  id: number;
  name: string;
  country_code: string;
  charge: number;
}
export interface Settings {
  currency: string;
  checkoutAvailable: boolean;
  paymentMethod: string;
  supportEmail: string | null;
  supportPhone: string | null;
  companyAddress: string | null;
  shipping: Shipping[];
}
export interface CartLine {
  variantId: number;
  quantity: number;
}
export interface CartView {
  variantId: number;
  quantity: number;
  product: string;
  label: string;
  slug: string;
  price: number | null;
  available: number;
  image: Image | null;
}
export interface QuoteLine {
  variantId: number;
  product: string;
  label: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
export interface Quote {
  items: QuoteLine[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  policyRevision: string;
}
export interface OrderResult {
  reference: string;
  accessCode: string;
  total: number;
  currency: string;
  status: string;
  expiresAt?: string;
}
export interface OrderView {
  order: Row;
  items: Row[];
}
export interface Staff {
  id: number;
  username: string;
  role: string;
}
export interface Login {
  accessToken: string;
  expiresAt: string;
  user: Staff;
}
export interface Page<T> {
  items: T[];
  hasMore: boolean;
  page: number;
  pageSize?: number;
}
export interface Problem {
  detail?: string;
  title?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

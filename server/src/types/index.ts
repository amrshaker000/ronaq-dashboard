import { Request } from 'express';

// ============================================
// Database Enums (matching PostgreSQL)
// ============================================

export type ProductSize = 'small' | 'medium' | 'large';
export type ProductCategory =
  | 'Random' | 'Islamic' | 'Palestine' | 'programing'
  | 'Graphic Design' | 'Marketing' | 'QUOTES' | 'Spshial'
  | 'movie' | 'AI' | 'Carton' | 'smiski'
  | 'Doctor' | 'Cats' | 'dogs' | 'foot ball'
  | 'Harry Potter' | 'Leters' | 'Marvel' | 'Traffic';

export type OrderStatus = 'received' | 'processing' | 'prepared' | 'delivering' | 'delivered' | 'cancelled' | 'returned';
export type PaymentMethod = 'wallet_instapay' | 'cod';

export type MovementType = 'stock_in' | 'stock_out' | 'adjustment';
export type MovementReason =
  | 'new_shipment' | 'order_fulfilled' | 'damage'
  | 'correction' | 'order_cancelled' | 'initial_stock';

export type UserRole = 'admin' | 'employee';
export type ExpenseCategory = 'printing' | 'packaging' | 'shipping' | 'marketing' | 'other';
export type NotificationType = 'low_stock' | 'order_update' | 'system' | 'stock_received';
export type ActivityAction =
  | 'create' | 'update' | 'delete' | 'status_change'
  | 'stock_adjustment' | 'login' | 'export';

// ============================================
// Database Models
// ============================================

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  serial_number: string;
  name: string;
  category: ProductCategory;
  size: ProductSize;
  price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock_level: number;
  image_path: string | null;
  description: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCostHistory {
  id: number;
  product_id: number;
  cost_price: number;
  supplier_id: number | null;
  quantity: number;
  effective_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_governorate: string;
  customer_address: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: 'paid' | 'pending';
  shipping_company: string | null;
  tracking_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  serial_number: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface OrderStatusLog {
  id: number;
  order_id: number;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  movement_type: MovementType;
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  reason: MovementReason;
  supplier_id: number | null;
  order_id: number | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface Expense {
  id: number;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  expense_date: string;
  notes: string | null;
  receipt_path: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  id: number;
  brand_name: string;
  whatsapp_number: string;
  default_shipping_company: string;
  free_shipping_threshold: number;
  order_number_prefix: string;
  default_shipping_cost: number;
  currency: string;
  currency_symbol: string;
  low_stock_threshold: number;
  updated_at: string;
  updated_by: string | null;
}

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  target_user: string | null;
  reference_id: number | null;
  reference_type: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: string | null;
  action: ActivityAction;
  entity_type: string;
  entity_id: number | null;
  description: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
  requestId?: string;
}

// ============================================
// Query Filters
// ============================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface ProductFilters extends PaginationParams {
  search?: string;
  category?: ProductCategory;
  size?: ProductSize;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OrderFilters extends PaginationParams {
  search?: string;
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  governorate?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StockMovementFilters extends PaginationParams {
  productId?: number;
  movementType?: MovementType;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExpenseFilters extends PaginationParams {
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalyticsDateRange {
  from: string;
  to: string;
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

export interface CreateProductDTO {
  serial_number: string;
  name: string;
  category: ProductCategory;
  size: ProductSize;
  price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock_level?: number;
  image_path?: string;
  description?: string;
}

export interface UpdateProductDTO {
  name?: string;
  category?: ProductCategory;
  size?: ProductSize;
  price?: number;
  cost_price?: number;
  min_stock_level?: number;
  image_path?: string;
  description?: string;
}

export interface CreateOrderDTO {
  customer_name: string;
  customer_phone: string;
  customer_governorate: string;
  customer_address: string;
  payment_method: PaymentMethod;
  notes?: string;
  discount?: number;
  shipping_cost?: number;
  items: CreateOrderItemDTO[];
}

export interface CreateOrderItemDTO {
  product_id: number;
  quantity: number;
}

export interface UpdateOrderStatusDTO {
  status: OrderStatus;
  tracking_number?: string;
  shipping_company?: string;
  notes?: string;
  payment_method?: PaymentMethod;
  payment_status?: 'paid' | 'pending';
}

export interface StockAdjustmentDTO {
  product_id: number;
  quantity: number;
  reason: MovementReason;
  notes?: string;
}

export interface ReceiveShipmentDTO {
  supplier_id?: number;
  items: {
    product_id: number;
    quantity: number;
    cost_price?: number;
  }[];
  notes?: string;
}

export interface CreateExpenseDTO {
  category: ExpenseCategory;
  amount: number;
  description?: string;
  expense_date: string;
  notes?: string;
}

export interface UpdateSettingsDTO {
  brand_name?: string;
  whatsapp_number?: string;
  default_shipping_company?: string;
  free_shipping_threshold?: number;
  order_number_prefix?: string;
  default_shipping_cost?: number;
  low_stock_threshold?: number;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar_url?: string;
}

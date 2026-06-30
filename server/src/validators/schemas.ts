import { z } from 'zod';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_SIZES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  MOVEMENT_REASONS,
  EXPENSE_CATEGORIES,
  USER_ROLES,
} from '../config/constants.js';

// ============================================
// Products
// ============================================

export const createProductSchema = z.object({
  serial_number: z.string().min(1, 'الرقم التسلسلي مطلوب').max(50).regex(/^[a-zA-Z0-9\-\/_#]+$/, 'الرقم التسلسلي يجب أن يحتوي على حروف وأرقام ورموز فقط وبدون مسافات'),
  name: z.string().min(1, 'اسم المنتج مطلوب').max(255).regex(/^[a-zA-Z0-9\u0600-\u06FF\u0660-\u0669\s]+$/, 'اسم المنتج يجب أن يحتوي على حروف وأرقام فقط'),
  category: z.enum(PRODUCT_CATEGORIES, { message: 'التصنيف غير صالح' }),
  size: z.enum(PRODUCT_SIZES, { message: 'المقاس غير صالح' }),
  price: z.number().min(0, 'السعر يجب أن يكون 0 أو أكثر'),
  cost_price: z.number().min(0, 'سعر التكلفة يجب أن يكون 0 أو أكثر'),
  stock_quantity: z.number().int().min(0, 'الكمية يجب أن تكون 0 أو أكثر'),
  min_stock_level: z.number().int().min(0).optional().default(2),
  image_path: z.string().optional(),
  description: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).regex(/^[a-zA-Z0-9\u0600-\u06FF\u0660-\u0669\s]+$/, 'اسم المنتج يجب أن يحتوي على حروف وأرقام فقط').optional(),
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  size: z.enum(PRODUCT_SIZES).optional(),
  price: z.number().min(0).optional(),
  cost_price: z.number().min(0).optional(),
  min_stock_level: z.number().int().min(0).optional(),
  image_path: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

// ============================================
// Orders
// ============================================

export const createOrderItemSchema = z.object({
  product_id: z.number().int().positive('معرف المنتج مطلوب'),
  quantity: z.number().int().positive('الكمية يجب أن تكون 1 أو أكثر'),
});

export const createOrderSchema = z.object({
  customer_name: z.string().min(1, 'اسم العميل مطلوب').max(255).regex(/^[a-zA-Z\u0600-\u06FF\s]+$/, 'اسم العميل يجب أن يحتوي على أحرف فقط'),
  customer_phone: z.string().min(1, 'رقم الهاتف مطلوب').regex(/^01\d{9}$/, 'رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من 11 رقماً'),
  customer_governorate: z.string().min(1, 'المحافظة مطلوبة').max(100),
  customer_address: z.string().min(1, 'العنوان مطلوب').regex(/^[a-zA-Z0-9\u0600-\u06FF\u0660-\u0669\s.,\-\/()#_]+$/, 'العنوان يجب أن يحتوي على أحرف وأرقام ورموز مقبولة فقط'),
  payment_method: z.enum(PAYMENT_METHODS, { message: 'طريقة الدفع غير صالحة' }),
  notes: z.string().optional(),
  discount: z.number().min(0).optional().default(0),
  shipping_cost: z.number().min(0).optional(),
  items: z.array(createOrderItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { message: 'حالة الطلب غير صالحة' }),
  tracking_number: z.string().max(100).optional(),
  shipping_company: z.string().max(100).optional(),
  notes: z.string().optional(),
  payment_method: z.enum(PAYMENT_METHODS, { message: 'طريقة الدفع غير صالحة' }).optional(),
  payment_status: z.enum(['paid', 'pending']).optional(),
});

// ============================================
// Stock
// ============================================

export const stockAdjustmentSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().refine((n) => n !== 0, { message: 'الكمية لا يمكن أن تكون صفر' }),
  reason: z.enum(MOVEMENT_REASONS, { message: 'سبب الحركة غير صالح' }),
  notes: z.string().optional(),
});

export const receiveShipmentSchema = z.object({
  supplier_id: z.number().int().positive().optional(),
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    quantity: z.number().int().positive('الكمية يجب أن تكون 1 أو أكثر'),
    cost_price: z.number().min(0).optional(),
  })).min(1, 'يجب إضافة منتج واحد على الأقل'),
  notes: z.string().optional(),
});

// ============================================
// Expenses
// ============================================

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, { message: 'تصنيف المصروف غير صالح' }),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من 0'),
  description: z.string().max(500).optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تنسيق التاريخ غير صالح'),
  notes: z.string().optional(),
});

export const updateExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  amount: z.number().positive().optional(),
  description: z.string().max(500).nullable().optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().nullable().optional(),
});

// ============================================
// Settings
// ============================================

export const updateSettingsSchema = z.object({
  brand_name: z.string().min(1).max(255).optional(),
  whatsapp_number: z.string().regex(/^01\d{9}$/, 'رقم الواتساب يجب أن يبدأ بـ 01 ويتكون من 11 رقماً').optional().or(z.literal('')),
  default_shipping_company: z.string().max(100).optional(),
  free_shipping_threshold: z.number().min(0).optional(),
  order_number_prefix: z.string().min(1).max(10).optional(),
  default_shipping_cost: z.number().min(0).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
});

// ============================================
// Users
// ============================================

export const createUserSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').max(255).regex(/^[a-zA-Z\u0600-\u06FF\s]+$/, 'الاسم يجب أن يحتوي على أحرف فقط'),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  role: z.enum(USER_ROLES, { message: 'الدور غير صالح' }),
  avatar_url: z.string().optional(),
});

// ============================================
// Query Params
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(10000).default(20),
});

export const productFiltersSchema = paginationSchema.extend({
  search: z.string().optional(),
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  size: z.enum(PRODUCT_SIZES).optional(),
  stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
  sortBy: z.string().optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const orderFiltersSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  governorate: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.string().optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const movementFiltersSchema = paginationSchema.extend({
  productId: z.coerce.number().int().optional(),
  movementType: z.enum(['stock_in', 'stock_out', 'adjustment'] as const).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const expenseFiltersSchema = paginationSchema.extend({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const analyticsDateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ============================================
// Suppliers
// ============================================

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'اسم المورد مطلوب').max(255).regex(/^[a-zA-Z\u0600-\u06FF\s]+$/, 'اسم المورد يجب أن يحتوي على أحرف فقط'),
  contact_person: z.string().regex(/^[a-zA-Z\u0600-\u06FF\s]+$/, 'اسم المسؤول يجب أن يحتوي على أحرف فقط').optional().or(z.literal('')),
  phone: z.string().regex(/^01\d{9}$/, 'رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من 11 رقماً').optional().or(z.literal('')),
  address: z.string().regex(/^[a-zA-Z0-9\u0600-\u06FF\u0660-\u0669\s.,\-\/()#_]+$/, 'العنوان يجب أن يحتوي على أحرف وأرقام ورموز مقبولة فقط').optional().or(z.literal('')),
  notes: z.string().optional(),
});

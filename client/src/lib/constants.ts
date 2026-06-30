export const EGYPTIAN_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'الدقهلية',
  'البحر الأحمر',
  'البحيرة',
  'الفيوم',
  'الغربية',
  'الإسماعيلية',
  'المنوفية',
  'المنيا',
  'القليوبية',
  'الوادي الجديد',
  'السويس',
  'أسوان',
  'أسيوط',
  'بني سويف',
  'بورسعيد',
  'دمياط',
  'الشرقية',
  'جنوب سيناء',
  'كفر الشيخ',
  'مطروح',
  'الأقصر',
  'قنا',
  'شمال سيناء',
  'سوهاج',
] as const;

export type EgyptianGovernorate = (typeof EGYPTIAN_GOVERNORATES)[number];

export const PRODUCT_CATEGORIES = [
  'Random',
  'Islamic',
  'Palestine',
  'programing',
  'Graphic Design',
  'Marketing',
  'QUOTES',
  'Spshial',
  'movie',
  'AI',
  'Carton',
  'smiski',
  'Doctor',
  'Cats',
  'dogs',
  'foot ball',
  'Harry Potter',
  'Leters',
  'Marvel',
  'Traffic',
] as const;

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  'Random': 'Random',
  'Islamic': 'Islamic',
  'Palestine': 'Palestine',
  'programing': 'programing',
  'Graphic Design': 'Graphic Design',
  'Marketing': 'Marketing',
  'QUOTES': 'QUOTES',
  'Spshial': 'Spshial',
  'movie': 'movie',
  'AI': 'AI',
  'Carton': 'Carton',
  'smiski': 'smiski',
  'Doctor': 'Doctor',
  'Cats': 'Cats',
  'dogs': 'dogs',
  'foot ball': 'foot ball',
  'Harry Potter': 'Harry Potter',
  'Leters': 'Leters',
  'Marvel': 'Marvel',
  'Traffic': 'Traffic',
};

export const PRODUCT_SIZES = ['small', 'medium', 'large'] as const;

export const PRODUCT_SIZE_LABELS: Record<string, string> = {
  small: 'صغير',
  medium: 'متوسط',
  large: 'كبير',
};

export const ORDER_STATUSES = [
  'received',
  'processing',
  'prepared',
  'delivering',
  'delivered',
  'cancelled',
  'returned',
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  received: 'تم الاستلام',
  processing: 'قيد التجهيز',
  prepared: 'تم التجهيز',
  delivering: 'قيد التوصيل',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
  returned: 'مرتجع',
};

export const PAYMENT_METHODS = ['wallet_instapay', 'cod'] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wallet_instapay: 'محفظة الكترونية/انستاباي',
  cod: 'الدفع عند الاستلام',
};

export const MOVEMENT_TYPES = ['stock_in', 'stock_out', 'adjustment'] as const;

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  stock_in: 'وارد',
  stock_out: 'صادر',
  adjustment: 'تعديل',
};

export const MOVEMENT_REASONS = [
  'new_shipment',
  'order_fulfilled',
  'damage',
  'correction',
  'order_cancelled',
  'initial_stock',
] as const;

export const MOVEMENT_REASON_LABELS: Record<string, string> = {
  new_shipment: 'شحنة جديدة',
  order_fulfilled: 'تنفيذ طلب',
  damage: 'تالف',
  correction: 'تصحيح',
  order_cancelled: 'إلغاء طلب',
  initial_stock: 'مخزون أولي',
};

export const EXPENSE_CATEGORIES = [
  'printing',
  'packaging',
  'shipping',
  'marketing',
  'other',
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  printing: 'طباعة',
  packaging: 'تغليف',
  shipping: 'شحن',
  marketing: 'تسويق',
  other: 'أخرى',
};

export const USER_ROLES = ['admin', 'employee'] as const;

export const USER_ROLE_LABELS: Record<string, string> = {
  admin: 'مدير النظام',
  employee: 'موظف',
};

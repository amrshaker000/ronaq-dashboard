import { orderRepository } from '../repositories/orderRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { stockRepository } from '../repositories/stockRepository.js';
import { settingsRepository } from '../repositories/profileRepository.js';
import { activityLogRepository, notificationRepository } from '../repositories/profileRepository.js';
import { createAppError } from '../middleware/errorHandler.js';
import type {
  Order,
  OrderFilters,
  CreateOrderDTO,
  UpdateOrderStatusDTO,
  OrderStatus,
} from '../types/index.js';

export class OrderService {
  async getAll(filters: OrderFilters) {
    const { data, count } = await orderRepository.findAll(filters);
    return {
      orders: data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count,
        totalPages: Math.ceil(count / filters.pageSize),
      },
    };
  }

  async getById(id: number) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw createAppError('الطلب غير موجود.', 404);
    }

    const items = await orderRepository.getOrderItems(id);
    const statusLogs = await orderRepository.getStatusLogs(id);

    return { order, items, statusLogs };
  }

  async getByStatus(status: OrderStatus) {
    return orderRepository.findByStatus(status);
  }

  async create(dto: CreateOrderDTO, userId: string | null): Promise<Order> {
    // 1. Fetch all products and validate stock
    const productIds = dto.items.map((i) => i.product_id);
    const products = await productRepository.findByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate all products exist and have sufficient stock
    for (const item of dto.items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw createAppError(`المنتج برقم ${item.product_id} غير موجود.`, 404);
      }
      if (product.stock_quantity < item.quantity) {
        throw createAppError(
          `المخزون غير كافٍ لـ "${product.name}". المتوفر: ${product.stock_quantity}، المطلوب: ${item.quantity}`,
          400
        );
      }
    }

    // 2. Calculate totals
    let subtotal = 0;
    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.product_id)!;
      const totalPrice = product.price * item.quantity;
      subtotal += totalPrice;
      return {
        product_id: product.id,
        product_name: product.name,
        serial_number: product.serial_number,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: totalPrice,
      };
    });

    // 3. Calculate shipping
    const settings = await settingsRepository.get();
    let shippingCost = dto.shipping_cost ?? settings.default_shipping_cost;
    if (subtotal >= settings.free_shipping_threshold) {
      shippingCost = 0;
    }

    const discount = dto.discount || 0;
    const total = subtotal + shippingCost - discount;

    // Generate random alphanumeric order number for public orders
    let orderNumber: string | undefined = undefined;
    if (!userId) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const segment1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const segment2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      orderNumber = `RNQ-${segment1}-${segment2}`;
    }

    // 5. Create the order
    const order = await orderRepository.create({
      order_number: orderNumber,
      customer_name: dto.customer_name,
      customer_phone: dto.customer_phone,
      customer_governorate: dto.customer_governorate,
      customer_address: dto.customer_address,
      subtotal,
      shipping_cost: shippingCost,
      discount,
      total,
      status: 'received',
      payment_method: dto.payment_method,
      payment_status: 'pending',
      shipping_company: null,
      tracking_number: null,
      notes: dto.notes || null,
      created_by: userId || null,
    });

    // Create new order notification
    await notificationRepository.create({
      type: 'order_update',
      title: 'طلب جديد من المتجر',
      message: `تم استلام طلب جديد برقم ${order.order_number} للعميل ${dto.customer_name}`,
      reference_id: order.id,
      reference_type: 'order',
    });

    // 6. Create order items
    await orderRepository.createItems(
      orderItems.map((item) => ({
        ...item,
        order_id: order.id,
      }))
    );

    // 7. Deduct stock + log movements
    const movements = [];
    for (const item of dto.items) {
      const product = productMap.get(item.product_id)!;
      const newQuantity = product.stock_quantity - item.quantity;

      await productRepository.updateStock(item.product_id, newQuantity);

      movements.push({
        product_id: item.product_id,
        movement_type: 'stock_out' as const,
        quantity: item.quantity,
        before_quantity: product.stock_quantity,
        after_quantity: newQuantity,
        reason: 'order_fulfilled' as const,
        order_id: order.id,
        performed_by: userId,
        supplier_id: null,
        notes: `طلب رقم ${order.order_number}`,
      });

      // Check low stock
      if (newQuantity <= settings.low_stock_threshold) {
        await notificationRepository.create({
          type: 'low_stock',
          title: 'تنبيه انخفاض المخزون',
          message: `المنتج "${product.name}" (${product.serial_number}) وصل إلى ${newQuantity} قطعة.`,
          reference_id: product.id,
          reference_type: 'product',
        });
      }
    }

    await stockRepository.createMovements(movements);

    // 8. Log initial status
    // (Trigger handles this via order_status_logs)

    await activityLogRepository.log({
      user_id: userId,
      action: 'create',
      entity_type: 'order',
      entity_id: order.id,
      description: `تم إنشاء طلب ${order.order_number} — ${dto.customer_name} — ${total} ج.م`,
    });

    return order;
  }

  async updateStatus(
    id: number,
    dto: UpdateOrderStatusDTO,
    userId: string
  ): Promise<Order> {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw createAppError('الطلب غير موجود.', 404);
    }

    // Validate status transitions
    this.validateStatusTransition(order.status, dto.status);

    const updates: Partial<Order> = {};
    if (dto.tracking_number) updates.tracking_number = dto.tracking_number;
    if (dto.shipping_company) updates.shipping_company = dto.shipping_company;
    if (dto.notes) updates.notes = dto.notes;
    if (dto.payment_method) updates.payment_method = dto.payment_method;
    if (dto.payment_status) updates.payment_status = dto.payment_status;

    // Handle cancellation / return — restore stock
    const isRestorableNewStatus = dto.status === 'cancelled' || dto.status === 'returned';
    const isRestorableOldStatus = order.status === 'cancelled' || order.status === 'returned';
    if (isRestorableNewStatus && !isRestorableOldStatus) {
      await this.restoreStock(order, userId);
    }

    // We need to set created_by for the trigger to track who changed status
    const updatedOrder = await orderRepository.updateStatus(id, dto.status, {
      ...updates,
      created_by: userId,
    });

    await activityLogRepository.log({
      user_id: userId,
      action: 'status_change',
      entity_type: 'order',
      entity_id: id,
      description: `تم تغيير حالة الطلب ${order.order_number}: ${order.status} → ${dto.status}`,
    });

    return updatedOrder;
  }

  async updateOrderDetails(id: number, dto: any, userId: string): Promise<Order> {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw createAppError('الطلب غير موجود.', 404);
    }

    const updates: Partial<Order> = {};
    if (dto.customer_name !== undefined) updates.customer_name = dto.customer_name;
    if (dto.customer_phone !== undefined) updates.customer_phone = dto.customer_phone;
    if (dto.customer_governorate !== undefined) updates.customer_governorate = dto.customer_governorate;
    if (dto.customer_address !== undefined) updates.customer_address = dto.customer_address;
    if (dto.shipping_cost !== undefined) updates.shipping_cost = dto.shipping_cost;
    if (dto.discount !== undefined) updates.discount = dto.discount;
    if (dto.payment_method !== undefined) updates.payment_method = dto.payment_method;
    if (dto.payment_status !== undefined) updates.payment_status = dto.payment_status;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    // Recalculate total if shipping or discount changed
    const newShippingCost = dto.shipping_cost !== undefined ? dto.shipping_cost : order.shipping_cost;
    const newDiscount = dto.discount !== undefined ? dto.discount : order.discount;
    
    if (dto.shipping_cost !== undefined || dto.discount !== undefined) {
      updates.total = order.subtotal + newShippingCost - newDiscount;
    }

    const updatedOrder = await orderRepository.updateDetails(id, updates);

    await activityLogRepository.log({
      user_id: userId,
      action: 'update',
      entity_type: 'order',
      entity_id: id,
      description: `تم تعديل تفاصيل الطلب ${order.order_number}`,
    });

    return updatedOrder;
  }

  private validateStatusTransition(current: OrderStatus, next: OrderStatus): void {
    if (current === next) return; // Allow updating details/payment status without changing order status
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      received: ['processing', 'cancelled'],
      processing: ['prepared', 'cancelled'],
      prepared: ['delivering', 'cancelled'],
      delivering: ['delivered', 'cancelled', 'returned'],
      delivered: ['returned'],
      cancelled: [],
      returned: [],
    };

    const allowed = validTransitions[current];
    if (!allowed || !allowed.includes(next)) {
      throw createAppError(
        `لا يمكن تغيير حالة الطلب من "${current}" إلى "${next}".`,
        400
      );
    }
  }

  private async restoreStock(order: Order, userId: string): Promise<void> {
    const items = await orderRepository.getOrderItems(order.id);
    const productIds = items.map((i) => i.product_id);
    const products = await productRepository.findByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) continue;

      const newQuantity = product.stock_quantity + item.quantity;
      await productRepository.updateStock(item.product_id, newQuantity);

      await stockRepository.createMovement({
        product_id: item.product_id,
        movement_type: 'stock_in',
        quantity: item.quantity,
        before_quantity: product.stock_quantity,
        after_quantity: newQuantity,
        reason: 'order_cancelled',
        order_id: order.id,
        performed_by: userId,
        supplier_id: null,
        notes: `إلغاء طلب ${order.order_number}`,
      });
    }
  }

  async getRecentOrders(limit: number = 10) {
    return orderRepository.getRecentOrders(limit);
  }

  async getByOrderNumber(orderNumber: string) {
    const order = await orderRepository.findByOrderNumber(orderNumber);
    if (!order) return null;
    const items = await orderRepository.getOrderItems(order.id);
    return { ...order, items };
  }
}

export const orderService = new OrderService();

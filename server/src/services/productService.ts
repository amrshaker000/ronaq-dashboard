import { productRepository } from '../repositories/productRepository.js';
import { stockRepository } from '../repositories/stockRepository.js';
import { activityLogRepository } from '../repositories/profileRepository.js';
import { createAppError } from '../middleware/errorHandler.js';
import type {
  Product,
  ProductFilters,
  CreateProductDTO,
  UpdateProductDTO,
  StockAdjustmentDTO,
  ReceiveShipmentDTO,
} from '../types/index.js';

export class ProductService {
  async getAll(filters: ProductFilters) {
    const { data, count } = await productRepository.findAll(filters);
    return {
      products: data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count,
        totalPages: Math.ceil(count / filters.pageSize),
      },
    };
  }

  async getById(id: number): Promise<Product> {
    const product = await productRepository.findById(id);
    if (!product) {
      throw createAppError('المنتج غير موجود.', 404);
    }
    return product;
  }

  async create(dto: CreateProductDTO, userId: string): Promise<Product> {
    // Check serial number uniqueness
    const existing = await productRepository.findBySerialNumber(dto.serial_number);
    if (existing) {
      throw createAppError('الرقم التسلسلي مستخدم بالفعل.', 409);
    }

    const product = await productRepository.create(dto);

    // Log initial stock movement if quantity > 0
    if (dto.stock_quantity > 0) {
      await stockRepository.createMovement({
        product_id: product.id,
        movement_type: 'stock_in',
        quantity: dto.stock_quantity,
        before_quantity: 0,
        after_quantity: dto.stock_quantity,
        reason: 'initial_stock',
        performed_by: userId,
        supplier_id: null,
        order_id: null,
        notes: 'مخزون أولي عند إنشاء المنتج',
      });
    }

    await activityLogRepository.log({
      user_id: userId,
      action: 'create',
      entity_type: 'product',
      entity_id: product.id,
      description: `تم إنشاء منتج: ${product.name} (${product.serial_number})`,
    });

    return product;
  }

  async update(id: number, dto: UpdateProductDTO, userId: string): Promise<Product> {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw createAppError('المنتج غير موجود.', 404);
    }

    const product = await productRepository.update(id, dto);

    await activityLogRepository.log({
      user_id: userId,
      action: 'update',
      entity_type: 'product',
      entity_id: id,
      description: `تم تحديث منتج: ${product.name}`,
    });

    return product;
  }

  async delete(id: number, userId: string): Promise<void> {
    const product = await productRepository.findById(id);
    if (!product) {
      throw createAppError('المنتج غير موجود.', 404);
    }

    await productRepository.softDelete(id);

    await activityLogRepository.log({
      user_id: userId,
      action: 'delete',
      entity_type: 'product',
      entity_id: id,
      description: `تم حذف منتج: ${product.name} (${product.serial_number})`,
    });
  }

  async adjustStock(dto: StockAdjustmentDTO, userId: string): Promise<Product> {
    const product = await productRepository.findById(dto.product_id);
    if (!product) {
      throw createAppError('المنتج غير موجود.', 404);
    }

    const newQuantity = product.stock_quantity + dto.quantity;
    if (newQuantity < 0) {
      throw createAppError('لا يمكن أن يكون المخزون بالسالب.', 400);
    }

    await productRepository.updateStock(dto.product_id, newQuantity);

    await stockRepository.createMovement({
      product_id: dto.product_id,
      movement_type: dto.quantity > 0 ? 'stock_in' : 'stock_out',
      quantity: Math.abs(dto.quantity),
      before_quantity: product.stock_quantity,
      after_quantity: newQuantity,
      reason: dto.reason,
      performed_by: userId,
      notes: dto.notes || null,
      supplier_id: null,
      order_id: null,
    });

    await activityLogRepository.log({
      user_id: userId,
      action: 'stock_adjustment',
      entity_type: 'product',
      entity_id: dto.product_id,
      description: `تعديل مخزون ${product.name}: ${product.stock_quantity} → ${newQuantity}`,
    });

    return (await productRepository.findById(dto.product_id))!;
  }

  async receiveShipment(dto: ReceiveShipmentDTO, userId: string): Promise<void> {
    const productIds = dto.items.map((i) => i.product_id);
    const products = await productRepository.findByIds(productIds);

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw createAppError(`المنتج برقم ${item.product_id} غير موجود.`, 404);
      }
    }

    // Process each item
    for (const item of dto.items) {
      const product = productMap.get(item.product_id)!;
      const newQuantity = product.stock_quantity + item.quantity;

      await productRepository.updateStock(item.product_id, newQuantity);

      // Update cost price if provided
      if (item.cost_price !== undefined) {
        await productRepository.update(item.product_id, { cost_price: item.cost_price });
      }

      await stockRepository.createMovement({
        product_id: item.product_id,
        movement_type: 'stock_in',
        quantity: item.quantity,
        before_quantity: product.stock_quantity,
        after_quantity: newQuantity,
        reason: 'new_shipment',
        supplier_id: dto.supplier_id || null,
        performed_by: userId,
        notes: dto.notes || null,
        order_id: null,
      });
    }

    await activityLogRepository.log({
      user_id: userId,
      action: 'stock_adjustment',
      entity_type: 'shipment',
      description: `تم استلام شحنة: ${dto.items.length} منتج`,
      metadata: { items: dto.items },
    });
  }

  async getAllMovements(filters: any) {
    const { data, count } = await stockRepository.findAll(filters);
    return {
      movements: data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count,
        totalPages: Math.ceil(count / filters.pageSize),
      },
    };
  }

  async getLowStock(): Promise<Product[]> {
    return productRepository.findLowStock();
  }

  async getStockHistory(productId: number) {
    return stockRepository.getProductMovements(productId);
  }
}

export const productService = new ProductService();

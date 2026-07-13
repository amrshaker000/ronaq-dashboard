import { productRepository } from '../repositories/productRepository.js';

import { activityLogRepository } from '../repositories/profileRepository.js';
import { createAppError } from '../middleware/errorHandler.js';
import type {
  Product,
  ProductFilters,
  CreateProductDTO,
  UpdateProductDTO,
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


}

export const productService = new ProductService();

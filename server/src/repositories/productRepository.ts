import { getAdminClient } from '../config/supabase.js';
import type {
  Product,
  ProductFilters,
  CreateProductDTO,
  UpdateProductDTO,
} from '../types/index.js';

export class ProductRepository {
  private get db() {
    return getAdminClient();
  }

  async findAll(filters: ProductFilters): Promise<{ data: Product[]; count: number }> {
    let query = this.db
      .from('products')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    // Search
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`
      );
    }

    // Filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.size) {
      query = query.eq('size', filters.size);
    }


    // Sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder === 'asc';
    query = query.order(sortBy, { ascending: sortOrder });

    // Pagination
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: (data as Product[]) || [], count: count || 0 };
  }

  async findById(id: number): Promise<Product | null> {
    const { data, error } = await this.db
      .from('products')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Product | null;
  }

  async findBySerialNumber(serialNumber: string): Promise<Product | null> {
    const { data, error } = await this.db
      .from('products')
      .select('*')
      .eq('serial_number', serialNumber)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Product | null;
  }

  async create(dto: CreateProductDTO): Promise<Product> {
    const { data, error } = await this.db
      .from('products')
      .insert(dto)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  }

  async update(id: number, dto: UpdateProductDTO): Promise<Product> {
    const { data, error } = await this.db
      .from('products')
      .update(dto)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  }

  async softDelete(id: number): Promise<void> {
    const { error } = await this.db
      .from('products')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);

    if (error) throw error;
  }



  async findByIds(ids: number[]): Promise<Product[]> {
    const { data, error } = await this.db
      .from('products')
      .select('*')
      .in('id', ids)
      .is('deleted_at', null);

    if (error) throw error;
    return (data as Product[]) || [];
  }

  async countAll(): Promise<number> {
    const { count, error } = await this.db
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    if (error) throw error;
    return count || 0;
  }


}

export const productRepository = new ProductRepository();

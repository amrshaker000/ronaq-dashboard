import { getAdminClient } from '../config/supabase.js';
import type { StockMovement, StockMovementFilters } from '../types/index.js';

export class StockRepository {
  private get db() {
    return getAdminClient();
  }

  async createMovement(
    movement: Omit<StockMovement, 'id' | 'created_at'>
  ): Promise<StockMovement> {
    const { data, error } = await this.db
      .from('stock_movements')
      .insert(movement)
      .select()
      .single();

    if (error) throw error;
    return data as StockMovement;
  }

  async createMovements(
    movements: Omit<StockMovement, 'id' | 'created_at'>[]
  ): Promise<StockMovement[]> {
    const { data, error } = await this.db
      .from('stock_movements')
      .insert(movements)
      .select();

    if (error) throw error;
    return (data as StockMovement[]) || [];
  }

  async findAll(
    filters: StockMovementFilters
  ): Promise<{ data: StockMovement[]; count: number }> {
    let query = this.db
      .from('stock_movements')
      .select('*, products:product_id(name, serial_number), profiles:performed_by(name)', {
        count: 'exact',
      });

    if (filters.productId) {
      query = query.eq('product_id', filters.productId);
    }
    if (filters.movementType) {
      query = query.eq('movement_type', filters.movementType);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
    }

    query = query.order('created_at', { ascending: false });

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data as StockMovement[]) || [], count: count || 0 };
  }

  async getProductMovements(productId: number): Promise<StockMovement[]> {
    const { data, error } = await this.db
      .from('stock_movements')
      .select('*, profiles:performed_by(name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data as StockMovement[]) || [];
  }
}

export const stockRepository = new StockRepository();

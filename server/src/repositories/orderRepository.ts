import { getAdminClient } from '../config/supabase.js';
import type {
  Order,
  OrderItem,
  OrderFilters,
  OrderStatus,
} from '../types/index.js';

export class OrderRepository {
  private get db() {
    return getAdminClient();
  }

  async findAll(filters: OrderFilters): Promise<{ data: Order[]; count: number }> {
    let query = this.db
      .from('orders')
      .select('*', { count: 'exact' });

    if (filters.search) {
      query = query.or(
        `order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%`
      );
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod);
    }
    if (filters.governorate) {
      query = query.eq('customer_governorate', filters.governorate);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
    }

    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder === 'asc';
    query = query.order(sortBy, { ascending: sortOrder });

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data as Order[]) || [], count: count || 0 };
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const { data, error } = await this.db
      .from('orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as Order[]) || [];
  }

  async findById(id: number): Promise<Order | null> {
    const { data, error } = await this.db
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Order | null;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const { data, error } = await this.db
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Order | null;
  }

  async create(order: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'> & { order_number?: string }): Promise<Order> {
    const { data, error } = await this.db
      .from('orders')
      .insert(order)
      .select()
      .single();

    if (error) throw error;
    return data as Order;
  }

  async createItems(items: Omit<OrderItem, 'id' | 'created_at'>[]): Promise<OrderItem[]> {
    const { data, error } = await this.db
      .from('order_items')
      .insert(items)
      .select();

    if (error) throw error;
    return (data as OrderItem[]) || [];
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    const { data, error } = await this.db
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (error) throw error;
    return (data as OrderItem[]) || [];
  }

  async updateStatus(id: number, status: OrderStatus, updates: Partial<Order> = {}): Promise<Order> {
    const { data, error } = await this.db
      .from('orders')
      .update({ status, ...updates })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Order;
  }

  async updateDetails(id: number, updates: Partial<Order>): Promise<Order> {
    const { data, error } = await this.db
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Order;
  }

  async getRecentOrders(limit: number = 10): Promise<Order[]> {
    const { data, error } = await this.db
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as Order[]) || [];
  }

  async countByStatus(): Promise<Record<string, number>> {
    const { data, error } = await this.db
      .from('orders')
      .select('status');

    if (error) throw error;

    const counts: Record<string, number> = {};
    (data || []).forEach((o) => {
      const s = (o as { status: string }).status;
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }

  async getActiveOrdersCount(): Promise<number> {
    const { count, error } = await this.db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['received', 'processing', 'prepared', 'delivering']);

    if (error) throw error;
    return count || 0;
  }

  async getStatusLogs(orderId: number) {
    const { data, error } = await this.db
      .from('order_status_logs')
      .select('*, profiles:changed_by(name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getTodayRevenue(): Promise<number> {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const today = new Date(now.getTime() - offset).toISOString().split('T')[0];
    
    const { data, error } = await this.db
      .from('orders')
      .select('total')
      .eq('status', 'delivered')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    if (error) throw error;
    return (data || []).reduce((sum, o) => sum + Number((o as { total: number }).total), 0);
  }

  async getTodayOrdersCount(): Promise<number> {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const today = new Date(now.getTime() - offset).toISOString().split('T')[0];
    
    const { count, error } = await this.db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`);

    if (error) throw error;
    return count || 0;
  }
}

export const orderRepository = new OrderRepository();

import { getAdminClient } from '../config/supabase.js';
import type { AnalyticsDateRange } from '../types/index.js';

export class AnalyticsRepository {
  private get db() {
    return getAdminClient();
  }

  async getRevenueByDateRange(range: AnalyticsDateRange) {
    const { data, error } = await this.db
      .from('orders')
      .select('total, created_at')
      .eq('status', 'delivered')
      .gte('created_at', `${range.from}T00:00:00`)
      .lte('created_at', `${range.to}T23:59:59`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getOrdersByStatus(range: AnalyticsDateRange) {
    const { data, error } = await this.db
      .from('orders')
      .select('status')
      .gte('created_at', `${range.from}T00:00:00`)
      .lte('created_at', `${range.to}T23:59:59`);

    if (error) throw error;

    const counts: Record<string, number> = {};
    (data || []).forEach((o) => {
      const status = (o as { status: string }).status;
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }

  async getTopSellingProducts(range: AnalyticsDateRange, limit: number = 10) {
    const { data, error } = await this.db
      .from('order_items')
      .select(`
        product_id,
        product_name,
        serial_number,
        quantity,
        orders!inner(created_at, status)
      `)
      .gte('orders.created_at', `${range.from}T00:00:00`)
      .lte('orders.created_at', `${range.to}T23:59:59`)
      .in('orders.status', ['delivered', 'shipped', 'ready', 'processing']);

    if (error) throw error;

    // Aggregate by product
    const productMap = new Map<number, { name: string; serial: string; total: number }>();
    (data || []).forEach((item) => {
      const i = item as { product_id: number; product_name: string; serial_number: string; quantity: number };
      const existing = productMap.get(i.product_id);
      if (existing) {
        existing.total += i.quantity;
      } else {
        productMap.set(i.product_id, {
          name: i.product_name,
          serial: i.serial_number,
          total: i.quantity,
        });
      }
    });

    return Array.from(productMap.entries())
      .map(([id, info]) => ({ product_id: id, ...info }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  async getSalesByGovernorate(range: AnalyticsDateRange) {
    const { data, error } = await this.db
      .from('orders')
      .select('customer_governorate, total')
      .in('status', ['delivered', 'shipped', 'ready'])
      .gte('created_at', `${range.from}T00:00:00`)
      .lte('created_at', `${range.to}T23:59:59`);

    if (error) throw error;

    const governorates: Record<string, { count: number; revenue: number }> = {};
    (data || []).forEach((o) => {
      const order = o as { customer_governorate: string; total: number };
      if (!governorates[order.customer_governorate]) {
        governorates[order.customer_governorate] = { count: 0, revenue: 0 };
      }
      governorates[order.customer_governorate]!.count += 1;
      governorates[order.customer_governorate]!.revenue += Number(order.total);
    });
    return governorates;
  }

  async getAverageOrderValue(range: AnalyticsDateRange): Promise<number> {
    const { data, error } = await this.db
      .from('orders')
      .select('total')
      .eq('status', 'delivered')
      .gte('created_at', `${range.from}T00:00:00`)
      .lte('created_at', `${range.to}T23:59:59`);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const total = data.reduce((sum, o) => sum + Number((o as { total: number }).total), 0);
    return total / data.length;
  }

  async getTopCustomers(range: AnalyticsDateRange, limit: number = 10) {
    const { data, error } = await this.db
      .from('orders')
      .select('customer_name, customer_phone, total')
      .in('status', ['delivered', 'shipped', 'ready'])
      .gte('created_at', `${range.from}T00:00:00`)
      .lte('created_at', `${range.to}T23:59:59`);

    if (error) throw error;

    const customerMap = new Map<string, { name: string; phone: string; orders: number; total: number }>();
    (data || []).forEach((o) => {
      const order = o as { customer_name: string; customer_phone: string; total: number };
      const key = order.customer_phone;
      const existing = customerMap.get(key);
      if (existing) {
        existing.orders += 1;
        existing.total += Number(order.total);
      } else {
        customerMap.set(key, {
          name: order.customer_name,
          phone: order.customer_phone,
          orders: 1,
          total: Number(order.total),
        });
      }
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  async getMonthlyGrowth(range: AnalyticsDateRange) {
    const { data, error } = await this.db
      .from('orders')
      .select('total, created_at')
      .eq('status', 'delivered')
      .gte('created_at', `${range.from}T00:00:00`)
      .lte('created_at', `${range.to}T23:59:59`)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by month
    const months: Record<string, number> = {};
    (data || []).forEach((o) => {
      const order = o as { total: number; created_at: string };
      const month = order.created_at.substring(0, 7); // YYYY-MM
      months[month] = (months[month] || 0) + Number(order.total);
    });

    return months;
  }

  async getRepeatCustomers(range: AnalyticsDateRange): Promise<number> {
    const { data, error } = await this.db
      .from('orders')
      .select('customer_phone')
      .in('status', ['delivered', 'shipped', 'ready'])
      .gte('created_at', `${range.from}T00:00:00`)
      .lte('created_at', `${range.to}T23:59:59`);

    if (error) throw error;

    const customerCounts = new Map<string, number>();
    (data || []).forEach((o) => {
      const phone = (o as { customer_phone: string }).customer_phone;
      customerCounts.set(phone, (customerCounts.get(phone) || 0) + 1);
    });

    let repeat = 0;
    customerCounts.forEach((count) => {
      if (count > 1) repeat++;
    });
    return repeat;
  }

  async getAverageFulfillmentTime(range: AnalyticsDateRange): Promise<number> {
    // Get orders that were delivered with their status logs
    const { data, error } = await this.db
      .from('orders')
      .select('id, created_at')
      .eq('status', 'delivered')
      .gte('created_at', `${range.from}T00:00:00`)
      .lte('created_at', `${range.to}T23:59:59`);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    // Get delivery timestamps from status logs
    const orderIds = data.map((o) => (o as { id: number }).id);
    const { data: logs, error: logsError } = await this.db
      .from('order_status_logs')
      .select('order_id, created_at')
      .in('order_id', orderIds)
      .eq('new_status', 'delivered');

    if (logsError) throw logsError;

    const deliveryMap = new Map<number, string>();
    (logs || []).forEach((l) => {
      const log = l as { order_id: number; created_at: string };
      deliveryMap.set(log.order_id, log.created_at);
    });

    let totalHours = 0;
    let count = 0;
    data.forEach((o) => {
      const order = o as { id: number; created_at: string };
      const deliveredAt = deliveryMap.get(order.id);
      if (deliveredAt) {
        const diff = new Date(deliveredAt).getTime() - new Date(order.created_at).getTime();
        totalHours += diff / (1000 * 60 * 60);
        count++;
      }
    });

    return count > 0 ? totalHours / count : 0;
  }

  async getPendingShipmentsCount(): Promise<number> {
    const { count, error } = await this.db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ready');

    if (error) throw error;
    return count || 0;
  }
}

export const analyticsRepository = new AnalyticsRepository();

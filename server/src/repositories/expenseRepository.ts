import { getAdminClient } from '../config/supabase.js';
import type { Expense, ExpenseFilters, CreateExpenseDTO } from '../types/index.js';

export class ExpenseRepository {
  private get db() {
    return getAdminClient();
  }

  async findAll(filters: ExpenseFilters): Promise<{ data: Expense[]; count: number }> {
    let query = this.db
      .from('expenses')
      .select('*, profiles:created_by(name)', { count: 'exact' })
      .is('deleted_at', null);

    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.dateFrom) {
      query = query.gte('expense_date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('expense_date', filters.dateTo);
    }

    query = query.order('expense_date', { ascending: false });

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data as Expense[]) || [], count: count || 0 };
  }

  async findById(id: number): Promise<Expense | null> {
    const { data, error } = await this.db
      .from('expenses')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Expense | null;
  }

  async create(dto: CreateExpenseDTO & { created_by: string }): Promise<Expense> {
    const { data, error } = await this.db
      .from('expenses')
      .insert(dto)
      .select()
      .single();

    if (error) throw error;
    return data as Expense;
  }

  async update(id: number, dto: Partial<CreateExpenseDTO>): Promise<Expense> {
    const { data, error } = await this.db
      .from('expenses')
      .update(dto)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return data as Expense;
  }

  async softDelete(id: number): Promise<void> {
    const { error } = await this.db
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async getTotalByDateRange(from: string, to: string): Promise<number> {
    const { data, error } = await this.db
      .from('expenses')
      .select('amount')
      .is('deleted_at', null)
      .gte('expense_date', from)
      .lte('expense_date', to);

    if (error) throw error;
    return (data || []).reduce((sum, e) => sum + Number((e as { amount: number }).amount), 0);
  }

  async getByCategory(from: string, to: string): Promise<Record<string, number>> {
    const { data, error } = await this.db
      .from('expenses')
      .select('category, amount')
      .is('deleted_at', null)
      .gte('expense_date', from)
      .lte('expense_date', to);

    if (error) throw error;

    const result: Record<string, number> = {};
    (data || []).forEach((e) => {
      const expense = e as { category: string; amount: number };
      result[expense.category] = (result[expense.category] || 0) + Number(expense.amount);
    });
    return result;
  }
}

export const expenseRepository = new ExpenseRepository();

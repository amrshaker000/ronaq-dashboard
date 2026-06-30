import { expenseRepository } from '../repositories/expenseRepository.js';
import { activityLogRepository } from '../repositories/profileRepository.js';
import { createAppError } from '../middleware/errorHandler.js';
import type { Expense, ExpenseFilters, CreateExpenseDTO } from '../types/index.js';

export class ExpenseService {
  async getAll(filters: ExpenseFilters) {
    const { data, count } = await expenseRepository.findAll(filters);
    return {
      expenses: data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count,
        totalPages: Math.ceil(count / filters.pageSize),
      },
    };
  }

  async getById(id: number): Promise<Expense> {
    const expense = await expenseRepository.findById(id);
    if (!expense) {
      throw createAppError('المصروف غير موجود.', 404);
    }
    return expense;
  }

  async create(dto: CreateExpenseDTO, userId: string): Promise<Expense> {
    const expense = await expenseRepository.create({
      ...dto,
      created_by: userId,
    });

    await activityLogRepository.log({
      user_id: userId,
      action: 'create',
      entity_type: 'expense',
      entity_id: expense.id,
      description: `تم تسجيل مصروف جديد بقيمة ${expense.amount} ج.م في تصنيف ${expense.category}`,
    });

    return expense;
  }

  async update(id: number, dto: Partial<CreateExpenseDTO>, userId: string): Promise<Expense> {
    const existing = await expenseRepository.findById(id);
    if (!existing) {
      throw createAppError('المصروف غير موجود.', 404);
    }

    const expense = await expenseRepository.update(id, dto);

    await activityLogRepository.log({
      user_id: userId,
      action: 'update',
      entity_type: 'expense',
      entity_id: id,
      description: `تم تحديث المصروف بقيمة ${expense.amount} ج.م`,
    });

    return expense;
  }

  async delete(id: number, userId: string): Promise<void> {
    const existing = await expenseRepository.findById(id);
    if (!existing) {
      throw createAppError('المصروف غير موجود.', 404);
    }

    await expenseRepository.softDelete(id);

    await activityLogRepository.log({
      user_id: userId,
      action: 'delete',
      entity_type: 'expense',
      entity_id: id,
      description: `تم حذف المصروف بقيمة ${existing.amount} ج.م`,
    });
  }
}

export const expenseService = new ExpenseService();

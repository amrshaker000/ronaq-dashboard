import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { apiRequest } from '@/lib/api';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus,
  TrendingUp,
  ArrowDownRight,
  TrendingDown,
  Calendar,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';
import type { Expense } from '@/types';

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  expensesByCategory: Record<string, number>;
}

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Filters State
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Date Range for P&L
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Last 30 days
    return d.toISOString().split('T')[0]!;
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]!);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [expCategory, setExpCategory] = useState('printing');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (category) params.append('category', category);

      const response = await apiRequest<Expense[]>(`/expenses?${params.toString()}`);
      if (response.success) {
        setExpenses(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setTotalItems(response.pagination.total);
        }
      }
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFinancials = async () => {
    try {
      setLoadingSummary(true);
      const response = await apiRequest<FinancialSummary>(
        `/analytics/financials?from=${dateFrom}&to=${dateTo}`
      );
      if (response.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error('Failed to load financial summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [page, category]);

  useEffect(() => {
    loadFinancials();
  }, [dateFrom, dateTo]);

  const handleOpenAddModal = () => {
    setAmount(0);
    setExpCategory('printing');
    setExpDate(new Date().toISOString().split('T')[0]!);
    setDescription('');
    setNotes('');
    setShowAddModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast.error('يرجى تحديد مبلغ مصروف صحيح أكبر من 0.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        category: expCategory,
        amount: Number(amount),
        description: description || undefined,
        expense_date: expDate,
        notes: notes || undefined,
      };

      const response = await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        toast.success('تم تسجيل المصروف بنجاح.');
        setShowAddModal(false);
        loadExpenses();
        loadFinancials();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل حفظ المصروف.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;

    try {
      const response = await apiRequest(`/expenses/${id}`, {
        method: 'DELETE',
      });
      if (response.success) {
        toast.success('تم حذف المصروف بنجاح.');
        loadExpenses();
        loadFinancials();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل حذف المصروف.');
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="page-title">المصاريف والأرباح (P&L)</h2>
          <p className="page-subtitle">تسجيل التكاليف وتتبع الأرباح الصافية وتحليلات الأداء المالي</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-400 text-white font-bold text-body-md hover:bg-brand-500 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          تسجيل مصروف جديد
        </button>
      </div>

      {/* Date Range Selector for Financials */}
      <div className="card p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <span className="text-body-md font-semibold text-on-surface flex items-center gap-1.5">
          <Calendar className="w-5 h-5 text-brand-400" />
          الفترة المالية المحددة للتحليل:
        </span>
        
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
          />
          <span className="text-body-md">إلى</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="metric-card bg-white">
          {loadingSummary ? (
            <LoadingSpinner />
          ) : (
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="metric-label">إجمالي الإيرادات (المبيعات)</span>
                <h3 className="metric-value text-success-dark">
                  {formatCurrency(summary?.totalRevenue || 0)}
                </h3>
              </div>
              <div className="p-3 bg-success-light rounded-lg text-success-dark">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          )}
        </div>

        {/* Total Expenses */}
        <div className="metric-card bg-white">
          {loadingSummary ? (
            <LoadingSpinner />
          ) : (
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="metric-label">إجمالي المصاريف المسجلة</span>
                <h3 className="metric-value text-danger-dark">
                  {formatCurrency(summary?.totalExpenses || 0)}
                </h3>
              </div>
              <div className="p-3 bg-danger-light rounded-lg text-danger-dark">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
          )}
        </div>

        {/* Net Profit */}
        <div className="metric-card bg-white">
          {loadingSummary ? (
            <LoadingSpinner />
          ) : (
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="metric-label">صافي الأرباح</span>
                <h3
                  className={`metric-value ${
                    (summary?.netProfit || 0) >= 0 ? 'text-brand-400' : 'text-danger'
                  }`}
                >
                  {formatCurrency(summary?.netProfit || 0)}
                </h3>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  (summary?.netProfit || 0) >= 0
                    ? 'bg-brand-50 text-brand-400'
                    : 'bg-danger-light text-danger'
                }`}
              >
                <ArrowDownRight className="w-6 h-6" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses List */}
        <div className="card bg-white p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-body-lg font-bold text-on-surface">دفتر المصاريف</h3>
            
            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-label-sm bg-white"
            >
              <option value="">كل التصنيفات</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant">لا توجد مصاريف مسجلة حالياً</div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>التصنيف</th>
                      <th>القيمة</th>
                      <th>البيان</th>
                      <th>المسؤول</th>
                      <th>حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp: any) => (
                      <tr key={exp.id}>
                        <td>{formatDate(exp.expense_date)}</td>
                        <td>
                          <span className="badge badge-neutral">
                            {EXPENSE_CATEGORY_LABELS[exp.category]}
                          </span>
                        </td>
                        <td className="font-bold text-danger-dark">{formatCurrency(exp.amount)}</td>
                        <td className="max-w-xs truncate">{exp.description || '—'}</td>
                        <td>{exp.profiles?.name || 'غير معروف'}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 rounded text-danger hover:bg-danger-light"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                  <span className="text-label-sm text-on-surface-variant">
                    عرض {expenses.length} من أصل {totalItems} مصروف
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-label-sm font-semibold px-2">
                      الصفحة {page} من {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expense breakdown by Category */}
        <div className="card bg-white p-6 space-y-4">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-body-lg font-bold text-on-surface">توزيع المصاريف حسب التصنيف</h3>
          </div>

          {loadingSummary ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-4">
              {EXPENSE_CATEGORIES.map((cat) => {
                const totalExp = summary?.totalExpenses || 1;
                const value = summary?.expensesByCategory[cat] || 0;
                const percent = Math.round((value / totalExp) * 100) || 0;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-body-md">
                      <span className="text-on-surface-variant">{EXPENSE_CATEGORY_LABELS[cat]}</span>
                      <span className="font-semibold">{formatCurrency(value)} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-300 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-modal border border-neutral-200 w-full max-w-md animate-fade-up">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2 mb-4">
              تسجيل مصروف جديد في الحسابات
            </h3>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  required
                  min={0.5}
                  step="0.5"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">التصنيف *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {EXPENSE_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">تاريخ الصرف *</label>
                <input
                  type="date"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">البيان / الوصف</label>
                <input
                  type="text"
                  placeholder="مثال: فاتورة كهرباء المطبعة، كرتون تغليف..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات اختيارية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-on-surface font-semibold text-body-md"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-brand-400 hover:bg-brand-500 text-white font-semibold text-body-md"
                >
                  تسجيل المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

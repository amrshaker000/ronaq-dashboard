import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { apiRequest } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  EGYPTIAN_GOVERNORATES,
} from '@/lib/constants';
import { Search, Plus, Filter, ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Order } from '@/types';

export const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [governorate, setGovernorate] = useState<string>('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 15;

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (governorate) params.append('governorate', governorate);

      const response = await apiRequest<Order[]>(`/orders?${params.toString()}`);
      if (response.success) {
        setOrders(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setTotalItems(response.pagination.total);
        }
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, status, governorate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'received':
        return 'badge-primary';
      case 'processing':
      case 'prepared':
      case 'delivering':
        return 'badge-warning';
      case 'delivered':
        return 'badge-success';
      case 'cancelled':
      case 'returned':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="page-title">قائمة الطلبات</h2>
          <p className="page-subtitle">عرض وتتبع جميع الطلبات، تغيير الحالات، وتجهيز شحنات العملاء</p>
        </div>
        
        <button
          onClick={() => navigate('/orders/new')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-400 text-white font-bold text-body-md hover:bg-brand-500 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          إنشاء طلب جديد
        </button>
      </div>

      {/* Filters Panel */}
      <div className="card p-4 bg-white space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <input
              type="text"
              placeholder="البحث برقم الطلب، اسم العميل، الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-10 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none transition-colors"
            />
            <button type="submit" className="absolute top-2.5 right-3 text-neutral-500">
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Governorate Filter */}
          <div>
            <select
              value={governorate}
              onChange={(e) => {
                setGovernorate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
            >
              <option value="">-- كل المحافظات --</option>
              {EGYPTIAN_GOVERNORATES.map((gov) => (
                <option key={gov} value={gov}>
                  {gov}
                </option>
              ))}
            </select>
          </div>

          {/* Search Action for text search only */}
          <button
            type="submit"
            className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-on-surface font-semibold rounded-lg text-body-md transition-colors"
          >
            بحث
          </button>
        </form>

        {/* Status filters toggles */}
        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
          <span className="text-label-sm font-semibold text-on-surface-variant flex items-center gap-1">
            <Filter className="w-4 h-4" />
            تصفية بالحالة:
          </span>
          
          <button
            onClick={() => {
              setStatus('');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full text-label-sm font-semibold transition-colors ${
              status === ''
                ? 'bg-brand-400 text-white shadow-sm'
                : 'bg-neutral-100 text-on-surface-variant hover:bg-neutral-200'
            }`}
          >
            الكل
          </button>

          {ORDER_STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatus(st);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-label-sm font-semibold transition-colors ${
                status === st
                  ? 'bg-brand-400 text-white shadow-sm'
                  : 'bg-neutral-100 text-on-surface-variant hover:bg-neutral-200'
              }`}
            >
              {ORDER_STATUS_LABELS[st]}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card bg-white p-6 space-y-4">
        {loading ? (
          <LoadingSpinner />
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">لا توجد أي طلبات مطابقة للبحث</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>اسم العميل</th>
                    <th>الهاتف</th>
                    <th>المحافظة</th>
                    <th>الحالة</th>
                    <th>تاريخ الطلب</th>
                    <th>القيمة الإجمالية</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="cursor-pointer"
                    >
                      <td className="font-mono text-brand-400 font-semibold">{order.order_number}</td>
                      <td className="font-medium">{order.customer_name}</td>
                      <td className="font-mono text-neutral-600 ltr text-right">{order.customer_phone}</td>
                      <td>{order.customer_governorate}</td>
                      <td>
                        <span className={getStatusBadgeClass(order.status)}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td>{formatDateTime(order.created_at)}</td>
                      <td className="font-semibold">{formatCurrency(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                <span className="text-label-sm text-on-surface-variant">
                  عرض {orders.length} من أصل {totalItems} طلب
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <span className="text-body-md font-semibold px-4">
                    الصفحة {page} من {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
};

import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp,
  ShoppingBag,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { Link, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Order } from '@/types';

interface DashboardMetrics {
  todayRevenue: number;
  activeOrders: number;
  totalProducts: number;
  todayOrders: number;
  statusCounts: Record<string, number>;
}

export const Dashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsRes, ordersRes] = await Promise.all([
        apiRequest<DashboardMetrics>('/analytics/dashboard'),
        apiRequest<Order[]>('/orders/recent?limit=5'),
      ]);
      if (metricsRes.success) setMetrics(metricsRes.data);
      if (ordersRes.success) setRecentOrders(ordersRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

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
      {/* Welcome Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="page-title">نظرة عامة</h2>
          <p className="page-subtitle">أرقام وإحصائيات العمل اليومية وملخص الحركات الأخيرة</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Revenue Card (Admin Only) */}
        {isAdmin && (
          <div className="metric-card bg-white hover:shadow-card-hover transition-shadow duration-200">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="metric-label">مبيعات اليوم المستلمة</span>
                <h3 className="metric-value text-brand-400">
                  {formatCurrency(metrics?.todayRevenue || 0)}
                </h3>
              </div>
              <div className="p-3 bg-brand-50 rounded-lg text-brand-400">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {/* Today's Orders */}
        <div className="metric-card bg-white hover:shadow-card-hover transition-shadow duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="metric-label">طلبات اليوم الجديدة</span>
              <h3 className="metric-value">{metrics?.todayOrders || 0}</h3>
            </div>
            <div className="p-3 bg-neutral-100 rounded-lg text-neutral-600">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Active Orders */}
        <div className="metric-card bg-white hover:shadow-card-hover transition-shadow duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="metric-label">الطلبات النشطة (قيد العمل)</span>
              <h3 className="metric-value text-warning-dark">{metrics?.activeOrders || 0}</h3>
            </div>
            <div className="p-3 bg-warning-light rounded-lg text-warning-dark">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="card bg-white p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-body-lg font-bold text-on-surface">آخر الطلبات المستلمة</h3>
            <Link
              to="/orders"
              className="text-label-sm font-semibold text-brand-400 hover:text-brand-500 flex items-center gap-1"
            >
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant">
                لا توجد طلبات مسجلة حالياً
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>اسم العميل</th>
                    <th>المحافظة</th>
                    <th>الحالة</th>
                    <th>القيمة الإجمالية</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="cursor-pointer"
                    >
                      <td className="font-mono text-brand-400 font-semibold">
                        {order.order_number}
                      </td>
                      <td className="font-medium">{order.customer_name}</td>
                      <td>{order.customer_governorate}</td>
                      <td>
                        <span className={getStatusBadgeClass(order.status)}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="font-semibold">{formatCurrency(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Status Breakdown Panel */}
        <div className="card bg-white p-6 space-y-4">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-body-lg font-bold text-on-surface">إحصائيات حالات الطلبات</h3>
          </div>

          <div className="space-y-3">
            {Object.keys(ORDER_STATUS_LABELS).map((status) => {
              const count = metrics?.statusCounts[status] || 0;
              const totalOrders = Object.values(metrics?.statusCounts || {}).reduce(
                (sum, val) => sum + val,
                0
              ) || 1;
              const percentage = Math.round((count / totalOrders) * 100);

              return (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-body-md">
                    <span className="font-medium text-on-surface-variant">
                      {ORDER_STATUS_LABELS[status]}
                    </span>
                    <span className="font-bold text-on-surface">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        status === 'received'
                          ? 'bg-brand-400'
                          : status === 'cancelled' || status === 'returned'
                          ? 'bg-danger'
                          : status === 'delivered'
                          ? 'bg-success'
                          : 'bg-warning'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

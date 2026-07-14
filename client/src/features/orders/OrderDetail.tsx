import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { apiRequest } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/constants';
import {
  ArrowRight,
  User,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  FileText,
  AlertCircle,
  Play,
  XCircle,
  Edit,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';
import type { Order, OrderItem, OrderStatusLog, OrderStatus } from '@/types';

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [statusLogs, setStatusLogs] = useState<OrderStatusLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Transition Form State
  const [nextStatus, setNextStatus] = useState<OrderStatus>('processing');
  const [paymentMethod, setPaymentMethod] = useState<'wallet_instapay' | 'cod'>('cod');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCompany, setShippingCompany] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');

  // Edit Order State
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_governorate: '',
    customer_address: '',
    shipping_cost: 0,
    discount: 0,
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{
        order: Order;
        items: OrderItem[];
        statusLogs: OrderStatusLog[];
      }>(`/orders/${id}`);
      if (response.success) {
        setOrder(response.data.order);
        setItems(response.data.items);
        setStatusLogs(response.data.statusLogs);
      }
    } catch (error: any) {
      console.error(error);
      toast.error('فشل تحميل تفاصيل الطلب.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const handleReturnOrder = async () => {
    if (!window.confirm('هل أنت متأكد من تسجيل هذا الطلب كمرتجع؟')) return;

    try {
      setSubmitting(true);
      const response = await apiRequest(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'returned',
          notes: 'تم إرجاع الطلب من قبل المستخدم',
        }),
      });
      if (response.success) {
        toast.success('تم تسجيل مرتجع الطلب بنجاح وتحديث الحسابات.');
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل إرجاع الطلب.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;

    try {
      setSubmitting(true);
      const response = await apiRequest(`/orders/${id}/cancel`, {
        method: 'POST',
      });
      if (response.success) {
        toast.success('تم إلغاء الطلب بنجاح وتحديث الحسابات.');
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل إلغاء الطلب.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        status: nextStatus,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        tracking_number: trackingNumber || undefined,
        shipping_company: shippingCompany || undefined,
        notes: transitionNotes || undefined,
      };

      const response = await apiRequest(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        toast.success('تم تحديث حالة الطلب بنجاح.');
        setShowStatusModal(false);
        setTrackingNumber('');
        setShippingCompany('');
        setTransitionNotes('');
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل تحديث الحالة.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await apiRequest(`/orders/${id}/details`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });

      if (response.success) {
        toast.success('تم تحديث بيانات الطلب بنجاح.');
        setShowEditModal(false);
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل تحديث بيانات الطلب.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!order) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-danger mx-auto mb-2" />
          <h3 className="text-body-lg font-bold">الطلب غير موجود</h3>
          <button onClick={() => navigate('/orders')} className="mt-4 text-brand-400 font-semibold">
            العودة لقائمة الطلبات
          </button>
        </div>
      </PageWrapper>
    );
  }

  // Determine valid next statuses
  const getNextStatuses = (current: OrderStatus): OrderStatus[] => {
    const map: Record<OrderStatus, OrderStatus[]> = {
      received: ['processing', 'cancelled'],
      processing: ['prepared', 'cancelled'],
      prepared: ['delivering', 'cancelled'],
      delivering: ['delivered', 'cancelled', 'returned'],
      delivered: ['returned'],
      cancelled: [],
      returned: [],
    };
    return map[current] || [];
  };

  const allowedTransitions = getNextStatuses(order.status).filter((s) => s !== 'cancelled' && s !== 'returned');

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
      {/* Detail Header */}
      <div className="flex items-center gap-3 border-b border-neutral-200 pb-4 mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface flex items-center gap-3">
            تفاصيل الطلب: <span className="font-mono text-brand-400">{order.order_number}</span>
            <span className={getStatusBadgeClass(order.status)}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </h2>
          <p className="text-label-sm text-on-surface-variant">
            سجل بواسطة Supabase في {formatDateTime(order.created_at)}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Area (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table Card */}
          <div className="card p-6 bg-white space-y-4">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2">
              المنتجات المطلوبة
            </h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>الرقم التسلسلي</th>
                  <th>الملصق والتفاصيل</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono text-neutral-600">{item.serial_number}</td>
                    <td className="font-medium">
                      <div className="flex items-center gap-3">
                        {item.is_custom && item.custom_image_url ? (
                          <a 
                            href={item.custom_image_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded border border-neutral-200 overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity block bg-neutral-50 shadow-sm"
                            title="عرض التصميم بالحجم الكامل"
                          >
                            <img src={item.custom_image_url} alt="تصميم مخصوص" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <div className="w-12 h-12 rounded bg-neutral-50 border border-neutral-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-[10px] text-neutral-400 font-bold">جاهز</span>
                          </div>
                        )}
                        <div>
                          <span className="block font-bold text-body-md text-on-surface">{item.product_name}</span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {item.is_custom && (
                              <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">
                                تصميم مخصوص
                              </span>
                            )}
                            {item.material && (
                              <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">
                                {item.material === 'glossy' ? 'خامة: لامع' : item.material === 'matte' ? 'خامة: مط' : `خامة: ${item.material}`}
                              </span>
                            )}
                            {item.is_custom && item.custom_size && (
                              <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">
                                مقاس: {item.custom_size} سم
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{item.quantity}</td>
                    <td className="font-mono">{formatCurrency(item.unit_price)}</td>
                    <td className="font-semibold font-mono">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Customer & Delivery Card */}
          <div className="card p-6 bg-white grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2">
                معلومات العميل
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-body-md text-on-surface-variant">
                  <User className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="text-label-sm">الاسم الكامل</p>
                    <p className="font-medium text-on-surface">{order.customer_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-body-md text-on-surface-variant">
                  <Phone className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="text-label-sm">رقم الهاتف</p>
                    <p className="font-medium text-on-surface ltr">{order.customer_phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-body-md text-on-surface-variant">
                  <MapPin className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="text-label-sm">العنوان</p>
                    <p className="font-medium text-on-surface">
                      {order.customer_governorate} — {order.customer_address}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery/Payment info */}
            <div className="space-y-4">
              <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2">
                تفاصيل الشحن والدفع
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-body-md text-on-surface-variant">
                  <CreditCard className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="text-label-sm">حالة الدفع</p>
                    <span
                      className={`badge mt-0.5 ${
                        order.payment_status === 'paid' ? 'badge-success' : 'badge-danger'
                      }`}
                    >
                      {order.payment_status === 'paid' ? 'مدفوع' : 'لم يتم بعد'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-body-md text-on-surface-variant">
                  <Truck className="w-5 h-5 text-neutral-500" />
                  <div>
                    <p className="text-label-sm">شركة الشحن ورقم التتبع</p>
                    <p className="font-medium text-on-surface">
                      {order.shipping_company || 'غير محدد'} (رقم التتبع:{' '}
                      <span className="font-mono">{order.tracking_number || 'معلق'}</span>)
                    </p>
                  </div>
                </div>

                {order.notes && (
                  <div className="flex items-center gap-3 text-body-md text-on-surface-variant">
                    <FileText className="w-5 h-5 text-neutral-500" />
                    <div>
                      <p className="text-label-sm">ملاحظات العميل</p>
                      <p className="font-medium text-on-surface">{order.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Sidebar / Logs (Right Column) */}
        <div className="space-y-6">
          {/* Summary / Controls Card */}
          <div className="card p-6 bg-white space-y-4">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2">
              الحساب والعمليات
            </h3>
            
            <div className="space-y-2 border-b border-neutral-100 pb-4">
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>سعر المنتجات</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>مصاريف الشحن</span>
                <span>{formatCurrency(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>الخصم</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
              <div className="flex justify-between text-body-lg font-bold text-on-surface pt-2">
                <span>المجموع الكلي</span>
                <span className="text-brand-400 text-xl">{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Transition Controls */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setNextStatus(order.status);
                  setPaymentMethod(order.payment_method);
                  setPaymentStatus(order.payment_status || 'pending');
                  setShippingCompany(order.shipping_company || '');
                  setTrackingNumber(order.tracking_number || '');
                  setShowStatusModal(true);
                }}
                disabled={submitting}
                className="w-full py-2.5 bg-brand-400 hover:bg-brand-500 text-white font-semibold rounded-lg text-body-md flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="w-5 h-5" />
                تحديث حالة الطلب
              </button>

              <button
                onClick={() => {
                  setEditForm({
                    customer_name: order.customer_name,
                    customer_phone: order.customer_phone,
                    customer_governorate: order.customer_governorate,
                    customer_address: order.customer_address,
                    shipping_cost: order.shipping_cost,
                    discount: order.discount,
                    notes: order.notes || '',
                  });
                  setShowEditModal(true);
                }}
                disabled={submitting}
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-on-surface font-semibold rounded-lg text-body-md flex items-center justify-center gap-2 transition-colors border border-neutral-200"
              >
                <Edit className="w-5 h-5 text-neutral-600" />
                تعديل بيانات الطلب والعميل
              </button>

              {order.status !== 'cancelled' && order.status !== 'returned' && (
                order.status === 'delivered' || order.status === 'delivering' ? (
                  <button
                    onClick={handleReturnOrder}
                    disabled={submitting}
                    className="w-full py-2.5 bg-danger-light hover:bg-danger/25 text-danger font-semibold rounded-lg text-body-md flex items-center justify-center gap-2 transition-colors border border-danger/30"
                  >
                    <XCircle className="w-5 h-5" />
                    تسجيل الطلب كمرتجع (تحديث المبيعات)
                  </button>
                ) : (
                  <button
                    onClick={handleCancelOrder}
                    disabled={submitting}
                    className="w-full py-2.5 bg-danger-light hover:bg-danger/25 text-danger font-semibold rounded-lg text-body-md flex items-center justify-center gap-2 transition-colors border border-danger/30"
                  >
                    <XCircle className="w-5 h-5" />
                    إلغاء الطلب بالكامل
                  </button>
                )
              )}
            </div>
          </div>

          {/* Timeline status logs */}
          <div className="card p-6 bg-white space-y-4">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2">
              سجل حالة الطلب
            </h3>
            
            <div className="relative border-r border-neutral-200 pr-4 space-y-6">
              {statusLogs.map((log) => (
                <div key={log.id} className="relative">
                  {/* Circle Indicator */}
                  <span className="absolute top-1 -right-[21px] w-2.5 h-2.5 rounded-full bg-brand-400 border border-white" />
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-body-md font-semibold text-on-surface">
                        حالة: {ORDER_STATUS_LABELS[log.new_status]}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    <p className="text-label-sm text-on-surface-variant">
                      بواسطة: {log.profiles?.name || 'النظام'}
                    </p>
                    {log.notes && (
                      <p className="text-label-sm bg-neutral-50 p-2 rounded border border-neutral-100 text-neutral-600 mt-1">
                        {log.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Type Card */}
          <div className="card p-6 bg-white space-y-3 mt-6">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2">
              نوع الدفع
            </h3>
            <div className="flex items-center gap-3 text-body-md text-on-surface-variant">
              <CreditCard className="w-5 h-5 text-neutral-500" />
              <div>
                <p className="font-semibold text-on-surface text-body-md">
                  {PAYMENT_METHOD_LABELS[order.payment_method || 'cod']}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transition Modal Popup */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-modal border border-neutral-200 w-full max-w-md animate-fade-up">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2 mb-4">
              تحديث حالة الطلب
            </h3>
            
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">الحالة القادمة</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                >
                  <option value={order.status}>
                    {ORDER_STATUS_LABELS[order.status]} (الحالية)
                  </option>
                  {allowedTransitions.map((status) => (
                    <option key={status} value={status}>
                      {ORDER_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">نوع الدفع</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                >
                  <option value="wallet_instapay">محفظة الكترونية/انستاباي</option>
                  <option value="cod">الدفع عند الاستلام</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">حالة الدفع</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                >
                  <option value="paid">مدفوع</option>
                  <option value="pending">لم يتم بعد</option>
                </select>
              </div>

              {/* Conditionally ask for shipping detail */}
              {(nextStatus === 'delivering' || order.status === 'prepared') && (
                <>
                  <div className="space-y-1">
                    <label className="text-label-sm font-semibold text-on-surface">شركة الشحن</label>
                    <input
                      type="text"
                      placeholder="بوسطة، أرامكس..."
                      value={shippingCompany}
                      onChange={(e) => setShippingCompany(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-label-sm font-semibold text-on-surface">رقم التتبع (Tracking Number)</label>
                    <input
                      type="text"
                      placeholder="رقم تتبع شحنة العميل"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none ltr text-right"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">ملاحظات التغيير</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات توضيحية اختيارية لتغيير الحالة..."
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-on-surface font-semibold text-body-md"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-brand-400 hover:bg-brand-500 text-white font-semibold text-body-md"
                >
                  حفظ وتحديث
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal Popup */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-modal border border-neutral-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2 mb-4">
              تعديل بيانات الطلب
            </h3>
            
            <form onSubmit={handleEditOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">اسم العميل</label>
                  <input
                    type="text"
                    required
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">رقم الهاتف</label>
                  <input
                    type="text"
                    required
                    value={editForm.customer_phone}
                    onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none ltr text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">المحافظة</label>
                  <input
                    type="text"
                    required
                    value={editForm.customer_governorate}
                    onChange={(e) => setEditForm({ ...editForm, customer_governorate: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">العنوان بالتفصيل</label>
                  <input
                    type="text"
                    required
                    value={editForm.customer_address}
                    onChange={(e) => setEditForm({ ...editForm, customer_address: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">مصاريف الشحن</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.shipping_cost}
                    onChange={(e) => setEditForm({ ...editForm, shipping_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">الخصم</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.discount}
                    onChange={(e) => setEditForm({ ...editForm, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">ملاحظات الطلب</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-on-surface font-semibold text-body-md"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-brand-400 hover:bg-brand-500 text-white font-semibold text-body-md"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

import React, { useState } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Search,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  FileText,
  User,
  MapPin,
  Phone,
  ArrowRight,
} from 'lucide-react';
import logoImg from '@/assets/logo.jpg';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

interface OrderItemDetails {
  id: number;
  product_name: string;
  serial_number: string;
  quantity: number;
}

interface TrackedOrder {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_governorate: string;
  customer_address: string;
  status: string;
  shipping_company: string | null;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  items: OrderItemDetails[];
}

const ORDER_STATUS_LABELS_AR: Record<string, string> = {
  received: 'تم استلام الطلب',
  preparing: 'قيد التجهيز',
  prepared: 'تم التجهيز',
  delivering: 'قيد التوصيل',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
  returned: 'مرتجع',
};

const ORDER_STATUS_STEPS = [
  { key: 'received', label: 'تم الاستلام', icon: Clock },
  { key: 'preparing', label: 'التجهيز', icon: Package },
  { key: 'delivering', label: 'الشحن', icon: Truck },
  { key: 'delivered', label: 'التسليم', icon: CheckCircle2 },
];

export const TrackOrder: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const fetchOrderData = async (orderNum: string) => {
    try {
      setLoading(true);
      setOrder(null);
      const response = await apiRequest<TrackedOrder>(`/public/orders/track/${orderNum.trim()}`);
      if (response.success) {
        setOrder(response.data);
      } else {
        toast.error(response.message || 'الطلب غير موجود.');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'لم نتمكن من العثور على هذا الطلب. يرجى التأكد من الرمز.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const initialNum = (location.state as any)?.orderNumber;
    if (initialNum) {
      setOrderNumberInput(initialNum);
      fetchOrderData(initialNum);
    }
  }, [location.state]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = orderNumberInput.trim();
    if (!trimmedInput) {
      toast.error('يرجى إدخال رمز تتبع الطلب أولاً.');
      return;
    }

    // Strict validation: must start with RNQ
    if (!trimmedInput.startsWith('RNQ')) {
      toast.error('خطأ في رقم التتبع');
      return;
    }

    fetchOrderData(trimmedInput);
  };

  // Helper to determine step status
  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const statusOrder = ['received', 'preparing', 'prepared', 'delivering', 'delivered'];
    const currentIdx = statusOrder.indexOf(currentStatus);
    const stepIdx = statusOrder.indexOf(stepKey);

    if (currentStatus === 'cancelled' || currentStatus === 'returned') {
      return 'inactive';
    }

    if (stepKey === 'preparing' && currentStatus === 'prepared') {
      return 'completed';
    }

    if (currentIdx >= stepIdx) {
      return currentIdx === stepIdx ? 'active' : 'completed';
    }
    return 'pending';
  };

  return (
    <div className="min-h-screen pb-12 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-brand-50/45 backdrop-blur-md border-b border-brand-400/10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="رونق" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
            <div>
              <h1 className="text-body-lg font-bold text-brand-900 leading-none">تتبع طلبك</h1>
              <span className="text-[10px] text-brand-400">رونق ملصقات (Ronaq)</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/shop')}
            className="flex items-center gap-1 text-label-sm font-semibold text-brand-500 hover:underline"
          >
            <span>العودة للمتجر</span>
            <ArrowRight className="w-4 h-4 transform rotate-180" />
          </button>
        </div>
      </header>

      {/* Main Track Section */}
      <main className="max-w-3xl mx-auto px-4 mt-8 space-y-6 animate-fade-up">
        {/* Search Panel */}
        <div className="card p-6 bg-white/40 text-center space-y-4">
          <h2 className="text-headline-md font-bold text-brand-900">أدخل رمز الطلب لمتابعة حالته</h2>
          <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
            قم بإدخال رمز تتبع الطلب الفريد الذي حصلت عليه بعد تأكيد الطلب لمشاهدة التفاصيل ومراحل التوصيل.
          </p>

          <form onSubmit={handleTrack} className="flex gap-2 max-w-md mx-auto mt-4">
            <div className="relative flex-1">
              <input
                type="text"
                required
                placeholder="مثال: RNQ-A1B2-C3D4"
                value={orderNumberInput}
                onChange={(e) => setOrderNumberInput(e.target.value)}
                className="w-full pl-3 pr-9 py-2.5 border border-neutral-300 rounded-xl text-body-md focus:border-brand-400 focus:outline-none text-center font-mono tracking-wider"
              />
              <Search className="w-5 h-5 text-neutral-500 absolute top-3 right-3" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-brand-400 hover:bg-brand-500 disabled:bg-neutral-300 text-white font-bold rounded-xl text-body-md shadow-md transition-colors"
            >
              {loading ? 'جاري البحث...' : 'تتبع'}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        {order && (
          <div className="space-y-6">
            {/* Status Tracking Steps */}
            <div className="card p-6 bg-white/40">
              <h3 className="text-body-lg font-bold text-brand-900 border-b border-brand-400/10 pb-3 mb-6">
                مراحل تجهيز وتوصيل الطلب
              </h3>
              
              {order.status === 'cancelled' || order.status === 'returned' ? (
                <div className="text-center p-4 bg-danger-light border border-danger/30 rounded-xl text-danger-dark font-bold text-body-md">
                  حالة الطلب الحالية: {ORDER_STATUS_LABELS_AR[order.status]}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-[12%] right-[12%] h-0.5 bg-neutral-200 -z-10" />
                  
                  {ORDER_STATUS_STEPS.map((step) => {
                    const stepStatus = getStepStatus(step.key, order.status);
                    const StepIcon = step.icon;

                    return (
                      <div key={step.key} className="flex flex-col items-center text-center space-y-2">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                            stepStatus === 'completed'
                              ? 'bg-success border-success text-white shadow-md'
                              : stepStatus === 'active'
                              ? 'bg-brand-400 border-brand-400 text-white shadow-md animate-pulse'
                              : 'bg-white border-neutral-300 text-neutral-400'
                          }`}
                        >
                          <StepIcon className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-label-sm font-semibold ${
                            stepStatus === 'completed' || stepStatus === 'active'
                              ? 'text-brand-900 font-bold'
                              : 'text-neutral-500'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delivery & Items Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Delivery Info */}
              <div className="card p-6 bg-white/40 space-y-4">
                <h3 className="text-body-md font-bold text-brand-900 border-b border-brand-400/10 pb-2">
                  تفاصيل الشحن والتوصيل
                </h3>
                
                <div className="space-y-3 text-body-md text-on-surface">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-neutral-500" />
                    <div>
                      <p className="text-[10px] text-neutral-500">اسم المستلم</p>
                      <p className="font-semibold">{order.customer_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-neutral-500" />
                    <div>
                      <p className="text-[10px] text-neutral-500">رقم الهاتف</p>
                      <p className="font-semibold font-mono ltr">{order.customer_phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-neutral-500" />
                    <div>
                      <p className="text-[10px] text-neutral-500">المحافظة والعنوان</p>
                      <p className="font-semibold">
                        {order.customer_governorate} — {order.customer_address}
                      </p>
                    </div>
                  </div>

                  {(order.shipping_company || order.tracking_number) && (
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-neutral-500" />
                      <div>
                        <p className="text-[10px] text-neutral-500">تفاصيل شركة الشحن</p>
                        <p className="font-semibold">
                          {order.shipping_company || 'تحت التجهيز'} 
                          {order.tracking_number && ` (رقم التتبع: ${order.tracking_number})`}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-neutral-500" />
                      <div>
                        <p className="text-[10px] text-neutral-500">ملاحظات العميل</p>
                        <p className="font-semibold text-neutral-700">{order.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Card */}
              <div className="card p-6 bg-white/40 space-y-4">
                <h3 className="text-body-md font-bold text-brand-900 border-b border-brand-400/10 pb-2">
                  الملصقات المطلوبة
                </h3>

                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-white/30 p-2.5 rounded-lg border border-brand-400/5">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-body-md font-bold text-on-surface truncate">{item.product_name}</h4>
                        <span className="text-[10px] font-mono text-neutral-500">{item.serial_number}</span>
                      </div>
                      <div className="text-brand-500 font-bold font-mono text-body-md">
                        {item.quantity} ×
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

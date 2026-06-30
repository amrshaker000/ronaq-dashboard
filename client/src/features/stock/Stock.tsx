import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_REASON_LABELS,
} from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import {
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Truck,
  Trash,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';
import type { StockMovement, Product } from '@/types';

interface ShipmentItemInput {
  productId: number;
  quantity: number;
  costPrice: number;
}

export const Stock: React.FC = () => {
  const { isAdmin } = useAuth();
  
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [movementType, setMovementType] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 15;

  // Shipment Modal State
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentNotes, setShipmentNotes] = useState('');
  const [shipmentItems, setShipmentItems] = useState<ShipmentItemInput[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (movementType) params.append('movementType', movementType);

      const response = await apiRequest<StockMovement[]>(`/products/movements?${params.toString()}`);
      if (response.success) {
        setMovements(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setTotalItems(response.pagination.total);
        }
      }
    } catch (error) {
      console.error('Failed to load stock movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiRequest<Product[]>('/products?pageSize=100');
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [page, movementType]);

  useEffect(() => {
    if (isAdmin) {
      loadProducts();
    }
  }, [isAdmin]);

  const handleOpenShipmentModal = () => {
    setShipmentNotes('');
    setShipmentItems([{ productId: 0, quantity: 1, costPrice: 0 }]);
    setShowShipmentModal(true);
  };

  const handleAddShipmentItem = () => {
    setShipmentItems((prev) => [...prev, { productId: 0, quantity: 1, costPrice: 0 }]);
  };

  const handleRemoveShipmentItem = (index: number) => {
    setShipmentItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleShipmentItemChange = (index: number, field: keyof ShipmentItemInput, value: number) => {
    setShipmentItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        
        if (field === 'productId') {
          const prod = products.find((p) => p.id === value);
          return {
            ...item,
            productId: value,
            costPrice: prod ? prod.cost_price : 0,
          };
        }
        
        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shipmentItems.length === 0) {
      toast.error('يرجى إضافة منتج واحد على الأقل للشحنة.');
      return;
    }

    const invalid = shipmentItems.find((it) => it.productId === 0);
    if (invalid) {
      toast.error('يرجى تحديد منتج صحيح لجميع الأسطر.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        notes: shipmentNotes || undefined,
        items: shipmentItems.map((it) => ({
          product_id: it.productId,
          quantity: Number(it.quantity),
          cost_price: Number(it.costPrice),
        })),
      };

      const response = await apiRequest('/products/receive-shipment', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        toast.success('تم استلام الشحنة وتحديث المخزون بنجاح.');
        setShowShipmentModal(false);
        loadMovements();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل تسجيل الشحنة.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'stock_in':
        return <ArrowDownCircle className="w-5 h-5 text-success" />;
      case 'stock_out':
        return <ArrowUpCircle className="w-5 h-5 text-danger" />;
      default:
        return <Settings className="w-5 h-5 text-warning" />;
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="page-title">حركة المخزون والشحنات</h2>
          <p className="page-subtitle">تتبع سجل الحركات الداخلة والخارجة للمنتجات وتسجيل التوريدات</p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenShipmentModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-400 text-white font-bold text-body-md hover:bg-brand-500 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Truck className="w-5 h-5" />
            استلام شحنة جديدة
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 bg-white flex flex-wrap items-center gap-3">
        <span className="text-label-sm font-semibold text-on-surface-variant">تصفية بنوع الحركة:</span>
        <button
          onClick={() => {
            setMovementType('');
            setPage(1);
          }}
          className={`px-3 py-1 rounded-full text-label-sm font-semibold transition-colors ${
            movementType === ''
              ? 'bg-brand-400 text-white shadow-sm'
              : 'bg-neutral-100 text-on-surface-variant hover:bg-neutral-200'
          }`}
        >
          الكل
        </button>
        <button
          onClick={() => {
            setMovementType('stock_in');
            setPage(1);
          }}
          className={`px-3 py-1 rounded-full text-label-sm font-semibold transition-colors ${
            movementType === 'stock_in'
              ? 'bg-brand-400 text-white shadow-sm'
              : 'bg-neutral-100 text-on-surface-variant hover:bg-neutral-200'
          }`}
        >
          وارد (+)
        </button>
        <button
          onClick={() => {
            setMovementType('stock_out');
            setPage(1);
          }}
          className={`px-3 py-1 rounded-full text-label-sm font-semibold transition-colors ${
            movementType === 'stock_out'
              ? 'bg-brand-400 text-white shadow-sm'
              : 'bg-neutral-100 text-on-surface-variant hover:bg-neutral-200'
          }`}
        >
          صادر (-)
        </button>
        <button
          onClick={() => {
            setMovementType('adjustment');
            setPage(1);
          }}
          className={`px-3 py-1 rounded-full text-label-sm font-semibold transition-colors ${
            movementType === 'adjustment'
              ? 'bg-brand-400 text-white shadow-sm'
              : 'bg-neutral-100 text-on-surface-variant hover:bg-neutral-200'
          }`}
        >
          تسوية (±)
        </button>
      </div>

      {/* Table */}
      <div className="card bg-white p-6 space-y-4">
        {loading ? (
          <LoadingSpinner />
        ) : movements.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">لا توجد حركات مسجلة للمخزون</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>نوع الحركة</th>
                    <th>الكمية</th>
                    <th>قبل → بعد</th>
                    <th>السبب</th>
                    <th>المسؤول</th>
                    <th>التاريخ</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((move: any) => (
                    <tr key={move.id}>
                      <td className="font-medium">
                        <div>
                          <p className="text-body-md text-on-surface">{move.products?.name}</p>
                          <p className="font-mono text-xs text-brand-400">{move.products?.serial_number}</p>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          {getMovementIcon(move.movement_type)}
                          <span className="font-semibold text-body-md">
                            {MOVEMENT_TYPE_LABELS[move.movement_type]}
                          </span>
                        </div>
                      </td>
                      <td className="font-bold">
                        {move.movement_type === 'stock_in' ? '+' : move.movement_type === 'stock_out' ? '-' : ''}
                        {move.quantity} قطعة
                      </td>
                      <td className="font-mono text-neutral-600">
                        {move.before_quantity} ← {move.after_quantity}
                      </td>
                      <td>
                        <span className="badge badge-neutral">
                          {MOVEMENT_REASON_LABELS[move.reason]}
                        </span>
                      </td>
                      <td>{move.profiles?.name || 'غير معروف'}</td>
                      <td>{formatDateTime(move.created_at)}</td>
                      <td className="text-on-surface-variant max-w-xs truncate">{move.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                <span className="text-label-sm text-on-surface-variant">
                  عرض {movements.length} من أصل {totalItems} حركة
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <span className="text-body-md font-semibold px-4">
                    الصفحة {page} من {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Receive Shipment Modal */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-modal border border-neutral-200 w-full max-w-2xl animate-fade-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2 mb-4">
              تسجيل واستلام شحنة ملصقات واردة
            </h3>

            <form onSubmit={handleSaveShipment} className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-label-sm font-semibold text-on-surface">قائمة الملصقات المستلمة</span>
                  <button
                    type="button"
                    onClick={handleAddShipmentItem}
                    className="flex items-center gap-1 text-label-sm text-brand-400 hover:text-brand-500 font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة سطر منتج
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {shipmentItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3 rounded-lg border border-neutral-200 bg-surface-container-low"
                    >
                      {/* Product select */}
                      <div className="flex-1">
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleShipmentItemChange(index, 'productId', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                        >
                          <option value="">-- اختر ملصقاً --</option>
                          {products.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.name} ({prod.serial_number})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity & Unit cost */}
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <input
                            type="number"
                            min={1}
                            placeholder="الكمية"
                            value={item.quantity}
                            onChange={(e) => handleShipmentItemChange(index, 'quantity', Number(e.target.value))}
                            className="w-full px-2 py-2 border border-neutral-300 rounded-lg text-body-md text-center focus:border-brand-400 focus:outline-none"
                          />
                        </div>

                        <div className="w-28">
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            placeholder="سعر التكلفة"
                            value={item.costPrice}
                            onChange={(e) => handleShipmentItemChange(index, 'costPrice', Number(e.target.value))}
                            className="w-full px-2 py-2 border border-neutral-300 rounded-lg text-body-md text-center focus:border-brand-400 focus:outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveShipmentItem(index)}
                          className="p-2 rounded text-danger hover:bg-danger-light"
                        >
                          <Trash className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">ملاحظات التوريد</label>
                <textarea
                  rows={2}
                  placeholder="رقم الشحنة، تفاصيل المورد، ملاحظات إضافية..."
                  value={shipmentNotes}
                  onChange={(e) => setShipmentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowShipmentModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-on-surface font-semibold text-body-md"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting || shipmentItems.length === 0}
                  className="px-4 py-2 rounded-lg bg-brand-400 hover:bg-brand-500 text-white font-semibold text-body-md"
                >
                  تأكيد واستلام الشحنة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

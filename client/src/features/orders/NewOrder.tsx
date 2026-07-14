import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { apiRequest } from '@/lib/api';
import { EGYPTIAN_GOVERNORATES, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash, Check, AlertCircle, RefreshCw, Search, X, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Product } from '@/types';

interface OrderItemInput {
  productId: number | null;
  quantity: number;
  price: number;
  name: string;
  serialNumber: string;
  imagePath: string | null;
  isCustom: boolean;
  material: 'glossy' | 'matte';
  customSize?: string;
  customImageUrl?: string;
}

export const NewOrder: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGov, setCustomerGov] = useState('القاهرة');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet_instapay' | 'cod'>('cod');
  const [shippingCost, setShippingCost] = useState<number>(50);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemInput[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [refreshingProducts, setRefreshingProducts] = useState(false);
  
  const refreshProducts = async (showToast = false) => {
    try {
      setRefreshingProducts(true);
      const prodRes = await apiRequest<Product[]>('/products?pageSize=10000');
      if (prodRes.success) {
        const activeProds = prodRes.data.filter((p) => p.is_active);
        setProducts(activeProds);
        
        // Update items already in the list to match new prices
        setItems((prevItems) => {
          return prevItems.map((item) => {
            const currentProd = activeProds.find((p) => p.id === item.productId);
            if (currentProd) {
              return {
                ...item,
                price: currentProd.price,
                name: currentProd.name,
                serialNumber: currentProd.serial_number,
                imagePath: currentProd.image_path,
                quantity: item.quantity
              };
            }
            return item;
          });
        });

        if (showToast) {
          toast.success('تم تحديث قائمة المنتجات بنجاح.');
        }
      }
    } catch (error) {
      console.error('Failed to refresh products:', error);
      toast.error('حدث خطأ أثناء تحديث قائمة المنتجات.');
    } finally {
      setRefreshingProducts(false);
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoadingConfig(true);
        const prodRes = await apiRequest<Product[]>('/products?pageSize=10000');
        if (prodRes.success) {
          // Only show active products
          setProducts(prodRes.data.filter((p) => p.is_active));
        }
      } catch (error) {
        console.error('Failed to load initial configs:', error);
        toast.error('حدث خطأ أثناء تحميل بيانات التهيئة.');
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfig();
  }, []);

  const handleGovChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const gov = e.target.value;
    setCustomerGov(gov);
    if (gov === 'القاهرة') setShippingCost(45);
    else if (gov === 'الجيزة') setShippingCost(40);
    else if (gov === 'القليوبية') setShippingCost(50);
    else setShippingCost(60);
  };

  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectorCategory, setSelectorCategory] = useState('');

  const handleAddItem = () => {
    setSelectorSearch('');
    setSelectorCategory('');
    setShowSelectorModal(true);
    // refreshProducts(); // Removing auto-refresh to make it faster
  };

  const handleAddCustomSticker = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: null,
        quantity: 1,
        price: 20, // Default 3x3 glossy
        name: 'استيكر مخصوص',
        serialNumber: `CUST-${Date.now().toString().slice(-4)}`,
        imagePath: null,
        isCustom: true,
        material: 'glossy',
        customSize: '3*3',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleProduct = (product: Product) => {
    const alreadyExists = items.some((item) => item.productId === product.id);
    if (alreadyExists) {
      setItems((prev) => prev.filter((item) => item.productId !== product.id));
      toast.info(`تمت إزالة ${product.name} من الطلب.`);
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          quantity: 1,
          price: product.price,
          name: product.name,
          serialNumber: product.serial_number,
          imagePath: product.image_path,
          isCustom: false,
          material: 'glossy',
        },
      ]);
      toast.success(`تمت إضافة ${product.name} إلى الطلب.`);
    }
  };

  const handleItemPropertyChange = (index: number, field: keyof OrderItemInput, value: any) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        
        const updated = { ...it, [field]: value };
        
        // Recalculate price if size or material changes for custom stickers
        if (updated.isCustom && (field === 'customSize' || field === 'material')) {
          const sizeStr = updated.customSize || '3*3';
          const size = parseInt(sizeStr.split('*')[0] || '', 10) || 3;
          const basePrice = updated.material === 'glossy' ? 20 : 25;
          const sizeAddition = Math.max(0, size - 3) * 5;
          updated.price = basePrice + sizeAddition;
        }
        
        return updated;
      })
    );
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const item = items[index];
    if (!item) return;

    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, quantity: Math.max(1, quantity) } : it))
    );
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal + shippingCost - discount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('يرجى إضافة منتج واحد على الأقل للطلب.');
      return;
    }

    // Name validation: Letters only
    if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(customerName.trim())) {
      toast.error('اسم العميل يجب أن يحتوي على أحرف فقط (عربية أو إنجليزية).');
      return;
    }

    // Phone validation: numbers only, starts with 01, total 11 digits
    if (!/^01\d{9}$/.test(customerPhone.trim())) {
      toast.error('رقم الهاتف يجب أن يتكون من 11 رقماً ويبدأ بـ 01.');
      return;
    }

    // Address validation: letters, numbers, and symbols
    if (!/^[a-zA-Z0-9\u0600-\u06FF\u0660-\u0669\s.,\-\/()#_]+$/.test(customerAddress.trim())) {
      toast.error('العنوان يجب أن يحتوي على أحرف وأرقام ورموز مقبولة فقط.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_governorate: customerGov,
        customer_address: customerAddress.trim(),
        payment_method: paymentMethod,
        discount: Number(discount),
        shipping_cost: Number(shippingCost),
        notes: notes,
        items: items.map((it) => ({ 
          product_id: it.productId, 
          quantity: it.quantity,
          is_custom: it.isCustom,
          material: it.material,
          custom_size: it.customSize,
          custom_image_url: it.customImageUrl,
          price: it.price
        })),
      };

      const response = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        toast.success(`تم إنشاء الطلب ${response.data.order_number} بنجاح!`);
        navigate('/orders');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'فشل إنشاء الطلب. يرجى مراجعة المدخلات.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingConfig) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <PageWrapper>
      <div className="page-header">
        <h2 className="page-title">طلب جديد</h2>
        <p className="page-subtitle">تسجيل طلبية جديدة لعميل لطباعة الملصقات</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Card */}
          <div className="card p-6 bg-white space-y-4">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2">
              بيانات العميل الشحن
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">اسم العميل *</label>
                <input
                  type="text"
                  required
                  placeholder="محمد أحمد"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">رقم الهاتف *</label>
                <input
                  type="text"
                  required
                  placeholder="01xxxxxxxxx"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none transition-colors ltr text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">المحافظة *</label>
                <select
                  value={customerGov}
                  onChange={handleGovChange}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                >
                  {EGYPTIAN_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-label-sm font-semibold text-on-surface">العنوان بالتفصيل *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="الشارع، رقم العمارة، الشقة، معلم مميز..."
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Items Selector Card */}
          <div className="card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h3 className="text-body-lg font-bold text-on-surface">المنتجات المطلوبة</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddCustomSticker}
                  disabled={loading}
                  className="flex items-center gap-1 text-label-sm text-brand-500 hover:text-brand-600 font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  استيكر مخصوص
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={loading}
                  className="flex items-center gap-1 text-label-sm text-brand-400 hover:text-brand-500 font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  إضافة ملصق
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-neutral-400" />
                <span>قم بإضافة ملصقات للبدء في تجهيز الطلب</span>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3 rounded-lg border border-neutral-200 bg-surface-container-lowest"
                  >
                    {/* Product Info with Image */}
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      {item.imagePath ? (
                        <img
                          src={item.imagePath}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded border flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-neutral-100 flex items-center justify-center rounded border text-neutral-400 flex-shrink-0">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-body-md text-on-surface truncate flex items-center gap-2">
                          {item.name}
                          {item.isCustom && (
                            <span className="text-[10px] bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded">مخصوص</span>
                          )}
                        </div>
                        <div className="font-mono text-label-sm text-brand-400">
                          {item.serialNumber}
                        </div>
                      </div>
                    </div>

                    {/* Properties (Material & Size for Custom) */}
                    <div className="flex items-center gap-2">
                      {item.isCustom ? (
                        <>
                          <select
                            value={item.customSize || '3*3'}
                            onChange={(e) => handleItemPropertyChange(index, 'customSize', e.target.value)}
                            className="px-2 py-1.5 border border-neutral-300 rounded text-label-sm focus:border-brand-400 focus:outline-none bg-white"
                          >
                            <option value="3*3">3*3</option>
                            <option value="4*4">4*4</option>
                            <option value="5*5">5*5</option>
                            <option value="6*6">6*6</option>
                            <option value="7*7">7*7</option>
                            <option value="8*8">8*8</option>
                          </select>
                          <input 
                            type="text" 
                            placeholder="رابط الصورة (اختياري)" 
                            value={item.customImageUrl || ''}
                            onChange={e => handleItemPropertyChange(index, 'customImageUrl', e.target.value)}
                            className="w-32 px-2 py-1.5 border border-neutral-300 rounded text-label-sm focus:border-brand-400 focus:outline-none"
                          />
                        </>
                      ) : null}
                      
                      <select
                        value={item.material}
                        onChange={(e) => handleItemPropertyChange(index, 'material', e.target.value)}
                        className="px-2 py-1.5 border border-neutral-300 rounded text-label-sm focus:border-brand-400 focus:outline-none bg-white"
                      >
                        <option value="glossy">لامع</option>
                        <option value="matte">مط</option>
                      </select>
                    </div>

                    {/* Quantity & Pricing details */}
                    <div className="flex items-center gap-3 justify-between md:justify-end">
                      <div className="w-20">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                          disabled={loading || (item.productId === null && !item.isCustom)}
                          className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg text-body-md text-center focus:border-brand-400 focus:outline-none"
                        />
                      </div>
                      
                      <div className="w-24 text-left font-semibold text-on-surface text-body-md">
                        {formatCurrency(item.price * item.quantity)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={loading}
                        className="p-2 rounded-lg text-danger hover:bg-danger-light transition-colors"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Totals & Options (Right Column) */}
        <div className="space-y-6">
          <div className="card p-6 bg-white space-y-6">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2">
              ملخص الحساب
            </h3>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-label-sm font-semibold text-on-surface">طريقة الدفع</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method as any)}
                    disabled={loading}
                    className={`py-2 text-label-sm font-medium border rounded-lg transition-colors ${
                      paymentMethod === method
                        ? 'border-brand-400 bg-brand-50 text-brand-400'
                        : 'border-neutral-200 text-on-surface-variant hover:bg-neutral-50'
                    }`}
                  >
                    {PAYMENT_METHOD_LABELS[method]}
                  </button>
                ))}
              </div>
            </div>

            {/* Financial Calculations */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-body-md">
                <span className="text-on-surface-variant">مجموع المنتجات</span>
                <span className="font-semibold text-on-surface">{formatCurrency(subtotal)}</span>
              </div>

              {/* Shipping Cost Input */}
              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">تكلفة الشحن (ج.م)</label>
                <input
                  type="number"
                  min={0}
                  value={shippingCost}
                  onChange={(e) => setShippingCost(Math.max(0, Number(e.target.value)))}
                  disabled={loading}
                  className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              {/* Discount Input */}
              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">قيمة الخصم (ج.م)</label>
                <input
                  type="number"
                  min={0}
                  max={subtotal}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  disabled={loading || subtotal === 0}
                  className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="border-t border-neutral-100 pt-4 flex justify-between items-center text-body-lg font-bold text-on-surface">
                <span>الإجمالي النهائي</span>
                <span className="text-brand-400 text-2xl">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface">ملاحظات الطلب</label>
              <textarea
                rows={2}
                placeholder="ملاحظات الشحن أو الدفع أو التوصيل..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="w-full py-3 bg-brand-400 hover:bg-brand-500 disabled:bg-neutral-300 text-white font-bold rounded-lg text-body-md shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  جاري تسجيل الطلب...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  حفظ وتأكيد الطلب
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Product Selector Modal */}
      {showSelectorModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-modal border border-neutral-200 w-full max-w-4xl animate-fade-up max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4 flex-shrink-0 font-rtl">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-body-lg font-bold text-on-surface">اختر الملصقات</h3>
                  <p className="text-label-sm text-on-surface-variant">اختر الملصقات المراد إضافتها للطلب</p>
                </div>
                <button
                  type="button"
                  onClick={() => refreshProducts(true)}
                  disabled={refreshingProducts}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-label-sm bg-neutral-100 hover:bg-neutral-200 text-on-surface-variant transition-colors disabled:opacity-50"
                  title="تحديث قائمة الملصقات والأسعار"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingProducts ? 'animate-spin' : ''}`} />
                  تحديث
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowSelectorModal(false)}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search & Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 flex-shrink-0">
              <div className="relative md:col-span-2">
                <input
                  type="text"
                  placeholder="البحث بالاسم أو الرقم التسلسلي..."
                  value={selectorSearch}
                  onChange={(e) => setSelectorSearch(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
                <Search className="w-5 h-5 text-neutral-400 absolute top-2.5 right-3" />
              </div>

              <div>
                <select
                  value={selectorCategory}
                  onChange={(e) => setSelectorCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                >
                  <option value="">-- كل التصنيفات --</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {PRODUCT_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable Products List/Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              {(() => {
                const filteredProducts = products.filter((prod) => {
                  const matchSearch =
                    !selectorSearch ||
                    prod.name.toLowerCase().includes(selectorSearch.toLowerCase()) ||
                    prod.serial_number.toLowerCase().includes(selectorSearch.toLowerCase());
                  const matchCat = !selectorCategory || prod.category === selectorCategory;
                  return matchSearch && matchCat;
                });

                if (filteredProducts.length === 0) {
                  return (
                    <div className="text-center py-12 text-on-surface-variant">
                      لا توجد ملصقات مطابقة لخيارات البحث
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredProducts.map((prod) => {
                      const isAdded = items.some((item) => item.productId === prod.id);

                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleToggleProduct(prod)}
                          className={`flex flex-col p-3 rounded-lg border transition-all cursor-pointer select-none bg-surface-container-lowest ${
                            isAdded
                              ? 'border-brand-400 ring-1 ring-brand-400 bg-brand-50/20'
                              : 'border-neutral-200 hover:border-brand-300 hover:shadow-sm'
                          }`}
                        >
                          {/* Image */}
                          <div className="w-full h-32 bg-neutral-50 rounded-md overflow-hidden flex items-center justify-center border border-neutral-100 mb-3 flex-shrink-0 relative">
                            {prod.image_path ? (
                              <img
                                src={prod.image_path}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package className="w-8 h-8 text-neutral-400" />
                            )}
                            {isAdded && (
                              <div className="absolute top-2 left-2 bg-brand-400 text-white rounded-full p-1 shadow-sm">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-semibold text-body-md text-on-surface truncate">
                                {prod.name}
                              </h4>
                              <p className="font-mono text-label-sm text-brand-400">
                                {prod.serial_number}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-neutral-100">
                              <span className="font-bold text-body-md text-brand-500">
                                {formatCurrency(Number(prod.price))}
                              </span>
                              {(Number(prod.discount) || 66.67) > 0 && (
                                <>
                                  <span className="text-label-sm text-neutral-400 line-through">
                                    {formatCurrency(Number(prod.base_price) || 30)}
                                  </span>
                                  <span className="text-[10px] font-bold bg-danger/10 text-danger px-1.5 py-0.5 rounded">
                                    {Number(prod.discount) || 66.67}% خصم
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 mt-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowSelectorModal(false)}
                className="px-5 py-2.5 rounded-lg bg-brand-400 hover:bg-brand-500 text-white font-bold text-body-md"
              >
                تأكيد وإغلاق ({items.length} ملصقات)
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

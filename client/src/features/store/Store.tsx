import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { EGYPTIAN_GOVERNORATES } from '@/lib/constants';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Search,
  Sparkles,
  ShoppingBag as BagIcon,
  X,
} from 'lucide-react';
import type { Product } from '@/types';
import logoImg from '@/assets/logo.jpg';
import bgImg from '@/assets/background.png';
import { toast } from 'sonner';

import { useNavigate } from 'react-router-dom';

interface CartItem {
  product: Product;
  quantity: number;
}

export const Store: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Shopping Cart state ("طلباتي")
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  // Checkout Form State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGovernorate, setCustomerGovernorate] = useState('القاهرة');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Success Receipt State
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);

  // Image Preview State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Load Products
  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<Product[]>('/public/products');
      if (response.success) {
        // Shuffle the products to show them in a random order every time
        const shuffledProducts = [...response.data];
        for (let i = shuffledProducts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledProducts[i], shuffledProducts[j]] = [shuffledProducts[j], shuffledProducts[i]];
        }
        setProducts(shuffledProducts);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('فشل تحميل المنتجات. يرجى إعادة المحاولة.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter Categories
  const categories = ['All', ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.serial_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart actions
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast.error(`المخزون المتوفر غير كافٍ. المتوفر فقط: ${product.stock_quantity}`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      toast.success(`تم إضافة "${product.name}" إلى طلبي.`);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.product.stock_quantity) {
              toast.error(`عذراً، المخزون المتاح فقط: ${item.product.stock_quantity}`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    toast.info('تمت إزالة الملصق من طلبي.');
  };

  // Handle checkout submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('لم تختر أي ملصقات بعد.');
      return;
    }

    // Name validation: Letters only
    if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(customerName.trim())) {
      toast.error('الاسم بالكامل يجب أن يحتوي على أحرف فقط (عربية أو إنجليزية).');
      return;
    }

    // Phone validation: numbers only, starts with 01, total 11 digits
    if (!/^01\d{9}$/.test(customerPhone.trim())) {
      toast.error('رقم الهاتف يجب أن يتكون من 11 رقماً ويبدأ بـ 01.');
      return;
    }

    // Address validation: letters, numbers, and symbols
    if (!/^[a-zA-Z0-9\u0600-\u06FF\u0660-\u0669\s.,\-\/()#_]+$/.test(customerAddress.trim())) {
      toast.error('العنوان بالتفصيل يجب أن يحتوي على أحرف وأرقام ورموز مقبولة فقط.');
      return;
    }

    try {
      setSubmittingOrder(true);
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_governorate: customerGovernorate,
        customer_address: customerAddress.trim(),
        payment_method: 'cod', // Default guest payment method
        notes: notes || undefined,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      };

      const response = await apiRequest<{ order_number: string }>('/public/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        setCreatedOrderNumber(response.data.order_number);
        setCart([]); // Clear selections
        setShowCheckoutModal(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل إرسال طلبك. يرجى التحقق من المدخلات.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen pb-12 transition-colors duration-300">
      {/* Public Store Header */}
      <header className="sticky top-0 z-40 w-full bg-brand-50/45 backdrop-blur-md border-b border-brand-400/10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="رونق" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
            <div>
              <h1 className="text-body-lg font-bold text-brand-900 leading-none">متجر رونق</h1>
              <span className="text-[10px] text-brand-400">عالم الملصقات الفريدة</span>
            </div>
          </div>

          <button
            onClick={() => setShowCartDrawer(true)}
            className="relative p-2.5 rounded-full hover:bg-brand-100/30 text-brand-900 transition-colors flex items-center justify-center gap-2 font-bold text-body-md"
          >
            <ShoppingBag className="w-6 h-6" />
            <span>طلبي</span>
            {cart.length > 0 && (
              <span className="absolute -top-0.5 -left-0.5 w-5 h-5 rounded-full bg-brand-400 text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-bounce">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div 
          className="card p-6 text-center space-y-3 relative overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImg})` }}
        >
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px]"></div>

          <div className="relative z-10 py-4">
            <div className="absolute -top-4 -right-4 text-brand-400/30">
              <Sparkles className="w-24 h-24" />
            </div>
            <h2 className="text-headline-lg font-bold text-brand-900 drop-shadow-sm">اختر ملصقاتك المفضلة</h2>
            <p className="text-body-md text-brand-900 font-semibold max-w-xl mx-auto mt-2 drop-shadow-sm">
              تصفح مجموعتنا المميزة من الملصقات والستيكرز. أضف ما يعجبك لطلباتك، ثم قم بتأكيد طلبك للحصول على كود التتبع الفريد لمتابعة شحنتك.
            </p>
          </div>
        </div>
      </div>

      {/* Store Catalog */}
      <main className="max-w-6xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="space-y-4">
          <div className="card p-5 bg-white/40 space-y-4">
            <h3 className="text-body-md font-bold text-on-surface border-b border-neutral-100 pb-2">البحث والتصنيفات</h3>

            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-label-sm text-neutral-500">بحث بالاسم أو الرقم التسلسلي</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث هنا..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-1.5 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
                <Search className="w-4 h-4 text-neutral-500 absolute top-2.5 right-3" />
              </div>
            </div>

            {/* Category selection */}
            <div className="space-y-2">
              <label className="text-label-sm text-neutral-500">التصنيفات</label>
              <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1.5 rounded-lg text-right text-body-md transition-colors ${selectedCategory === category
                      ? 'bg-brand-400 text-white font-semibold'
                      : 'hover:bg-brand-100/30 text-on-surface-variant'
                      }`}
                  >
                    {category === 'All' ? 'جميع التصنيفات' : category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stickers Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <span className="text-body-md text-brand-400 animate-pulse">جاري تحميل المنتجات...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="card p-12 text-center text-on-surface-variant bg-white/40">
              لا توجد ملصقات مطابقة لخيارات البحث الحالية.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="card overflow-hidden bg-white/40 flex flex-col justify-between hover:shadow-md transition-shadow">
                  {/* Image */}
                  <div
                    className="aspect-square bg-neutral-100/50 flex items-center justify-center overflow-hidden relative cursor-pointer group"
                    onClick={() => {
                      if (product.image_path) setSelectedImage(product.image_path);
                    }}
                  >
                    {product.image_path ? (
                      <img src={product.image_path} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <ShoppingBag className="w-12 h-12 text-neutral-300" />
                    )}
                    {product.stock_quantity === 0 && (
                      <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-body-md">
                        نفذ المخزون
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3 space-y-2">
                    <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded font-mono">
                      {product.serial_number}
                    </span>
                    <h4 className="text-body-md font-bold text-on-surface truncate">{product.name}</h4>
                    <span className="text-[10px] text-neutral-500 block">{product.category}</span>

                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock_quantity === 0}
                      className="w-full py-1.5 mt-2 bg-brand-400 hover:bg-brand-500 disabled:bg-neutral-300 text-white font-semibold rounded-lg text-label-sm transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة للطلب
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Selected Items Drawer ("طلباتي") */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/45 backdrop-blur-xs" onClick={() => setShowCartDrawer(false)} />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md h-full bg-[#f2e0b8] border-l border-brand-400/20 shadow-modal p-6 flex flex-col justify-between animate-fade-left">
            <div>
              <div className="flex justify-between items-center border-b border-brand-400/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <BagIcon className="w-5 h-5 text-brand-900" />
                  <h3 className="text-body-lg font-bold text-brand-900">الملصقات المحددة (طلبي)</h3>
                </div>
                <button onClick={() => setShowCartDrawer(false)} className="text-neutral-500 hover:text-on-surface">إغلاق</button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-20 text-on-surface-variant space-y-3">
                  <p>قائمة طلبك فارغة حالياً.</p>
                  <button
                    onClick={() => setShowCartDrawer(false)}
                    className="text-brand-500 font-semibold underline text-body-md"
                  >
                    اختر بعض الملصقات أولاً
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.product.id} className="card p-3 bg-white/50 flex gap-3 items-center justify-between">
                      {/* Mini Thumbnail */}
                      <div className="w-12 h-12 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
                        {item.product.image_path ? (
                          <img src={item.product.image_path} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-neutral-300 m-3" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-body-md font-bold text-on-surface truncate">{item.product.name}</h4>
                        <span className="text-[10px] text-neutral-500">{item.product.category}</span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="p-1 rounded bg-neutral-200 hover:bg-neutral-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-semibold text-body-md font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="p-1 rounded bg-neutral-200 hover:bg-neutral-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-danger hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            {cart.length > 0 && (
              <div className="border-t border-brand-400/10 pt-4">
                <button
                  onClick={() => {
                    setShowCartDrawer(false);
                    setShowCheckoutModal(true);
                  }}
                  className="w-full py-3 bg-brand-400 hover:bg-brand-500 text-white font-bold rounded-xl text-body-md shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  تأكيد واختيار الشحن
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#f2e0b8] p-6 rounded-xl shadow-modal border border-brand-400/20 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up">
            <div className="flex justify-between items-center border-b border-brand-400/10 pb-2 mb-4">
              <h3 className="text-body-lg font-bold text-brand-900">تفاصيل شحن الطلب</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-neutral-500 hover:text-on-surface">إلغاء</button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">الاسم بالكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد محمد"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">رقم الهاتف *</label>
                  <input
                    type="tel"
                    required
                    placeholder="مثال: 01012345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none text-left ltr"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">المحافظة *</label>
                <select
                  value={customerGovernorate}
                  onChange={(e) => setCustomerGovernorate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                >
                  {EGYPTIAN_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">العنوان بالتفصيل *</label>
                <textarea
                  required
                  placeholder="اسم الشارع، رقم المبنى، الدور، الشقة، وعلامات مميزة"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">ملاحظات إضافية (اختياري)</label>
                <textarea
                  placeholder="أي ملاحظات تخص شحن الملصقات أو التسليم"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                disabled={submittingOrder}
                className="w-full py-3 bg-brand-400 hover:bg-brand-500 disabled:bg-neutral-300 text-white font-bold rounded-xl text-body-md shadow-md transition-colors flex items-center justify-center gap-2 mt-4"
              >
                {submittingOrder ? 'جاري تسجيل طلبك...' : 'تأكيد الطلب وشحن الملصقات'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Receipt Modal */}
      {createdOrderNumber && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#f2e0b8] p-8 rounded-2xl shadow-modal border border-brand-400/20 w-full max-w-md text-center space-y-6 animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-success-light text-success-dark flex items-center justify-center mx-auto shadow-md">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-headline-lg font-bold text-brand-900">تم تسجيل طلبك بنجاح!</h3>
              <p className="text-body-md text-on-surface-variant">
                شكراً لتأكيد اختيارك للملصقات. يرجى أخذ لقطة شاشة (Screenshot) لرمز تتبع الطلب الخاص بك:
              </p>
            </div>

            {/* Tracking Card */}
            <div className="card p-5 bg-white/40 space-y-3 border-dashed border-2 border-brand-400/30">
              <span className="text-label-sm text-neutral-500 block">رمز تتبع الطلب:</span>
              <span className="text-2xl font-bold font-mono text-brand-500 block select-all tracking-wider">
                {createdOrderNumber}
              </span>
            </div>

            <p className="text-[11px] text-brand-400 leading-relaxed">
              * يمكنك استخدام هذا الرمز لتتبع حالة طلبك وتفاصيله في أي وقت من صفحة التتبع العامة.
            </p>

            <button
              onClick={() => {
                const orderNum = createdOrderNumber;
                setCreatedOrderNumber(null);
                navigate('/track', { state: { orderNumber: orderNum } });
              }}
              className="w-full py-2.5 bg-brand-400 hover:bg-brand-500 text-white font-semibold rounded-xl text-body-md transition-colors"
            >
              تتبع الطلب الآن
            </button>
          </div>
        </div>
      )}
      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center animate-fade-up" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10 bg-white/5"
            />
          </div>
        </div>
      )}
    </div>
  );
};

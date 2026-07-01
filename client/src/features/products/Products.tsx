import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_SIZE_LABELS,
  PRODUCT_CATEGORIES,
  PRODUCT_SIZES,
  MOVEMENT_REASONS,
  MOVEMENT_REASON_LABELS,
} from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Package,
  X,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';
import type { Product } from '@/types';

export const Products: React.FC = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [size, setSize] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 15;

  // Modal States
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Image Preview State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockQty, setStockQty] = useState(0);
  const [stockReason, setStockReason] = useState<string>('correction');
  const [stockNotes, setStockNotes] = useState('');

  // Form Fields State
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [prodCategory, setProdCategory] = useState('Random');
  const [prodSize, setProdSize] = useState('medium');
  const [price, setPrice] = useState<number>(5);
  const [costPrice, setCostPrice] = useState<number>(1.5);
  const [stockQuantity, setStockQuantity] = useState<number>(5);
  const [minStockLevel, setMinStockLevel] = useState<number>(2);
  const [description, setDescription] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (size) params.append('size', size);
      if (stockStatus) params.append('stockStatus', stockStatus);

      const response = await apiRequest<Product[]>(`/products?${params.toString()}`);
      if (response.success) {
        // Shuffle the products to show them in a random order every time
        const shuffledProducts = [...response.data];
        for (let i = shuffledProducts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = shuffledProducts[i] as Product;
          shuffledProducts[i] = shuffledProducts[j] as Product;
          shuffledProducts[j] = temp;
        }
        setProducts(shuffledProducts);
        
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setTotalItems(response.pagination.total);
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [page, category, size, stockStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedProduct(null);
    setName('');
    setSerialNumber('');
    setProdCategory('Random');
    setProdSize('medium');
    setPrice(5);
    setCostPrice(1.5);
    setStockQuantity(5);
    setMinStockLevel(2);
    setDescription('');
    setImagePath('');
    setImageFile(null);
    setImagePreview('');
    setShowProductModal(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    setName(product.name);
    setSerialNumber(product.serial_number);
    setProdCategory(product.category);
    setProdSize(product.size);
    setPrice(product.price);
    setCostPrice(product.cost_price);
    setStockQuantity(product.stock_quantity);
    setMinStockLevel(product.min_stock_level);
    setDescription(product.description || '');
    setImagePath(product.image_path || '');
    setImageFile(null);
    setImagePreview(product.image_path || '');
    setShowProductModal(true);
  };

  const handleOpenStockModal = (product: Product) => {
    setSelectedProduct(product);
    setStockQty(0);
    setStockReason('correction');
    setStockNotes('');
    setShowStockModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // Name validation: letters and numbers only
    if (!/^[a-zA-Z0-9\u0600-\u06FF\u0660-\u0669\s]+$/.test(name.trim())) {
      toast.error('اسم المنتج يجب أن يحتوي على حروف وأرقام فقط.');
      return;
    }

    // SKU/Serial validation: letters, numbers, and symbols (no spaces)
    if (!/^[a-zA-Z0-9\-\/_#]+$/.test(serialNumber.trim())) {
      toast.error('الرقم التسلسلي يجب أن يحتوي على حروف وأرقام ورموز فقط وبدون مسافات.');
      return;
    }

    try {
      setSubmitting(true);
      
      let uploadedUrl = imagePath;
      if (imageFile) {
        setUploadingImage(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`رفع الصورة فشل: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedUrl = publicUrl;
      }

      const payload = {
        name,
        serial_number: serialNumber,
        category: prodCategory,
        size: prodSize,
        price: Number(price),
        cost_price: Number(costPrice),
        stock_quantity: Number(stockQuantity),
        min_stock_level: Number(minStockLevel),
        description: description || undefined,
        image_path: uploadedUrl || undefined,
      };

      let response;
      if (modalMode === 'create') {
        response = await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        response = await apiRequest(`/products/${selectedProduct?.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }

      if (response.success) {
        toast.success(modalMode === 'create' ? 'تم إنشاء المنتج بنجاح.' : 'تم تحديث المنتج بنجاح.');
        setShowProductModal(false);
        loadProducts();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل حفظ بيانات المنتج.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stockQty === 0) {
      toast.error('يرجى تحديد كمية تعديل غير صفرية.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        product_id: selectedProduct?.id,
        quantity: Number(stockQty),
        reason: stockReason,
        notes: stockNotes || undefined,
      };

      const response = await apiRequest('/products/adjust-stock', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        toast.success('تم تسوية وتحديث المخزون بنجاح.');
        setShowStockModal(false);
        loadProducts();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل تعديل المخزون.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المنتج: ${name}؟`)) return;

    try {
      const response = await apiRequest(`/products/${id}`, {
        method: 'DELETE',
      });
      if (response.success) {
        toast.success('تم حذف المنتج بنجاح.');
        loadProducts();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل حذف المنتج.');
    }
  };



  return (
    <PageWrapper>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="page-title">قائمة المنتجات الملصقات</h2>
          <p className="page-subtitle">إدارة وتعديل كتالوج الملصقات، وتحديث المخزون والأسعار</p>
        </div>
        
        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-400 text-white font-bold text-body-md hover:bg-brand-500 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-5 h-5" />
            إضافة ملصق جديد
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 bg-white space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <input
              type="text"
              placeholder="البحث بالاسم أو الرقم التسلسلي..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-10 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none transition-colors"
            />
            <button type="submit" className="absolute top-2.5 right-3 text-neutral-500">
              <Search className="w-5 h-5" />
            </button>
          </div>

          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
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

          <button
            type="submit"
            className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-on-surface font-semibold rounded-lg text-body-md transition-colors"
          >
            تطبيق البحث
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
          <span className="text-label-sm font-semibold text-on-surface-variant flex items-center gap-1">
            <SlidersHorizontal className="w-4 h-4" />
            تصفية سريعة:
          </span>
          <select
            value={size}
            onChange={(e) => {
              setSize(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1 border border-neutral-200 rounded-full text-label-sm font-semibold bg-white"
          >
            <option value="">كل المقاسات</option>
            {PRODUCT_SIZES.map((sz) => (
              <option key={sz} value={sz}>
                {PRODUCT_SIZE_LABELS[sz]}
              </option>
            ))}
          </select>

          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1 border border-neutral-200 rounded-full text-label-sm font-semibold bg-white"
          >
            <option value="">كل حالات المخزون</option>
            <option value="in_stock">متوفر بالمخزن</option>
            <option value="low_stock">مخزون منخفض</option>
            <option value="out_of_stock">نفذ المخزون</option>
          </select>
        </div>
      </div>

      {/* Products Grid / Table */}
      <div className="card bg-white p-6 space-y-4">
        {loading ? (
          <LoadingSpinner />
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">لا توجد ملصقات مسجلة مطابقة للبحث</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {products.map((prod) => {
                const isOutOfStock = prod.stock_quantity === 0;
                const isLowStock = prod.stock_quantity > 0 && prod.stock_quantity <= prod.min_stock_level;

                return (
                  <div
                    key={prod.id}
                    className="flex flex-col bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-card-hover transition-shadow duration-200"
                  >
                    {/* Card Image */}
                    <div 
                      className="w-full h-44 bg-neutral-50 relative flex items-center justify-center border-b border-neutral-100 flex-shrink-0 cursor-pointer group"
                      onClick={() => {
                        if (prod.image_path) setSelectedImage(prod.image_path);
                      }}
                    >
                      {prod.image_path ? (
                        <img
                          src={prod.image_path}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="w-10 h-10 text-neutral-400" />
                      )}

                      {/* Stock Status Badge */}
                      <span
                        className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOutOfStock
                            ? 'bg-danger-light text-danger-dark'
                            : isLowStock
                            ? 'bg-warning-light text-warning-dark'
                            : 'bg-success-light text-success-dark'
                        }`}
                      >
                        {isOutOfStock ? 'نفذ المخزن' : isLowStock ? 'مخزون منخفض' : 'متوفر'}
                      </span>

                      {/* Category Badge */}
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-semibold px-2 py-0.5 rounded">
                        {PRODUCT_CATEGORY_LABELS[prod.category]}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="font-bold text-body-md text-on-surface truncate" title={prod.name}>
                          {prod.name}
                        </h4>
                        <p className="font-mono text-[11px] text-neutral-500 mt-0.5">
                          {prod.serial_number}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                        <div className="flex justify-between text-label-sm">
                          <span className="text-on-surface-variant">المقاس:</span>
                          <span className="font-semibold text-on-surface">
                            {PRODUCT_SIZE_LABELS[prod.size]}
                          </span>
                        </div>
                        <div className="flex justify-between text-label-sm">
                          <span className="text-on-surface-variant">سعر البيع:</span>
                          <span className="font-bold text-brand-400">
                            {formatCurrency(prod.price)}
                          </span>
                        </div>
                        {isAdmin && (
                          <div className="flex justify-between text-label-sm">
                            <span className="text-on-surface-variant">سعر التكلفة:</span>
                            <span className="font-semibold text-neutral-600">
                              {formatCurrency(prod.cost_price)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-label-sm">
                          <span className="text-on-surface-variant">المخزون:</span>
                          <span className={`font-bold ${isOutOfStock ? 'text-danger' : 'text-on-surface'}`}>
                            {prod.stock_quantity} قطعة
                          </span>
                        </div>
                      </div>

                      {/* Card Actions (Admin only) */}
                      {isAdmin && (
                        <div className="flex items-center gap-2 pt-3 border-t border-neutral-100 flex-shrink-0">
                          <button
                            onClick={() => handleOpenStockModal(prod)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-brand-200 text-brand-400 hover:bg-brand-50 rounded-lg text-label-sm font-semibold transition-colors"
                            title="تسوية وتعديل مخزون"
                          >
                            <Package className="w-4 h-4" />
                            المخزن
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
                            title="تعديل بيانات"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-1.5 rounded-lg border border-danger/20 text-danger hover:bg-danger-light transition-colors"
                            title="حذف منتج"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                <span className="text-label-sm text-on-surface-variant">
                  عرض {products.length} من أصل {totalItems} منتج
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

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-modal border border-neutral-200 w-full max-w-lg animate-fade-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2 mb-4">
              {modalMode === 'create' ? 'إضافة ملصق جديد' : 'تعديل بيانات ملصق'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">اسم المنتج *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">الرقم التسلسلي (SKU/Serial) *</label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none font-mono"
                    style={{ direction: 'ltr', textAlign: 'left' }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">التصنيف *</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {PRODUCT_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">المقاس *</label>
                  <select
                    value={prodSize}
                    onChange={(e) => setProdSize(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                  >
                    {PRODUCT_SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {PRODUCT_SIZE_LABELS[sz]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">سعر البيع (ج.م) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">سعر التكلفة (ج.م) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  />
                </div>

                {modalMode === 'create' && (
                  <div className="space-y-1">
                    <label className="text-label-sm font-semibold text-on-surface">المخزون الأولي *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">الحد الأدنى للتنبيه *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">صورة المنتج</label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-20 h-20 border rounded overflow-hidden flex-shrink-0">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview('');
                          setImagePath('');
                        }}
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-neutral-50 border rounded flex items-center justify-center text-neutral-400 flex-shrink-0">
                      <Package className="w-8 h-8" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={submitting || uploadingImage}
                    className="text-body-md file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-label-sm file:font-semibold file:bg-brand-50 file:text-brand-400 hover:file:bg-brand-100 cursor-pointer"
                  />
                </div>
                {(uploadingImage || submitting) && imageFile && (
                  <p className="text-[11px] text-brand-400 animate-pulse">جاري رفع وتجهيز الصورة للمخزن...</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">وصف المنتج</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-on-surface font-semibold text-body-md"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-brand-400 hover:bg-brand-500 text-white font-semibold text-body-md"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-modal border border-neutral-200 w-full max-w-md animate-fade-up">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2 mb-4">
              تسوية وتعديل المخزون: {selectedProduct?.name}
            </h3>

            <form onSubmit={handleSaveStockAdjustment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">كمية التعديل *</label>
                <input
                  type="number"
                  required
                  placeholder="مثال: 10 للزيادة، -5 للنقصان"
                  value={stockQty}
                  onChange={(e) => setStockQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">سبب التعديل *</label>
                <select
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                >
                  {MOVEMENT_REASONS.filter((r) => r !== 'new_shipment' && r !== 'order_fulfilled').map(
                    (reason) => (
                      <option key={reason} value={reason}>
                        {MOVEMENT_REASON_LABELS[reason]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">ملاحظات التعديل</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات توضيحية لسبب هذا التعديل..."
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
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
    </PageWrapper>
  );
};

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  LogOut,
  Users,
  Store,
  Truck,
  DollarSign,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logoImg from '@/assets/logo.jpg';

interface SidebarProps {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className, isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const adminLinks = [
    { to: '/dashboard', label: 'لوحة القيادة', icon: LayoutDashboard },
    { to: '/accounts', label: 'الحسابات', icon: DollarSign },
    { to: '/products', label: 'المنتجات', icon: Package },
    { to: '/orders', label: 'الطلبات', icon: ShoppingCart },
    { to: '/settings', label: 'المستخدمين', icon: Users },
    { to: '/shop', label: 'الملصقات (المتجر)', icon: Store },
    { to: '/track', label: 'تتبع الطلبات', icon: Truck },
  ];

  const employeeLinks = [
    { to: '/orders/new', label: 'طلب جديد', icon: ShoppingCart },
    { to: '/orders', label: 'قائمة الطلبات', icon: ShoppingCart },
    { to: '/products', label: 'عرض المنتجات', icon: Package },
    { to: '/shop', label: 'الملصقات (المتجر)', icon: Store },
    { to: '/track', label: 'تتبع الطلبات', icon: Truck },
  ];

  const links = isAdmin ? adminLinks : employeeLinks;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'w-sidebar h-screen fixed top-0 right-0 z-50 bg-brand-50/45 backdrop-blur-md border-l border-brand-400/10 flex flex-col justify-between shadow-card transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-6 border-b border-neutral-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="رونق" className="w-8 h-8 rounded object-cover shadow-sm" />
              <div>
                <h1 className="text-body-lg font-bold text-brand-900 leading-none">رونق</h1>
                <span className="text-label-sm text-brand-400">لوحة التحكم</span>
              </div>
            </div>
            {/* Close Button on Mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-neutral-100 text-on-surface-variant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Badge */}
          <div className="p-4 mx-3 my-4 rounded-lg bg-surface-container-low flex items-center gap-3 border border-neutral-100">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || 'م'}
                className="w-10 h-10 rounded-full object-cover shadow-sm border border-brand-400/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-body-lg shadow-sm">
                {user?.name?.[0] || 'م'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-body-md font-semibold text-on-surface truncate">
                {user?.name || 'مستخدم رونق'}
              </p>
              <p className="text-label-sm text-on-surface-variant truncate">
                {user?.role === 'admin' ? 'مدير النظام' : 'قسم الإنتاج'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/dashboard'}
                  onClick={() => {
                    // Close sidebar on link click on mobile
                    onClose();
                  }}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-body-md font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-400 border-r-4 border-brand-400'
                        : 'text-on-surface-variant hover:bg-neutral-50 hover:text-on-surface'
                    )
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Info & Logout */}
        <div className="p-3 border-t border-neutral-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-body-md font-medium text-danger hover:bg-danger-light transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
};

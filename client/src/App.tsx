import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Toaster } from 'sonner';

// Views
import { Login } from '@/features/auth/Login';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { Products } from '@/features/products/Products';
import { Orders } from '@/features/orders/Orders';
import { NewOrder } from '@/features/orders/NewOrder';
import { OrderDetail } from '@/features/orders/OrderDetail';
import { Settings } from '@/features/settings/Settings';
import { Store } from '@/features/store/Store';
import { TrackOrder } from '@/features/store/TrackOrder';
import { Accounts } from '@/features/accounting/Accounts';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/shop" element={<Store />} />
          <Route path="/track" element={<TrackOrder />} />

          {/* Authenticated Dashboard Layout Wrapper */}
          <Route element={<DashboardLayout />}>
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard (Admin/Employee with conditional financial view) */}
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <Dashboard />
                </AuthGuard>
              }
            />

            {/* Products catalog (Admin editable, Employee read-only) */}
            <Route
              path="/products"
              element={
                <AuthGuard>
                  <Products />
                </AuthGuard>
              }
            />

            {/* Orders flow (Admin and Employee) */}
            <Route
              path="/orders"
              element={
                <AuthGuard>
                  <Orders />
                </AuthGuard>
              }
            />
            <Route
              path="/orders/new"
              element={
                <AuthGuard>
                  <NewOrder />
                </AuthGuard>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <AuthGuard>
                  <OrderDetail />
                </AuthGuard>
              }
            />



            {/* Accounts/Financials (Admin Only) */}
            <Route
              path="/accounts"
              element={
                <AuthGuard requireAdmin>
                  <Accounts />
                </AuthGuard>
              }
            />


            {/* General Settings and User profiles (Admin Only) */}
            <Route
              path="/settings"
              element={
                <AuthGuard requireAdmin>
                  <Settings />
                </AuthGuard>
              }
            />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        
        {/* Toast Notifier positioned to RTL layout */}
        <Toaster position="top-left" dir="rtl" />
      </AuthProvider>
    </BrowserRouter>
  );
};

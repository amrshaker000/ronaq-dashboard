import React, { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { apiRequest } from '@/lib/api';
import { USER_ROLE_LABELS, USER_ROLES } from '@/lib/constants';
import {
  Plus,
  UserCheck,
  UserX,
  Lock,
  Mail,
  User as UserIcon,
  Camera,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'sonner';
import type { Profile } from '@/types';
import { supabase } from '@/lib/supabase';

export const Settings: React.FC = () => {
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Users State
  const [users, setUsers] = useState<Profile[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [uploadingAvatarId, setUploadingAvatarId] = useState<string | null>(null);
  
  // Add User Form State
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'employee'>('employee');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await apiRequest<Profile[]>('/system/users');
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('حدث خطأ في تحميل قائمة الحسابات.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userPassword.length < 6) {
      toast.error('يجب أن تكون كلمة المرور 6 أحرف على الأقل.');
      return;
    }

    try {
      setSubmitting(true);
      
      let avatarUrl = undefined;
      if (avatarFile) {
        setUploadingAvatar(true);
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`رفع الصورة فشل: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      const payload = {
        name: userName,
        email: userEmail,
        password: userPassword,
        role: userRole,
        avatar_url: avatarUrl,
      };

      const response = await apiRequest('/system/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        toast.success(`تم إنشاء حساب المستخدم: ${response.data.name} بنجاح.`);
        setShowAddUserModal(false);
        setUserName('');
        setUserEmail('');
        setUserPassword('');
        setAvatarFile(null);
        setAvatarPreview(null);
        loadUsers();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل إنشاء حساب المستخدم.');
    } finally {
      setSubmitting(false);
      setUploadingAvatar(false);
    }
  };

  const handleAvatarChange = async (profileId: string, file: File) => {
    try {
      setUploadingAvatarId(profileId);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`رفع الصورة فشل: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      const response = await apiRequest(`/system/users/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify({ avatar_url: publicUrl }),
      });

      if (response.success) {
        toast.success('تم تحديث صورة المستخدم بنجاح.');
        loadUsers();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل تحديث الصورة.');
    } finally {
      setUploadingAvatarId(null);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من تعطيل حساب: ${name}؟`)) return;

    try {
      const response = await apiRequest(`/system/users/${id}/deactivate`, {
        method: 'POST',
      });
      if (response.success) {
        toast.success('تم تعطيل الحساب بنجاح.');
        loadUsers();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل تعطيل الحساب.');
    }
  };

  const handleActivate = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من إعادة تفعيل حساب: ${name}؟`)) return;

    try {
      const response = await apiRequest(`/system/users/${id}/activate`, {
        method: 'POST',
      });
      if (response.success) {
        toast.success('تم تفعيل الحساب بنجاح.');
        loadUsers();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل تفعيل الحساب.');
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">إدارة المستخدمين</h2>
        <p className="page-subtitle">إدارة وإنشاء حسابات طاقم الإنتاج والمديرين بالمنظومة</p>
      </div>

      <div className="space-y-6">
        {/* User controls card */}
        <div className="card p-6 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-body-lg font-bold text-on-surface">الحسابات النشطة بالمنظومة</h3>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-400 text-white font-semibold text-body-md hover:bg-brand-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة حساب مستخدم جديد
            </button>
          </div>

          {loadingUsers ? (
            <LoadingSpinner />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الدور</th>
                    <th>حالة الحساب</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((profile) => (
                    <tr key={profile.id}>
                      <td className="font-semibold">
                        <div className="flex items-center gap-3">
                          <div className="relative group">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile.name}
                                className="w-10 h-10 rounded-full object-cover border border-brand-400/20 shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-body-lg shadow-sm">
                                {profile.name?.[0] || 'م'}
                              </div>
                            )}
                            <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                              <Camera className="w-4 h-4 text-white" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingAvatarId === profile.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleAvatarChange(profile.id, file);
                                }}
                              />
                            </label>
                          </div>
                          <div className="flex flex-col">
                            <span>{profile.name}</span>
                            {uploadingAvatarId === profile.id && (
                              <span className="text-[10px] text-brand-400 animate-pulse">جاري الرفع...</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{profile.email}</td>
                      <td>
                        <span className="badge badge-neutral">
                          {USER_ROLE_LABELS[profile.role]}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            profile.is_active ? 'badge-success' : 'badge-danger'
                          }`}
                        >
                          {profile.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td>
                        {profile.is_active ? (
                          <button
                            onClick={() => handleDeactivate(profile.id, profile.name)}
                            className="p-1.5 rounded text-danger hover:bg-danger-light flex items-center gap-1 text-label-sm font-semibold"
                          >
                            <UserX className="w-4 h-4" />
                            تعطيل الحساب
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(profile.id, profile.name)}
                            className="p-1.5 rounded text-success hover:bg-success-light flex items-center gap-1 text-label-sm font-semibold"
                          >
                            <UserCheck className="w-4 h-4" />
                            إعادة تفعيل
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-modal border border-neutral-200 w-full max-w-md animate-fade-up">
            <h3 className="text-body-lg font-bold text-on-surface border-b border-neutral-100 pb-2 mb-4">
              إنشاء حساب مستخدم جديد
            </h3>

            <form onSubmit={handleAddUser} className="space-y-4">
              {/* Avatar upload */}
              <div className="flex flex-col items-center justify-center space-y-2 mb-4">
                <div className="relative group w-20 h-20">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-20 h-20 rounded-full object-cover border border-brand-400/20 shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold border border-brand-400/10 shadow-sm">
                      <UserIcon className="w-10 h-10 text-brand-400" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
                <span className="text-label-sm text-neutral-500">صورة الحساب (اختياري)</span>
                {uploadingAvatar && (
                  <span className="text-label-sm text-brand-400 animate-pulse">جاري رفع الصورة...</span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">الاسم الكامل *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="مثال: خالد محمد"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none"
                  />
                  <UserIcon className="w-5 h-5 text-neutral-500 absolute top-2.5 right-3" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">البريد الإلكتروني *</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="user@ronaq.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none text-left"
                    style={{ direction: 'ltr' }}
                  />
                  <Mail className="w-5 h-5 text-neutral-500 absolute top-2.5 right-3" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">كلمة المرور المؤقتة *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="6 أحرف على الأقل"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none text-left"
                    style={{ direction: 'ltr' }}
                  />
                  <Lock className="w-5 h-5 text-neutral-500 absolute top-2.5 right-3" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-semibold text-on-surface">دور المستخدم وصلاحياته *</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-body-md focus:border-brand-400 focus:outline-none bg-white"
                >
                  {USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {USER_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-on-surface font-semibold text-body-md"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-brand-400 hover:bg-brand-500 text-white font-semibold text-body-md"
                >
                  إنشاء الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

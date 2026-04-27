'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, ShieldOff, Trash2, ChevronLeft, ChevronRight, Crown, User as UserIcon, X, Zap, Plus, Minus } from 'lucide-react';
import api from '../../../services/api/client';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/useAuthStore';

interface User {
  _id: string; name: string; email: string; role: string;
  level: number; xp: number; points: number; isBanned?: boolean;
  bonusSpins?: number; ordersCount?: number; totalOrders?: number; createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  admin:      'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
  user:       'bg-gray-100 dark:bg-arena-600 text-gray-600 dark:text-gray-300',
};

export default function AdminUsersPage() {
  const { user: me } = useAuthStore();
  const [users,    setUsers]   = useState<User[]>([]);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page,     setPage]    = useState(1);
  const [total,    setTotal]   = useState(0);
  const [selected, setSelected] = useState<User | null>(null);
  const [saving,   setSaving]  = useState(false);
  const [spinCount, setSpinCount] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { limit: String(LIMIT), page: String(page) };
    if (search)     params.search = search;
    if (roleFilter) params.role   = roleFilter;
    try {
      const { data } = await api.get('/users', { params });
      setUsers(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { setPage(1); }, [search, roleFilter]);
  useEffect(() => { load(); }, [load]);

  const changeRole = async (userId: string, role: string) => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/users/${userId}/role`, { role });
      setUsers((p) => p.map((u) => u._id === userId ? { ...u, role } : u));
      if (selected?._id === userId) setSelected((p) => p ? { ...p, role } : null);
      toast.success(`Role changed to ${role}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleBan = async (user: User) => {
    const isBanned = !user.isBanned;
    setSaving(true);
    try {
      await api.patch(`/users/${user._id}/ban`, { isBanned });
      setUsers((p) => p.map((u) => u._id === user._id ? { ...u, isBanned } : u));
      if (selected?._id === user._id) setSelected((p) => p ? { ...p, isBanned } : null);
      toast.success(isBanned ? 'User banned' : 'User unbanned');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const grantSpins = async (userId: string, count: number) => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/users/${userId}/spins`, { amount: count });
      const newSpins = data.data?.bonusSpins ?? 0;
      setUsers((p) => p.map((u) => u._id === userId ? { ...u, bonusSpins: newSpins } : u));
      if (selected?._id === userId) setSelected((p) => p ? { ...p, bonusSpins: newSpins } : null);
      toast.success(`Granted ${count} bonus spin${count !== 1 ? 's' : ''}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers((p) => p.filter((u) => u._id !== userId));
      setSelected(null);
      toast.success('User deleted');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white dark:bg-arena-800 border border-gray-100 dark:border-arena-700 rounded-xl px-3 py-2 flex-1 min-w-56">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none flex-1" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white dark:bg-arena-800 border border-gray-100 dark:border-arena-700 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none">
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0 overflow-x-auto">
        <table className="w-full min-w-[580px]">
          <thead><tr className="border-b border-gray-100 dark:border-arena-700 text-xs text-gray-400 uppercase tracking-wide">
            <th className="text-left px-5 py-3.5">User</th>
            <th className="text-left px-4 py-3.5 hidden md:table-cell">Role</th>
            <th className="text-center px-4 py-3.5 hidden lg:table-cell">Level</th>
            <th className="text-center px-4 py-3.5 hidden lg:table-cell">XP</th>
            <th className="text-center px-4 py-3.5 hidden sm:table-cell">Orders</th>
            <th className="text-left px-4 py-3.5 hidden xl:table-cell">Joined</th>
            <th className="text-center px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50 dark:divide-arena-700/50">
            {loading ? Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}><td colSpan={8} className="px-5 py-3"><div className="skeleton h-6 rounded w-full" /></td></tr>
            )) : users.map((user) => (
              <tr key={user._id} onClick={() => setSelected(user)}
                className="hover:bg-gray-50 dark:hover:bg-arena-800/50 transition-colors cursor-pointer">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-sm shrink-0">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{user.name}</div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', ROLE_COLORS[user.role] ?? ROLE_COLORS.user)}>{user.role}</span>
                </td>
                <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{user.level}</span>
                </td>
                <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                  <span className="text-xs text-brand-500 font-medium">{user.xp?.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{user.ordersCount ?? user.totalOrders ?? 0}</span>
                </td>
                <td className="px-4 py-3.5 hidden xl:table-cell">
                  <span className="text-xs text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  {user.isBanned
                    ? <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-500 px-2 py-0.5 rounded-full font-medium">Banned</span>
                    : <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full font-medium">Active</span>}
                </td>
                <td className="px-4 py-3.5">
                  <button onClick={(e) => { e.stopPropagation(); setSelected(user); }}
                    className="text-xs text-brand-500 hover:text-brand-600 font-semibold">Manage</button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan={8} className="py-16 text-center text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-arena-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-arena-800 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-2 rounded-lg border border-gray-200 dark:border-arena-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-arena-800 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ type: 'spring', damping: 30 }}
              className="bg-white dark:bg-arena-800 w-full max-w-sm h-full shadow-2xl flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-arena-700 shrink-0">
                <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">Manage User</h2>
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-400"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-6 flex-1">
                {/* Profile */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 font-black text-2xl">
                    {selected.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">{selected.name}</div>
                    <div className="text-sm text-gray-400">{selected.email}</div>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block', ROLE_COLORS[selected.role] ?? ROLE_COLORS.user)}>{selected.role}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                  {[['Level', selected.level], ['XP', selected.xp?.toLocaleString()], ['Orders', selected.ordersCount ?? selected.totalOrders ?? 0], ['Spins', selected.bonusSpins ?? 0]].map(([label, val]) => (
                    <div key={label as string} className="bg-gray-50 dark:bg-arena-700/50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{val}</div>
                      <div className="text-xs text-gray-400">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Role Change — superadmin only */}
                {me?.role === 'superadmin' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Change Role</p>
                    <div className="flex gap-2 flex-wrap">
                      {['user', 'admin', 'superadmin'].map((r) => (
                        <button key={r} disabled={saving || selected.role === r}
                          onClick={() => changeRole(selected._id, r)}
                          className={cn('flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all capitalize',
                            selected.role === r
                              ? 'bg-brand-500 text-white border-brand-500'
                              : 'border-gray-200 dark:border-arena-600 text-gray-600 dark:text-gray-400 hover:border-brand-400 hover:text-brand-500')}>
                          {r === 'superadmin' ? <><Crown size={11} className="inline mr-1" />Super</> : r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bonus Spins */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Bonus Spins</p>
                  <div className="bg-gray-50 dark:bg-arena-700/50 rounded-xl p-3 mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Zap size={15} className="text-brand-500" />
                      <span>Current bonus spins</span>
                    </div>
                    <span className="font-bold text-brand-500">{selected.bonusSpins ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSpinCount((c) => Math.max(1, c - 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 dark:border-arena-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-arena-600 transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center font-semibold text-gray-900 dark:text-gray-100">{spinCount}</span>
                    <button onClick={() => setSpinCount((c) => Math.min(20, c + 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 dark:border-arena-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-arena-600 transition-colors">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => grantSpins(selected._id, spinCount)} disabled={saving}
                      className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1.5">
                      <Zap size={13} /> Grant {spinCount} Spin{spinCount !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>

                {/* Ban Toggle */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Account Status</p>
                  <button onClick={() => toggleBan(selected)} disabled={saving}
                    className={cn('w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border',
                      selected.isBanned
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 hover:bg-green-100'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-100')}>
                    {selected.isBanned ? <><ShieldOff size={15} /> Unban User</> : <><Shield size={15} /> Ban User</>}
                  </button>
                </div>

                {/* Delete — superadmin only */}
                {me?.role === 'superadmin' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Danger Zone</p>
                    <button onClick={() => deleteUser(selected._id)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-red-500 text-white hover:bg-red-600 transition-colors">
                      <Trash2 size={15} /> Delete Account
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

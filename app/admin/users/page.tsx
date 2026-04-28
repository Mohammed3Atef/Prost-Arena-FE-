'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, ShieldOff, Trash2, ChevronLeft, ChevronRight, Crown, User as UserIcon, X, Zap, Plus, Minus } from 'lucide-react';
import api from '../../../services/api/client';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/useAuthStore';
import { useConfirm } from '../../../components/ui/ConfirmProvider';

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
  const [users,      setUsers]      = useState<User[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [selected,   setSelected]   = useState<User | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [spinCount,  setSpinCount]  = useState(1);
  const confirm = useConfirm();
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
      await api.patch(`/users/${userId}/role`, { role });
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
    const ok = await confirm({
      title: 'Delete user permanently?',
      description: 'All of this user’s orders, XP and rewards will remain orphaned in the database. This cannot be undone.',
      confirmLabel: 'Delete user',
      tone: 'danger',
    });
    if (!ok) return;
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
          <option value="superadmin">Superadmin</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p>No users found</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-arena-700">
                <tr>
                  {['User', 'Role', 'Level / XP', 'Points', 'Joined', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    onClick={() => setSelected(u)}
                    className={cn('border-t border-gray-100 dark:border-arena-700 hover:bg-gray-50 dark:hover:bg-arena-750 transition-colors cursor-pointer',
                      u.isBanned && 'opacity-50')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                          <span className="text-brand-600 dark:text-brand-400 font-bold text-sm">{u.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', ROLE_COLORS[u.role] ?? ROLE_COLORS.user)}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      Lv.{u.level} · {u.xp.toLocaleString()} XP
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {u.points.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleBan(u)} title={u.isBanned ? 'Unban' : 'Ban'}
                          className={cn('p-1.5 rounded-lg transition-colors',
                            u.isBanned ? 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400')}>
                          {u.isBanned ? <Shield size={15} /> : <ShieldOff size={15} />}
                        </button>
                        {me?._id !== u._id && (
                          <button onClick={() => deleteUser(u._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-arena-700">
              <p className="text-sm text-gray-400">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 disabled:opacity-40">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page === pages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 disabled:opacity-40">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div className="bg-white dark:bg-arena-800 w-full max-w-sm h-full overflow-y-auto shadow-2xl"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 250 }}>
              {/* Drawer header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-arena-700">
                <h2 className="font-bold text-gray-900 dark:text-gray-100">User Details</h2>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Avatar + name */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <span className="text-brand-600 dark:text-brand-400 font-bold text-2xl">{selected.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{selected.name}</p>
                    <p className="text-gray-400 text-sm">{selected.email || 'No email'}</p>
                  </div>
                  <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', ROLE_COLORS[selected.role] ?? ROLE_COLORS.user)}>
                    {selected.role}
                  </span>
                  {selected.isBanned && (
                    <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold px-2 py-1 rounded-full">Banned</span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Level', value: selected.level, icon: '🏆' },
                    { label: 'XP', value: selected.xp.toLocaleString(), icon: '⚡' },
                    { label: 'Points', value: selected.points.toLocaleString(), icon: '⭐' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-gray-50 dark:bg-arena-750 rounded-xl p-3 text-center">
                      <p className="text-xl">{stat.icon}</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm mt-1">{stat.value}</p>
                      <p className="text-xs text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Role changer */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Change Role</p>
                  <div className="flex gap-2 flex-wrap">
                    {['user', 'admin', 'superadmin'].map((r) => (
                      <button key={r} disabled={saving || selected.role === r || me?._id === selected._id}
                        onClick={() => changeRole(selected._id, r)}
                        className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40',
                          selected.role === r
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-white dark:bg-arena-800 border-gray-200 dark:border-arena-600 text-gray-600 dark:text-gray-300 hover:border-brand-500')}>
                        {r === 'superadmin' ? <Crown size={10} className="inline mr-1" /> : null}{r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grant spins */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                    <Zap size={14} className="text-brand-500" /> Grant Bonus Spins
                    <span className="text-xs text-gray-400 font-normal ml-auto">Current: {selected.bonusSpins ?? 0}</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSpinCount((c) => Math.max(1, c - 1))}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-arena-700 hover:bg-gray-200 dark:hover:bg-arena-600">
                      <Minus size={14} />
                    </button>
                    <span className="font-bold text-gray-900 dark:text-gray-100 w-6 text-center">{spinCount}</span>
                    <button onClick={() => setSpinCount((c) => c + 1)}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-arena-700 hover:bg-gray-200 dark:hover:bg-arena-600">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => grantSpins(selected._id, spinCount)} disabled={saving}
                      className="btn-primary flex-1 text-sm py-2">
                      Grant {spinCount} spin{spinCount !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-arena-700">
                  <button onClick={() => toggleBan(selected)} disabled={saving}
                    className={cn('w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors',
                      selected.isBanned
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-200'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30')}>
                    {selected.isBanned ? <><Shield size={15} /> Unban User</> : <><ShieldOff size={15} /> Ban User</>}
                  </button>
                  {me?._id !== selected._id && (
                    <button onClick={() => deleteUser(selected._id)}
                      className="w-full py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-600 transition-colors">
                      <Trash2 size={15} /> Delete Account
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

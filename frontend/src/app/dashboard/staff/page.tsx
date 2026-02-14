'use client';
import { useEffect, useState } from 'react';
import { staffAPI } from '@/lib/api';
import { UserCircle, Plus, X, Shield, ShieldOff } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    can_access_inbox: true, can_access_bookings: true,
    can_access_forms: true, can_access_inventory: false
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    try {
      const { data } = await staffAPI.list();
      setStaff(data.staff);
    } catch {} finally { setLoading(false); }
  };

  const handleInvite = async () => {
    if (!form.full_name || !form.email || !form.password) {
      toast.error('All fields required');
      return;
    }
    setCreating(true);
    try {
      await staffAPI.invite(form);
      toast.success('Staff member invited!');
      setShowInvite(false);
      setForm({ full_name: '', email: '', password: '', can_access_inbox: true, can_access_bookings: true, can_access_forms: true, can_access_inventory: false });
      fetchStaff();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setCreating(false); }
  };

  const togglePermission = async (staffId: string, perm: string, value: boolean) => {
    try {
      await staffAPI.update(staffId, { [perm]: !value });
      toast.success('Permission updated');
      fetchStaff();
    } catch { toast.error('Failed to update'); }
  };

  const removeStaff = async (staffId: string) => {
    if (!confirm('Remove this staff member?')) return;
    try {
      await staffAPI.remove(staffId);
      toast.success('Staff member removed');
      fetchStaff();
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCircle className="w-6 h-6 text-primary-500" /> Staff Management
          </h1>
          <p className="text-gray-500 text-sm">{staff.length} team members</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Invite Staff
        </button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-blue-500">Invite Staff Member</h2>
              <button onClick={() => setShowInvite(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input className="input-field text-black" value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input className="input-field text-black" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input className="input-field text-black" type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="space-y-2 text-black">
                  {[
                    { key: 'can_access_inbox', label: 'Inbox' },
                    { key: 'can_access_bookings', label: 'Bookings' },
                    { key: 'can_access_forms', label: 'Forms' },
                    { key: 'can_access_inventory', label: 'Inventory' },
                  ].map(p => (
                    <label key={p.key} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" checked={(form as any)[p.key]}
                        onChange={(e) => setForm({ ...form, [p.key]: e.target.checked })} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowInvite(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleInvite} disabled={creating} className="btn-primary flex-1">
                  {creating ? 'Inviting...' : 'Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
            ) : staff.length === 0 ? (
        <div className="card text-center py-16">
          <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-500">No staff members yet</p>
          <p className="text-sm text-gray-400 mt-1">Invite team members to help manage operations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {staff.map((member) => (
            <div key={member.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    member.is_active ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    <span className={`font-bold text-sm ${
                      member.is_active ? 'text-primary-700' : 'text-gray-400'
                    }`}>
                      {getInitials(member.full_name)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{member.full_name}</p>
                      {!member.is_active && <span className="badge-danger">Inactive</span>}
                    </div>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeStaff(member.id)}
                  className="text-red-400 hover:text-red-600 text-sm font-medium transition-colors"
                >
                  Remove
                </button>
              </div>

              {/* Permissions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { key: 'can_access_inbox', label: 'Inbox', value: member.can_access_inbox },
                  { key: 'can_access_bookings', label: 'Bookings', value: member.can_access_bookings },
                  { key: 'can_access_forms', label: 'Forms', value: member.can_access_forms },
                  { key: 'can_access_inventory', label: 'Inventory', value: member.can_access_inventory },
                ].map((perm) => (
                  <button
                    key={perm.key}
                    onClick={() => togglePermission(member.id, perm.key, perm.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      perm.value
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {perm.value ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                    {perm.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
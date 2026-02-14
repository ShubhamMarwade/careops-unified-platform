'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Users,
  FileText,
  Package,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCircle,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/inbox', icon: MessageSquare, label: 'Inbox' },
  { href: '/dashboard/bookings', icon: Calendar, label: 'Bookings' },
  { href: '/dashboard/contacts', icon: Users, label: 'Contacts' },
  { href: '/dashboard/forms', icon: FileText, label: 'Forms' },
  { href: '/dashboard/inventory', icon: Package, label: 'Inventory' },
  { href: '/dashboard/staff', icon: UserCircle, label: 'Staff', ownerOnly: true },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings', ownerOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.ownerOnly && user?.role !== 'owner') return false;
    return true;
  });

  return (
    <aside
      className={cn(
        'relative h-screen flex flex-col transition-all duration-300 sticky top-0',
        'bg-white/5 backdrop-blur-xl border-r border-white/10',
        collapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* Subtle Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.08),transparent_70%)] pointer-events-none" />

      {/* Logo Section */}
      <div className="relative z-10 p-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold">C</span>
          </div>

          {!collapsed && (
            <span className="text-white font-semibold text-lg tracking-wide">
              CareOps
            </span>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                'group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left',
                isActive
                  ? 'bg-indigo-500/15 text-white border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-500 shadow-lg shadow-indigo-500/40" />
              )}

              <item.icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  isActive
                    ? 'text-indigo-400'
                    : 'text-gray-500 group-hover:text-white'
                )}
              />

              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="relative z-10 p-4 border-t border-white/10">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-xl bg-white/5 border border-white/10">
            <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/30">
              <span className="text-white text-xs font-bold">
                {user.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user.full_name}
              </p>
              <p className="text-gray-400 text-xs truncate capitalize">
                {user.role}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

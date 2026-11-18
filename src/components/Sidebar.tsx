import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  Settings,
  Upload,
} from 'lucide-react';
import type { UserProfile } from '../types/financial';

export type AppNavTab = 'dashboard' | 'models' | 'upload' | 'learning' | 'settings';

interface SidebarProps {
  activeTab: AppNavTab;
  onSelectTab: (tab: AppNavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: UserProfile;
  onOpenUpgrade: () => void;
  onOpenSupport: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  user,
  onOpenUpgrade,
  onOpenSupport,
}: SidebarProps) {
  const navItems: { id: AppNavTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'models', label: 'My Models', icon: FolderKanban },
    { id: 'upload', label: 'Upload 10-K', icon: Upload },
    { id: 'learning', label: 'Learning Center', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const content = (isMobileDrawer: boolean) => (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand & Collapse Toggle */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
          {(!collapsed || isMobileDrawer) && (
            <button
              type="button"
              onClick={() => {
                onSelectTab('dashboard');
                onCloseMobile();
              }}
              className="font-display text-lg font-bold tracking-tight text-[#1A1A2E] whitespace-nowrap"
            >
              Fynance Bro
            </button>
          )}
          {isMobileDrawer ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav aria-label="Workspace navigation" className="mt-4 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                title={collapsed && !isMobileDrawer ? item.label : undefined}
                aria-label={item.label}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#1A1A2E] text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                } ${collapsed && !isMobileDrawer ? 'justify-center px-0' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {(!collapsed || isMobileDrawer) && <span>{item.label}</span>}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onOpenSupport();
            }}
            title={collapsed && !isMobileDrawer ? 'Support' : undefined}
            aria-label="Support"
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap ${
              collapsed && !isMobileDrawer ? 'justify-center px-0' : ''
            }`}
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            {(!collapsed || isMobileDrawer) && <span>Support</span>}
          </button>
        </nav>
      </div>

      {/* Non-Intrusive Bottom-Left Subscription Card */}
      {(!collapsed || isMobileDrawer) && (
        <div className="p-3">
          {user.subscriptionTier === 'free' ? (
            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
              <div className="text-xs font-semibold text-[#1A1A2E]">Upgrade to Pro</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Unlimited 10-K models, clean Excel exports & Equity Research PDFs for $5/mo.
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Free usage</span>
                  <span className="font-mono-tabular">{Math.min(3, user.analysesUsed)} / 3</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-emerald-600 transition-all"
                    style={{ width: `${Math.min(100, (user.analysesUsed / 3) * 100)}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  onOpenUpgrade();
                }}
                className="mt-3 w-full rounded-lg bg-[#1A1A2E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2A2A48] transition-colors"
              >
                Upgrade ($5/mo)
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="text-xs font-semibold text-emerald-900">Pro Plan Active</div>
              <p className="mt-1 text-xs text-emerald-800">
                Unlimited 10-K analyses, PDF equity reports, and clean Excel exports enabled.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[248px]'
        }`}
      >
        {content(false)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-950/40" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="relative z-10 flex w-[260px] flex-col bg-white shadow-xl">
            {content(true)}
          </aside>
        </div>
      )}
    </>
  );
}

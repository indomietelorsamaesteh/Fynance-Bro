import { useEffect, useState } from 'react';
import { ChevronDown, LogOut, Menu, Search, Settings, CreditCard } from 'lucide-react';
import { AnalysisWorkspace } from './components/AnalysisWorkspace';
import { AuthModal, type AuthModalMode } from './components/AuthModal';
import { HomeDashboard } from './components/HomeDashboard';
import { LandingPage } from './components/LandingPage';
import { LearningCenter } from './components/LearningCenter';
import { SettingsView } from './components/SettingsView';
import { Sidebar, type AppNavTab } from './components/Sidebar';
import { SupportModal } from './components/SupportModal';
import { UpgradeModal } from './components/UpgradeModal';
import { UploadView } from './components/UploadView';
import { api, getStoredToken } from './lib/api';
import type { FinancialModelRecord, UserProfile } from './types/financial';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [booting, setBooting] = useState(true);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode | null>(null);

  const [models, setModels] = useState<FinancialModelRecord[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppNavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const loadWorkspaceData = async () => {
    const res = await api.listModels();
    setModels(res.models);
  };

  useEffect(() => {
    const boot = async () => {
      const params = new URLSearchParams(window.location.search);
      const autostart = params.get('autostart') === '1';
      try {
        if (getStoredToken()) {
          const me = await api.me();
          setUser(me.user);
          await loadWorkspaceData();
          return;
        }
        if (autostart) {
          const demo = await api.demoLogin();
          setUser(demo.user);
          await loadWorkspaceData();
          return;
        }
      } catch {
        // Not logged in; show landing page cleanly
      } finally {
        setBooting(false);
      }
    };
    void boot();
  }, []);

  const handleAuthSuccess = async (authedUser: UserProfile) => {
    setUser(authedUser);
    setAuthModalMode(null);
    setActiveTab('dashboard');
    setActiveModelId(null);
    await loadWorkspaceData();
  };

  const handleDemoEnter = async () => {
    try {
      const demo = await api.demoLogin();
      await handleAuthSuccess(demo.user);
    } catch {
      setAuthModalMode('login');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setModels([]);
    setActiveModelId(null);
    setUserMenuOpen(false);
  };

  const handleOpenUpgrade = (reason?: string) => {
    setUpgradeReason(reason);
    setShowUpgradeModal(true);
  };

  const handleDeleteModel = async (id: string) => {
    await api.deleteModel(id);
    setModels((prev) => prev.filter((m) => m.id !== id));
    if (activeModelId === id) setActiveModelId(null);
  };

  const handleExportExcel = async (id: string, ticker: string) => {
    await api.downloadFile(`/api/models/${encodeURIComponent(id)}/export/excel`, `${ticker}_Model.xlsx`);
  };

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] text-sm text-slate-500">
        Loading Fynance Bro workspace...
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage onOpenAuth={(mode) => setAuthModalMode(mode)} onDemoEnter={handleDemoEnter} />
        {authModalMode && (
          <AuthModal
            mode={authModalMode}
            onClose={() => setAuthModalMode(null)}
            onSuccess={handleAuthSuccess}
            onSwitchMode={(nextMode) => setAuthModalMode(nextMode)}
          />
        )}
      </>
    );
  }

  const activeModel = activeModelId ? models.find((m) => m.id === activeModelId) ?? null : null;

  return (
    <div className="flex min-h-screen bg-[#F7F8FA] text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setActiveModelId(null);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        user={user}
        onOpenUpgrade={() => handleOpenUpgrade()}
        onOpenSupport={() => setShowSupportModal(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Authenticated Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeModelId) {
                    setActiveModelId(null);
                    setActiveTab('models');
                  }
                }}
                aria-label="Search saved models"
                placeholder="Search models..."
                className="w-full rounded-lg border border-slate-200 bg-[#F8FAFC] py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1A1A2E] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="relative flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-expanded={userMenuOpen}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1A2E] text-[11px] font-bold text-white">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{user.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2">
                  <div className="truncate text-xs font-semibold text-slate-900">{user.name}</div>
                  <div className="truncate text-[11px] text-slate-500">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModelId(null);
                    setActiveTab('settings');
                    setUserMenuOpen(false);
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Account Settings</span>
                </button>
                {user.subscriptionTier === 'free' && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleOpenUpgrade();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-emerald-800 hover:bg-emerald-50"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Upgrade to Pro ($5/mo)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1">
          {activeModel ? (
            <AnalysisWorkspace
              model={activeModel}
              user={user}
              onBack={() => setActiveModelId(null)}
              onModelUpdated={(updated) => {
                setModels((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
              }}
              onOpenUpgrade={(reason) => handleOpenUpgrade(reason)}
            />
          ) : activeTab === 'dashboard' || activeTab === 'models' ? (
            <HomeDashboard
              user={user}
              models={models}
              searchQuery={searchQuery}
              onlyModelsView={activeTab === 'models'}
              onNewUpload={() => setActiveTab('upload')}
              onViewAllModels={() => setActiveTab('models')}
              onOpenModel={(id) => setActiveModelId(id)}
              onExportExcel={(id, ticker) => void handleExportExcel(id, ticker)}
              onDeleteModel={(id) => void handleDeleteModel(id)}
              onOpenUpgrade={() => handleOpenUpgrade()}
            />
          ) : activeTab === 'upload' ? (
            <UploadView
              user={user}
              onParsedSuccess={(newModel, updatedUser) => {
                setUser(updatedUser);
                setModels((prev) => [newModel, ...prev]);
                setActiveModelId(newModel.id);
              }}
              onOpenUpgrade={() => handleOpenUpgrade()}
            />
          ) : activeTab === 'learning' ? (
            <LearningCenter />
          ) : (
            <SettingsView
              user={user}
              onUserUpdated={(u) => setUser(u)}
              onAccountDeleted={() => {
                setUser(null);
                setModels([]);
                setActiveModelId(null);
              }}
              onOpenUpgrade={() => handleOpenUpgrade()}
            />
          )}
        </main>
      </div>

      {showUpgradeModal && (
        <UpgradeModal
          reason={upgradeReason}
          onClose={() => setShowUpgradeModal(false)}
          onUpgraded={(updatedUser) => {
            setUser(updatedUser);
            setShowUpgradeModal(false);
          }}
        />
      )}

      {showSupportModal && <SupportModal onClose={() => setShowSupportModal(false)} />}
    </div>
  );
}

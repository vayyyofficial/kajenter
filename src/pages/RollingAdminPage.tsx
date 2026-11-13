import React, { useState, useEffect } from 'react';
import SeatingAdminSidebar from '../components/admin/SeatingAdminSidebar';
import SeatingAdminHeader from '../components/admin/SeatingAdminHeader';
import SeatingAdminOverview from '../components/admin/SeatingAdminOverview';
import SeatingLayoutEditor from '../components/admin/SeatingLayoutEditor';
import SeatingStudentManager from '../components/admin/SeatingStudentManager';
import SeatingManager from '../components/admin/SeatingManager';
import SeatingHistoryTable from '../components/admin/SeatingHistoryTable';
import SeatingScheduleManager from '../components/admin/SeatingScheduleManager';
import SeatingToast from '../components/classroom/SeatingToast';
import { seatingStudentService } from '../services/seatingStudentService';
import { seatingLayoutService } from '../services/seatingLayoutService';
import { seatingArrangementService, SeatingArrangement, SeatingHistoryItem } from '../services/seatingArrangementService';
import { seatingAuthService, SeatingUser } from '../services/seatingAuthService';
import { ClassroomLayout } from '../data/seatingLayout';
import { SeatingStudent } from '../data/seatingStudents';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

interface RollingAdminPageProps {
  onNavigate: (route: string) => void;
}

export const RollingAdminPage: React.FC<RollingAdminPageProps> = ({ onNavigate }) => {
  const [currentUser, setCurrentUser] = useState<SeatingUser | null>(() =>
    seatingAuthService.isAuthenticated() ? seatingAuthService.getCurrentUser() : null
  );
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data state
  const [students, setStudents] = useState<SeatingStudent[]>(() => seatingStudentService.getStudents());
  const [layout, setLayout] = useState<ClassroomLayout>(() => seatingLayoutService.getLayout());
  const [currentArrangement, setCurrentArrangement] = useState<SeatingArrangement>(() =>
    seatingArrangementService.getCurrentArrangement()
  );
  const [previousArrangement, setPreviousArrangement] = useState<SeatingArrangement | null>(() =>
    seatingArrangementService.getPreviousArrangement()
  );
  const [history, setHistory] = useState<SeatingHistoryItem[]>(() => seatingArrangementService.getHistory());

  // Login form state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' }>({
    message: '',
    type: 'success',
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    let isMounted = true;

    seatingStudentService.fetchStudents().then((data) => {
      if (isMounted && data) setStudents(data);
    });

    seatingLayoutService.fetchLayout().then((data) => {
      if (isMounted && data) setLayout(data);
    });

    seatingArrangementService.fetchActiveArrangement().then((data) => {
      if (isMounted && data) setCurrentArrangement(data);
    });

    seatingArrangementService.fetchHistory().then((data) => {
      if (isMounted && data) setHistory(data);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Login submit handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!password) {
      setLoginError('Kata sandi administrator wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await seatingAuthService.login(password);
      setIsLoading(false);

      if (result.success && result.user) {
        setCurrentUser(result.user);
        showNotification(`Selamat datang kembali, ${result.user.name}!`, 'success');
      } else {
        setLoginError(result.message || 'Kata sandi tidak valid.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setLoginError(err.message || 'Terjadi kesalahan sistem saat memproses login.');
    }
  };

  const handleLogout = async () => {
    await seatingAuthService.logout();
    setCurrentUser(null);
    showNotification('Anda telah keluar dari sesi admin.', 'info');
  };

  // Student Actions
  const handleAddStudent = async (studentData: { fullName: string; nickname: string; isActive?: boolean }) => {
    const result = await seatingStudentService.addStudent(studentData);
    if (result?.error) {
      showNotification(result.error, 'error');
      return result;
    }
    setStudents(seatingStudentService.getStudents());
    showNotification(`Siswa "${studentData.nickname}" berhasil ditambahkan.`, 'success');
    return result;
  };

  const handleUpdateStudent = async (id: string, updates: Partial<SeatingStudent>) => {
    const result = await seatingStudentService.updateStudent(id, updates);
    if (result?.error) {
      showNotification(result.error, 'error');
      return result;
    }
    setStudents(seatingStudentService.getStudents());
    showNotification('Data siswa berhasil diperbarui.', 'success');
    return result;
  };

  const handleDeleteStudent = async (id: string) => {
    const result = await seatingStudentService.deleteStudent(id);
    if (result?.error) {
      showNotification(result.error, 'error');
      return result;
    }
    setStudents(seatingStudentService.getStudents());
    showNotification('Data siswa berhasil dihapus.', 'info');
    return result;
  };

  const handleToggleStudentActive = async (id: string) => {
    const result = await seatingStudentService.toggleActive(id);
    if (result?.error) {
      showNotification(result.error, 'error');
      return result;
    }
    setStudents(seatingStudentService.getStudents());
    return result;
  };

  const handleResetStudents = () => {
    const fresh = seatingStudentService.resetToDefault();
    setStudents(fresh);
    showNotification('Daftar siswa dikembalikan ke konfigurasi standar.', 'info');
  };

  // Layout Actions
  const handleSaveLayout = async (newLayout: ClassroomLayout) => {
    const result = await seatingLayoutService.saveLayout(newLayout);
    if (result?.error) {
      showNotification(result.error, 'error');
      return result;
    }
    setLayout(newLayout);
    showNotification('Konfigurasi tata letak kelas berhasil disimpan!', 'success');
    return result;
  };

  const handleResetLayout = () => {
    const fresh = seatingLayoutService.resetToDefault();
    setLayout(fresh);
    showNotification('Tata letak telah dikembalikan ke denah standar (3 blok).', 'info');
  };

  // Seating / Reroll Actions
  const handleExecuteReroll = async (type = 'Manual', description = '') => {
    const result = await seatingArrangementService.executeRerollAsync(type, description);
    if (result?.error) {
      showNotification(result.error, 'error');
      return result;
    }
    setCurrentArrangement(result);
    setPreviousArrangement(seatingArrangementService.getPreviousArrangement());
    const hist = await seatingArrangementService.fetchHistory();
    setHistory(hist);
    return result;
  };

  const handleSimulateAutoReroll = async () => {
    return handleExecuteReroll('Otomatis', 'Simulasi Rotasi Otomatis Mingguan (Minggu 06:00 WIB)');
  };

  const handleClearHistory = () => {
    seatingArrangementService.clearHistory();
    setHistory([]);
    showNotification('Riwayat pengacakan telah dibersihkan.', 'info');
  };

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    overview: { title: 'Ringkasan Dashboard', subtitle: 'Ikhtisar kapasitas kelas, siswa aktif, dan jadwal rotasi' },
    layout: { title: 'Editor Tata Letak Denah', subtitle: 'Atur blok meja, tambah/hapus baris & kolom secara visual' },
    students: { title: 'Manajemen Data Siswa', subtitle: 'Daftar 26 siswa kelas, ubah nama panggilan, atau nonaktifkan' },
    seating: { title: 'Kelola Denah & Reroll', subtitle: 'Pratinjau visual susunan aktif dan lakukan pengacakan ulang manual' },
    history: { title: 'Riwayat Aktivitas Rotasi', subtitle: 'Log riwayat seluruh pengacakan otomatis dan manual' },
    schedule: { title: 'Pengaturan Jadwal Mingguan', subtitle: 'Parameter waktu Minggu 06:00 WIB dan simulasi siklus' },
  };

  const currentTabInfo = tabTitles[activeTab] || tabTitles.overview;

  // VIEW: LOGIN FORM (If not logged in)
  if (!currentUser) {
    return (
      <div className="seating-scope min-h-[70vh] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
        <SeatingToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />

        <div className="max-w-md w-full mx-auto mb-6">
          <button
            onClick={() => onNavigate('/rolling-seat')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-content-secondary hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Denah Tempat Duduk
          </button>
        </div>

        <div className="max-w-md w-full mx-auto bg-white rounded-2xl border border-divider shadow-card p-6 sm:p-8">
          <div className="flex flex-col items-center text-center space-y-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shadow-subtle">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-content-primary">Login Pengurus Denah</h2>
              <p className="text-xs text-content-secondary mt-1">
                Masukkan kata sandi pengurus kelas untuk mengakses panel kontrol denah dan rotasi tempat duduk.
              </p>
            </div>
          </div>

          {loginError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-content-primary mb-1.5">
                Kata Sandi Administrator
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password admin..."
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-divider bg-canvas text-content-primary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  aria-label="Tampilkan atau sembunyikan password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-subtle hover:shadow-card transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk ke Dashboard</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // VIEW: ADMIN DASHBOARD (When authenticated)
  return (
    <div className="seating-scope min-h-screen bg-canvas flex">
      <SeatingToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SeatingAdminSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onLogout={handleLogout}
          onGoToPublic={() => onNavigate('/rolling-seat')}
          currentUser={currentUser}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-64 bg-white h-full shadow-card flex flex-col justify-between">
            <SeatingAdminSidebar
              activeTab={activeTab}
              onSelectTab={(tab: string) => {
                setActiveTab(tab);
                setMobileSidebarOpen(false);
              }}
              onLogout={handleLogout}
              onGoToPublic={() => onNavigate('/rolling-seat')}
              currentUser={currentUser}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <SeatingAdminHeader
          title={currentTabInfo.title}
          subtitle={currentTabInfo.subtitle}
          onToggleMobileNav={() => setMobileSidebarOpen(true)}
          onGoToPublic={() => onNavigate('/rolling-seat')}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <SeatingAdminOverview
              students={students}
              layout={layout}
              currentArrangement={currentArrangement}
              history={history}
              onNavigateTab={setActiveTab}
              onTriggerReroll={handleExecuteReroll}
            />
          )}

          {activeTab === 'layout' && (
            <SeatingLayoutEditor
              currentLayout={layout}
              activeStudentCount={students.filter((s) => s.isActive).length}
              onSave={handleSaveLayout}
              onResetDefault={handleResetLayout}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'students' && (
            <SeatingStudentManager
              students={students}
              assignments={currentArrangement?.assignments || {}}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onToggleActive={handleToggleStudentActive}
              onResetDefault={handleResetStudents}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'seating' && (
            <SeatingManager
              layout={layout}
              students={students}
              currentArrangement={currentArrangement}
              previousArrangement={previousArrangement}
              onExecuteReroll={handleExecuteReroll}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'history' && (
            <SeatingHistoryTable
              history={history}
              onClearHistory={handleClearHistory}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'schedule' && (
            <SeatingScheduleManager
              onSimulateAutoReroll={handleSimulateAutoReroll}
              showNotification={showNotification}
            />
          )}
        </main>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
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
type SeatingUser = { name: string; role: string };
import { ClassroomLayout } from '../data/seatingLayout';
import { SeatingStudent } from '../data/seatingStudents';


interface RollingAdminPageProps {
  onNavigate: (route: string) => void;
}

export const RollingAdminPage: React.FC<RollingAdminPageProps> = ({ onNavigate }) => {
  const { isAdmin, isSessionLoading, logout } = useAdmin();
  const currentUser: SeatingUser | null = isAdmin
    ? { name: 'Administrator', role: 'ADMIN' }
    : null;
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

  // Rolling Admin menggunakan sesi autentikasi admin utama.
  useEffect(() => {
    if (!isSessionLoading && !isAdmin) {
      onNavigate('/admin/login?redirect=/rolling-admin');
    }
  }, [isSessionLoading, isAdmin, onNavigate]);

  const handleLogout = () => {
    logout();
    onNavigate('/admin/login?redirect=/rolling-admin');
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

  if (isSessionLoading || !isAdmin) {
    return (
      <div className="seating-scope min-h-[70vh] flex items-center justify-center px-4">
        <p className="text-sm font-semibold text-content-secondary">
          {isSessionLoading ? 'Memeriksa sesi administrator...' : 'Mengalihkan ke halaman login...'}
        </p>
      </div>
    );
  }

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

import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useRealtimeSync } from '../context/SyncContext';
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
import { ClassroomLayout } from '../data/seatingLayout';
import { SeatingStudent } from '../data/seatingStudents';


interface RollingAdminPageProps {
  onNavigate?: (route: string) => void;
  embedded?: boolean;
  /** Sub-view selected in the unified admin tab bar. */
  tab?: string;
  onTabChange?: (tab: string) => void;
}

export const RollingAdminPage: React.FC<RollingAdminPageProps> = ({ tab, onTabChange }) => {
  const { isAdmin } = useAdmin();
  const activeTab = tab ?? 'overview';
  const setActiveTab = (next: string) => onTabChange?.(next);

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

  // Members are the single source of student data: refresh when they change.
  useRealtimeSync(['members'], () => {
    seatingStudentService.fetchStudents().then((data) => {
      if (data) setStudents(data);
    });
  });

  // Student Actions
  const handleAddStudent = async (studentData: { fullName: string; nickname: string; isActive?: boolean }) => {
    const result = await seatingStudentService.addStudent(studentData);
    if (result?.error) {
      showNotification(result.error, 'error');
      return result;
    }
    setStudents(seatingStudentService.getStudents());
    if (result?.warning) {
      showNotification(result.warning, 'info');
    } else {
      showNotification(`Siswa "${studentData.nickname}" berhasil ditambahkan.`, 'success');
    }
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

  const renderTabContent = () => (
    <>
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
    </>
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="seating-scope admin-rolling-embed">
      <SeatingToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
      {renderTabContent()}
    </div>
  );
};

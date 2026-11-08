import React, { useState, useEffect } from 'react';
import GroupRandomizerView from '../components/groups/GroupRandomizerView';
import SeatingToast from '../components/classroom/SeatingToast';
import { seatingStudentService } from '../services/seatingStudentService';
import { SeatingStudent } from '../data/seatingStudents';
import { Users2, ArrowLeft, Armchair } from 'lucide-react';

interface RollingKelompokPageProps {
  onNavigate: (route: string) => void;
}

export const RollingKelompokPage: React.FC<RollingKelompokPageProps> = ({ onNavigate }) => {
  const [students, setStudents] = useState<SeatingStudent[]>(() => seatingStudentService.getStudents());
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
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="seating-scope pb-12">
      <SeatingToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-divider">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/rolling-seat')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-content-secondary hover:text-brand-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Denah Kursi</span>
            </button>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-content-primary">Group Randomizer</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('/rolling-seat')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-divider bg-white hover:bg-canvas text-content-primary text-xs font-semibold shadow-subtle transition-colors"
          >
            <Armchair className="w-3.5 h-3.5 text-brand-600" />
            <span>Lihat Denah Duduk</span>
          </button>
        </div>
      </div>

      <GroupRandomizerView
        students={students}
        showNotification={showNotification}
      />
    </div>
  );
};

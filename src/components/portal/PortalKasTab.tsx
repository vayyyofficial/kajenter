import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Wallet,
  Check,
  RefreshCw,
  Search,
  Sliders,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Lock,
  Plus,
  Receipt,
  Edit2,
  Trash2,
  Filter,
  CheckSquare,
} from 'lucide-react';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { api } from '../../services/api';
import { ClassKasRecord, ClassKasExpense, Member } from '../../types';
import { useRealtimeSync } from '../../context/SyncContext';
import { Modal } from '../common/Modal';
import {
  KasWeekPeriod,
  generateKasWeeks,
  getActiveKasWeekIndex,
  getKasCellStatus,
  getWIBTodayString,
} from '../../utils/kasPeriod';

export type { KasWeekPeriod };

const EXPENSE_CATEGORIES = ['Administrasi', 'Konsumsi', 'Peralatan Kelas', 'Kegiatan', 'Lain-lain'];

export const PortalKasTab: React.FC = () => {
  const { member } = useMemberAuth();

  // All 44 Weeks from 1 Oktober 2026 to 31 Juli 2027
  const allWeeks = useMemo(() => generateKasWeeks(), []);

  // Today's date string YYYY-MM-DD in Indonesia/WIB timezone
  const todayStr = useMemo(() => getWIBTodayString(), []);

  // Detect which week index is current today (Real-Time WIB)
  const currentWeekIndex = useMemo(() => getActiveKasWeekIndex(allWeeks), [allWeeks]);

  // Role permissions
  const userRole = (member?.role || '').toLowerCase();
  const canManageKas = Boolean(
    member?.permissions?.canManageKas ||
    userRole === 'developer' ||
    userRole.includes('bendahara') ||
    userRole.includes('ketua') ||
    userRole.includes('wakil')
  );

  // Requirement #4: Pengeluaran Kas strictly Bendahara & Developer only!
  const canManageExpenses = Boolean(
    member?.permissions?.canManageExpenses ||
    userRole === 'developer' ||
    userRole.includes('bendahara')
  );

  // Subview Switcher ('pembayaran' | 'pengeluaran')
  const [activeSubView, setActiveSubView] = useState<'pembayaran' | 'pengeluaran'>('pembayaran');

  // States: Kas Payments
  const [students, setStudents] = useState<Member[]>([]);
  const [records, setRecords] = useState<ClassKasRecord[]>([]);
  const [defaultAmount, setDefaultAmount] = useState<number>(3000);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // States: Kas Expenses (Requirement #4 & #5)
  const [expenses, setExpenses] = useState<ClassKasExpense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [expenseSearch, setExpenseSearch] = useState<string>('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');

  // Add / Edit Expense modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [formExpenseDate, setFormExpenseDate] = useState<string>(todayStr);
  const [formExpenseDesc, setFormExpenseDesc] = useState<string>('');
  const [formExpenseCategory, setFormExpenseCategory] = useState<string>('Administrasi');
  const [formExpenseAmount, setFormExpenseAmount] = useState<number>(15000);
  const [formExpenseRecordedBy, setFormExpenseRecordedBy] = useState<string>('Bendahara');
  const [formExpenseNotes, setFormExpenseNotes] = useState<string>('');
  const [savingExpense, setSavingExpense] = useState<boolean>(false);

  // Delete Expense confirmation modal
  const [expenseToDelete, setExpenseToDelete] = useState<ClassKasExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Nominal Settings Modal (Mingguan)
  const [isNominalModalOpen, setIsNominalModalOpen] = useState(false);
  const [editNominalVal, setEditNominalVal] = useState<number>(3000);
  const [savingNominal, setSavingNominal] = useState(false);

  // Nominal Saat Ini (Saldo Awal Periode Sebelumnya - Requirement #1 & #2)
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [isInitialBalanceModalOpen, setIsInitialBalanceModalOpen] = useState<boolean>(false);
  const [editInitialBalanceVal, setEditInitialBalanceVal] = useState<number>(0);
  const [isConfirmInitialBalanceOpen, setIsConfirmInitialBalanceOpen] = useState<boolean>(false);
  const [savingInitialBalance, setSavingInitialBalance] = useState<boolean>(false);

  // Horizontal scroll table ref
  const currentWeekColRef = useRef<HTMLTableCellElement>(null);

  // Load Kas & Members & Expenses Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch students list
      const membersRes = await api.members.getAll();
      if (membersRes.success && membersRes.data) {
        const sortedStudents = [...membersRes.data.siswa].sort(
          (a, b) => (a.attendance_number || 99) - (b.attendance_number || 99)
        );
        setStudents(sortedStudents);
      }

      // Fetch Kas records from Supabase
      const kasRes = await api.portal.kas.getAll();
      if (kasRes.success) {
        setRecords(kasRes.data || []);
        const nominal = kasRes.defaultAmount || 3000;
        setDefaultAmount(nominal);
        setEditNominalVal(nominal);
        const initBal = Number(kasRes.initialBalance ?? kasRes.summary?.initialBalance ?? 0);
        setInitialBalance(initBal);
        setEditInitialBalanceVal(initBal);
      }

      // Fetch Expenses from Supabase
      const expRes = await api.portal.kas.getExpenses();
      if (expRes.success) {
        setExpenses(expRes.data || []);
        setTotalExpenses(expRes.totalExpenses || 0);
      }
    } catch (err: any) {
      console.error('Failed to load kas data:', err);
      showToast('Gagal memuat data kas dari Supabase.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Supabase sync
  useRealtimeSync(['settings', 'members'], loadData);

  // Distinct Months for Quick Filter Chips
  const monthFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ key: string; label: string }> = [{ key: 'all', label: 'Semua (44 Minggu)' }];
    allWeeks.forEach((w) => {
      if (!seen.has(w.monthKey)) {
        seen.add(w.monthKey);
        options.push({ key: w.monthKey, label: w.monthShort });
      }
    });
    return options;
  }, [allWeeks]);

  // Filtered Weeks based on Selected Month Chip
  const displayedWeeks = useMemo(() => {
    if (selectedMonthFilter === 'all') return allWeeks;
    return allWeeks.filter((w) => w.monthKey === selectedMonthFilter);
  }, [allWeeks, selectedMonthFilter]);

  // Filtered Students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.nickname && s.nickname.toLowerCase().includes(q)) ||
        String(s.attendance_number || '').includes(q) ||
        (s.role && s.role.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat = expenseCategoryFilter === 'all' || e.category === expenseCategoryFilter;
      const q = expenseSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        (e.recorded_by && e.recorded_by.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [expenses, expenseCategoryFilter, expenseSearch]);

  // Find record helper for a student and week
  const findCellRecord = useCallback(
    (studentId: number, week: KasWeekPeriod): ClassKasRecord | undefined => {
      return records.find((r) => {
        if (Number(r.member_id) !== Number(studentId)) return false;
        if (Number(r.week_number) === Number(week.weekIndex)) return true;
        if (r.month_year === week.monthKey) {
          const firstWeekOfMonth = allWeeks.find((w) => w.monthKey === week.monthKey)?.weekIndex || 1;
          const relative = week.weekIndex - firstWeekOfMonth + 1;
          if (Number(r.week_number) === relative) return true;
        }
        return false;
      });
    },
    [records, allWeeks]
  );

  // Jump scroll to current week
  const handleJumpToCurrentWeek = () => {
    if (selectedMonthFilter !== 'all') {
      setSelectedMonthFilter('all');
    }
    setTimeout(() => {
      if (currentWeekColRef.current) {
        currentWeekColRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 120);
  };

  // Toggle single cell payment status
  const handleToggleCell = async (student: Member, week: KasWeekPeriod) => {
    if (!canManageKas) return;

    const key = `${student.id}-${week.weekIndex}`;
    if (togglingKey === key) return;

    const existing = findCellRecord(student.id, week);
    const wasPaid = Boolean(
      existing && (existing.status === 'paid' || existing.is_paid === true || existing.is_paid === 1)
    );
    const newStatus = wasPaid ? 'unpaid' : 'paid';

    // Optimistic Update
    setTogglingKey(key);
    const previousRecords = [...records];

    if (existing) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === existing.id
            ? { ...r, status: newStatus, is_paid: !wasPaid, amount: defaultAmount }
            : r
        )
      );
    } else {
      const optimisticRecord: ClassKasRecord = {
        id: Date.now(),
        member_id: student.id,
        week_number: week.weekIndex,
        month_year: week.monthKey,
        year: week.year,
        amount: defaultAmount,
        status: newStatus,
        is_paid: true,
        recorded_by_name: member?.role || 'Bendahara',
      };
      setRecords((prev) => [...prev, optimisticRecord]);
    }

    try {
      const res = await api.portal.kas.record({
        memberId: student.id,
        weekNumber: week.weekIndex,
        month_year: week.monthKey,
        amount: defaultAmount,
        is_paid: !wasPaid,
        notes: !wasPaid ? 'Lunas' : 'Belum Bayar',
      });

      if (res.data) {
        const returned = res.data;
        setRecords((prev) =>
          prev.map((r) =>
            r.id === returned.id ||
            (Number(r.member_id) === Number(student.id) && Number(r.week_number) === Number(week.weekIndex))
              ? {
                  ...r,
                  ...returned,
                  id: returned.id || r.id,
                  status: returned.status || newStatus,
                  is_paid: returned.status === 'paid' || returned.is_paid === true || returned.is_paid === 1,
                  paid_date: returned.paid_date || returned.paid_at || r.paid_date,
                }
              : r
          )
        );
      }

      showToast(
        `${student.nickname || student.full_name} (${week.label}): ${!wasPaid ? '✓ Lunas' : 'Belum Bayar'}`
      );
    } catch (err: any) {
      console.error('Toggle cell error:', err);
      setRecords(previousRecords);
      showToast(err.message || 'Gagal mengubah status kas.', 'error');
    } finally {
      setTogglingKey(null);
    }
  };

  // Save updated nominal
  const handleSaveNominal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageKas) return;
    if (editNominalVal <= 0) {
      showToast('Nominal harus lebih dari Rp 0.', 'error');
      return;
    }

    try {
      setSavingNominal(true);
      const res = await api.portal.kas.setPeriode({
        nominal: editNominalVal,
      });
      if (res.success) {
        setDefaultAmount(editNominalVal);
        setIsNominalModalOpen(false);
        showToast(`Nominal kas mingguan berhasil diubah menjadi Rp ${editNominalVal.toLocaleString('id-ID')}.`);
        loadData();
      } else {
        throw new Error(res.error || 'Gagal menyimpan nominal kas.');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah nominal kas.', 'error');
    } finally {
      setSavingNominal(false);
    }
  };

  // Open & Save Initial Balance (Nominal Saat Ini / Saldo Awal - Requirement #1 & #2)
  const handleOpenEditInitialBalance = () => {
    if (!canManageExpenses) return;
    setEditInitialBalanceVal(initialBalance);
    setIsInitialBalanceModalOpen(true);
  };

  const handlePromptConfirmInitialBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (editInitialBalanceVal < 0 || isNaN(editInitialBalanceVal)) {
      showToast('Nominal harus berupa angka 0 atau lebih.', 'error');
      return;
    }
    setIsConfirmInitialBalanceOpen(true);
  };

  const handleSaveInitialBalance = async () => {
    if (!canManageExpenses) return;
    try {
      setSavingInitialBalance(true);
      const res = await api.portal.kas.setInitialBalance(Number(editInitialBalanceVal));
      if (res.success) {
        setInitialBalance(Number(editInitialBalanceVal));
        setIsConfirmInitialBalanceOpen(false);
        setIsInitialBalanceModalOpen(false);
        showToast(`Nominal saat ini (saldo awal) berhasil diatur ke Rp ${Number(editInitialBalanceVal).toLocaleString('id-ID')}.`);
        loadData();
      } else {
        throw new Error(res.message || 'Gagal menyimpan nominal saat ini.');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah nominal saat ini.', 'error');
    } finally {
      setSavingInitialBalance(false);
    }
  };

  // Open Expense Modal (Add)
  const handleOpenAddExpense = () => {
    if (!canManageExpenses) return;
    setEditingExpenseId(null);
    setFormExpenseDate(todayStr);
    setFormExpenseDesc('');
    setFormExpenseCategory('Administrasi');
    setFormExpenseAmount(15000);
    setFormExpenseRecordedBy(member?.full_name ? `${member.full_name} (${member.role})` : 'Bendahara');
    setFormExpenseNotes('');
    setIsExpenseModalOpen(true);
  };

  // Open Expense Modal (Edit)
  const handleOpenEditExpense = (expense: ClassKasExpense) => {
    if (!canManageExpenses) return;
    setEditingExpenseId(expense.id);
    setFormExpenseDate(expense.expense_date);
    setFormExpenseDesc(expense.description);
    setFormExpenseCategory(expense.category || 'Administrasi');
    setFormExpenseAmount(expense.amount);
    setFormExpenseRecordedBy(expense.recorded_by || 'Bendahara');
    setFormExpenseNotes(expense.notes || '');
    setIsExpenseModalOpen(true);
  };

  // Save Expense (Create or Update)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageExpenses) return;

    if (!formExpenseDesc.trim()) {
      showToast('Keterangan pengeluaran wajib diisi.', 'error');
      return;
    }
    if (formExpenseAmount <= 0) {
      showToast('Jumlah pengeluaran harus lebih dari Rp 0.', 'error');
      return;
    }

    try {
      setSavingExpense(true);
      if (editingExpenseId) {
        const res = await api.portal.kas.updateExpense(editingExpenseId, {
          expense_date: formExpenseDate,
          description: formExpenseDesc.trim(),
          category: formExpenseCategory,
          amount: Number(formExpenseAmount),
          recorded_by: formExpenseRecordedBy.trim(),
          notes: formExpenseNotes.trim() || undefined,
        });
        if (res.success) {
          showToast('Pengeluaran kas berhasil diperbarui.');
          setIsExpenseModalOpen(false);
          loadData();
        } else {
          throw new Error(res.message || 'Gagal memperbarui pengeluaran.');
        }
      } else {
        const res = await api.portal.kas.createExpense({
          expense_date: formExpenseDate,
          description: formExpenseDesc.trim(),
          category: formExpenseCategory,
          amount: Number(formExpenseAmount),
          recorded_by: formExpenseRecordedBy.trim(),
          notes: formExpenseNotes.trim() || undefined,
        });
        if (res.success) {
          showToast('Pengeluaran kas berhasil dicatat.');
          setIsExpenseModalOpen(false);
          loadData();
        } else {
          throw new Error(res.message || 'Gagal mencatat pengeluaran.');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan pengeluaran kas.', 'error');
    } finally {
      setSavingExpense(false);
    }
  };

  // Confirm Delete Expense
  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete || !canManageExpenses) return;
    try {
      setDeletingExpense(true);
      const res = await api.portal.kas.deleteExpense(expenseToDelete.id);
      if (res.success) {
        showToast('Catatan pengeluaran kas berhasil dihapus.');
        setExpenseToDelete(null);
        loadData();
      } else {
        throw new Error(res.message || 'Gagal menghapus pengeluaran.');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus pengeluaran kas.', 'error');
    } finally {
      setDeletingExpense(false);
    }
  };

  // Calculations for Kas Summary (Requirement #4 & #6)
  // Total Pemasukan
  const totalIncome = useMemo(() => {
    return records
      .filter((r) => r.status === 'paid' || r.is_paid === true || r.is_paid === 1)
      .reduce((sum, r) => sum + (r.amount || defaultAmount), 0);
  }, [records, defaultAmount]);

  // Saldo Kas = Nominal Saat Ini (Saldo Awal) + Total Pemasukan - Total Pengeluaran (Requirement #1 & #3)
  const netBalance = useMemo(() => {
    return initialBalance + totalIncome - totalExpenses;
  }, [initialBalance, totalIncome, totalExpenses]);

  // Requirement #3 & #4: Total Tunggakan Aktif (HANYA menghitung periode yang sudah dimulai / berjalan s/d currentWeekIndex)
  // Future weeks are NEVER counted as debt!
  const totalActiveArrears = useMemo(() => {
    if (students.length === 0 || currentWeekIndex <= 0) return 0;
    let unpaidCount = 0;
    students.forEach((student) => {
      for (let w = 1; w <= currentWeekIndex; w++) {
        const weekObj = allWeeks[w - 1];
        if (!weekObj) continue;
        const rec = findCellRecord(student.id, weekObj);
        const isPaid = Boolean(rec && (rec.status === 'paid' || rec.is_paid === true || rec.is_paid === 1));
        if (!isPaid) {
          unpaidCount++;
        }
      }
    });
    return unpaidCount * defaultAmount;
  }, [students, currentWeekIndex, allWeeks, findCellRecord, defaultAmount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', paddingBottom: '3.5rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 9999,
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: toast.type === 'error' ? 'var(--danger-main, #ef4444)' : '#059669',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. Header Overview Cards (Saldo Kas, Pemasukan, Pengeluaran, Nominal) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Saldo Kas (Net Balance) */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Saldo Kas Kelas
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: netBalance >= 0 ? 'var(--text-main)' : 'var(--danger-main, #ef4444)',
                marginTop: '0.2rem',
                letterSpacing: '-0.02em',
              }}
            >
              Rp {netBalance.toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Saldo Awal + Pemasukan - Pengeluaran
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wallet size={22} strokeWidth={2} />
          </div>
        </div>

        {/* Nominal Saat Ini (Saldo Awal Periode Sebelumnya - Requirement #1 & #2) */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Nominal Saat Ini
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: 'var(--text-main)',
                marginTop: '0.2rem',
                letterSpacing: '-0.02em',
              }}
            >
              Rp {initialBalance.toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Saldo awal kas kelas
            </div>
          </div>
          {canManageExpenses ? (
            <button
              onClick={handleOpenEditInitialBalance}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                border: '1px solid var(--border-color)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Set Nominal Saat Ini"
              type="button"
            >
              <Edit2 size={14} />
              <span>Edit Nominal</span>
            </button>
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-color)',
              }}
            >
              <Lock size={18} />
            </div>
          )}
        </div>

        {/* Total Pemasukan Kas */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Pemasukan
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: '#059669',
                marginTop: '0.2rem',
                letterSpacing: '-0.02em',
              }}
            >
              Rp {totalIncome.toLocaleString('id-ID')}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#059669',
                marginTop: '0.35rem',
              }}
            >
              <TrendingUp size={13} />
              <span>Dari Iuran Mingguan Siswa</span>
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckSquare size={22} strokeWidth={2} />
          </div>
        </div>

        {/* Total Pengeluaran Kas (Requirement #4) */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Pengeluaran
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: 'var(--danger-main, #ef4444)',
                marginTop: '0.2rem',
                letterSpacing: '-0.02em',
              }}
            >
              Rp {totalExpenses.toLocaleString('id-ID')}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--danger-main, #ef4444)',
                marginTop: '0.35rem',
              }}
            >
              <TrendingDown size={13} />
              <span>{expenses.length} Catatan Pengeluaran</span>
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-main)',
              border: '1px solid var(--danger-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Receipt size={22} strokeWidth={2} />
          </div>
        </div>

        {/* Nominal Mingguan */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Nominal Mingguan
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: 'var(--primary-600)',
                marginTop: '0.2rem',
                letterSpacing: '-0.02em',
              }}
            >
              Rp {defaultAmount.toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {canManageKas ? 'Dapat disesuaikan oleh Bendahara' : 'Iuran per minggu / siswa'}
            </div>
          </div>
          {canManageKas ? (
            <button
              onClick={() => {
                setEditNominalVal(defaultAmount);
                setIsNominalModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                border: '1px solid var(--border-color)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Atur Nominal Kas"
              type="button"
            >
              <Sliders size={14} />
              <span>Atur</span>
            </button>
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-color)',
              }}
            >
              <Lock size={18} />
            </div>
          )}
        </div>

        {/* Total Tunggakan Aktif (Periode Berjalan - Requirement #4) */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tunggakan Aktif (s/d W{currentWeekIndex})
            </div>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: totalActiveArrears > 0 ? '#d97706' : '#059669',
                marginTop: '0.2rem',
                letterSpacing: '-0.02em',
              }}
            >
              Rp {totalActiveArrears.toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Hanya periode aktif (masa depan tidak dihitung)
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: totalActiveArrears > 0 ? 'rgba(217, 119, 6, 0.1)' : 'rgba(16, 185, 129, 0.08)',
              color: totalActiveArrears > 0 ? '#d97706' : '#059669',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertCircle size={22} strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* 2. Subview Switcher: [ Tabel Pembayaran Kas ] | [ Catatan Pengeluaran Kas ] */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveSubView('pembayaran')}
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1.15rem',
            borderRadius: '8px',
            border: activeSubView === 'pembayaran' ? '1.5px solid var(--primary-600)' : '1px solid var(--border-color)',
            backgroundColor: activeSubView === 'pembayaran' ? 'var(--primary-600)' : 'var(--bg-card)',
            color: activeSubView === 'pembayaran' ? '#ffffff' : 'var(--text-main)',
            fontSize: '0.825rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <CheckSquare size={16} />
          <span>Tabel Pembayaran Kas</span>
        </button>

        <button
          onClick={() => setActiveSubView('pengeluaran')}
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1.15rem',
            borderRadius: '8px',
            border: activeSubView === 'pengeluaran' ? '1.5px solid var(--primary-600)' : '1px solid var(--border-color)',
            backgroundColor: activeSubView === 'pengeluaran' ? 'var(--primary-600)' : 'var(--bg-card)',
            color: activeSubView === 'pengeluaran' ? '#ffffff' : 'var(--text-main)',
            fontSize: '0.825rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Receipt size={16} />
          <span>Pengeluaran Kas ({expenses.length})</span>
        </button>
      </div>

      {/* 3A. SUBVIEW: TABEL PEMBAYARAN KAS */}
      {activeSubView === 'pembayaran' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Controls, Month Filter Chips, Search, Jump to This Week */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '1rem',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              {/* Search Box */}
              <div
                style={{
                  position: 'relative',
                  flex: '1 1 240px',
                  maxWidth: '380px',
                }}
              >
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari siswa atau no. absen..."
                  className="form-input"
                  style={{
                    paddingLeft: '2.4rem',
                    paddingTop: '0.55rem',
                    paddingBottom: '0.55rem',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {/* Jump to Current Week */}
                <button
                  onClick={handleJumpToCurrentWeek}
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 0.95rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--primary-600)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                  }}
                  title="Lompat ke kolom minggu saat ini di tabel"
                >
                  <Clock size={14} />
                  <span>Minggu Ini (W{currentWeekIndex})</span>
                </button>

                {/* Refresh */}
                <button
                  onClick={loadData}
                  disabled={loading}
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                  title="Perbarui Data Kas"
                >
                  <RefreshCw size={15} className={loading ? 'spin' : ''} />
                </button>
              </div>
            </div>

            {/* Filter Month Chips */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                overflowX: 'auto',
                paddingBottom: '0.2rem',
                scrollbarWidth: 'none',
              }}
            >
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginRight: '0.2rem' }}>
                Filter Bulan:
              </span>
              {monthFilterOptions.map((opt) => {
                const isActive = selectedMonthFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedMonthFilter(opt.key)}
                    type="button"
                    style={{
                      padding: '0.3rem 0.7rem',
                      borderRadius: '6px',
                      border: isActive ? '1px solid var(--primary-600)' : '1px solid var(--border-color)',
                      backgroundColor: isActive ? 'var(--primary-600)' : 'var(--bg-subtle)',
                      color: isActive ? '#ffffff' : 'var(--text-main)',
                      fontSize: '0.725rem',
                      fontWeight: isActive ? 800 : 600,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Spreadsheet Payment Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Table Horizontal Scroll Container */}
            <div
              style={{
                overflowX: 'auto',
                overflowY: 'visible',
                width: '100%',
                maxHeight: '68vh',
                position: 'relative',
              }}
            >
              <table
                style={{
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  width: '100%',
                  minWidth: '980px',
                  textAlign: 'left',
                  fontSize: '0.825rem',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
                    {/* Sticky Left Column: Student Name */}
                    <th
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 20,
                        backgroundColor: 'var(--bg-subtle)',
                        padding: '0.85rem 1rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        minWidth: '220px',
                        maxWidth: '240px',
                        borderBottom: '2px solid var(--border-color)',
                        boxShadow: '4px 0 10px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>NAMA ANGGOTA</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          NO
                        </span>
                      </div>
                    </th>

                    {/* Horizontal Weekly Period Columns (1 Okt 2026 – 31 Jul 2027) */}
                    {displayedWeeks.map((week) => {
                      const isCurrent = week.weekIndex === currentWeekIndex;
                      return (
                        <th
                          key={week.weekIndex}
                          ref={isCurrent ? currentWeekColRef : undefined}
                          style={{
                            padding: '0.65rem 0.5rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            minWidth: '85px',
                            maxWidth: '95px',
                            borderBottom: '2px solid var(--border-color)',
                            borderLeft: '1px solid var(--border-color)',
                            backgroundColor: isCurrent ? 'var(--primary-50)' : 'transparent',
                            color: isCurrent ? 'var(--primary-700)' : 'var(--text-main)',
                            fontSize: '0.75rem',
                          }}
                          title={week.fullDateRange}
                        >
                          <div style={{ fontWeight: 800, color: isCurrent ? 'var(--primary-600)' : 'var(--text-main)' }}>
                            {week.label}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            W{week.weekIndex}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={displayedWeeks.length + 1}
                        style={{
                          textAlign: 'center',
                          padding: '3rem 1rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Tidak ada siswa yang sesuai dengan pencarian "{searchQuery}".
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, rowIdx) => {
                      const isCurrentUser = member && Number(member.id) === Number(student.id);

                      return (
                        <tr
                          key={student.id}
                          style={{
                            backgroundColor: isCurrentUser
                              ? 'var(--primary-50)'
                              : rowIdx % 2 === 1
                              ? 'var(--bg-subtle)'
                              : 'var(--bg-card)',
                            transition: 'background-color 0.1s ease',
                          }}
                        >
                          {/* Sticky Left Column: Student Info */}
                          <td
                            style={{
                              position: 'sticky',
                              left: 0,
                              zIndex: 10,
                              backgroundColor: isCurrentUser
                                ? 'var(--primary-50)'
                                : rowIdx % 2 === 1
                                ? 'var(--bg-subtle)'
                                : 'var(--bg-card)',
                              padding: '0.65rem 1rem',
                              borderBottom: '1px solid var(--border-color)',
                              boxShadow: '4px 0 10px rgba(0,0,0,0.05)',
                              minWidth: '220px',
                              maxWidth: '240px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: isCurrentUser ? 900 : 700,
                                    color: isCurrentUser ? 'var(--primary-700)' : 'var(--text-main)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontSize: '0.825rem',
                                  }}
                                  title={student.full_name}
                                >
                                  {student.full_name}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                  {student.nickname || '-'} {student.role ? `• ${student.role}` : ''}
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.725rem',
                                  fontWeight: 800,
                                  color: 'var(--text-muted)',
                                  backgroundColor: 'var(--bg-surface)',
                                  border: '1px solid var(--border-color)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '6px',
                                  flexShrink: 0,
                                }}
                              >
                                {student.attendance_number ? String(student.attendance_number).padStart(2, '0') : '-'}
                              </span>
                            </div>
                          </td>

                          {/* Horizontal Weekly Cells with PAID, UNPAID, and FUTURE distinctions */}
                          {displayedWeeks.map((week) => {
                            const rec = findCellRecord(student.id, week);
                            const isPaid = Boolean(
                              rec && (rec.status === 'paid' || rec.is_paid === true || rec.is_paid === 1)
                            );
                            const cellStatus = getKasCellStatus(isPaid, week.weekIndex, currentWeekIndex);
                            const cellKey = `${student.id}-${week.weekIndex}`;
                            const isToggling = togglingKey === cellKey;

                            return (
                              <td
                                key={week.weekIndex}
                                onClick={() => canManageKas && handleToggleCell(student, week)}
                                style={{
                                  padding: '0.45rem 0.35rem',
                                  textAlign: 'center',
                                  borderBottom: '1px solid var(--border-color)',
                                  borderLeft: '1px solid var(--border-color)',
                                  cursor: canManageKas ? 'pointer' : 'default',
                                  userSelect: 'none',
                                  transition: 'all 0.15s ease',
                                }}
                                title={
                                  cellStatus === 'paid'
                                    ? `${student.nickname || student.full_name} (${week.label}): ✓ Lunas (Rp ${defaultAmount.toLocaleString('id-ID')})`
                                    : cellStatus === 'unpaid'
                                    ? `${student.nickname || student.full_name} (${week.label}): ✕ Belum Bayar (Jatuh Tempo Periode ${week.weekIndex})`
                                    : `${student.nickname || student.full_name} (${week.label}): — Periode Belum Mulai (Bukan Tunggakan)`
                                }
                              >
                                {isToggling ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <RefreshCw size={13} className="spin" color="var(--primary-600)" />
                                  </div>
                                ) : cellStatus === 'paid' ? (
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 28,
                                      height: 28,
                                      borderRadius: '6px',
                                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                      color: '#059669',
                                      border: '1px solid rgba(16, 185, 129, 0.35)',
                                    }}
                                  >
                                    <Check size={15} strokeWidth={3} />
                                  </div>
                                ) : cellStatus === 'unpaid' ? (
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 28,
                                      height: 28,
                                      borderRadius: '6px',
                                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                      color: 'var(--danger-main, #ef4444)',
                                      border: '1px solid rgba(239, 68, 68, 0.35)',
                                      fontSize: '0.8rem',
                                      fontWeight: 800,
                                    }}
                                  >
                                    ✕
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 28,
                                      height: 28,
                                      borderRadius: '6px',
                                      backgroundColor: 'var(--bg-subtle)',
                                      color: 'var(--text-muted)',
                                      border: '1px dashed var(--border-color)',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      opacity: 0.65,
                                    }}
                                  >
                                    —
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Legend */}
            <div
              style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <div>
                Menampilkan <strong>{filteredStudents.length}</strong> anggota • <strong>{displayedWeeks.length}</strong> minggu
                {currentWeekIndex > 0 && (
                  <span style={{ marginLeft: '0.75rem', color: 'var(--primary-600)', fontWeight: 700 }}>
                    • Periode Aktif Real-Time: #{currentWeekIndex}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '4px',
                      backgroundColor: 'rgba(16, 185, 129, 0.25)',
                      border: '1px solid #10b981',
                      display: 'inline-block',
                    }}
                  />
                  <span>✓ Lunas (Paid)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '4px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid var(--danger-main, #ef4444)',
                      display: 'inline-block',
                    }}
                  />
                  <span>✕ Belum Bayar (Unpaid)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px dashed var(--border-color)',
                      display: 'inline-block',
                    }}
                  />
                  <span>— Belum Mulai (Future - Bukan Tunggakan)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3B. SUBVIEW: CATATAN PENGELUARAN KAS (Requirement #4 & #5) */}
      {activeSubView === 'pengeluaran' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Controls: Search, Category Filter, and Add Expense Button */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '1rem',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Search Box */}
            <div
              style={{
                position: 'relative',
                flex: '1 1 240px',
                maxWidth: '380px',
              }}
            >
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                placeholder="Cari keterangan pengeluaran..."
                className="form-input"
                style={{
                  paddingLeft: '2.4rem',
                  paddingTop: '0.55rem',
                  paddingBottom: '0.55rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Category Filter & Add Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Filter size={15} color="var(--text-muted)" />
                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">Semua Kategori</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {canManageExpenses && (
                <button
                  onClick={handleOpenAddExpense}
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    backgroundColor: 'var(--primary-600)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.55rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} />
                  <span>Catat Pengeluaran</span>
                </button>
              )}
            </div>
          </div>

          {/* Expenses Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.825rem',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--text-main)' }}>TANGGAL</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--text-main)' }}>KETERANGAN</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--text-main)' }}>KATEGORI</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--text-main)', textAlign: 'right' }}>JUMLAH</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--text-main)' }}>DICATAT OLEH</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--text-main)' }}>CATATAN</th>
                    {canManageExpenses && (
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--text-main)', textAlign: 'center' }}>AKSI</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManageExpenses ? 7 : 6}
                        style={{
                          textAlign: 'center',
                          padding: '3rem 1rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {expenses.length === 0
                          ? 'Belum ada catatan pengeluaran kas.'
                          : 'Tidak ada pengeluaran yang sesuai dengan filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense, idx) => (
                      <tr
                        key={expense.id}
                        style={{
                          backgroundColor: idx % 2 === 1 ? 'var(--bg-subtle)' : 'var(--bg-card)',
                          borderBottom: '1px solid var(--border-color)',
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-main)' }}>
                          {expense.expense_date}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {expense.description}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              backgroundColor: 'var(--primary-50)',
                              color: 'var(--primary-700)',
                              border: '1px solid var(--primary-200)',
                              display: 'inline-block',
                            }}
                          >
                            {expense.category || 'Lain-lain'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: 'var(--danger-main, #ef4444)', whiteSpace: 'nowrap' }}>
                          -Rp {Number(expense.amount).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                          {expense.recorded_by || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontStyle: expense.notes ? 'normal' : 'italic' }}>
                          {expense.notes || '-'}
                        </td>
                        {canManageExpenses && (
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <button
                                onClick={() => handleOpenEditExpense(expense)}
                                type="button"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 28,
                                  height: 28,
                                  borderRadius: '6px',
                                  backgroundColor: 'var(--bg-subtle)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--primary-600)',
                                  cursor: 'pointer',
                                }}
                                title="Edit Pengeluaran"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => setExpenseToDelete(expense)}
                                type="button"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 28,
                                  height: 28,
                                  borderRadius: '6px',
                                  backgroundColor: 'var(--danger-bg)',
                                  border: '1px solid var(--danger-border)',
                                  color: 'var(--danger-main)',
                                  cursor: 'pointer',
                                }}
                                title="Hapus Pengeluaran"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Expense Table Footer */}
            <div
              style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <div>
                Total <strong>{filteredExpenses.length}</strong> catatan pengeluaran
              </div>
              <div style={{ fontWeight: 800, color: 'var(--danger-main, #ef4444)' }}>
                Total: -Rp {totalExpenses.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Add / Edit Expense (Bendahara & Developer only) */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={editingExpenseId ? 'Edit Pengeluaran Kas' : 'Catat Pengeluaran Kas Baru'}
        size="sm"
      >
        <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Tanggal Pengeluaran *
            </label>
            <input
              type="date"
              required
              value={formExpenseDate}
              onChange={(e) => setFormExpenseDate(e.target.value)}
              className="form-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Keterangan Pengeluaran *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Cetak dokumen kelas, Pembelian spidol"
              value={formExpenseDesc}
              onChange={(e) => setFormExpenseDesc(e.target.value)}
              className="form-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Kategori *
              </label>
              <select
                value={formExpenseCategory}
                onChange={(e) => setFormExpenseCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Jumlah (Rp) *
              </label>
              <input
                type="number"
                min={1000}
                step={500}
                required
                value={formExpenseAmount}
                onChange={(e) => setFormExpenseAmount(Number(e.target.value))}
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Dicatat Oleh
            </label>
            <input
              type="text"
              value={formExpenseRecordedBy}
              onChange={(e) => setFormExpenseRecordedBy(e.target.value)}
              className="form-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Keterangan tambahan atau nota..."
              value={formExpenseNotes}
              onChange={(e) => setFormExpenseNotes(e.target.value)}
              className="form-input"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingExpense}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary-600)',
                color: '#ffffff',
                fontSize: '0.825rem',
                fontWeight: 800,
                cursor: savingExpense ? 'not-allowed' : 'pointer',
                opacity: savingExpense ? 0.7 : 1,
              }}
            >
              {savingExpense ? 'Menyimpan...' : editingExpenseId ? 'Perbarui Pengeluaran' : 'Simpan Pengeluaran'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Modal: Delete Confirmation */}
      {expenseToDelete && (
        <Modal
          isOpen={Boolean(expenseToDelete)}
          onClose={() => setExpenseToDelete(null)}
          title="Konfirmasi Hapus Pengeluaran"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus catatan pengeluaran kas ini?
            </p>
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                fontSize: '0.825rem',
              }}
            >
              <strong>{expenseToDelete.description}</strong>
              <div style={{ color: 'var(--danger-main, #ef4444)', fontWeight: 800, marginTop: '0.15rem' }}>
                -Rp {Number(expenseToDelete.amount).toLocaleString('id-ID')}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem', marginTop: '0.15rem' }}>
                {expenseToDelete.expense_date} • {expenseToDelete.category}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                style={{
                  padding: '0.55rem 1rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExpense}
                disabled={deletingExpense}
                style={{
                  padding: '0.55rem 1.15rem',
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  backgroundColor: 'var(--danger-main, #ef4444)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: deletingExpense ? 'not-allowed' : 'pointer',
                  opacity: deletingExpense ? 0.7 : 1,
                }}
              >
                {deletingExpense ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Modal: Atur Nominal Kas (Requirement #6) */}
      <Modal
        isOpen={isNominalModalOpen}
        onClose={() => setIsNominalModalOpen(false)}
        title="Atur Nominal Kas Mingguan"
        size="sm"
      >
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '1rem', marginTop: 0 }}>
          Ubah nominal iuran Kas per minggu untuk seluruh kelas. Pengaturan ini akan tersimpan permanen di database Supabase.
        </p>

        <form onSubmit={handleSaveNominal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Nominal Kas per Minggu (Rp)
            </label>
            <input
              type="number"
              min={500}
              step={500}
              required
              value={editNominalVal}
              onChange={(e) => setEditNominalVal(Number(e.target.value))}
              placeholder="Contoh: 3000"
              className="form-input"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '1.1rem',
                fontWeight: 800,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={() => setIsNominalModalOpen(false)}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingNominal}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary-600)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: savingNominal ? 'not-allowed' : 'pointer',
              }}
            >
              {savingNominal ? 'Menyimpan...' : 'Simpan Nominal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. Modal: Set Nominal Saat Ini (Saldo Awal - Requirement #1 & #2) */}
      <Modal
        isOpen={isInitialBalanceModalOpen}
        onClose={() => setIsInitialBalanceModalOpen(false)}
        title="Set Nominal Saat Ini"
        size="sm"
      >
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '1rem', marginTop: 0 }}>
          Atur saldo awal atau kas dari periode sebelumnya. Nominal ini menjadi titik awal perhitungan saldo kas kelas. Riwayat pembayaran kas mingguan siswa tetap 100% aman dan dipertahankan.
        </p>

        <form onSubmit={handlePromptConfirmInitialBalance} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Nominal Saat Ini / Saldo Awal (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              required
              value={editInitialBalanceVal}
              onChange={(e) => setEditInitialBalanceVal(Number(e.target.value))}
              placeholder="Contoh: 500000"
              className="form-input"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '1.1rem',
                fontWeight: 800,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={() => setIsInitialBalanceModalOpen(false)}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary-600)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Lanjut Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* 8. Confirmation Dialog: Konfirmasi Ubah Nominal Saat Ini (Requirement #2) */}
      <Modal
        isOpen={isConfirmInitialBalanceOpen}
        onClose={() => !savingInitialBalance && setIsConfirmInitialBalanceOpen(false)}
        title="Konfirmasi Perubahan Nominal"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '0.5rem 0' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              border: '1px solid var(--border-color)',
            }}
          >
            <Wallet size={24} />
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
              Atur Nominal Saat Ini?
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menetapkan <strong>Nominal Saat Ini (Saldo Awal)</strong> menjadi{' '}
              <strong style={{ color: 'var(--primary-600)' }}>
                Rp {Number(editInitialBalanceVal).toLocaleString('id-ID')}
              </strong>
              ?
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>
              Perubahan ini menjadi titik awal perhitungan saldo kas dan tidak menghapus history pembayaran kas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              disabled={savingInitialBalance}
              onClick={() => setIsConfirmInitialBalanceOpen(false)}
              style={{
                flex: 1,
                padding: '0.7rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="button"
              disabled={savingInitialBalance}
              onClick={handleSaveInitialBalance}
              style={{
                flex: 1,
                padding: '0.7rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'var(--primary-600)',
                color: '#ffffff',
                fontSize: '0.825rem',
                fontWeight: 800,
                cursor: savingInitialBalance ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              {savingInitialBalance ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>{savingInitialBalance ? 'Menyimpan...' : 'Ya, Simpan'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

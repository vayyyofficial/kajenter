import React, { useState, useEffect } from "react";
import ClassroomMap from "../components/classroom/ClassroomMap";
import StudentList from "../components/classroom/StudentList";
import Countdown from "../components/classroom/Countdown";
import Badge from "../components/classroom/Badge";
import SeatingToast from "../components/classroom/SeatingToast";
import { formatWIBShort } from "../utils/seatingTimezone";
import { seatingStudentService } from "../services/seatingStudentService";
import { seatingLayoutService } from "../services/seatingLayoutService";
import {
  seatingArrangementService,
  SeatingArrangement,
} from "../services/seatingArrangementService";
import { ClassroomLayout } from "../data/seatingLayout";
import { SeatingStudent } from "../data/seatingStudents";
import {
  Users,
  Calendar,
  Clock,
  Shield,
  Armchair,
  Users2,
  Sparkles,
} from "lucide-react";

interface RollingSeatPageProps {
  onNavigate: (route: string) => void;
}

export const RollingSeatPage: React.FC<RollingSeatPageProps> = ({
  onNavigate,
}) => {
  const [students, setStudents] = useState<SeatingStudent[]>(() =>
    seatingStudentService.getStudents(),
  );
  const [layout, setLayout] = useState<ClassroomLayout>(() =>
    seatingLayoutService.getLayout(),
  );
  const [currentArrangement, setCurrentArrangement] =
    useState<SeatingArrangement>(() =>
      seatingArrangementService.getCurrentArrangement(),
    );
  const [highlightedStudentId, setHighlightedStudentId] = useState<
    string | null
  >(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  }>({
    message: "",
    type: "success",
  });

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
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

    const unsubSeating = seatingArrangementService.subscribeToSeatingChanges(
      (updated) => {
        if (isMounted && updated) {
          setCurrentArrangement(updated);
          showNotification("Denah tempat duduk baru saja diperbarui!", "info");
        }
      },
    );

    return () => {
      isMounted = false;
      unsubSeating();
    };
  }, []);

  const activeStudents = students.filter((s) => s.isActive);

  const handleStudentSelect = (studentId: string) => {
    setHighlightedStudentId((prev) => (prev === studentId ? null : studentId));
    const mapElement = document.getElementById("denah-kelas");
    if (
      mapElement &&
      typeof window !== "undefined" &&
      window.innerWidth < 768
    ) {
      mapElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="seating-scope">
      <SeatingToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      <div className="space-y-12 sm:space-y-16 pb-12">
        {/* 1. Hero / Welcome Section */}
        <section className="relative overflow-hidden pt-4 sm:pt-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-8">
              {/* Left Column: Heading & Value Prop */}
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  Rotasi Mingguan &amp; Pembagi Kelompok 26 Siswa
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-content-primary tracking-tight leading-[1.15]">
                  Denah Duduk Kelas &amp;{" "}
                  <span className="text-brand-600">Rolling Seat</span>
                </h1>

                <p className="text-sm sm:text-base text-content-secondary leading-relaxed">
                  Rolling Seat membantu kita melihat posisi meja duduk kelas
                  setiap minggu dan membagi kelompok tugas dengan cepat tanpa
                  ribet.
                </p>

                {/* Quick stats pills */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-divider shadow-subtle text-xs">
                    <Users className="w-4 h-4 text-brand-600" />
                    <span className="text-content-secondary">Total:</span>
                    <strong className="text-content-primary">
                      {activeStudents.length} Siswa
                    </strong>
                  </div>

                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-divider shadow-subtle text-xs">
                    <Armchair className="w-4 h-4 text-brand-600" />
                    <span className="text-content-secondary">Kapasitas:</span>
                    <strong className="text-content-primary">
                      28 Kursi (2 Kosong)
                    </strong>
                  </div>

                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-divider shadow-subtle text-xs">
                    <Clock className="w-4 h-4 text-brand-600" />
                    <span className="text-content-secondary">Jadwal:</span>
                    <strong className="text-content-primary">
                      Minggu 06:00 WIB
                    </strong>
                  </div>

                  <button
                    onClick={() => onNavigate("/rolling-kelompok")}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-semibold shadow-subtle transition-all"
                  >
                    <Users2 className="w-4 h-4 text-brand-600" />
                    <span>Acak Kelompok Tugas &rarr;</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Live Countdown Card */}
              <div className="w-full lg:w-96 bg-white rounded-2xl border border-divider p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-divider">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-content-primary uppercase tracking-wider">
                      Rotasi Berikutnya
                    </span>
                  </div>
                  <Badge variant="primary" size="xs">
                    Mingguan
                  </Badge>
                </div>

                <Countdown />

                <div className="pt-2 border-t border-divider text-center">
                  <span className="text-[11px] text-content-secondary">
                    Terakhir diperbarui:{" "}
                    <strong>
                      {formatWIBShort(
                        currentArrangement?.updatedAt ||
                          new Date().toISOString(),
                      )}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Interactive Classroom Map */}
        <section id="denah-kelas" className="scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-content-primary flex items-center gap-2">
                  <Armchair className="w-6 h-6 text-brand-600" />
                  Denah Tata Letak Meja Kelas
                </h2>
                <p className="text-xs sm:text-sm text-content-secondary mt-1">
                  Format 3 blok meja (Kiri 10, Tengah 10, Kanan 8 kursi). Klik
                  kursi untuk melihat nama siswa.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate("/rolling-kelompok")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-divider bg-white hover:bg-canvas text-content-primary text-xs font-semibold shadow-subtle transition-colors"
                >
                  <Users2 className="w-3.5 h-3.5 text-brand-600" />
                  <span>Buka Acak Kelompok</span>
                </button>
                <button
                  onClick={() => onNavigate("/rolling-admin")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold shadow-subtle transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-brand-600" />
                  <span>Panel Pengurus</span>
                </button>
              </div>
            </div>

            <ClassroomMap
              layout={layout}
              students={students}
              assignments={currentArrangement?.assignments || {}}
              highlightedStudentId={highlightedStudentId}
            />
          </div>
        </section>

        {/* 3. Students Directory List */}
        <section id="daftar-siswa" className="scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <StudentList
              students={students}
              layout={layout}
              assignments={currentArrangement?.assignments || {}}
              onSelectStudent={handleStudentSelect}
              highlightedStudentId={highlightedStudentId}
            />
          </div>
        </section>

        {/* 4. Weekly Rotation Information */}
        <section id="jadwal-reroll" className="scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl border border-divider shadow-subtle p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-content-primary flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-600" />
                  Ketentuan &amp; Cara Kerja Rotasi Mingguan
                </h3>
                <p className="text-xs text-content-secondary mt-1">
                  Informasi jadwal pergantian tempat duduk kelas kita.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-canvas border border-divider space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 font-bold flex items-center justify-center text-xs mb-2">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-content-primary">
                    Otomatis Tiap Minggu
                  </h4>
                  <p className="text-xs text-content-secondary leading-relaxed">
                    Tempat duduk otomatis berganti setiap hari{" "}
                    <strong>Minggu pukul 06:00 WIB</strong> agar denah baru
                    sudah siap sebelum kita masuk kelas di hari Senin.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-canvas border border-divider space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 font-bold flex items-center justify-center text-xs mb-2">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-content-primary">
                    Bisa Diacak Manual
                  </h4>
                  <p className="text-xs text-content-secondary leading-relaxed">
                    Pengurus kelas juga bisa mengacak tempat duduk secara manual
                    sewaktu-waktu jika ada instruksi khusus dari wali kelas atau
                    guru.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-canvas border border-divider space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 font-bold flex items-center justify-center text-xs mb-2">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-content-primary">
                    Jadwal Mingguan Tetap Aman
                  </h4>
                  <p className="text-xs text-content-secondary leading-relaxed">
                    Pengacakan manual tidak mengganggu atau membatalkan jadwal
                    rotasi otomatis hari Minggu berikutnya.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-brand-50/50 border border-brand-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-brand-900">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <span>
                    Pengurus kelas ingin mengacak ulang khusus atau menyesuaikan
                    tata letak meja?
                  </span>
                </div>
                <button
                  onClick={() => onNavigate("/rolling-admin")}
                  className="font-bold text-brand-700 hover:text-brand-800 hover:underline flex-shrink-0"
                >
                  Masuk ke Panel Pengurus &rarr;
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

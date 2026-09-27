import React, { useState, useEffect, useRef } from 'react';
import { TabType, ClassData, Student, Team, ClassSettings, PointLog, Reward, Badge, UserAuth, MonthlySnapshot } from './types';
import { loadClassData, saveClassData, resetClassData } from './utils/storage';
import { sound } from './utils/sound';
import { subscribeToClassData, saveClassDataToCloud, debouncedSaveClassDataToCloud, deleteSchoolRankingFromCloud, isFirestoreQuotaExceeded } from './lib/firebase';
import { findWeekDataInHistory, isSameStudentId } from './utils/weekUtils';

import { HeaderBanner } from './components/HeaderBanner';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { StudentManagement } from './components/StudentManagement';
import { TeamCompetition } from './components/TeamCompetition';
import { QuickScoring } from './components/QuickScoring';
import { RulesAndCriteria } from './components/RulesAndCriteria';
import { ClassSettingsView } from './components/ClassSettings';
import { FullClassScoreModal } from './components/FullClassScoreModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { QRCodeModal } from './components/QRCodeModal';
import { TeacherLoginModal } from './components/TeacherLoginModal';
import { DailyAttendance } from './components/DailyAttendance';
import { WeeklySummary } from './components/WeeklySummary';
import { StudentProfiles } from './components/StudentProfiles';
import { ClassroomSeating } from './components/ClassroomSeating';

export default function App() {
  const [classData, setClassData] = useState<ClassData>(() => loadClassData());
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isBgmOn, setIsBgmOn] = useState<boolean>(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Protection flag: ONLY enable auto-save AFTER Firestore has successfully hydrated state
  const [isFirestoreLoaded, setIsFirestoreLoaded] = useState<boolean>(false);

  // Track if state update came from Firestore snapshot (to prevent feedback loop)
  const isRemoteUpdateRef = useRef(false);

  // Sync status & Document ID
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'unsynced'>('synced');
  const [currentDocId, setCurrentDocId] = useState<string>('thcs_nguyenvancu_6a3');

  // Auth & Permissions (Guest by default, Admin when logged in with quynhan9942@gmail.com)
  const [userAuth, setUserAuth] = useState<UserAuth>({ role: 'guest' });

  // Guard for Guest tabs (Only home, summary, attendance, rules, seating allowed)
  const ALLOWED_GUEST_TABS: TabType[] = ['home', 'summary', 'attendance', 'rules', 'seating'];

  // 1. Firebase Auth State Listener
  useEffect(() => {
    import('./lib/firebase').then(({ auth, onAuthStateChanged }) => {
      const unsub = onAuthStateChanged(auth, (fbUser) => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlDocId = urlParams.get('docId') || urlParams.get('classId');
        const mode = urlParams.get('mode');

        const ADMIN_EMAIL = 'quynhan9942@gmail.com';
        if (mode !== 'view' && mode !== 'guest' && fbUser && fbUser.email && fbUser.email.trim().toLowerCase() === ADMIN_EMAIL) {
          setUserAuth({
            role: 'admin',
            email: fbUser.email,
            name: fbUser.displayName || 'Cô Quỳnh An',
          });
          setCurrentDocId(urlDocId || 'thcs_nguyenvancu_6a3');
        } else {
          setUserAuth({ role: 'guest' });
          setCurrentDocId(urlDocId || 'thcs_nguyenvancu_6a3');
        }
      });
      return () => unsub();
    });
  }, []);

  const handleNavigateTab = (tab: TabType) => {
    if (userAuth.role !== 'admin' && !ALLOWED_GUEST_TABS.includes(tab)) {
      showToast('🔒 Chế độ Khách (chỉ xem). Vui lòng bấm "Đăng nhập Giáo viên" để thực hiện.');
      return;
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    if (userAuth.role !== 'admin' && !ALLOWED_GUEST_TABS.includes(activeTab)) {
      setActiveTab('home');
    }
  }, [userAuth.role, activeTab]);

  // Modals state
  const [isFullScoreModalOpen, setIsFullScoreModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isTeacherLoginOpen, setIsTeacherLoginOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('Tuần 1');
  const weeklyHistory = classData.weeklyHistory || {};

  const setWeeklyHistory = (action: React.SetStateAction<Record<string, any>>) => {
    setClassData((prev) => {
      const currentHistory = prev.weeklyHistory || {};
      const nextHistory = typeof action === 'function' ? action(currentHistory) : action;
      return {
        ...prev,
        weeklyHistory: nextHistory,
      };
    });
  };

  const isInitialMountRef = useRef(true);

  // 2. Online / Offline Listener
  useEffect(() => {
    const handleOnline = () => {
      setIsCloudConnected(true);
      if (isFirestoreLoaded && userAuth.role === 'admin' && classData?.students?.length > 0) {
        saveClassDataToCloud(currentDocId, classData).then((success) => {
          setSyncStatus(success ? 'synced' : 'unsynced');
        });
      }
    };
    const handleOffline = () => {
      setIsCloudConnected(false);
      setSyncStatus('unsynced');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentDocId, classData, userAuth.role, isFirestoreLoaded]);

  // 3. Check URL query params & Subscribe to Realtime Firestore Sync
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'view' || mode === 'guest') {
      setNotificationMsg('📱 Đã kết nối Bảng Thi Đua Trực Tiếp Lớp (Dành cho Phụ Huynh) - Đồng bộ thời gian thực từ Đám Mây Cloud!');
      setTimeout(() => setNotificationMsg(null), 5000);
    }

    if (isFirestoreQuotaExceeded()) {
      setIsCloudConnected(false);
      setSyncStatus('unsynced');
      return;
    }

    const unsubscribe = subscribeToClassData(
      currentDocId,
      (cloudData) => {
        if (cloudData && cloudData.students && Array.isArray(cloudData.students) && cloudData.students.length > 0) {
          isRemoteUpdateRef.current = true;

          // Restore team member photo if student avatarUrl is empty
          let restoredStudents = cloudData.students;
          const team0 = cloudData.teams?.[0] as any;
          if (team0 && Array.isArray(team0.members)) {
            const member0Photo = team0.members[0]?.avatarUrl || team0.members[0]?.photoUrl;
            if (member0Photo && (!restoredStudents[0]?.avatarUrl && !restoredStudents[0]?.photoUrl)) {
              restoredStudents = restoredStudents.map((s) =>
                s.id === 1 ? { ...s, avatarUrl: member0Photo, photoUrl: member0Photo } : s
              );
            }
          }

          // Normalize weeklyHistory to ensure Week 1 records (wh.week_1) map to 'Tuần 1'
          let normalizedHistory = cloudData.weeklyHistory || {};
          if (normalizedHistory && typeof normalizedHistory === 'object') {
            const week1Record = findWeekDataInHistory(normalizedHistory, 'Tuần 1');
            if (week1Record && typeof week1Record === 'object' && Array.isArray(week1Record.studentRecords)) {
              const week1Students = restoredStudents.map((initS) => {
                const rec = week1Record.studentRecords.find((r: any) => isSameStudentId(r.studentId ?? r.id, initS.id));
                return rec
                  ? { ...initS, points: rec.points, score: rec.points, speechCount: rec.speechCount || 0 }
                  : { ...initS, points: 100, score: 100, speechCount: 0 };
              });
              normalizedHistory = {
                ...normalizedHistory,
                'Tuần 1': week1Students,
                '1': week1Students,
                'week_1': week1Students,
              };
            }
          }

          const updatedCloudData = { ...cloudData, students: restoredStudents, weeklyHistory: normalizedHistory };
          setClassData(updatedCloudData);
          saveClassData(updatedCloudData); // Update LocalStorage cache silently
          setIsCloudConnected(true);
          setSyncStatus('synced');
          setIsFirestoreLoaded(true); // Hydration from Firestore complete!
        }
      },
      async (err) => {
        console.warn('Firestore subscription status:', err?.message);
        if (
          isFirestoreQuotaExceeded() ||
          err?.message?.toLowerCase().includes('quota') ||
          (err as any)?.code === 'resource-exhausted'
        ) {
          setIsCloudConnected(false);
          setSyncStatus('unsynced');
          return;
        }

        if (err?.message === 'Document does not exist yet' && userAuth.role === 'admin') {
          const localData = loadClassData();
          if (localData && Array.isArray(localData.students) && localData.students.length > 0) {
            const success = await saveClassDataToCloud(currentDocId, localData);
            if (success) {
              setIsCloudConnected(true);
              setSyncStatus('synced');
            }
          }
          setIsFirestoreLoaded(true); // Doc confirmed non-existent by Firestore server
          return;
        }
        setIsCloudConnected(false);
        setSyncStatus('unsynced');
      }
    );

    return () => unsubscribe();
  }, [currentDocId, userAuth.role]);

  // 4. Auto-save data to LocalStorage & Sync to Firestore Cloud when changed locally by Teacher
  useEffect(() => {
    // GUARD 1: MUST NOT auto-save if Firestore has not finished initial loading (hydration)
    if (!isFirestoreLoaded) {
      return;
    }

    // GUARD 2: Guest users MUST NEVER auto-save or write to Firestore
    if (userAuth.role !== 'admin') {
      return;
    }

    // GUARD 3: Must have valid non-empty student list (never save 0 students)
    if (!classData || !Array.isArray(classData.students) || classData.students.length === 0) {
      return;
    }

    // Update LocalStorage cache once hydrated
    saveClassData(classData);

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (isRemoteUpdateRef.current) {
      // Updated from Firestore remote snapshot -> reset flag and don't push back
      isRemoteUpdateRef.current = false;
    } else {
      // Local change by Admin -> Push with 500ms debounce to Firestore Cloud
      if (!isFirestoreQuotaExceeded()) {
        setSyncStatus('syncing');
        debouncedSaveClassDataToCloud(currentDocId, classData, 500, (success) => {
          setSyncStatus(success ? 'synced' : 'unsynced');
        });
      }
    }
  }, [classData, currentDocId, userAuth.role, isFirestoreLoaded]);

  // Show Toast Notification
  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => {
      setNotificationMsg(null);
    }, 3500);
  };

  // Handle BGM toggle
  const handleToggleBgm = () => {
    const newState = sound.toggleBgm(!isBgmOn);
    setIsBgmOn(newState);
  };

  // Login / Logout Handlers
  const handleSuccessTeacherLogin = (auth: UserAuth) => {
    setUserAuth(auth);
    setIsTeacherLoginOpen(false);
    sound.playPointGain();
    sound.triggerConfetti();
    showToast('🔑 Đăng nhập Admin thành công!');
  };

  const handleTeacherLogout = () => {
    import('./lib/firebase').then(({ auth: fbAuth, signOut: fbSignOut }) => {
      fbSignOut(fbAuth).catch(() => {});
    });
    setUserAuth({ role: 'guest' });
    showToast('🔒 Đã đăng xuất. Bạn chuyển sang Chế độ Khách (Chỉ xem).');
  };

  // Change selected week and sync active student data
  const handleSelectWeek = (newWeek: string) => {
    setSelectedWeek(newWeek);

    try {
      const cloudHistory = classData.weeklyHistory || {};
      const weekData = findWeekDataInHistory(cloudHistory, newWeek);

      if (weekData) {
        if (Array.isArray(weekData)) {
          setClassData((prev) => ({ ...prev, students: weekData }));
        } else if (weekData && typeof weekData === 'object' && Array.isArray(weekData.studentRecords)) {
          setClassData((prev) => ({
            ...prev,
            students: prev.students.map((s) => {
              const rec = weekData.studentRecords.find(
                (r: any) => isSameStudentId(r.studentId ?? r.id, s.id)
              );
              return rec
                ? { ...s, points: rec.points, score: rec.points, speechCount: rec.speechCount || 0 }
                : { ...s };
            }),
          }));
        }
      }
      // SECTION IV REQUIREMENT:
      // If week data is NOT found in history, DO NOT reset students to 100 points!
      // Simply view the selected week without altering current student points/data.
    } catch {
      // Fallback
    }
  };

  // Add Point Log (Scoring)
  const handleAddPointLog = (
    studentId: string | number,
    pointsDelta: number,
    criteriaName: string,
    category: PointLog['category'],
    note?: string
  ) => {
    const studentStrId = String(studentId);

    setClassData((prev) => {
      // 1. Search target student using String ID comparison
      const targetStudent = prev.students.find((s) => isSameStudentId(s.id, studentStrId));

      if (!targetStudent) {
        console.warn(`[PointLog Guard] Student with ID ${studentId} not found.`);
        setTimeout(() => {
          showToast(`❌ Lỗi: Không tìm thấy học sinh ID ${studentId}! Giao dịch bị hủy.`);
        }, 0);
        return prev; // STOP transaction immediately!
      }

      const nowStr = new Date().toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      const isSpeechAction = criteriaName.toLowerCase().includes('phát biểu');

      const updatedStudents = prev.students.map((student) => {
        if (!isSameStudentId(student.id, studentStrId)) return student;

        const currentPts = student.points ?? student.score ?? 100;
        const newPoints = currentPts + pointsDelta;
        const totalPos = pointsDelta > 0 ? (student.totalPositive || 0) + pointsDelta : (student.totalPositive || 0);
        const totalNeg = pointsDelta < 0 ? (student.totalNegative || 0) + Math.abs(pointsDelta) : (student.totalNegative || 0);
        const newSpeechCount = isSpeechAction && pointsDelta > 0 ? (student.speechCount || 0) + 1 : (student.speechCount || 0);

        // Auto check badge unlocking
        const unlockedBadges = [...(student.badges || [])];
        prev.customBadges?.forEach((badge) => {
          if (!unlockedBadges.includes(badge.id) && newPoints >= badge.requiredPoints) {
            unlockedBadges.push(badge.id);
          }
        });

        // Deduction notes handling
        let updatedDeductionNotes = Array.isArray(student.deductionNotes) ? [...student.deductionNotes] : [];
        if (pointsDelta < 0) {
          const detailNote = note && note !== 'Cộng điểm nhanh' && note !== 'Ghi nhận từ điểm danh ngày'
            ? `${criteriaName} (${note})`
            : criteriaName;
          const noteEntry = `${detailNote} (${pointsDelta}đ)`;
          updatedDeductionNotes.push(noteEntry);
        }

        return {
          ...student,
          points: newPoints,
          score: newPoints, // Keep points and score identical!
          totalPositive: totalPos,
          totalNegative: totalNeg,
          speechCount: newSpeechCount,
          badges: unlockedBadges,
          deductionNotes: updatedDeductionNotes,
        };
      });

      const currentWeekKey = selectedWeek || 'Tuần 1';
      const updatedWeeklyHistory = {
        ...(prev.weeklyHistory || {}),
        [currentWeekKey]: updatedStudents,
      };

      const newLog: PointLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        studentId: String(targetStudent.id),
        studentName: targetStudent.name,
        points: pointsDelta,
        criteriaName,
        category,
        timestamp: nowStr,
        note,
      };

      const nextClassData: ClassData = {
        ...prev,
        students: updatedStudents,
        pointLogs: [newLog, ...(prev.pointLogs || [])],
        weeklyHistory: updatedWeeklyHistory,
      };

      // Immediate or short debounce save to cloud for admin
      if (isFirestoreLoaded && userAuth.role === 'admin' && !isFirestoreQuotaExceeded()) {
        debouncedSaveClassDataToCloud(currentDocId, nextClassData, 300, (success) => {
          setSyncStatus(success ? 'synced' : 'unsynced');
        });
      }

      return nextClassData;
    });
  };

  // Save Daily Attendance
  const handleSaveAttendance = (
    record: import('./types').DailyAttendanceRecord,
    showToastNotification: boolean = true
  ) => {
    setClassData((prev) => {
      const existingIdx = (prev.attendanceRecords || []).findIndex((r) => r.date === record.date);
      let updatedRecords = [...(prev.attendanceRecords || [])];
      if (existingIdx >= 0) {
        updatedRecords[existingIdx] = record;
      } else {
        updatedRecords.unshift(record);
      }
      return {
        ...prev,
        attendanceRecords: updatedRecords,
      };
    });
    if (showToastNotification) {
      showToast(`💾 Đã lưu dữ liệu điểm danh ngày ${record.date}`);
    }
  };

  // Deduct Points from Attendance toggle
  const handleDeductPointsForAttendance = (studentId: string, pointsDelta: number, reason: string) => {
    handleAddPointLog(studentId, pointsDelta, reason, 'ne_nep', 'Ghi nhận từ điểm danh ngày');
  };

  // Save Weekly Snapshot
  const handleSaveWeeklySnapshot = (snapshot: import('./types').WeeklySnapshot) => {
    setClassData((prev) => {
      const existingIdx = (prev.weeklySnapshots || []).findIndex((s) => s.weekNumber === snapshot.weekNumber);
      let updatedSnapshots = [...(prev.weeklySnapshots || [])];
      if (existingIdx >= 0) {
        updatedSnapshots[existingIdx] = snapshot;
      } else {
        updatedSnapshots.unshift(snapshot);
      }
      return {
        ...prev,
        weeklySnapshots: updatedSnapshots,
      };
    });
    showToast(`🏆 Đã tổng kết & lưu trữ dữ liệu Tuần ${snapshot.weekNumber}!`);
  };

  // Save Monthly Snapshot
  const handleSaveMonthlySnapshot = (snapshot: MonthlySnapshot) => {
    setClassData((prev) => {
      const existingSnapshots = prev.monthlySnapshots || [];
      const filteredSnapshots = existingSnapshots.filter((s) => s.monthKey !== snapshot.monthKey && s.id !== snapshot.id);
      const updatedSnapshots = [...filteredSnapshots, snapshot];

      const updatedMonthlyHistory = {
        ...(prev.monthlyHistory || {}),
        [snapshot.monthKey]: snapshot,
      };

      const nextData: ClassData = {
        ...prev,
        monthlySnapshots: updatedSnapshots,
        monthlyHistory: updatedMonthlyHistory,
      };

      saveClassData(nextData);
      if (isFirestoreLoaded && userAuth.role === 'admin' && !isFirestoreQuotaExceeded()) {
        debouncedSaveClassDataToCloud(currentDocId, nextData, 500);
      }

      return nextData;
    });
    showToast(`📅 Đã lưu kết quả xếp hạng ${snapshot.monthKey} lên Đám Mây Firestore!`);
  };

  // Delete / Unlock Weekly Snapshot
  const handleDeleteWeeklySnapshot = (weekNumber: number) => {
    setClassData((prev) => {
      const updatedSnapshots = (prev.weeklySnapshots || []).filter(
        (s) => Number(s.weekNumber) !== Number(weekNumber)
      );
      const newClassData = {
        ...prev,
        weeklySnapshots: updatedSnapshots,
      };
      saveClassData(newClassData);
      if (isFirestoreLoaded && userAuth.role === 'admin' && !isFirestoreQuotaExceeded()) {
        saveClassDataToCloud(currentDocId, newClassData);
      }
      return newClassData;
    });
    showToast(`🔓 Đã hủy chốt dữ liệu Tuần ${weekNumber}!`);
  };

  const handleSaveWeekDates = (newWeekDates: Record<number, { startDate?: string; endDate?: string }>) => {
    setClassData((prev) => ({
      ...prev,
      weekDates: newWeekDates,
    }));
    showToast('⚙️ Đã lưu mốc thời gian Tuần 1 - 35!');
  };

  // Save Classroom Seating Map (Instant Cloud Sync)
  const handleSaveSeatingMap = (newMap: Record<string, string | number>) => {
    setClassData((prev) => {
      const updatedData = {
        ...prev,
        seatingMap: newMap,
      };
      saveClassData(updatedData);
      if (isFirestoreLoaded && userAuth.role === 'admin' && !isFirestoreQuotaExceeded()) {
        saveClassDataToCloud(currentDocId, updatedData);
      }
      return updatedData;
    });
  };

  // Reset Weekly Points to 100
  const handleResetWeeklyPoints = () => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    if (
      confirm(
        'Bạn có chắc chắn muốn đặt lại 100 ĐIỂM BẮT ĐẦU TUẦN MỚI cho tất cả học sinh trong Lớp 6A3 không?'
      )
    ) {
      setClassData((prev) => ({
        ...prev,
        students: prev.students.map((s) => ({
          ...s,
          points: 100,
          totalPositive: 0,
          totalNegative: 0,
        })),
        pointLogs: [
          {
            id: `log_${Date.now()}`,
            studentId: 'system',
            studentName: 'Hệ Thống Lớp 6A3',
            points: 100,
            criteriaName: '🔄 Đặt lại 100 điểm bắt đầu tuần thi đua mới',
            category: 'hoc_tap',
            timestamp: new Date().toLocaleString('vi-VN'),
            note: 'Đặt lại tuần mới bởi Cô Quỳnh An',
          },
          ...prev.pointLogs,
        ],
      }));

      sound.playPointGain();
      sound.triggerConfetti();
      showToast('🎉 Đã đặt lại thành công 100 điểm cho toàn bộ học sinh tuần mới!');
    }
  };

  // Student CRUD
  const handleAddStudent = (
    newStudentData: Omit<Student, 'id' | 'points' | 'totalPositive' | 'totalNegative' | 'badges'>
  ) => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    setClassData((prev) => {
      const newStudent: Student = {
        ...newStudentData,
        id: `s_${Date.now()}`,
        points: 100,
        totalPositive: 0,
        totalNegative: 0,
        speechCount: 0,
        badges: [],
      };
      return {
        ...prev,
        students: [...prev.students, newStudent],
      };
    });

    showToast(`Thêm học sinh ${newStudentData.name} thành công!`);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    setClassData((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)),
    }));

    showToast(`Đã cập nhật thông tin ${updatedStudent.name}`);
  };

  const handleDeleteStudent = (studentId: string) => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    setClassData((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== studentId),
    }));

    showToast('Đã xóa học sinh khỏi danh sách lớp.');
  };

  // Team CRUD
  const handleUpdateTeam = (updatedTeam: Team) => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    setClassData((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)),
    }));

    showToast(`Đã cập nhật thông tin ${updatedTeam.name}`);
  };

  // Redeem Reward
  const handleRedeemReward = (studentId: string, rewardId: string) => {
    setClassData((prev) => {
      const reward = (prev.rewards || []).find((r) => r.id === rewardId);
      if (!reward) return prev;

      const nowStr = new Date().toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      const updatedStudents = prev.students.map((student) => {
        if (student.id !== studentId) return student;
        return {
          ...student,
          points: Math.max(0, student.points - reward.pointsCost),
        };
      });

      const targetStudent = updatedStudents.find((s) => s.id === studentId);

      const newRedemption = {
        id: `red_${Date.now()}`,
        studentId,
        studentName: targetStudent ? targetStudent.name : 'Học Sinh',
        rewardId,
        rewardTitle: reward.title,
        pointsUsed: reward.pointsCost,
        timestamp: nowStr,
        status: 'approved' as const,
      };

      return {
        ...prev,
        students: updatedStudents,
        redemptions: [newRedemption, ...prev.redemptions],
      };
    });

    sound.playPointGain();
    showToast('Đã đổi phần thưởng thành công!');
  };

  const handleAddReward = (newRewardData: Omit<Reward, 'id'>) => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    setClassData((prev) => ({
      ...prev,
      rewards: [...prev.rewards, { ...newRewardData, id: `r_${Date.now()}` }],
    }));

    showToast('Đã thêm phần thưởng mới vào cửa hàng!');
  };

  const handleAddCustomBadge = (newBadgeData: Omit<Badge, 'id'>) => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    setClassData((prev) => ({
      ...prev,
      customBadges: [...(prev.customBadges || []), { ...newBadgeData, id: `b_${Date.now()}` }],
    }));

    showToast('Đã tạo huy hiệu danh hiệu mới!');
  };

  const handleAwardBadgeToStudent = (studentId: string, badgeId: string) => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    setClassData((prev) => ({
      ...prev,
      students: prev.students.map((student) => {
        if (student.id !== studentId) return student;
        if (student.badges.includes(badgeId)) return student;
        return {
          ...student,
          badges: [...student.badges, badgeId],
        };
      }),
    }));

    sound.triggerConfetti();
    showToast('Đã trao huy hiệu danh dự cho học sinh!');
  };

  // Class Settings Update
  const handleUpdateSettings = (newSettings: ClassSettings) => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    setClassData((prev) => ({
      ...prev,
      settings: newSettings,
    }));

    showToast('Đã lưu cài đặt thông tin lớp!');
  };

  // School Rankings Update & Add
  const handleUpdateSchoolRankings = async (newRankings: import('./types').SchoolRanking[]) => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    const updatedData: ClassData = {
      ...classData,
      schoolRankings: newRankings,
    };

    setClassData(updatedData);
    saveClassData(updatedData);
    if (isFirestoreLoaded && userAuth.role === 'admin' && !isFirestoreQuotaExceeded()) {
      await saveClassDataToCloud(currentDocId, updatedData);
    }

    showToast('Đã cập nhật thứ hạng thi đua toàn trường!');
  };

  // School Rankings Delete
  const handleDeleteSchoolRanking = async (rankingId: string) => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    const updatedRankings = (classData.schoolRankings || []).filter((r) => r.id !== rankingId);
    const updatedData: ClassData = {
      ...classData,
      schoolRankings: updatedRankings,
    };

    // 1. Immediately update local React state
    setClassData(updatedData);

    // 2. Synchronously update LocalStorage
    saveClassData(updatedData);

    // 3. Immediately update Firestore Cloud & delete doc
    if (isFirestoreLoaded && userAuth.role === 'admin' && !isFirestoreQuotaExceeded()) {
      await deleteSchoolRankingFromCloud(currentDocId, rankingId, updatedData);
    }

    showToast('✅ Đã xóa kết quả thứ hạng.');
  };

  // Reset All Data to Sample Default
  const handleResetClassData = () => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    const defaultData = resetClassData();
    setClassData(defaultData);
    showToast('Đã khôi phục dữ liệu mẫu ban đầu cho Lớp 6A3!');
  };

  // Export / Import JSON
  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(classData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `VongNguyetQue_${classData.settings.className}_Backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (newData: ClassData) => {
    if (userAuth.role !== 'admin') {
      setIsTeacherLoginOpen(true);
      return;
    }

    setClassData(newData);
    saveClassData(newData);
    showToast('Nhập tệp dữ liệu backup thành công!');
  };

  const totalClassPoints = classData.students.reduce((sum, s) => sum + s.points, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-indigo-50/40 text-slate-800 font-sans antialiased p-3 sm:p-6 md:p-8 relative">
      
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-yellow-300 font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl border-2 border-yellow-400/60 animate-fadeIn flex items-center gap-2">
          <span>✨</span>
          <span>{notificationMsg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <HeaderBanner
          activeTab={activeTab}
          settings={classData.settings}
          userAuth={userAuth}
          isBgmOn={isBgmOn}
          isCloudConnected={isCloudConnected}
          isQuotaExceeded={isFirestoreQuotaExceeded()}
          syncStatus={syncStatus}
          onToggleBgm={handleToggleBgm}
          onOpenFullScoreModal={() => setIsFullScoreModalOpen(true)}
          onResetWeeklyPoints={handleResetWeeklyPoints}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
          onTeacherLogout={handleTeacherLogout}
          onSaveDataNotification={() => showToast('☁️ Dữ liệu lớp 6A3 đã tự động đồng bộ thành công')}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Main Workspace Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Left Menu Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleNavigateTab}
            studentCount={classData.students.length}
            totalPoints={totalClassPoints}
            userAuth={userAuth}
            onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
            onOpenQrModal={() => {
              if (userAuth.role !== 'admin') {
                setIsTeacherLoginOpen(true);
              } else {
                setIsQrModalOpen(true);
              }
            }}
            isMobileOpen={isMobileSidebarOpen}
            setIsMobileOpen={setIsMobileSidebarOpen}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            schoolName={classData.settings.schoolName}
          />

          {/* Right Main Content Panel */}
          <main className="flex-1 w-full min-w-0">
            {activeTab === 'home' && (
              <Dashboard
                students={classData.students}
                teams={classData.teams}
                settings={classData.settings}
                schoolRankings={classData.schoolRankings}
                userAuth={userAuth}
                onNavigateToScoring={() => handleNavigateTab('scoring')}
                onSelectStudent={(s) => setSelectedStudentForDetail(s)}
                onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
                onOpenRankingManager={() => handleNavigateTab('settings')}
              />
            )}

            {activeTab === 'students' && (
              <StudentManagement
                students={classData.students}
                teams={classData.teams}
                userAuth={userAuth}
                onAddStudent={handleAddStudent}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                onSelectStudent={(s) => setSelectedStudentForDetail(s)}
                onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
              />
            )}

            {activeTab === 'profile' && (
              <StudentProfiles
                students={classData.students}
                userAuth={userAuth}
                onUpdateStudent={handleUpdateStudent}
                onAddStudent={handleAddStudent}
                onDeleteStudent={handleDeleteStudent}
                onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
              />
            )}

            {activeTab === 'teams' && (
              <TeamCompetition
                teams={classData.teams}
                students={classData.students}
                onUpdateTeam={handleUpdateTeam}
                onSelectStudent={(s) => setSelectedStudentForDetail(s)}
              />
            )}

            {activeTab === 'scoring' && (
              <QuickScoring
                students={classData.students}
                teams={classData.teams}
                onAddPointLog={handleAddPointLog}
                pointLogs={classData.pointLogs}
                selectedWeek={selectedWeek}
                setSelectedWeek={handleSelectWeek}
                weeklyHistory={weeklyHistory}
                setWeeklyHistory={setWeeklyHistory}
                setStudents={(newStudents) => setClassData((prev) => ({ ...prev, students: newStudents }))}
              />
            )}

            {activeTab === 'attendance' && (
              <DailyAttendance
                students={classData.students}
                attendanceRecords={classData.attendanceRecords || []}
                userAuth={userAuth}
                settings={classData.settings}
                onSaveAttendance={handleSaveAttendance}
                onDeductPointsForAttendance={handleDeductPointsForAttendance}
                onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
              />
            )}

            {activeTab === 'summary' && (
              <WeeklySummary
                students={classData.students}
                weeklySnapshots={classData.weeklySnapshots || []}
                monthlySnapshots={classData.monthlySnapshots || []}
                monthlyHistory={classData.monthlyHistory || {}}
                userAuth={userAuth}
                settings={classData.settings}
                weekDates={classData.weekDates || {}}
                onSaveWeeklySnapshot={handleSaveWeeklySnapshot}
                onSaveMonthlySnapshot={handleSaveMonthlySnapshot}
                onDeleteWeeklySnapshot={handleDeleteWeeklySnapshot}
                onResetWeeklyPoints={handleResetWeeklyPoints}
                onSaveWeekDates={handleSaveWeekDates}
                onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
                selectedWeek={selectedWeek}
                setSelectedWeek={handleSelectWeek}
                weeklyHistory={weeklyHistory}
                setWeeklyHistory={setWeeklyHistory}
                setStudents={(newStudents) => setClassData((prev) => ({ ...prev, students: newStudents }))}
              />
            )}

            {activeTab === 'rules' && (
              <RulesAndCriteria
                criteriaList={classData.criteriaList || []}
                isAdmin={userAuth.role === 'admin'}
                onOpenScoring={() => handleNavigateTab('scoring')}
              />
            )}

            {activeTab === 'seating' && (
              <ClassroomSeating
                students={classData.students}
                teams={classData.teams}
                settings={classData.settings}
                seatingMap={classData.seatingMap}
                onSaveSeatingMap={handleSaveSeatingMap}
                onSelectStudent={(s) => setSelectedStudentForDetail(s)}
                isAdmin={userAuth.role === 'admin'}
              />
            )}

            {activeTab === 'settings' && (
              <ClassSettingsView
                settings={classData.settings}
                schoolRankings={classData.schoolRankings}
                userAuth={userAuth}
                onUpdateSettings={handleUpdateSettings}
                onUpdateRankings={handleUpdateSchoolRankings}
                onDeleteRanking={handleDeleteSchoolRanking}
                onResetClassData={handleResetClassData}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onOpenTeacherLogin={() => setIsTeacherLoginOpen(true)}
              />
            )}
          </main>
        </div>

        {/* Full Class Score Table Modal */}
        {isFullScoreModalOpen && (
          <FullClassScoreModal
            students={classData.students}
            teams={classData.teams}
            settings={classData.settings}
            onClose={() => setIsFullScoreModalOpen(false)}
            onSelectStudent={(s) => setSelectedStudentForDetail(s)}
          />
        )}

        {/* Student Detail Modal */}
        {selectedStudentForDetail && (
          <StudentDetailModal
            student={selectedStudentForDetail}
            teams={classData.teams}
            pointLogs={classData.pointLogs}
            badges={classData.customBadges || []}
            onClose={() => setSelectedStudentForDetail(null)}
          />
        )}

        {/* QR Code Modal for Parents / Guest access */}
        {isQrModalOpen && (
          <QRCodeModal
            classId={currentDocId}
            schoolYear={classData.settings.schoolYear || '2025-2026'}
            classNameTitle={classData.settings.className}
            teacherName={classData.settings.teacherName}
            onClose={() => setIsQrModalOpen(false)}
          />
        )}

        {/* Teacher Login Auth Modal */}
        {isTeacherLoginOpen && (
          <TeacherLoginModal
            onSuccessLogin={handleSuccessTeacherLogin}
            onClose={() => setIsTeacherLoginOpen(false)}
            targetEmail={classData.settings.teacherEmail || 'quynhan9942@gmail.com'}
            teacherName={classData.settings.teacherName || 'Cô Quỳnh An'}
          />
        )}
      </div>
    </div>
  );
}

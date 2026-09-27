import React, { useState, useEffect } from 'react';
import { Student, Team, ClassSettings } from '../types';
import { ChibiAvatar } from './ChibiAvatar';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  Search,
  Download,
  Loader2,
  Sparkles,
  Filter,
  Plus,
  X,
  RotateCcw,
  UserCheck,
  UserX,
  Shuffle,
  DoorOpen,
  Presentation,
  User,
  Check,
  GripVertical,
  ExternalLink
} from 'lucide-react';
import { getConductRank, getConductRankInfo } from '../utils/conduct';

interface ClassroomSeatingProps {
  students: Student[];
  teams: Team[];
  settings?: ClassSettings;
  seatingMap?: Record<string, string | number>;
  onSaveSeatingMap?: (map: Record<string, string | number>) => void;
  onSelectStudent: (student: Student) => void;
  isAdmin?: boolean;
}

const STORAGE_KEY = 'vong_nguyet_que_6a3_seating';

// Standard layout: 4 Clusters (Dãy/Cụm bàn), 6 Desks per cluster (Bàn), 2 Seats per desk (Bàn đôi - 2 học sinh)
const TOTAL_CLUSTERS = 4;
const DESKS_PER_CLUSTER = 6;
const SEATS_PER_DESK = 2;

export const ClassroomSeating: React.FC<ClassroomSeatingProps> = ({
  students,
  teams,
  settings,
  seatingMap: propSeatingMap,
  onSaveSeatingMap,
  onSelectStudent,
  isAdmin = false,
}) => {
  const className = settings?.className || '6A3';
  const teacherName = settings?.teacherName || 'Lê Thị Quỳnh An';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');

  // seatingMap maps seatId (e.g. 'c1_b1_g1') to studentId (string | number)
  const [internalSeatingMap, setInternalSeatingMap] = useState<Record<string, string | number>>({});
  const seatingMap = propSeatingMap !== undefined ? propSeatingMap : internalSeatingMap;

  // Drag and drop states
  const [draggedStudentId, setDraggedStudentId] = useState<string | number | null>(null);
  const [draggedFromSeatKey, setDraggedFromSeatKey] = useState<string | null>(null);
  const [dragOverSeatKey, setDragOverSeatKey] = useState<string | null>(null);

  // Modal state for selecting a student for a specific seat on mobile/click
  const [targetSeatId, setTargetSeatId] = useState<string | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    url?: string;
    pngUrl?: string;
    fileName?: string;
  } | null>(null);

  // 1. Load or initialize seatingMap on mount ONLY IF propSeatingMap is undefined
  useEffect(() => {
    // If propSeatingMap is defined (even if {} when cleared/reset), keep propSeatingMap as Cloud source of truth
    if (propSeatingMap !== undefined) {
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setInternalSeatingMap(parsed);
          if (isAdmin) {
            onSaveSeatingMap?.(parsed);
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load seating map from localStorage:', e);
    }

    // Default initialization: Group students by team into corresponding desk clusters
    const defaultMap: Record<string, string | number> = {};
    const teamOrder = ['to_1', 'to_2', 'to_3', 'to_4'];

    teamOrder.forEach((teamId, cIdx) => {
      const teamStudents = students.filter((s) => s.teamId === teamId);
      let sIdx = 0;
      for (let b = 1; b <= DESKS_PER_CLUSTER; b++) {
        for (let g = 1; g <= SEATS_PER_DESK; g++) {
          if (sIdx < teamStudents.length) {
            const seatKey = `c${cIdx + 1}_b${b}_g${g}`;
            defaultMap[seatKey] = teamStudents[sIdx].id;
            sIdx++;
          }
        }
      }
    });

    setInternalSeatingMap(defaultMap);
    if (isAdmin) {
      onSaveSeatingMap?.(defaultMap);
    }
  }, [students, propSeatingMap, isAdmin]);

  // Helper to save map
  const saveMap = (newMap: Record<string, string | number>) => {
    setInternalSeatingMap(newMap);
    onSaveSeatingMap?.(newMap);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
    } catch (e) {
      console.error('Failed to save seating map:', e);
    }
  };

  // Find student assigned to a seat
  const getStudentInSeat = (seatId: string): Student | undefined => {
    const studentId = seatingMap[seatId];
    if (studentId === undefined || studentId === null) return undefined;
    return students.find((s) => String(s.id) === String(studentId));
  };

  // Find seat ID for a given student
  const getSeatOfStudent = (studentId: string | number): string | undefined => {
    return Object.keys(seatingMap).find(
      (key) => String(seatingMap[key]) === String(studentId)
    );
  };

  // Assign student to seat (removes student from former seat if any)
  const handleAssignStudent = (seatId: string, studentId: string | number) => {
    if (!isAdmin) return;
    const newMap = { ...seatingMap };

    // Remove student from previous seat
    Object.keys(newMap).forEach((key) => {
      if (String(newMap[key]) === String(studentId)) {
        delete newMap[key];
      }
    });

    // Assign to new seat
    newMap[seatId] = studentId;
    saveMap(newMap);
    setTargetSeatId(null);
  };

  // Remove student from a seat
  const handleRemoveFromSeat = (e: React.MouseEvent, seatId: string) => {
    e.stopPropagation();
    if (!isAdmin) return;
    const newMap = { ...seatingMap };
    delete newMap[seatId];
    saveMap(newMap);
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (
    e: React.DragEvent,
    studentId: string | number,
    sourceSeatKey?: string
  ) => {
    if (!isAdmin) return;
    setDraggedStudentId(studentId);
    setDraggedFromSeatKey(sourceSeatKey || null);
    e.dataTransfer.setData('text/plain', String(studentId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetSeatKey: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSeatKey !== targetSeatKey) {
      setDragOverSeatKey(targetSeatKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetSeatKey: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    if (dragOverSeatKey === targetSeatKey) {
      setDragOverSeatKey(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetSeatKey: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    setDragOverSeatKey(null);

    const studentIdStr = e.dataTransfer.getData('text/plain') || String(draggedStudentId);
    if (!studentIdStr) return;

    const sourceStudentId = studentIdStr;
    const targetSeatCurrentStudent = getStudentInSeat(targetSeatKey);

    const newMap = { ...seatingMap };

    if (draggedFromSeatKey) {
      // Swapping or moving from another seat
      if (targetSeatCurrentStudent) {
        // Swap positions
        newMap[draggedFromSeatKey] = targetSeatCurrentStudent.id;
      } else {
        delete newMap[draggedFromSeatKey];
      }
      newMap[targetSeatKey] = sourceStudentId;
    } else {
      // Placing from unassigned drawer
      Object.keys(newMap).forEach((key) => {
        if (String(newMap[key]) === String(sourceStudentId)) {
          delete newMap[key];
        }
      });
      newMap[targetSeatKey] = sourceStudentId;
    }

    saveMap(newMap);
    setDraggedStudentId(null);
    setDraggedFromSeatKey(null);
  };

  // Random Shuffle All Students
  const handleRandomShuffle = () => {
    if (!isAdmin) return;
    if (!students || students.length === 0) return;

    // Clone all students currently in the class
    const shuffledStudents = [...students];

    // Fisher-Yates Shuffle
    for (let i = shuffledStudents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledStudents[i], shuffledStudents[j]] = [shuffledStudents[j], shuffledStudents[i]];
    }

    const newMap: Record<string, string | number> = {};
    let sIdx = 0;

    // Fill all 48 available seats in order (4 clusters x 6 desks x 2 seats)
    for (let c = 1; c <= TOTAL_CLUSTERS; c++) {
      for (let b = 1; b <= DESKS_PER_CLUSTER; b++) {
        for (let g = 1; g <= SEATS_PER_DESK; g++) {
          if (sIdx < shuffledStudents.length) {
            const seatKey = `c${c}_b${b}_g${g}`;
            newMap[seatKey] = shuffledStudents[sIdx].id;
            sIdx++;
          }
        }
      }
    }

    saveMap(newMap);
  };

  // Auto-arrange all students by team
  const handleAutoArrangeByTeam = () => {
    if (!isAdmin) return;
    if (!students || students.length === 0) return;

    const defaultMap: Record<string, string | number> = {};
    const teamOrder = ['to_1', 'to_2', 'to_3', 'to_4'];

    teamOrder.forEach((teamId, cIdx) => {
      const teamStudents = students.filter((s) => s.teamId === teamId);
      let sIdx = 0;
      for (let b = 1; b <= DESKS_PER_CLUSTER; b++) {
        for (let g = 1; g <= SEATS_PER_DESK; g++) {
          if (sIdx < teamStudents.length) {
            const seatKey = `c${cIdx + 1}_b${b}_g${g}`;
            defaultMap[seatKey] = teamStudents[sIdx].id;
            sIdx++;
          }
        }
      }
    });

    saveMap(defaultMap);
  };

  // Clear all seats
  const handleClearAllSeats = () => {
    if (!isAdmin) return;
    saveMap({});
  };

  // Tự động tạo và tải xuống file PDF sơ đồ lớp (A4 Ngang) bằng html-to-image
  const handleDownloadPDF = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isExportingPDF) return;

    let exportDiv: HTMLDivElement | null = null;

    try {
      setIsExportingPDF(true);
      setPdfNotice(null);

      // Tạo container tạm thời chuyên dụng cho PDF (dùng position: absolute để không bị xén theo viewport màn hình)
      exportDiv = document.createElement('div');
      exportDiv.style.position = 'absolute';
      exportDiv.style.top = '0';
      exportDiv.style.left = '0';
      exportDiv.style.width = '1280px';
      exportDiv.style.minWidth = '1280px';
      exportDiv.style.maxWidth = 'none';
      exportDiv.style.backgroundColor = '#ffffff';
      exportDiv.style.color = '#0f172a';
      exportDiv.style.padding = '24px';
      exportDiv.style.zIndex = '999999';
      exportDiv.style.display = 'block';
      exportDiv.style.visibility = 'visible';
      exportDiv.style.opacity = '1';
      exportDiv.style.boxSizing = 'border-box';
      exportDiv.style.overflow = 'visible';
      exportDiv.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

      // Xây dựng bố cục 4 Cụm bàn chuẩn A4 Ngang
      let clustersHTML = '';
      for (let c = 1; c <= TOTAL_CLUSTERS; c++) {
        const team = teams[c - 1];
        const teamName = team?.name || `Tổ ${c}`;

        let desksHTML = '';
        for (let b = DESKS_PER_CLUSTER; b >= 1; b--) {
          let seatsHTML = '';
          for (let g = 1; g <= SEATS_PER_DESK; g++) {
            const seatKey = `c${c}_b${b}_g${g}`;
            const student = getStudentInSeat(seatKey);
            const seatLabel = g === 1 ? 'Ô A' : 'Ô B';

            if (student) {
              const rank = getConductRank(student.points, student.speechCount || 0);
              const rankInfo = getConductRankInfo(rank);
              seatsHTML += `
                <div style="background-color: #fef3c7; border: 1.5px solid #f59e0b; border-radius: 8px; padding: 4px 6px; display: flex; flex-direction: column; justify-content: space-between; min-height: 52px; box-sizing: border-box;">
                  <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9px; font-weight: 800; color: #78350f;">
                    <span>${seatLabel}</span>
                    <span style="background-color: #fde68a; padding: 1px 4px; border-radius: 4px; color: #92400e; font-weight: 900;">#${student.id}</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 900; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
                    ${student.name}
                  </div>
                  <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9px; margin-top: 2px; font-weight: 700;">
                    <span style="color: #b45309;">${student.points}đ</span>
                    <span style="background-color: #e0e7ff; color: #3730a3; padding: 0px 4px; border-radius: 4px; font-size: 8px; font-weight: 800;">${rankInfo.label}</span>
                  </div>
                </div>
              `;
            } else {
              seatsHTML += `
                <div style="background-color: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 4px 6px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 52px; box-sizing: border-box;">
                  <span style="font-size: 9px; font-weight: 700; color: #94a3b8;">${seatLabel} (Trống)</span>
                </div>
              `;
            }
          }

          desksHTML += `
            <div style="background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 6px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
              <div style="font-size: 9px; font-weight: 900; color: #475569; background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px; border: 1px solid #e2e8f0;">
                📌 Bàn ${b}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                ${seatsHTML}
              </div>
            </div>
          `;
        }

        clustersHTML += `
          <div style="background-color: #f8fafc; border: 2px solid #cbd5e1; border-radius: 14px; padding: 10px; box-sizing: border-box;">
            <div style="background-color: #1e293b; color: #ffffff; padding: 6px 8px; border-radius: 8px; text-align: center; margin-bottom: 10px;">
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">CỤM BÀN ${c}</div>
              <div style="font-size: 12px; font-weight: 900; color: #facc15; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${teamName}</div>
            </div>
            <div>
              ${desksHTML}
            </div>
          </div>
        `;
      }

      const currentDateStr = new Date().toLocaleDateString('vi-VN');

      exportDiv.innerHTML = `
        <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; margin: 0;">
              SƠ ĐỒ LỚP HỌC
            </h1>
            <div style="margin-top: 6px; display: flex; align-items: center; gap: 12px; font-size: 12px; font-weight: 800;">
              <span style="background-color: #fef3c7; color: #78350f; padding: 3px 10px; border-radius: 8px; border: 1px solid #fde68a;">
                LỚP: <strong>${className}</strong>
              </span>
              <span style="background-color: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 8px; border: 1px solid #c7d2fe;">
                GVCN: <strong>${teacherName}</strong>
              </span>
              <span style="background-color: #f1f5f9; color: #334155; padding: 3px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                Sĩ số: ${students.length} HS (Đã xếp: ${seatedStudentIds.size}/${students.length})
              </span>
            </div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b; font-weight: 700;">
            <div>Ngày xuất: ${currentDateStr}</div>
            <div style="margin-top: 2px; color: #475569; font-weight: 800;">Hệ thống Quản lý Lớp học</div>
          </div>
        </div>

        <!-- 4 CỤM BÀN GRID -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
          ${clustersHTML}
        </div>

        <!-- KHU VỰC PHÍA DƯỚI BÀN HỌC (LỐI VÀO | BẢNG LỚP HỌC | BÀN GIÁO VIÊN) -->
        <div style="margin-top: 14px; padding-top: 10px; border-top: 2px dashed #cbd5e1; display: grid; grid-template-columns: 3fr 6fr 3fr; gap: 12px; align-items: center;">
          <div style="background-color: #fffbeb; border: 1.5px dashed #d97706; border-radius: 10px; padding: 8px; text-align: center; color: #78350f; font-size: 10px; font-weight: 900; text-transform: uppercase;">
            🚪 LỐI VÀO
          </div>
          <div style="background-color: #1e293b; color: #ffffff; border-radius: 10px; padding: 8px; text-align: center; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
            📺 BẢNG LỚP HỌC
          </div>
          <div style="background-color: #312e81; color: #facc15; border-radius: 10px; padding: 8px; text-align: center; font-size: 10px; font-weight: 900; text-transform: uppercase;">
            🧑‍🏫 BÀN GIÁO VIÊN
          </div>
        </div>
      `;

      document.body.appendChild(exportDiv);

      // Chờ nhỏ 250ms để trình duyệt render DOM đầy đủ
      await new Promise((resolve) => setTimeout(resolve, 250));

      const targetWidth = 1280;
      const targetHeight = Math.max(800, exportDiv.scrollHeight);

      // Capture thành ảnh PNG bằng html-to-image với kích thước cố định chuẩn không phụ thuộc viewport
      const imgData = await toPng(exportDiv, {
        quality: 0.98,
        pixelRatio: 2,
        width: targetWidth,
        height: targetHeight,
        canvasWidth: targetWidth * 2,
        canvasHeight: targetHeight * 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'none',
          position: 'absolute',
          left: '0',
          top: '0',
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
          maxWidth: 'none',
          maxHeight: 'none',
          overflow: 'visible',
          margin: '0',
        },
      });

      if (!imgData || imgData === 'data:,' || imgData.length < 100) {
        throw new Error('Ảnh PNG tạo ra bị rỗng hoặc không hợp lệ.');
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 297mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm

      const margin = 8;
      const maxWidth = pdfWidth - margin * 2;
      const maxHeight = pdfHeight - margin * 2;

      const imgProps = pdf.getImageProperties(imgData);
      let width = maxWidth;
      let height = (imgProps.height * width) / imgProps.width;

      if (height > maxHeight) {
        height = maxHeight;
        width = (imgProps.width * height) / imgProps.height;
      }

      const x = (pdfWidth - width) / 2;
      const y = (pdfHeight - height) / 2;

      pdf.addImage(imgData, 'PNG', x, y, width, height);

      const cleanClassName = (className || '6A3').trim().replace(/[^a-zA-Z0-9À-ỹ_]/g, '');
      const fileName = `SoDoLop_${cleanClassName || '6A3'}.pdf`;

      // 1. Tạo PDF dưới dạng Blob & Blob URL
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      // 2. Kích hoạt tải file bằng <a> download
      let downloadAttempted = false;
      try {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        downloadAttempted = true;
      } catch (linkErr) {
        console.warn('Không thể tự động tải file trực tiếp:', linkErr);
      }

      // 3. Hiển thị thông báo React UI trên màn hình kèm Link Tải PDF & Tải Ảnh
      setPdfNotice({
        type: downloadAttempted ? 'success' : 'warning',
        message: `Đã xuất xong sơ đồ lớp học thành công (${fileName}).`,
        url: blobUrl,
        pngUrl: imgData,
        fileName: fileName,
      });

      // Giải phóng URL.revokeObjectURL sau 2 phút
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 120000);
    } catch (err: any) {
      console.error('Lỗi khi xuất file PDF Sơ Đồ Lớp:', err);
      const errMsg = err?.message || String(err);
      setPdfNotice({
        type: 'error',
        message: `Không thể tạo file PDF (${errMsg}). Vui lòng mở ứng dụng ở tab mới hoặc thử lại.`,
      });
    } finally {
      if (exportDiv && document.body.contains(exportDiv)) {
        document.body.removeChild(exportDiv);
      }
      setIsExportingPDF(false);
    }
  };

  // Unassigned students list
  const seatedStudentIds = new Set(
    Object.values(seatingMap).map((id) => String(id))
  );
  const unseatedStudents = students.filter(
    (s) => !seatedStudentIds.has(String(s.id))
  );

  // Target seat details formatting
  const getSeatLabel = (seatKey: string) => {
    const match = seatKey.match(/^c(\d+)_b(\d+)_g(\d+)$/);
    if (!match) return seatKey;
    const [, cluster, desk, seat] = match;
    return `Cụm ${cluster} • Bàn ${desk} • Ô ${seat === '1' ? 'Trái (A)' : 'Phải (B)'}`;
  };

  return (
    <div id="printable-seating-root" className="space-y-6 animate-fadeIn pb-12 print:p-0 print:space-y-4">
      {/* Printable CSS Styles */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 6mm;
        }
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-seating-root, #printable-seating-root * {
            visibility: visible !important;
          }
          #printable-seating-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print-desk-box {
            border: 1.5px solid #000000 !important;
            background-color: #ffffff !important;
          }
          .print-cell-box {
            border: 1px solid #000000 !important;
            background-color: #ffffff !important;
          }
        }
      `}</style>

      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & TITLE (SƠ ĐỒ LỚP HỌC - LỚP - GVCN) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:border-none print:shadow-none print:p-0 print:mb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight print:text-black print:text-2xl">
            SƠ ĐỒ LỚP HỌC
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-extrabold text-slate-800 print:text-black print:mt-1">
            <span className="bg-amber-100 text-amber-950 px-3.5 py-1 rounded-xl border border-amber-300 print:bg-transparent print:border-none print:p-0">
              LỚP: <strong className="text-amber-900 font-black print:text-black">{className}</strong>
            </span>
            <span className="text-slate-300 print:hidden">•</span>
            <span className="bg-indigo-100 text-indigo-950 px-3.5 py-1 rounded-xl border border-indigo-300 print:bg-transparent print:border-none print:p-0">
              GVCN: <strong className="text-indigo-900 font-black print:text-black">{teacherName}</strong>
            </span>
            <span className="text-slate-300 print:hidden">•</span>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 print:text-black print:bg-transparent print:border-none print:p-0">
              Sĩ số: {students.length} Học sinh (Đã xếp: {seatedStudentIds.size}/{students.length})
            </span>
          </div>
        </div>

        {/* Header Action Buttons (Hidden when printing) */}
        <div className="flex flex-wrap items-center gap-2 print:hidden w-full md:w-auto">
          {/* Admin Seating Action Buttons */}
          {isAdmin && (
            <>
              {/* Nút Xếp ngẫu nhiên */}
              <button
                type="button"
                onClick={handleRandomShuffle}
                className="px-3.5 py-2.5 bg-purple-900 hover:bg-purple-950 text-amber-300 font-black text-xs rounded-2xl shadow transition-all active:scale-95 flex items-center gap-1.5 border border-purple-700 shrink-0 cursor-pointer"
                title="Tự động xáo trộn ngẫu nhiên tất cả học sinh"
              >
                <Shuffle className="w-4 h-4 text-amber-300" />
                <span>𔗫 Xếp chỗ ngẫu nhiên</span>
              </button>

              {/* Nút Xếp theo Tổ */}
              <button
                type="button"
                onClick={handleAutoArrangeByTeam}
                className="px-3 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-black text-xs rounded-2xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5 border border-amber-300 shrink-0 cursor-pointer"
                title="Xếp lại vị trí phân chia theo 4 Tổ thi đua"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>⚡ Xếp theo Tổ</span>
              </button>

              {/* Nút Đặt lại */}
              <button
                type="button"
                onClick={handleClearAllSeats}
                className="px-3 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-900 font-black text-xs rounded-2xl shadow-sm transition-all active:scale-95 flex items-center gap-1 border border-rose-300 shrink-0 cursor-pointer"
                title="Xóa tất cả vị trí ghế"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                <span>Đặt lại</span>
              </button>
            </>
          )}

          {/* Nút Tải Sơ Đồ Lớp */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="px-4 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-black text-xs rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 border border-indigo-700 shrink-0 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
            title="Tải sơ đồ lớp học ra file PDF (Khổ A4 Ngang)"
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                <span>Đang tạo PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-amber-300" />
                <span>⬇️ Tải Sơ Đồ Lớp</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PDF Download Feedback & Fallback Banner */}
      {pdfNotice && (
        <div
          className={`p-4 rounded-2xl border shadow-md flex flex-wrap items-center justify-between gap-3 animate-fadeIn print:hidden ${
            pdfNotice.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl text-white ${
                pdfNotice.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              {pdfNotice.type === 'error' ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-extrabold">{pdfNotice.message}</div>
              <div className="text-xs font-semibold opacity-80">
                {pdfNotice.type === 'error'
                  ? 'Vui lòng kiểm tra lại kết nối hoặc thử mở ứng dụng ở tab mới.'
                  : 'Nếu trình duyệt/Preview không tự động tải file, bạn có thể chọn thao tác bên dưới:'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pdfNotice.url && (
              <>
                <a
                  href={pdfNotice.url}
                  download={pdfNotice.fileName || 'SoDoLop.pdf'}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải File PDF</span>
                </a>
                {pdfNotice.pngUrl && (
                  <a
                    href={pdfNotice.pngUrl}
                    download={pdfNotice.fileName ? pdfNotice.fileName.replace('.pdf', '.png') : 'SoDoLop.png'}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải File Ảnh PNG</span>
                  </a>
                )}
                <a
                  href={pdfNotice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-amber-300" />
                  <span>Mở PDF Tab Mới</span>
                </a>
              </>
            )}
            <button
              type="button"
              onClick={() => setPdfNotice(null)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Summary Badges (Hidden when printing) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl font-black">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-emerald-800">Đã Được Xếp Chỗ</div>
            <div className="text-lg font-black text-emerald-950">
              {seatedStudentIds.size} / {students.length} Học sinh
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl font-black">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-amber-800">Chưa Có Chỗ Ngồi</div>
            <div className="text-lg font-black text-amber-950">
              {unseatedStudents.length} Học sinh
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-600">Sơ Đồ Bàn Học Sinh</div>
            <div className="text-lg font-black text-slate-900">4 Cụm Bàn • 48 Chỗ Ngồi</div>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
            Còn trống {48 - seatedStudentIds.size} chỗ
          </span>
        </div>
      </div>

      {/* Search & Filter Controls (Hidden when printing) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc số thứ tự..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 shrink-0">Lọc Theo Tổ:</span>
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="bg-amber-50 border border-amber-200 text-amber-950 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="all">Tất cả các Tổ</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Unassigned Students Quick Drawer (Drag & Drop or Click to place - Hidden when printing) */}
      {unseatedStudents.length > 0 && (
        <div className="bg-amber-50/80 rounded-2xl p-4 border-2 border-amber-300 print:hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
              <span>🌱 Danh sách chưa có chỗ ngồi ({unseatedStudents.length} HS)</span>
              <span className="text-[10px] font-normal text-amber-800 normal-case">(Kéo thả học sinh vào ô bàn mong muốn):</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
            {unseatedStudents
              .filter(
                (s) =>
                  (searchTerm === '' ||
                    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    String(s.id).includes(searchTerm)) &&
                  (selectedTeamFilter === 'all' || s.teamId === selectedTeamFilter)
              )
              .map((student) => (
                <div
                  key={`unseated_drawer_${student.id}`}
                  draggable={isAdmin}
                  onDragStart={(e) => handleDragStart(e, student.id)}
                  className={`bg-white border-2 border-amber-300 hover:border-amber-500 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm ${
                    isAdmin ? 'cursor-grab active:cursor-grabbing hover:bg-amber-100/60' : 'cursor-default'
                  } transition-all text-slate-900`}
                >
                  {isAdmin && <GripVertical className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  <span className="font-extrabold text-xs">#{student.id}</span>
                  <span className="font-bold text-xs truncate max-w-[120px]">{student.name}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. STUDENT DESKS GRID (KHU VỰC BÀN HỌC SINH - 4 CỤM BÀN) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-50 rounded-3xl p-4 sm:p-6 border-2 border-slate-300 shadow-sm overflow-x-auto print:bg-white print:border-none print:p-0 print:shadow-none">
        <div className="min-w-[850px] print:min-w-full">
          {/* 4 CỤM BÀN THEO CHIỀU NGANG */}
          <div className="grid grid-cols-4 gap-4 sm:gap-6 print:grid-cols-4 print:gap-3">
            {[1, 2, 3, 4].map((clusterNum) => {
              const team = teams[clusterNum - 1];

              return (
                <div
                  key={`cluster_${clusterNum}`}
                  className="bg-white rounded-2xl p-3 border-2 border-slate-300 shadow-sm flex flex-col space-y-3 print:border-2 print:border-slate-800 print:shadow-none print:rounded-lg print-desk-box"
                >
                  {/* Cluster Header */}
                  <div className="bg-slate-800 text-white rounded-xl p-2 text-center shadow-sm print:bg-slate-200 print:text-black print:border print:border-slate-800">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-300 print:text-slate-800">
                      CỤM BÀN {clusterNum}
                    </div>
                    <div className="font-black text-xs sm:text-sm truncate mt-0.5">
                      {team?.name || `Tổ ${clusterNum}`}
                    </div>
                  </div>

                  {/* 6 Desks in Cluster (Nhiều hàng bàn theo chiều dọc: Bàn 6 ở trên cùng, Bàn 1 ở dưới cùng) */}
                  <div className="space-y-3 flex-1">
                    {[6, 5, 4, 3, 2, 1].map((deskNum) => (
                      <div
                        key={`cluster_${clusterNum}_desk_${deskNum}`}
                        className="bg-slate-50/90 rounded-xl p-2 border-2 border-slate-300 shadow-xs relative print:bg-white print:border-2 print:border-slate-700 print:rounded-md"
                      >
                        {/* Desk Header Badge */}
                        <div className="text-[9px] font-black text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md w-max mb-1.5 flex items-center gap-1 border border-slate-300 print:bg-slate-100 print:text-black">
                          <span>📌 Bàn {deskNum}</span>
                        </div>

                        {/* Each Desk Divided into 2 Equal Cells (2 ô bằng nhau = 2 HS) */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {[1, 2].map((seatNum) => {
                            const seatKey = `c${clusterNum}_b${deskNum}_g${seatNum}`;
                            const student = getStudentInSeat(seatKey);
                            const isOver = dragOverSeatKey === seatKey;

                            const isMatched =
                              !student ||
                              ((searchTerm === '' ||
                                student.name
                                  .toLowerCase()
                                  .includes(searchTerm.toLowerCase()) ||
                                String(student.id).includes(searchTerm)) &&
                                (selectedTeamFilter === 'all' ||
                                  student.teamId === selectedTeamFilter));

                            const rank = student
                              ? getConductRank(student.points, student.speechCount || 0)
                              : null;
                            const rankInfo = rank ? getConductRankInfo(rank) : null;

                            return (
                              <div
                                key={seatKey}
                                onDragOver={(e) => handleDragOver(e, seatKey)}
                                onDragLeave={(e) => handleDragLeave(e, seatKey)}
                                onDrop={(e) => handleDrop(e, seatKey)}
                                onClick={() => {
                                  if (!student && isAdmin) {
                                    setTargetSeatId(seatKey);
                                  }
                                }}
                                className={`min-h-[85px] rounded-lg p-1.5 border-2 transition-all flex flex-col justify-between relative ${
                                  isOver
                                    ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-400'
                                    : student
                                    ? isMatched
                                      ? 'bg-amber-50/90 border-amber-400 shadow-xs hover:border-amber-500'
                                      : 'bg-slate-100 border-slate-200 opacity-40'
                                    : isAdmin
                                    ? 'bg-white border-dashed border-slate-300 hover:border-amber-400 cursor-pointer'
                                    : 'bg-white border-dashed border-slate-200'
                                } print:min-h-[65px] print:bg-white print:border-slate-800 print-cell-box`}
                              >
                                {/* Seat Label & ID */}
                                <div className="flex items-center justify-between text-[9px] font-extrabold text-slate-500 print:text-black">
                                  <span>Ô {seatNum === 1 ? 'A' : 'B'}</span>
                                  {student && (
                                    <span className="font-black text-slate-800 bg-amber-200/90 px-1 py-0.2 rounded print:bg-slate-200 print:text-black">
                                      #{student.id}
                                    </span>
                                  )}
                                </div>

                                {student ? (
                                  /* OCCUPIED SEAT CELL */
                                  <div
                                    draggable={isAdmin}
                                    onDragStart={(e) => handleDragStart(e, student.id, seatKey)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectStudent(student);
                                    }}
                                    className={`${
                                      isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                    } my-1 relative group`}
                                  >
                                    {/* Remove Button 'X' (Admin Only) */}
                                    {isAdmin && (
                                      <button
                                        onClick={(e) => handleRemoveFromSeat(e, seatKey)}
                                        className="absolute -top-1 -right-1 p-0.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow transition-all active:scale-90 z-10 print:hidden"
                                        title="Gỡ học sinh"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}

                                    <div className="flex items-center gap-1.5">
                                      <div className="print:hidden">
                                        <ChibiAvatar
                                          gender={student.gender}
                                          styleIndex={student.avatarStyle}
                                          avatarUrl={student.avatarUrl || student.photoUrl}
                                          size="sm"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-black text-[11px] text-slate-900 truncate print:text-black print:text-[10px]">
                                          {student.name}
                                        </div>
                                        <div className="text-[9px] text-slate-600 font-semibold flex items-center gap-1 print:text-slate-800">
                                          <span>{student.points}đ</span>
                                          <span className="print:hidden">•</span>
                                          <span className="print:hidden">{student.speechCount || 0} PB</span>
                                        </div>
                                      </div>
                                    </div>

                                    {rankInfo && (
                                      <div className="mt-0.5 print:hidden">
                                        <span
                                          className={`inline-block text-[8px] font-black px-1.5 py-0.2 rounded-full border ${rankInfo.color}`}
                                        >
                                          {rankInfo.label}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* EMPTY SEAT CELL */
                                  <div className="flex-1 flex flex-col items-center justify-center text-center p-1">
                                    <span className="text-[10px] font-bold text-slate-400 print:text-slate-600">Trống</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTargetSeatId(seatKey);
                                      }}
                                      className="mt-1 px-1.5 py-0.5 bg-amber-400 hover:bg-amber-500 text-purple-950 font-black text-[9px] rounded shadow-xs transition-all flex items-center gap-0.5 active:scale-95 print:hidden"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      <span>Xếp chỗ</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 3. AREA BELOW DESKS (LỐI VÀO | BẢNG | BÀN GIÁO VIÊN) */}
          {/* ------------------------------------------------------------- */}
          <div className="mt-8 pt-4 border-t-2 border-slate-300 print:mt-4 print:pt-2">
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* LỐI VÀO (Lối vào nằm phía dưới/bên trái) */}
              <div className="col-span-3">
                <div className="border-2 border-dashed border-amber-600 bg-amber-50 rounded-2xl p-3 text-center print:border-2 print:border-slate-800 print:bg-white">
                  <div className="text-xs font-black text-amber-950 uppercase tracking-wider print:text-black flex items-center justify-center gap-1.5">
                    <DoorOpen className="w-4 h-4 text-amber-700 print:hidden" />
                    <span>🚪 LỐI VÀO</span>
                  </div>
                </div>
              </div>

              {/* BẢNG (Hình chữ nhật dài ở giữa) */}
              <div className="col-span-6">
                <div className="border-2 border-slate-900 bg-slate-800 text-white rounded-2xl p-3 text-center shadow-md print:bg-slate-200 print:text-black print:border-2 print:border-slate-800">
                  <div className="text-xs sm:text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    <Presentation className="w-4 h-4 text-amber-400 print:hidden" />
                    <span>BẢNG LỚP HỌC</span>
                  </div>
                </div>
              </div>

              {/* BÀN GIÁO VIÊN (Hình chữ nhật riêng bên cạnh bảng) */}
              <div className="col-span-3">
                <div className="border-2 border-indigo-900 bg-indigo-900 text-white rounded-2xl p-3 text-center shadow-md print:bg-white print:text-black print:border-2 print:border-slate-800">
                  <div className="text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <User className="w-4 h-4 text-amber-300 print:hidden" />
                    <span>BÀN GIÁO VIÊN</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SEAT ASSIGNMENT MODAL (For mobile or click selection) */}
      {/* ------------------------------------------------------------- */}
      {targetSeatId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn print:hidden">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-amber-300 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="text-[11px] font-black text-amber-800 uppercase tracking-wider">
                  {getSeatLabel(targetSeatId)}
                </div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>🪑 Chọn Học Sinh Xếp Vào Chỗ Ngồi</span>
                </h3>
              </div>
              <button
                onClick={() => setTargetSeatId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm học sinh theo tên hoặc số thứ tự..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800"
              />
            </div>

            {/* Students Selection List */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {/* Unseated Section */}
              <div className="text-xs font-black text-amber-900 uppercase tracking-wider bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                🌱 Học sinh chưa có chỗ ({unseatedStudents.length} HS)
              </div>

              {students
                .filter((s) => !seatedStudentIds.has(String(s.id)))
                .filter(
                  (s) =>
                    modalSearchTerm === '' ||
                    s.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                    String(s.id).includes(modalSearchTerm)
                )
                .map((student) => (
                  <div
                    key={`modal_unseated_${student.id}`}
                    onClick={() => handleAssignStudent(targetSeatId, student.id)}
                    className="p-3 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-300 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-xs group"
                  >
                    <div className="flex items-center gap-3">
                      <ChibiAvatar
                        gender={student.gender}
                        styleIndex={student.avatarStyle}
                        size="sm"
                      />
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-950">
                          #{student.id}. {student.name}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          Chưa xếp chỗ
                        </div>
                      </div>
                    </div>

                    <button className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Xếp vào ghế</span>
                    </button>
                  </div>
                ))}

              {/* Already Seated Section */}
              <div className="text-xs font-black text-slate-700 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 mt-4">
                🔄 Học sinh đã có chỗ (Bấm để chuyển/đổi sang chỗ này)
              </div>

              {students
                .filter((s) => seatedStudentIds.has(String(s.id)))
                .filter(
                  (s) =>
                    modalSearchTerm === '' ||
                    s.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                    String(s.id).includes(modalSearchTerm)
                )
                .map((student) => {
                  const currentSeatKey = getSeatOfStudent(student.id);
                  return (
                    <div
                      key={`modal_seated_${student.id}`}
                      onClick={() => handleAssignStudent(targetSeatId, student.id)}
                      className="p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-xs group"
                    >
                      <div className="flex items-center gap-3">
                        <ChibiAvatar
                          gender={student.gender}
                          styleIndex={student.avatarStyle}
                          size="sm"
                        />
                        <div>
                          <div className="font-extrabold text-xs text-slate-900 group-hover:text-amber-950">
                            #{student.id}. {student.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Đang ngồi:{' '}
                            {currentSeatKey ? getSeatLabel(currentSeatKey) : 'Không rõ'}
                          </div>
                        </div>
                      </div>

                      <button className="px-3 py-1 bg-amber-400 hover:bg-amber-500 text-purple-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1">
                        <span>Đổi chỗ sang đây</span>
                      </button>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-200 text-right">
              <button
                onClick={() => setTargetSeatId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

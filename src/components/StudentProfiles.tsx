import React, { useState, useEffect, useRef } from 'react';
import { Student, UserAuth } from '../types';
import { Search, Download, Edit3, Phone, ExternalLink, Save, X, UserCheck, ShieldCheck, Filter, Upload, Trash2, Camera, RefreshCw } from 'lucide-react';
import { ChibiAvatar } from './ChibiAvatar';
import { sound } from '../utils/sound';
import { uploadStudentPhotoToStorage, DEFAULT_CLASS_DOC_ID } from '../lib/firebase';

interface StudentProfilesProps {
  students: Student[];
  userAuth: UserAuth;
  onUpdateStudent: (updatedStudent: Student) => void;
  onAddStudent: (newStudentData: Omit<Student, 'id' | 'points' | 'totalPositive' | 'totalNegative' | 'badges'>) => void;
  onDeleteStudent: (studentId: string) => void;
  onOpenTeacherLogin: () => void;
}

export const StudentProfiles: React.FC<StudentProfilesProps> = ({
  students,
  userAuth,
  onUpdateStudent,
  onAddStudent,
  onDeleteStudent,
  onOpenTeacherLogin,
}) => {
  const isAdmin = userAuth.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Form state for editing
  const [formData, setFormData] = useState<Partial<Student>>({});

  // Firebase Storage photo upload states
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<{ type: 'loading' | 'success' | 'error'; text: string } | null>(null);

  // Camera feature states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Automatically cleanup the camera stream when modal is closed
  useEffect(() => {
    if (!editingStudent && !isAddModalOpen) {
      stopCamera();
      setCameraError(null);
      setCapturedImage(null);
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [editingStudent, isAddModalOpen]);

  const stopCamera = (streamToStop?: MediaStream | null) => {
    const stream = streamToStop || cameraStream;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsCameraActive(false);
  };

  const startCamera = async (mode: 'user' | 'environment' = 'user') => {
    setCameraError(null);
    setCapturedImage(null);

    // Stop any existing stream first
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setIsCameraActive(true);
      setFacingMode(mode);

      // Short delay to ensure the video ref is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.error('Video play error:', err);
          });
        }
      }, 150);
    } catch (err: any) {
      console.error('Camera access error:', err);
      let errMsg = 'Không thể truy cập camera. Vui lòng cấp quyền camera hoặc sử dụng chức năng Tải ảnh lên.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Quyền truy cập camera bị từ chối. Vui lòng cấp quyền camera hoặc sử dụng chức năng Tải ảnh lên.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'Không tìm thấy thiết bị camera trên máy.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Camera đang được sử dụng bởi ứng dụng khác.';
      }
      setCameraError(errMsg);
      setIsCameraActive(false);
    }
  };

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');

      const videoWidth = video.videoWidth || 640;
      const videoHeight = video.videoHeight || 480;

      const size = Math.min(videoWidth, videoHeight);
      canvas.width = 120;
      canvas.height = 120;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw centered square crop from video feed
        const sourceX = (videoWidth - size) / 2;
        const sourceY = (videoHeight - size) / 2;
        ctx.drawImage(
          video,
          sourceX,
          sourceY,
          size,
          size,
          0,
          0,
          120,
          120
        );
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        setCapturedImage(dataUrl);
      }
    } catch (err) {
      console.error('Error capturing photo:', err);
      setCameraError('Lỗi trong quá trình chụp ảnh. Vui lòng thử lại.');
    }
  };

  const handleStartEdit = (student: Student) => {
    setEditingStudent(student);
    setUploadStatusMsg(null);
    setIsUploadingPhoto(false);
    const existingPhoto = student.avatarUrl || student.photoUrl || '';
    setFormData({
      name: student.name,
      dob: student.dob || '',
      gender: student.gender,
      ethnicity: student.ethnicity || '',
      place: student.place || '',
      hometown: student.hometown || '',
      address: student.address || '',
      familyStatus: student.familyStatus || '',
      fatherName: student.fatherName || '',
      motherName: student.motherName || '',
      phone: student.phone || '',
      avatarUrl: existingPhoto,
      photoUrl: existingPhoto,
      teamId: student.teamId || 'to_1',
    });
  };

  const handleStartAdd = () => {
    setUploadStatusMsg(null);
    setIsUploadingPhoto(false);
    setFormData({
      name: '',
      dob: '',
      gender: 'Nam',
      ethnicity: 'Kinh',
      place: '',
      hometown: '',
      address: '',
      familyStatus: '',
      fatherName: '',
      motherName: '',
      phone: '',
      avatarUrl: '',
      photoUrl: '',
      teamId: 'to_1',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingPhoto) return;

    const newStudentData = {
      name: formData.name || '',
      dob: formData.dob || '',
      gender: formData.gender || 'Nam',
      ethnicity: formData.ethnicity || 'Kinh',
      place: formData.place || '',
      hometown: formData.hometown || '',
      address: formData.address || '',
      familyStatus: formData.familyStatus || '',
      fatherName: formData.fatherName || '',
      motherName: formData.motherName || '',
      phone: formData.phone || '',
      avatarUrl: formData.avatarUrl || '',
      photoUrl: formData.avatarUrl || '',
      avatarStyle: Math.floor(Math.random() * 12) + 1,
      teamId: formData.teamId || 'to_1',
    };

    onAddStudent(newStudentData);
    setIsAddModalOpen(false);
    sound.playPointGain();
  };

  const handleConfirmDelete = (student: Student) => {
    setStudentToDelete(student);
  };

  const handleExecuteDelete = () => {
    if (studentToDelete) {
      onDeleteStudent(studentToDelete.id.toString());
      setStudentToDelete(null);
      sound.playPointDeduct();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) {
      e.target.value = '';
    }

    // 1. If user cancelled file selection dialog, do nothing
    if (!file) return;

    // 2. Validate file type
    if (!file.type || !file.type.startsWith('image/')) {
      setUploadStatusMsg({ type: 'error', text: 'Vui lòng chọn file ảnh JPG, PNG hoặc WEBP.' });
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadStatusMsg({ type: 'error', text: 'Vui lòng chọn file ảnh JPG, PNG hoặc WEBP.' });
      return;
    }

    // 3. Validate file size (10MB)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadStatusMsg({
        type: 'error',
        text: 'File ảnh quá lớn (tối đa 10MB). Vui lòng chọn ảnh nhỏ hơn.',
      });
      return;
    }

    // 4. Perform Firebase Storage upload
    try {
      setIsUploadingPhoto(true);
      setUploadStatusMsg({ type: 'loading', text: 'Đang tải ảnh...' });

      const studentId = editingStudent?.id || `student_${Date.now()}`;
      const teacherUid = userAuth?.email || 'teacher_6a3';
      const downloadUrl = await uploadStudentPhotoToStorage(file, studentId, DEFAULT_CLASS_DOC_ID, teacherUid);

      setFormData((prev) => ({
        ...prev,
        avatarUrl: downloadUrl,
        photoUrl: downloadUrl,
      }));

      if (editingStudent) {
        const updatedStudent: Student = {
          ...editingStudent,
          name: formData.name || editingStudent.name,
          dob: formData.dob !== undefined ? formData.dob : editingStudent.dob,
          gender: formData.gender !== undefined ? (formData.gender as any) : editingStudent.gender,
          ethnicity: formData.ethnicity !== undefined ? formData.ethnicity : editingStudent.ethnicity,
          place: formData.place !== undefined ? formData.place : editingStudent.place,
          hometown: formData.hometown !== undefined ? formData.hometown : editingStudent.hometown,
          address: formData.address !== undefined ? formData.address : editingStudent.address,
          familyStatus: formData.familyStatus !== undefined ? formData.familyStatus : editingStudent.familyStatus,
          fatherName: formData.fatherName !== undefined ? formData.fatherName : editingStudent.fatherName,
          motherName: formData.motherName !== undefined ? formData.motherName : editingStudent.motherName,
          phone: formData.phone !== undefined ? formData.phone : editingStudent.phone,
          teamId: formData.teamId !== undefined ? formData.teamId : editingStudent.teamId,
          avatarUrl: downloadUrl,
          photoUrl: downloadUrl,
        };
        onUpdateStudent(updatedStudent);
      }

      setUploadStatusMsg({ type: 'success', text: 'Đã tải và lưu ảnh học sinh lên Cloudinary thành công.' });
    } catch (err: any) {
      console.error('Student image upload error:', err);
      setUploadStatusMsg({
        type: 'error',
        text: 'Không thể tải ảnh lên Cloudinary. ' + (err?.message || 'Vui lòng kiểm tra cấu hình hoặc thử lại.'),
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAcceptCapturedPhoto = async () => {
    if (!capturedImage) return;

    try {
      setIsUploadingPhoto(true);
      setUploadStatusMsg({ type: 'loading', text: 'Đang nén và tải ảnh lên Cloudinary...' });

      const studentId = editingStudent?.id || `student_${Date.now()}`;
      const teacherUid = userAuth?.email || 'teacher_6a3';
      const downloadUrl = await uploadStudentPhotoToStorage(capturedImage, studentId, DEFAULT_CLASS_DOC_ID, teacherUid);

      setFormData((prev) => ({
        ...prev,
        avatarUrl: downloadUrl,
        photoUrl: downloadUrl,
      }));

      if (editingStudent) {
        const updatedStudent: Student = {
          ...editingStudent,
          name: formData.name || editingStudent.name,
          dob: formData.dob !== undefined ? formData.dob : editingStudent.dob,
          gender: formData.gender !== undefined ? (formData.gender as any) : editingStudent.gender,
          ethnicity: formData.ethnicity !== undefined ? formData.ethnicity : editingStudent.ethnicity,
          place: formData.place !== undefined ? formData.place : editingStudent.place,
          hometown: formData.hometown !== undefined ? formData.hometown : editingStudent.hometown,
          address: formData.address !== undefined ? formData.address : editingStudent.address,
          familyStatus: formData.familyStatus !== undefined ? formData.familyStatus : editingStudent.familyStatus,
          fatherName: formData.fatherName !== undefined ? formData.fatherName : editingStudent.fatherName,
          motherName: formData.motherName !== undefined ? formData.motherName : editingStudent.motherName,
          phone: formData.phone !== undefined ? formData.phone : editingStudent.phone,
          teamId: formData.teamId !== undefined ? formData.teamId : editingStudent.teamId,
          avatarUrl: downloadUrl,
          photoUrl: downloadUrl,
        };
        onUpdateStudent(updatedStudent);
      }

      stopCamera();
      setCapturedImage(null);
      setUploadStatusMsg({ type: 'success', text: 'Đã tải và lưu ảnh chụp lên Cloudinary thành công.' });
    } catch (err: any) {
      console.error('Student camera image upload error:', err);
      setUploadStatusMsg({
        type: 'error',
        text: 'Không thể tải ảnh lên Cloudinary. ' + (err?.message || 'Vui lòng thử lại.'),
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: '', photoUrl: '' }));
    setUploadStatusMsg(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || isUploadingPhoto) return;

    const finalAvatar = formData.avatarUrl !== undefined
      ? formData.avatarUrl
      : (editingStudent.avatarUrl || editingStudent.photoUrl || '');

    const updated: Student = {
      ...editingStudent,
      name: formData.name || editingStudent.name,
      dob: formData.dob !== undefined ? formData.dob : editingStudent.dob,
      gender: (formData.gender as 'Nam' | 'Nữ' | 'nam' | 'nu') || editingStudent.gender,
      ethnicity: formData.ethnicity !== undefined ? formData.ethnicity : editingStudent.ethnicity,
      place: formData.place !== undefined ? formData.place : editingStudent.place,
      hometown: formData.hometown !== undefined ? formData.hometown : editingStudent.hometown,
      address: formData.address !== undefined ? formData.address : editingStudent.address,
      familyStatus: formData.familyStatus !== undefined ? formData.familyStatus : editingStudent.familyStatus,
      fatherName: formData.fatherName !== undefined ? formData.fatherName : editingStudent.fatherName,
      motherName: formData.motherName !== undefined ? formData.motherName : editingStudent.motherName,
      phone: formData.phone !== undefined ? formData.phone : editingStudent.phone,
      avatarUrl: finalAvatar,
      photoUrl: finalAvatar,
      teamId: formData.teamId !== undefined ? formData.teamId : editingStudent.teamId,
    };

    onUpdateStudent(updated);
    setEditingStudent(null);
    sound.playPointGain();
  };

  // Export CSV of 44 student profiles
  const handleExportCSV = () => {
    const headers = [
      'STT',
      'Họ và tên',
      'Ngày sinh',
      'Giới tính',
      'Dân tộc',
      'Nơi sinh',
      'Quê quán',
      'Địa chỉ',
      'Hoàn cảnh GĐ',
      'Họ tên Bố',
      'Họ tên Mẹ',
      'SĐT Liên hệ',
    ];

    const rows = students.map((s, idx) => [
      idx + 1,
      `"${s.name}"`,
      `"${s.dob || ''}"`,
      `"${s.gender || ''}"`,
      `"${s.ethnicity || ''}"`,
      `"${s.place || ''}"`,
      `"${s.hometown || ''}"`,
      `"${s.address || ''}"`,
      `"${s.familyStatus || ''}"`,
      `"${s.fatherName || ''}"`,
      `"${s.motherName || ''}"`,
      `"${s.phone || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Ho_So_Hoc_Sinh_Lop_6A3.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    sound.playPointGain();
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      s.name.toLowerCase().includes(query) ||
      (s.phone && s.phone.includes(query)) ||
      (s.ethnicity && s.ethnicity.toLowerCase().includes(query)) ||
      (s.address && s.address.toLowerCase().includes(query))
    );
  });

  // Dynamic statistics calculations
  const totalStudents = students.length;
  const maleCount = students.filter(s => {
    const g = (s.gender || '').toLowerCase().trim();
    return g === 'nam';
  }).length;
  const femaleCount = students.filter(s => {
    const g = (s.gender || '').toLowerCase().trim();
    return g === 'nữ' || g === 'nu';
  }).length;

  const ethnicityCounts: { [key: string]: number } = {};
  students.forEach(s => {
    const rawEth = (s.ethnicity || '').trim();
    if (rawEth) {
      const formatted = rawEth.split('-').map(word => {
        const trimmedWord = word.trim();
        if (!trimmedWord) return '';
        if (trimmedWord.toLowerCase().startsWith("h'") && trimmedWord.length > 2) {
          return "H'" + trimmedWord.charAt(2).toUpperCase() + trimmedWord.slice(3).toLowerCase();
        }
        if (trimmedWord.toLowerCase().startsWith("m'") && trimmedWord.length > 2) {
          return "M'" + trimmedWord.charAt(2).toUpperCase() + trimmedWord.slice(3).toLowerCase();
        }
        return trimmedWord.charAt(0).toUpperCase() + trimmedWord.slice(1).toLowerCase();
      }).filter(Boolean).join('-');
      
      const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      ethnicityCounts[capitalized] = (ethnicityCounts[capitalized] || 0) + 1;
    } else {
      ethnicityCounts['Chưa xác định'] = (ethnicityCounts['Chưa xác định'] || 0) + 1;
    }
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 text-white p-6 rounded-3xl shadow-xl border border-indigo-400/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-black uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Hồ Sơ Sơ Yếu Lý Lịch Lớp 6A3</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-300 drop-shadow">
            📇 HỒ SƠ HỌC SINH
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button
              onClick={handleStartAdd}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-450 hover:to-indigo-550 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg border border-indigo-400 active:scale-95 transition-all flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>➕ Thêm Học Sinh</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg border border-emerald-300 active:scale-95 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>📥 Xuất File CSV</span>
          </button>

          {!isAdmin && (
            <button
              onClick={onOpenTeacherLogin}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs sm:text-sm rounded-2xl shadow border border-amber-300 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Đăng Nhập GVCN</span>
            </button>
          )}
        </div>
      </div>

      {/* 📊 THỐNG KÊ HỒ SƠ HỌC SINH */}
      <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/50 p-5 rounded-3xl border border-indigo-100 shadow-md space-y-4">
        <h3 className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-2 uppercase tracking-wide">
          <span>📊 Thống Kê Tổng Hợp Hồ Sơ Học Sinh</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card: Tổng số học sinh */}
          <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-indigo-200">
            <div className="text-3xl bg-indigo-50 p-3 rounded-xl flex items-center justify-center w-14 h-14 select-none">👥</div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">TỔNG SỐ HỌC SINH</p>
              <p className="text-lg font-black text-indigo-950">{totalStudents} học sinh</p>
            </div>
          </div>

          {/* Card: Nam */}
          <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-indigo-200">
            <div className="text-3xl bg-sky-50 p-3 rounded-xl flex items-center justify-center w-14 h-14 select-none">👦</div>
            <div>
              <p className="text-[10px] font-black text-sky-500 uppercase tracking-wider">NAM</p>
              <p className="text-lg font-black text-indigo-950">{maleCount} học sinh</p>
            </div>
          </div>

          {/* Card: Nữ */}
          <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-indigo-200">
            <div className="text-3xl bg-rose-50 p-3 rounded-xl flex items-center justify-center w-14 h-14 select-none">👧</div>
            <div>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider">NỮ</p>
              <p className="text-lg font-black text-indigo-950">{femaleCount} học sinh</p>
            </div>
          </div>

          {/* Card: Dân tộc */}
          <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-center gap-2 transition-all hover:shadow-md hover:border-indigo-200">
            <div className="flex items-center gap-2">
              <span className="text-xl select-none">🌍</span>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">DÂN TỘC</p>
            </div>
            <div className="text-[11px] font-bold text-slate-700 divide-y divide-slate-100 max-h-[64px] overflow-y-auto pr-1">
              {Object.entries(ethnicityCounts).map(([eth, count]) => (
                <div key={eth} className="py-0.5 flex justify-between items-center">
                  <span className="text-slate-600">{eth}:</span>
                  <span className="font-black text-indigo-950">{count} học sinh</span>
                </div>
              ))}
              {Object.keys(ethnicityCounts).length === 0 && (
                <div className="text-slate-400 italic">Chưa có dữ liệu</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-indigo-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-indigo-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, dân tộc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="text-xs font-bold text-slate-600">
          Hiển thị: <span className="font-black text-indigo-900">{filteredStudents.length} / {students.length}</span> học sinh
        </div>
      </div>

      {/* Full Profile Table */}
      <div className="bg-white rounded-3xl border border-indigo-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-900 to-purple-900 text-amber-300 font-black uppercase text-[11px] tracking-wider whitespace-nowrap">
                <th className="p-3 text-center border-b border-indigo-800">STT</th>
                <th className="p-3 border-b border-indigo-800 min-w-[150px]">Họ và Tên</th>
                <th className="p-3 border-b border-indigo-800">Ngày Sinh</th>
                <th className="p-3 text-center border-b border-indigo-800">Giới Tính</th>
                <th className="p-3 border-b border-indigo-800">Dân Tộc</th>
                <th className="p-3 border-b border-indigo-800">Nơi Sinh</th>
                <th className="p-3 border-b border-indigo-800">Quê Quán</th>
                <th className="p-3 border-b border-indigo-800 min-w-[160px]">Địa Chỉ Thường Trú</th>
                <th className="p-3 border-b border-indigo-800">Hoàn Cảnh GĐ</th>
                <th className="p-3 border-b border-indigo-800">Họ Tên Bố</th>
                <th className="p-3 border-b border-indigo-800">Họ Tên Mẹ</th>
                <th className="p-3 border-b border-indigo-800 min-w-[140px]">SĐT Liên Hệ</th>
                {isAdmin && <th className="p-3 text-center border-b border-indigo-800">Thao Tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100 font-medium text-slate-800">
              {filteredStudents.map((student, idx) => {
                const cleanPhone = student.phone ? student.phone.replace(/\D/g, '') : '';

                return (
                  <tr
                    key={student.id}
                    className="hover:bg-indigo-50/60 transition-colors whitespace-nowrap"
                  >
                    <td className="p-3 text-center font-black text-indigo-900 bg-indigo-50/30">
                      {idx + 1}
                    </td>

                    <td className="p-3 font-black text-slate-900 text-xs">
                      <div className="flex items-center gap-2.5">
                        <ChibiAvatar
                          gender={student.gender}
                          styleIndex={student.avatarStyle}
                          avatarUrl={student.avatarUrl || student.photoUrl}
                          size="sm"
                        />
                        <span>{student.name}</span>
                      </div>
                    </td>

                    <td className="p-3 text-slate-700 font-bold">
                      {student.dob || '—'}
                    </td>

                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        student.gender === 'Nam' || student.gender === 'nam'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {student.gender}
                      </span>
                    </td>

                    <td className="p-3 text-slate-700">
                      {student.ethnicity || '—'}
                    </td>

                    <td className="p-3 text-slate-700">
                      {student.place || '—'}
                    </td>

                    <td className="p-3 text-slate-600 italic">
                      {student.hometown || '—'}
                    </td>

                    <td className="p-3 text-slate-700 max-w-xs truncate" title={student.address}>
                      {student.address || '—'}
                    </td>

                    <td className="p-3 text-slate-700">
                      {student.familyStatus ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold">
                          {student.familyStatus}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="p-3 text-slate-700">
                      {student.fatherName || '—'}
                    </td>

                    <td className="p-3 text-slate-700">
                      {student.motherName || '—'}
                    </td>

                    <td className="p-3">
                      {cleanPhone ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-indigo-950">{student.phone}</span>
                          <a
                            href={`https://zalo.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black shadow flex items-center gap-1 transition-all active:scale-95"
                            title="Chat Zalo Phụ Huynh"
                          >
                            <span>💬 Zalo</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa cập nhật</span>
                      )}
                    </td>

                    {isAdmin && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(student)}
                            className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black rounded-xl text-[11px] shadow flex items-center gap-1 transition-all active:scale-95"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>✏️ Sửa</span>
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(student)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-[11px] shadow flex items-center gap-1 transition-all active:scale-95"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>🗑️ Xóa</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-4 border-indigo-400 space-y-4 my-auto">
            
            <div className="flex items-center justify-between border-b pb-3 border-indigo-100">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                  Cập Nhật Sơ Yếu Lý Lịch
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  ✏️ SỬA HỒ SƠ: {editingStudent.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-semibold">
              {/* Photo Upload & Preview Section */}
              <div className="bg-indigo-50/80 p-3.5 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="shrink-0">
                  <ChibiAvatar
                    gender={formData.gender || editingStudent.gender}
                    styleIndex={editingStudent.avatarStyle || 1}
                    avatarUrl={formData.avatarUrl}
                    size="xl"
                  />
                </div>

                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <label className="block text-indigo-950 font-black text-xs uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>Ảnh Học Sinh (Chân dung / Ảnh thẻ)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Chọn ảnh từ thiết bị để làm avatar chính thức cho học sinh trên toàn bộ website.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <label className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center gap-1.5 active:scale-95">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{formData.avatarUrl ? 'Thay Ảnh Mới' : 'Tải Ảnh Lên'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => startCamera('user')}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-purple-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Chụp Ảnh Trực Tiếp</span>
                    </button>

                    {formData.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={isUploadingPhoto}
                        className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa Ảnh</span>
                      </button>
                    )}
                  </div>

                  {uploadStatusMsg && (
                    <div className={`mt-2 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      uploadStatusMsg.type === 'loading'
                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 animate-pulse'
                        : uploadStatusMsg.type === 'success'
                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                        : 'bg-rose-100 text-rose-950 border border-rose-300'
                    }`}>
                      {uploadStatusMsg.type === 'loading' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />}
                      {uploadStatusMsg.type === 'success' && <span>✅</span>}
                      {uploadStatusMsg.type === 'error' && <span>⚠️</span>}
                      <span>{uploadStatusMsg.text}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Camera Interface Section */}
              {(isCameraActive || capturedImage || cameraError) && (
                <div className="bg-slate-900 p-4 rounded-2xl border-2 border-indigo-400 flex flex-col items-center justify-center gap-3 relative text-white">
                  <h4 className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4" />
                    <span>{capturedImage ? 'Xem Trước Ảnh Đã Chụp' : 'Chụp Ảnh Học Sinh Trực Tiếp'}</span>
                  </h4>

                  {cameraError && (
                    <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-[11px] rounded-xl text-center max-w-md">
                      ⚠️ {cameraError}
                    </div>
                  )}

                  <div className="relative w-[240px] h-[240px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                    {/* Live Stream */}
                    {isCameraActive && !capturedImage && (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                        {/* Circular crop guide */}
                        <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-full m-4 pointer-events-none flex items-center justify-center">
                          <span className="text-[9px] text-white/50 font-semibold bg-slate-900/40 px-1.5 py-0.5 rounded-full">
                            Khung căn mặt
                          </span>
                        </div>
                      </>
                    )}

                    {/* Captured Image Preview */}
                    {capturedImage && (
                      <img
                        src={capturedImage}
                        alt="Captured Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {isCameraActive && !capturedImage && (
                      <>
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          <span>📸 Chụp Ảnh</span>
                        </button>

                        <button
                          type="button"
                          onClick={toggleCamera}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow active:scale-95 transition-all flex items-center gap-1"
                        >
                          <span>🔄 Đổi Camera</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => stopCamera()}
                          className="px-3 py-2 bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-bold text-xs rounded-xl transition-all active:scale-95"
                        >
                          ✕ Hủy
                        </button>
                      </>
                    )}

                    {capturedImage && (
                      <>
                        <button
                          type="button"
                          onClick={handleAcceptCapturedPhoto}
                          disabled={isUploadingPhoto}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isUploadingPhoto ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang tải ảnh...</span>
                            </>
                          ) : (
                            <span>✓ Sử dụng ảnh</span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCapturedImage(null);
                            startCamera(facingMode);
                          }}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center gap-1"
                        >
                          ↻ Chụp lại
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCapturedImage(null);
                            stopCamera();
                          }}
                          className="px-3 py-2 bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-bold text-xs rounded-xl transition-all active:scale-95"
                        >
                          ✕ Hủy
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Họ và tên</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ngày sinh (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    placeholder="10/03/2014"
                    value={formData.dob || ''}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Giới tính</label>
                  <select
                    value={formData.gender || 'Nam'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Thành viên Tổ</label>
                  <select
                    value={formData.teamId || 'to_1'}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                  >
                    <option value="to_1">Tổ 1</option>
                    <option value="to_2">Tổ 2</option>
                    <option value="to_3">Tổ 3</option>
                    <option value="to_4">Tổ 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Dân tộc</label>
                  <input
                    type="text"
                    placeholder="Kinh / Ê-đê / Nùng..."
                    value={formData.ethnicity || ''}
                    onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nơi sinh</label>
                  <input
                    type="text"
                    placeholder="Đắk Lắk..."
                    value={formData.place || ''}
                    onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Quê quán</label>
                  <input
                    type="text"
                    placeholder="Nhập quê quán..."
                    value={formData.hometown || ''}
                    onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Địa chỉ thường trú</label>
                  <input
                    type="text"
                    placeholder="Thôn, xã, huyện, tỉnh..."
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Hoàn cảnh gia đình</label>
                  <input
                    type="text"
                    placeholder="Bình thường / Hộ nghèo / Cận nghèo..."
                    value={formData.familyStatus || ''}
                    onChange={(e) => setFormData({ ...formData, familyStatus: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">SĐT Liên hệ (Bố / Mẹ)</label>
                  <input
                    type="text"
                    placeholder="0912345678"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Họ tên Bố</label>
                  <input
                    type="text"
                    placeholder="Họ tên Bố..."
                    value={formData.fatherName || ''}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Họ tên Mẹ</label>
                  <input
                    type="text"
                    placeholder="Họ tên Mẹ..."
                    value={formData.motherName || ''}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>💾 Lưu Hồ Sơ</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Admin Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-indigo-100 shadow-2xl flex flex-col my-8 max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b flex items-center justify-between bg-gradient-to-r from-indigo-950 to-purple-950 text-white rounded-t-3xl">
              <div className="flex items-center gap-2">
                <span className="text-xl">➕</span>
                <div>
                  <h3 className="font-black text-amber-300 text-sm sm:text-base">THÊM HỒ SƠ HỌC SINH MỚI</h3>
                  <p className="text-[10px] text-indigo-200 font-bold">Lớp 6A3 • Sổ chủ nhiệm điện tử</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors font-black text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveAdd} className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Avatar Photo Camera Section */}
              <div className="flex flex-col items-center justify-center gap-2 bg-indigo-50/50 p-4 rounded-2xl border border-dashed border-indigo-200">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full border-4 border-indigo-200 overflow-hidden shadow-md flex items-center justify-center bg-white">
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt="Captured"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-3xl">👤</span>
                    )}
                  </div>
                  {formData.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow font-black text-[10px] transition-all"
                      title="Xóa ảnh"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {!isCameraActive ? (
                    <>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow flex items-center gap-1 transition-all active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Chụp Ảnh Trực Tiếp</span>
                      </button>

                      <label className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs rounded-xl shadow cursor-pointer flex items-center gap-1 transition-all active:scale-95">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tải Ảnh Lên</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500 max-w-[280px]">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full aspect-square object-cover"
                        />
                        <button
                          type="button"
                          onClick={toggleCamera}
                          className="absolute bottom-2 left-2 p-1.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-lg transition-all active:scale-95"
                          title="Đổi camera"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            capturePhoto();
                            setTimeout(() => {
                              handleAcceptCapturedPhoto();
                            }, 100);
                          }}
                          disabled={isUploadingPhoto}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isUploadingPhoto ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang tải...</span>
                            </>
                          ) : (
                            <span>📸 Chụp Ngay</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow transition-all active:scale-95"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1 text-center bg-rose-50 px-2 py-1 rounded-lg">
                    ⚠️ {cameraError}
                  </p>
                )}
              </div>

              {/* Form Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Họ và tên</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A..."
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ngày sinh (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    placeholder="10/03/2014"
                    value={formData.dob || ''}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Giới tính</label>
                  <select
                    value={formData.gender || 'Nam'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Thành viên Tổ</label>
                  <select
                    value={formData.teamId || 'to_1'}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                  >
                    <option value="to_1">Tổ 1</option>
                    <option value="to_2">Tổ 2</option>
                    <option value="to_3">Tổ 3</option>
                    <option value="to_4">Tổ 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Dân tộc</label>
                  <input
                    type="text"
                    placeholder="Kinh / Ê-đê / Nùng..."
                    value={formData.ethnicity || ''}
                    onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nơi sinh</label>
                  <input
                    type="text"
                    placeholder="Đắk Lắk..."
                    value={formData.place || ''}
                    onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Quê quán</label>
                  <input
                    type="text"
                    placeholder="Nhập quê quán..."
                    value={formData.hometown || ''}
                    onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Địa chỉ thường trú</label>
                  <input
                    type="text"
                    placeholder="Thôn, xã, huyện, tỉnh..."
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Hoàn cảnh gia đình</label>
                  <input
                    type="text"
                    placeholder="Bình thường / Hộ nghèo / Cận nghèo..."
                    value={formData.familyStatus || ''}
                    onChange={(e) => setFormData({ ...formData, familyStatus: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">SĐT Liên hệ (Bố / Mẹ)</label>
                  <input
                    type="text"
                    placeholder="0912345678"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Họ tên Bố</label>
                  <input
                    type="text"
                    placeholder="Họ tên Bố..."
                    value={formData.fatherName || ''}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Họ tên Mẹ</label>
                  <input
                    type="text"
                    placeholder="Họ tên Mẹ..."
                    value={formData.motherName || ''}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>💾 Thêm Học Sinh</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-indigo-100 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="font-black text-rose-950 text-base sm:text-lg">XÁC NHẬN XÓA HỌC SINH</h3>
                <p className="text-xs text-rose-600 font-semibold">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-rose-50 p-3 rounded-2xl border border-rose-100">
              Bạn có chắc chắn muốn xóa học sinh <span className="font-black text-rose-950">"{studentToDelete.name}"</span> khỏi sổ chủ nhiệm lớp 6A3? Mọi dữ liệu về điểm thi đua, hồ sơ, và điểm danh của học sinh này sẽ bị loại bỏ khỏi hệ thống.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs shadow flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

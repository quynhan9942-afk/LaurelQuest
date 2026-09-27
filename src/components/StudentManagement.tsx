import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  UserPlus,
  Filter,
  Sparkles,
  Award,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { Student, Team, UserAuth } from '../types';
import { ChibiAvatar } from './ChibiAvatar';

interface StudentManagementProps {
  students: Student[];
  teams: Team[];
  userAuth: UserAuth;
  onAddStudent: (newStudent: Omit<Student, 'id' | 'points' | 'totalPositive' | 'totalNegative' | 'badges'>) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onSelectStudent: (student: Student) => void;
  onOpenTeacherLogin: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  teams,
  userAuth,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onSelectStudent,
  onOpenTeacherLogin,
}) => {
  const isAdmin = userAuth.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'nam' | 'nu'>('nam');
  const [teamId, setTeamId] = useState('to_1');
  const [avatarStyle, setAvatarStyle] = useState(1);

  const resetForm = () => {
    setName('');
    setGender('nam');
    setTeamId('to_1');
    setAvatarStyle(1);
    setEditingStudent(null);
  };

  const handleOpenAddModal = () => {
    if (!isAdmin) {
      onOpenTeacherLogin();
      return;
    }
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (s: Student) => {
    if (!isAdmin) {
      onOpenTeacherLogin();
      return;
    }
    setEditingStudent(s);
    setName(s.name);
    setGender(s.gender);
    setTeamId(s.teamId);
    setAvatarStyle(s.avatarStyle);
    setIsAddModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        name: name.trim(),
        gender,
        teamId,
        avatarStyle,
      });
    } else {
      onAddStudent({
        name: name.trim(),
        gender,
        teamId,
        avatarStyle,
      });
    }

    setIsAddModalOpen(false);
    resetForm();
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = selectedTeamFilter === 'all' || s.teamId === selectedTeamFilter;
    return matchesSearch && matchesTeam;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Controls */}
      <div className="bg-white rounded-3xl p-5 shadow-xl border-2 border-amber-300/60 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
            <span>👥 DANH SÁCH HỌC SINH</span>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </h2>
          <p className="text-xs text-slate-600">
            Tổng số: <strong className="text-amber-600">{students.length} học sinh</strong> trong danh sách Lớp 6A3
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-52">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên học sinh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 pr-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả các Tổ</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add Button - Only for Admin or prompts login */}
          {isAdmin ? (
            <button
              onClick={handleOpenAddModal}
              id="btn-add-student"
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-purple-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Học Sinh</span>
            </button>
          ) : (
            <button
              onClick={onOpenTeacherLogin}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all"
              title="Đăng nhập Giáo viên để thêm/sửa học sinh"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>Đăng nhập để Thêm/Sửa</span>
            </button>
          )}
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredStudents.map((student) => {
          const team = teams.find((t) => t.id === student.teamId);

          return (
            <div
              key={student.id}
              className="bg-white rounded-2xl p-4 shadow-md border-2 border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {team ? team.name : 'Tổ'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectStudent(student)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(student)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa học sinh ${student.name}?`)) {
                              onDeleteStudent(student.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa học sinh"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <ChibiAvatar
                    gender={student.gender}
                    styleIndex={student.avatarStyle}
                    avatarUrl={student.avatarUrl || student.photoUrl}
                    size="lg"
                  />
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-amber-700 transition-colors">
                      {student.name}
                    </h3>
                    <div className="text-xs text-slate-500">
                      Giới tính: {student.gender === 'nam' ? 'Nam 👦' : 'Nữ 👧'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Điểm thi đua</div>
                  <div className="text-lg font-black text-amber-600">{student.points} đ</div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phát biểu / Huy hiệu</div>
                  <div className="text-xs font-bold text-indigo-600 flex items-center gap-1 justify-end">
                    <span>✋ {student.speechCount || 0} lần</span>
                    <span>• {student.badges.length} 🎖️</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveStudent}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-4 border-amber-300 space-y-4 animate-in fade-in zoom-in duration-200 text-slate-800"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-lg text-slate-900">
                {editingStudent ? 'Sửa Thông Tin Học Sinh' : 'Thêm Học Sinh Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Avatar Preview */}
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <ChibiAvatar gender={gender} styleIndex={avatarStyle} size="xl" />
              <span className="text-xs font-semibold text-slate-500">Xem trước Chibi Avatar</span>
            </div>

            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Họ và Tên Học Sinh <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn Anh..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Gender Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Giới Tính</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('nam')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    gender === 'nam'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Nam 👦
                </button>
                <button
                  type="button"
                  onClick={() => setGender('nu')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    gender === 'nu'
                      ? 'bg-pink-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Nữ 👧
                </button>
              </div>
            </div>

            {/* Team Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Xếp Vào Tổ/Nhóm</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-300 focus:outline-none"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Style Index Picker */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase">Kiểu Chibi (1-12)</label>
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarStyle(idx)}
                    className={`p-1 rounded-xl border-2 transition-all ${
                      avatarStyle === idx ? 'border-amber-500 scale-110 shadow-md' : 'border-transparent'
                    }`}
                  >
                    <ChibiAvatar gender={gender} styleIndex={idx} size="sm" />
                  </button>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-purple-950 font-black text-xs rounded-xl shadow-md active:scale-95 transition-all"
              >
                {editingStudent ? 'Cập Nhật' : 'Lưu Học Sinh'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

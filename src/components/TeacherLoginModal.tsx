import React, { useState } from 'react';
import { UserAuth } from '../types';
import { auth, googleProvider, signInWithPopup, signOut } from '../lib/firebase';

interface TeacherLoginModalProps {
  onSuccessLogin: (auth: UserAuth) => void;
  onClose: () => void;
  targetEmail?: string;
  teacherName?: string;
}

export const TeacherLoginModal: React.FC<TeacherLoginModalProps> = ({
  onSuccessLogin,
  onClose,
  targetEmail = 'quynhan9942@gmail.com',
  teacherName = 'Cô Quỳnh An',
}) => {
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user && user.email && user.email.trim().toLowerCase() === targetEmail.trim().toLowerCase()) {
        // Successful Teacher/Admin Login
        onSuccessLogin({
          role: 'admin',
          email: user.email,
          name: user.displayName || teacherName,
        });
        onClose();
      } else {
        await signOut(auth).catch(() => {});
        setErrorMsg('Tài khoản Google này chưa được cấp quyền Giáo viên.');
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      const errCode = err?.code || '';
      if (errCode === 'auth/popup-closed-by-user') {
        setErrorMsg('Đã hủy cửa sổ đăng nhập Google.');
      } else if (errCode === 'auth/popup-blocked') {
        setErrorMsg('Cửa sổ bật lên bị trình duyệt chặn. Vui lòng bật popup và thử lại!');
      } else if (errCode === 'auth/cancelled-popup-request') {
        // Ignore rapid duplicate clicks
      } else {
        setErrorMsg(err?.message || 'Đăng nhập bằng Google thất bại. Vui lòng thử lại!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border-2 border-yellow-400">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-full text-yellow-600">
                <span className="text-2xl">🔑</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">ĐĂNG NHẬP GIÁO VIÊN</h3>
                <p className="text-xs text-gray-500">Bảo mật Firebase Auth (Google Sign-In)</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white text-gray-700 font-bold py-3.5 px-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md disabled:opacity-50 group"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="text-sm font-semibold group-hover:text-blue-600 transition-colors">
                {isLoading ? 'Đang mở đăng nhập Google...' : 'Đăng nhập Giáo viên bằng Google'}
              </span>
            </button>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-center gap-2 text-xs text-gray-500">
          🔒 Xác thực Google Sign-In chính chủ bảo vệ thông tin lớp học
        </div>
      </div>
    </div>
  );
};


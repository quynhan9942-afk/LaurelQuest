import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, Download, X, Smartphone, ShieldCheck, Sparkles } from 'lucide-react';

interface QRCodeModalProps {
  classId?: string;
  docId?: string;
  schoolYear?: string;
  classNameTitle?: string;
  className?: string;
  teacherName?: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  classId,
  docId,
  schoolYear,
  classNameTitle,
  className,
  teacherName,
  onClose,
}) => {
  const displayClassName = classNameTitle || className || 'LỚP 6A3';
  const targetClassId = classId || docId || 'thcs_nguyenvancu_6a3';
  const targetSchoolYear = schoolYear || '2025-2026';

  const getTargetUrl = () => {
    if (typeof window === 'undefined') {
      return `https://ais-pre-c4uoequqihp7ybrrzoktmj-523129646692.asia-east1.run.app/?mode=guest&classId=${encodeURIComponent(targetClassId)}&schoolYear=${encodeURIComponent(targetSchoolYear)}`;
    }
    let host = window.location.host;
    if (host.includes('ais-dev-')) {
      host = host.replace('ais-dev-', 'ais-pre-');
    }
    const protocol = window.location.protocol;
    const pathname = window.location.pathname;
    return `${protocol}//${host}${pathname}?mode=guest&classId=${encodeURIComponent(targetClassId)}&schoolYear=${encodeURIComponent(targetSchoolYear)}`;
  };

  const targetUrl = getTargetUrl();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const svgElement = document.getElementById('qr-code-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = window.URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 20, 20, 360, 360);
        const png = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = png;
        downloadLink.download = `Ma_QR_Tra_Cuu_${displayClassName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    image.src = blobURL;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border-4 border-yellow-400/80 text-white space-y-5 my-auto relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-yellow-400/20 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-yellow-400 to-amber-500 text-purple-950 rounded-2xl shadow-lg">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-yellow-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>MÃ QR TRA CỨU BẢNG ĐIỂM</span>
              </h3>
              <p className="text-xs text-indigo-200">Dành riêng cho Phụ huynh & Học sinh</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center space-y-4 py-2 relative z-10">
          <div className="bg-white p-4 rounded-3xl shadow-2xl border-4 border-amber-300 relative group flex flex-col items-center">
            <QRCodeSVG
              id="qr-code-svg"
              value={targetUrl}
              size={220}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23d97706'><path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/></svg>",
                x: undefined,
                y: undefined,
                height: 32,
                width: 32,
                excavate: true,
              }}
            />
            <div className="mt-2 text-center">
              <span className="text-[11px] font-black tracking-wider text-purple-950 uppercase px-3 py-1 bg-amber-200 rounded-full border border-amber-400">
                ⭐ {displayClassName} - BẢNG THI ĐUA
              </span>
            </div>
          </div>

          {/* Guest Mode Info Card */}
          <div className="p-3.5 bg-white/10 backdrop-blur rounded-2xl border border-yellow-400/30 text-xs space-y-2 text-indigo-100">
            <div className="flex items-center gap-2 font-bold text-yellow-300">
              <Smartphone className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>Hướng Dẫn Quét Mã:</span>
            </div>
            <p className="leading-relaxed text-indigo-100/90 text-[11px]">
              Phụ huynh dùng Camera điện thoại hoặc ứng dụng <strong>Zalo</strong> quét mã QR này để xem trực tiếp Bảng Thi Đua của lớp ở chế độ <span className="text-emerald-300 font-bold">[Khách - Chỉ Xem]</span> mà không cần mật khẩu.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-300/80 pt-1 border-t border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tự động khóa tất cả quyền chỉnh sửa để bảo mật dữ liệu.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 relative z-10">
          <button
            onClick={handleCopy}
            className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-yellow-300" />}
            <span>{copied ? 'Đã Sao Chép!' : 'Sao Chép Link'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="py-2.5 px-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-purple-950 font-black text-xs rounded-2xl shadow-lg border border-yellow-200 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Tải Ảnh Mã QR</span>
          </button>
        </div>

      </div>
    </div>
  );
};

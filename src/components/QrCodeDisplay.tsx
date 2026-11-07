import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeDisplayProps {
  token: string;
  size?: number;
  className?: string;
}

export const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({
  token,
  size = 180,
  className = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    QRCode.toDataURL(token, {
      width: size * 2, // High DPI
      margin: 1,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => {
        setDataUrl(url);
        setError(null);
      })
      .catch(err => {
        console.error('QR code generation error:', err);
        setError('Failed to render QR');
      });
  }, [token, size]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-100 text-xs text-rose-500 rounded border border-rose-200 ${className}`}
      >
        QR Error
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-100 animate-pulse rounded border border-slate-200 ${className}`}
      >
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="BA QR Code"
      style={{ width: size, height: size }}
      className={`rounded shadow-xs border border-slate-200 bg-white ${className}`}
    />
  );
};

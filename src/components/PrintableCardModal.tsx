import React, { useState } from 'react';
import { BrandAmbassador } from '../types';
import { QrCodeDisplay } from './QrCodeDisplay';
import { Printer, RefreshCw, ShieldAlert, X, Check, Award, Phone, MapPin, Building, Calendar } from 'lucide-react';
import { DataService } from '../services/dataService';

interface PrintableCardModalProps {
  ba: BrandAmbassador;
  isOpen: boolean;
  onClose: () => void;
  onCardUpdated?: (updatedBa: BrandAmbassador) => void;
  currentUserRole?: string;
}

export const PrintableCardModal: React.FC<PrintableCardModalProps> = ({
  ba,
  isOpen,
  onClose,
  onCardUpdated,
  currentUserRole = 'admin',
}) => {
  const [currentBa, setCurrentBa] = useState<BrandAmbassador>(ba);
  const [showBackSide, setShowBackSide] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [confirmNotice, setConfirmNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleRegenerateQr = () => {
    if (confirm('Are you sure you want to regenerate this QR credential? Any physical cards printed with the old QR code will immediately be invalidated.')) {
      setIsRegenerating(true);
      const updated = DataService.revokeAndRegenerateQrToken(currentBa.baId, 'Admin User');
      if (updated) {
        setCurrentBa(updated);
        onCardUpdated?.(updated);
        setConfirmNotice('New secure QR token generated successfully.');
        setTimeout(() => setConfirmNotice(null), 3000);
      }
      setIsRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-slate-800 border border-slate-200">
        {/* Header - Hidden on Print */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 no-print">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-600" />
              BA Identification & Security Card
            </h3>
            <p className="text-xs text-slate-500">
              Official Econet Wireless Zimbabwe Field Force Credential ({currentBa.baId})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmNotice && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2 no-print">
            <Check className="w-4 h-4 text-emerald-600" />
            {confirmNotice}
          </div>
        )}

        {/* Card View Switcher & Print Controls - Hidden on Print */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 mb-4 no-print">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setShowBackSide(false)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                !showBackSide ? 'bg-white text-blue-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Card Front
            </button>
            <button
              onClick={() => setShowBackSide(true)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                showBackSide ? 'bg-white text-blue-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Card Back & Terms
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentUserRole === 'admin' && (
              <button
                onClick={handleRegenerateQr}
                disabled={isRegenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                title="Invalidate old QR code and generate new secure token"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                Rotate QR Token
              </button>
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Card
            </button>
          </div>
        </div>

        {/* PRINTABLE BADGE CONTAINER */}
        <div className="py-2 flex justify-center">
          {!showBackSide ? (
            /* FRONT OF BADGE - Standard CR80 ID Card dimensions (approx 85.6mm x 53.98mm ratio) */
            <div
              id="printable-id-card-front"
              className="w-[340px] h-[520px] bg-gradient-to-b from-blue-900 via-blue-800 to-slate-950 rounded-2xl shadow-xl border-2 border-blue-400/30 text-white relative overflow-hidden flex flex-col justify-between p-5"
            >
              {/* Decorative Brand Accent Background */}
              <div className="absolute -top-16 -right-16 w-44 h-44 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute top-1/2 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

              {/* Lanyard punch hole indicator */}
              <div className="w-12 h-2.5 bg-slate-900/60 rounded-full mx-auto border border-blue-400/40" />

              {/* Organization Header */}
              <div className="text-center mt-2">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm border border-blue-300">
                    E
                  </div>
                  <span className="font-extrabold tracking-wider text-sm text-white uppercase">
                    ECONET WIRELESS
                  </span>
                </div>
                <div className="text-[10px] tracking-widest uppercase font-semibold text-blue-200">
                  Field Sales & Distribution • Zimbabwe
                </div>
              </div>

              {/* BA Photo & Badge Tag */}
              <div className="flex flex-col items-center mt-2">
                <div className="relative">
                  <img
                    src={currentBa.photoUrl}
                    alt={currentBa.fullName}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg bg-slate-200"
                  />
                  <span className="absolute bottom-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white uppercase">
                    ACTIVE
                  </span>
                </div>

                <h4 className="mt-2 text-base font-bold text-center text-white tracking-wide">
                  {currentBa.fullName}
                </h4>

                <div className="mt-1 flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-400 text-blue-950 tracking-wider uppercase">
                    {currentBa.category === 'OMI' ? 'OMI MERCHANT SPECIALIST' : 'BRAND AMBASSADOR'}
                  </span>
                </div>

                <div className="mt-1 text-xs font-mono font-bold text-blue-200 tracking-wider">
                  {currentBa.baId}
                </div>
              </div>

              {/* QR Code Container (Crisp & Scannable) */}
              <div className="flex flex-col items-center justify-center bg-white p-2.5 rounded-xl shadow-md border border-slate-200 my-1">
                <QrCodeDisplay token={currentBa.qrToken} size={118} />
                <span className="text-[9px] font-mono font-medium text-slate-500 mt-1">
                  SECURE VERIFICATION TOKEN
                </span>
              </div>

              {/* Assignment Details Footer */}
              <div className="space-y-0.5 text-[10px] text-blue-100 border-t border-blue-700/60 pt-2 text-center">
                <div className="font-semibold text-white">
                  {currentBa.branch} • {currentBa.region}
                </div>
                <div className="text-blue-200">
                  Team: {currentBa.salesConsultantName}
                </div>
              </div>
            </div>
          ) : (
            /* BACK OF BADGE */
            <div
              id="printable-id-card-back"
              className="w-[340px] h-[520px] bg-slate-900 rounded-2xl shadow-xl border-2 border-slate-700 text-slate-200 relative overflow-hidden flex flex-col justify-between p-6"
            >
              {/* Lanyard punch hole indicator */}
              <div className="w-12 h-2.5 bg-slate-950 rounded-full mx-auto border border-slate-700" />

              <div>
                <div className="text-center border-b border-slate-800 pb-3">
                  <h5 className="font-bold text-white text-xs tracking-wider uppercase">
                    Credential Terms & Conditions
                  </h5>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Econet Wireless Zimbabwe Limited (Registration #1998/001)
                  </p>
                </div>

                <div className="mt-3 space-y-2 text-[10px] text-slate-300 leading-relaxed">
                  <p>
                    1. This identification card remains the exclusive property of Econet Wireless Zimbabwe.
                  </p>
                  <p>
                    2. The card must be visibly displayed at all times during official duty and activations.
                  </p>
                  <p>
                    3. The QR credential is cryptographically tied to the authorized BA. Sharing cards is strictly prohibited and subject to immediate deactivation.
                  </p>
                  <p>
                    4. In case of loss, damage, or theft, report immediately to the assigned Sales Consultant or Econet Security.
                  </p>
                </div>

                <div className="mt-4 p-2.5 bg-slate-800/80 rounded-lg border border-slate-700 text-[10px] space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                    <Phone className="w-3 h-3" />
                    <span>Emergency Hotline: 111 / +263 77 111 1111</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>Registered: {currentBa.dateRegistered}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Token Issued: {currentBa.qrGeneratedAt.split(' ')[0]}</span>
                  </div>
                </div>
              </div>

              {/* Barcode strip & Return Address */}
              <div className="text-center pt-3 border-t border-slate-800">
                <div className="font-mono text-[9px] text-slate-400 tracking-widest uppercase">
                  ECONET PARK • 2 OLD MUTARE ROAD • MSASA, HARARE
                </div>
                <div className="text-[9px] text-amber-400 font-semibold mt-1">
                  Reward if found: Return to nearest Econet Shop
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Notice Footer - Hidden on Print */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900 no-print">
          <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Zero-Confidential QR Architecture:</span> The QR code only encodes a revocable security token ({currentBa.qrToken.substring(0, 14)}...). No private commission amounts, national IDs, or personal records are stored inside the barcode.
          </div>
        </div>
      </div>
    </div>
  );
};

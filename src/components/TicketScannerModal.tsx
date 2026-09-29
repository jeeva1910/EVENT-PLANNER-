import React, { useState } from 'react';
import {
  X,
  QrCode,
  CheckCircle,
  AlertCircle,
  Search,
  UserCheck,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { IRegistration, IEvent } from '../types';

interface TicketScannerModalProps {
  onClose: () => void;
  onSuccessCheckIn?: () => void;
}

export const TicketScannerModal: React.FC<TicketScannerModalProps> = ({ onClose, onSuccessCheckIn }) => {
  const [ticketInput, setTicketInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    registration?: IRegistration;
    event?: IEvent;
    message?: string;
    error?: string;
  } | null>(null);

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || ticketInput).trim();
    if (!code) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.verifyTicket(code);
      setResult({
        registration: res.registration,
        event: res.event,
        message: res.message
      });

      if (!res.message.includes('already checked in')) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

      if (onSuccessCheckIn) {
        onSuccessCheckIn();
      }
    } catch (err: any) {
      setResult({
        error: err.message || 'Invalid or unregistered ticket code.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateScan = (sampleCode: string) => {
    setTicketInput(sampleCode);
    handleVerify(sampleCode);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display">Organizer Attendance Scanner</h3>
              <p className="text-xs text-slate-300">Live Ticket Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Scanner Simulation Box */}
          <div className="relative aspect-4/3 rounded-2xl bg-slate-950 border-2 border-indigo-500/50 flex flex-col items-center justify-center p-4 overflow-hidden group">
            {/* Animated Laser Scan Line */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-[bounce_2.5s_infinite]"></div>

            <QrCode className="w-16 h-16 text-indigo-400/40 mb-2" />
            <p className="text-xs text-indigo-200 font-medium text-center">
              Target Camera at Attendee QR Code
            </p>
            <p className="text-[10px] text-slate-400 mt-1">or type the 6-digit ticket ID below</p>

            {/* Quick test buttons */}
            <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
              <button
                type="button"
                onClick={() => handleSimulateScan('EH-TKT-782194')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-mono rounded-md border border-slate-700 transition-colors"
              >
                Scan Ticket #782194
              </button>
              <button
                type="button"
                onClick={() => handleSimulateScan('EH-TKT-491023')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-mono rounded-md border border-slate-700 transition-colors"
              >
                Scan Ticket #491023
              </button>
            </div>
          </div>

          {/* Manual Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="space-y-3"
          >
            <label className="block text-xs font-semibold text-slate-700">
              Manual Ticket ID Lookup
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. EH-TKT-782194"
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !ticketInput.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-xs shrink-0 flex items-center gap-1"
              >
                {loading ? 'Checking...' : 'Verify'}
              </button>
            </div>
          </form>

          {/* Verification Result Feedback */}
          {result && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-150">
              {result.error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-sm">Verification Failed</strong>
                    <p className="mt-0.5 text-red-700">{result.error}</p>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-4 rounded-2xl border ${
                    result.message?.includes('already checked in')
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        result.message?.includes('already checked in')
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    />
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-sm">{result.message}</p>
                      {result.event && (
                        <p className="text-slate-600">
                          <strong>Event:</strong> {result.event.title}
                        </p>
                      )}
                      {result.registration?.attendee && (
                        <div className="pt-2 border-t border-slate-200/50 flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-slate-500" />
                          <span>
                            <strong>Attendee:</strong> {result.registration.attendee.name} (
                            {result.registration.attendee.email})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};

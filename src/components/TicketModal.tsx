import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Calendar,
  MapPin,
  CheckCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  FileDown,
  Loader2,
  Users,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { IRegistration, IEvent } from '../types';
import { api } from '../services/api';
import { downloadTicketPdf } from '../utils/ticketPdf';

interface TicketModalProps {
  registration: IRegistration;
  event: IEvent;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  registration,
  event,
  onClose
}) => {
  const navigate = useNavigate();
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    async function generateQR() {
      try {
        const payload = JSON.stringify({
          ticketId: registration.ticketId,
          eventId: event._id,
          attendeeId: registration.attendeeId
        });
        const url = await QRCode.toDataURL(payload, {
          width: 280,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate QR code', err);
      }
    }
    generateQR();
  }, [registration, event]);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      setFeedback(null);
      await downloadTicketPdf({
        registration,
        event,
        attendeeName: (registration as any).attendee?.name,
        attendeeEmail: (registration as any).attendee?.email
      });
      setFeedback({ message: 'Ticket PDF downloaded successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Failed to generate ticket PDF', err);
      setFeedback({ message: err.message || 'Failed to download ticket PDF.', type: 'error' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    if (registration.ticketId) {
      navigator.clipboard.writeText(registration.ticketId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const isCheckedIn = registration.attendanceStatus === 'checked_in';
  const isWaitlisted = registration.status === 'waitlisted';
  const isCancelled = registration.status === 'cancelled';

  const startDate = new Date(event.startDateTime);
  const formattedDate = !isNaN(startDate.getTime())
    ? startDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Date TBD';
  const formattedTime = !isNaN(startDate.getTime())
    ? startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })
    : 'Time TBD';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Navigation Bar Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700"
              title="Return to Dashboard / Previous View"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold font-display leading-tight truncate max-w-[150px] sm:max-w-[200px]">
                  Verified Digital Ticket
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 font-mono">{registration.ticketId}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              to={`/tickets/${registration.ticketId}`}
              onClick={onClose}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700"
              title="Open full page ticket view with navigation"
            >
              <span>Full Page</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close ticket view (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* Printable Ticket Area */}
        <div ref={ticketRef} className="p-5 sm:p-6 space-y-5 max-h-[68vh] overflow-y-auto">
          {/* Status Banner */}
          {isCancelled ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Ticket Cancelled {registration.cancelledAt ? `on ${new Date(registration.cancelledAt).toLocaleDateString()}` : ''} – Inactive
              </span>
            </div>
          ) : isCheckedIn ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Checked in on {new Date(registration.checkedInAt!).toLocaleTimeString()}</span>
            </div>
          ) : isWaitlisted ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs font-semibold">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Waitlist Status: Position #{registration.waitlistPosition || 1} (Pending promotion)</span>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-blue-800 text-xs font-semibold">
              <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Confirmed Pass – Ready for Entrance & QR Check-in</span>
            </div>
          )}

          {/* Event Header */}
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-blue-600">
              {event.category} · {event.eventType}
              {registration.registrationType === 'team' && (
                <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-semibold border border-indigo-100">
                  Team: {registration.teamName || 'Team Pass'}
                </span>
              )}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-display leading-tight">
              {event.title}
            </h2>
          </div>

          {/* Timing & Venue */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Date & Time
              </span>
              <p className="font-semibold text-slate-900">{formattedDate}</p>
              <p className="text-slate-600">{formattedTime}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Venue Location
              </span>
              <p className="font-semibold text-slate-900 truncate">{event.venueName}</p>
              <p className="text-slate-600 truncate">{[event.address, event.city].filter(Boolean).join(', ')}</p>
            </div>
          </div>

          {/* QR Code Presentation */}
          <div className="flex flex-col items-center justify-center p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            {qrDataUrl ? (
              <div className="relative p-2.5 bg-white rounded-xl shadow-xs border border-slate-200">
                <img
                  src={qrDataUrl}
                  alt="Ticket QR Code"
                  className={`w-44 h-44 sm:w-48 sm:h-48 rounded-lg ${
                    isCancelled ? 'opacity-40 grayscale' : ''
                  }`}
                />
              </div>
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <p className="text-xs sm:text-sm font-mono font-bold text-slate-900 tracking-wider">
                {registration.ticketId}
              </p>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                title="Copy ticket code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-1 text-center">
              {isCancelled
                ? 'This ticket code has been cancelled and will not scan.'
                : 'Show this QR code at the entrance for instant check-in'}
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Close & Back</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              title="Download printable high-resolution PDF ticket pass"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <a
              href={api.getIcsDownloadUrl(event._id)}
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1"
              title="Export .ics Calendar"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>.ics</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

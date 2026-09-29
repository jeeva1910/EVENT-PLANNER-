import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Download,
  Printer,
  Calendar,
  MapPin,
  CheckCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  FileDown,
  Loader2,
  Users
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
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display">EventHub Verified Ticket</h3>
              <p className="text-xs text-slate-300 font-mono">{registration.ticketId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
        <div ref={ticketRef} className="p-6 space-y-6">
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
            <h2 className="text-xl font-bold text-slate-900 mt-1 font-display leading-tight">
              {event.title}
            </h2>
          </div>

          {/* Timing & Venue */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
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
              <p className="text-slate-600 truncate">{event.city}</p>
            </div>
          </div>

          {/* QR Code Presentation */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Ticket QR Code"
                className={`w-48 h-48 rounded-xl shadow-xs border border-white bg-white p-2 ${
                  isCancelled ? 'opacity-40 grayscale' : ''
                }`}
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                Generating secure QR...
              </div>
            )}
            <p className="mt-3 text-xs font-mono font-bold text-slate-800 tracking-wider">
              {registration.ticketId}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {isCancelled
                ? 'This ticket code has been cancelled and will not scan.'
                : 'Show this QR code at the entrance for instant check-in'}
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-xs font-medium text-slate-500">
            {isCancelled ? (
              <span className="text-rose-600 font-semibold">Cancelled Ticket Pass</span>
            ) : isCheckedIn ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Checked In at Venue
              </span>
            ) : isWaitlisted ? (
              <span className="text-amber-600 font-semibold">Waitlist Pass #{registration.waitlistPosition || 1}</span>
            ) : (
              <span className="text-slate-600 font-medium">Valid Entrance Pass</span>
            )}
          </div>

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
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download Ticket (PDF)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5"
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

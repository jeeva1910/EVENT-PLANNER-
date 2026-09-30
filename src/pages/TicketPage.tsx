import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Printer,
  FileDown,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Navigation,
  Compass,
  Ticket,
  User,
  Users
} from 'lucide-react';
import { api } from '../services/api';
import { IRegistration, IEvent } from '../types';
import { downloadTicketPdf } from '../utils/ticketPdf';
import { useAuth } from '../context/AuthContext';

export const TicketPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<IRegistration | null>(null);
  const [event, setEvent] = useState<IEvent | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedTicketId, setCopiedTicketId] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadTicket() {
      if (!ticketId) {
        setError('No ticket code specified.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await api.getTicketDetails(ticketId);
        setRegistration(res.registration);
        setEvent(res.event);

        // Generate QR code
        const payload = JSON.stringify({
          ticketId: res.registration.ticketId,
          eventId: res.event._id,
          attendeeId: res.registration.attendeeId
        });

        const url = await QRCode.toDataURL(payload, {
          width: 320,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
        setQrDataUrl(url);
      } catch (err: any) {
        setError(err.message || 'Unable to load ticket details.');
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [ticketId]);

  const handleDownloadPdf = async () => {
    if (!registration || !event) return;
    try {
      setDownloadingPdf(true);
      setFeedback(null);
      await downloadTicketPdf({
        registration,
        event,
        attendeeName: (registration as any).attendee?.name || user?.name,
        attendeeEmail: (registration as any).attendee?.email || user?.email
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

  const handleCopyTicketId = () => {
    if (registration?.ticketId) {
      navigator.clipboard.writeText(registration.ticketId);
      setCopiedTicketId(true);
      setTimeout(() => setCopiedTicketId(false), 2000);
    }
  };

  const handleBackNavigation = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/dashboard/attendee');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading your verified digital ticket...</p>
      </div>
    );
  }

  if (error || !registration || !event) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 font-display">Ticket Pass Unavailable</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {error || 'The requested ticket could not be found or you do not have permission to view it.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={handleBackNavigation}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to My Tickets</span>
          </button>
          <Link
            to="/explore"
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <Compass className="w-4 h-4 text-slate-600" />
            <span>Explore Events</span>
          </Link>
        </div>
      </div>
    );
  }

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

  const destinationAddress = [event.venueName, event.address, event.city].filter(Boolean).join(', ');
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destinationAddress || 'Event Location'
  )}`;

  return (
    <div className="min-h-[85vh] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Persistent Navigation Subheader */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackNavigation}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Return to previous page or dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {/* Breadcrumb links */}
            <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
              <span>/</span>
              <Link to="/dashboard/attendee" className="hover:text-slate-900 transition-colors">My Tickets</Link>
              <span>/</span>
              <span className="text-slate-900 font-bold font-mono truncate max-w-[120px] sm:max-w-none">
                {registration.ticketId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              to="/dashboard/attendee"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Ticket className="w-3.5 h-3.5 text-blue-600" />
              <span>All Tickets</span>
            </Link>
            <Link
              to="/explore"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Explore</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className="max-w-3xl mx-auto">
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs ${
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
        </div>
      )}

      {/* Main Ticket Card Pass */}
      <div className="max-w-3xl mx-auto">
        <div
          ref={ticketRef}
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header Bar */}
          <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold font-display">EventHub Verified Digital Pass</h3>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-mono rounded-md border border-blue-400/30">
                    Official Pass
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono mt-0.5">{registration.ticketId}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTicketId}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                title="Copy ticket alphanumeric code"
              >
                {copiedTicketId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTicketId ? 'Copied Code' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Status Banner */}
            {isCancelled ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start sm:items-center gap-3 text-rose-900 text-xs font-semibold">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <p className="font-bold text-sm">Ticket Pass Cancelled & Inactive</p>
                  <p className="text-rose-700 font-normal mt-0.5">
                    This registration was cancelled {registration.cancelledAt ? `on ${new Date(registration.cancelledAt).toLocaleDateString()}` : ''}. It is invalid for entrance check-in.
                  </p>
                </div>
              </div>
            ) : isCheckedIn ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">Checked In at Venue Entrance</p>
                  <p className="text-emerald-700 font-normal mt-0.5">
                    Attendance verified on {new Date(registration.checkedInAt!).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : isWaitlisted ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 text-xs font-semibold">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">Waitlist Queue Position #{registration.waitlistPosition || 1}</p>
                  <p className="text-amber-700 font-normal mt-0.5">
                    You are in line for promotion when a seat becomes available.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-blue-900 text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">Confirmed Ticket Pass</p>
                  <p className="text-blue-700 font-normal mt-0.5">
                    Present this QR pass on your mobile screen or printable copy at the entrance desk.
                  </p>
                </div>
              </div>
            )}

            {/* Event Overview */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  {event.category}
                </span>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  {event.eventType} Event
                </span>
                {registration.registrationType === 'team' && (
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Team Pass: {registration.teamName || 'Team'}
                  </span>
                )}
              </div>

              <Link
                to={`/events/${event._id}`}
                className="group inline-flex items-center gap-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 font-display hover:text-blue-600 transition-colors leading-snug"
              >
                <span>{event.title}</span>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </Link>
            </div>

            {/* Date, Time & Venue Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <div className="space-y-1.5">
                <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Date & Time
                </span>
                <p className="font-bold text-slate-900 text-sm">{formattedDate}</p>
                <p className="text-slate-600">{formattedTime} ({event.timezone || 'Local Time'})</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Venue & Location
                </span>
                <p className="font-bold text-slate-900 text-sm truncate">{event.venueName}</p>
                <p className="text-slate-600 truncate">{[event.address, event.city].filter(Boolean).join(', ')}</p>
                {destinationAddress && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors mt-0.5"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Get Directions in Maps</span>
                  </a>
                )}
              </div>
            </div>

            {/* Attendee Details Card */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700 font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold block">
                    Registered Attendee
                  </span>
                  <p className="font-bold text-slate-900">
                    {(registration as any).attendee?.name || user?.name || 'Attendee'}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    {(registration as any).attendee?.email || user?.email}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold block">
                  Registration ID
                </span>
                <p className="font-mono font-bold text-slate-700 text-[11px]">{registration._id}</p>
                <p className="text-[10px] text-slate-400">
                  Booked on {new Date(registration.registeredAt || (registration as any).createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* QR Code Presentation */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              {qrDataUrl ? (
                <div className="relative p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                  <img
                    src={qrDataUrl}
                    alt="Ticket QR Code"
                    className={`w-52 h-52 sm:w-60 sm:h-60 rounded-xl ${
                      isCancelled ? 'opacity-30 grayscale' : ''
                    }`}
                  />
                </div>
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              )}

              <div className="mt-4 text-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
                  Official Ticket Code
                </span>
                <p className="text-base sm:text-lg font-mono font-extrabold text-slate-900 tracking-widest mt-0.5">
                  {registration.ticketId}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {isCancelled
                    ? 'This ticket is cancelled and cannot be scanned for entry.'
                    : 'Show this QR code at the event entrance for fast, contactless check-in.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold text-slate-500">
              {isCancelled ? (
                <span className="text-rose-600">Inactive Pass</span>
              ) : isCheckedIn ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Entrance Verified
                </span>
              ) : (
                <span className="text-slate-700">Valid Entrance Pass</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="px-4 py-2.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-2 shadow-xs"
              >
                {downloadingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 text-blue-600" />
                    <span>Download PDF Ticket</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-2xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>

              <a
                href={api.getIcsDownloadUrl(event._id)}
                className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Export .ics Calendar"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Calendar (.ics)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

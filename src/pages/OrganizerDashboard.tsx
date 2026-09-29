import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  CheckCircle,
  Clock,
  PlusCircle,
  QrCode,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  TrendingUp,
  UserCheck,
  Search,
  ExternalLink,
  ShieldCheck,
  X,
  Ban,
  Download,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  UserX
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IEvent, IRegistration } from '../types';
import { TicketScannerModal } from '../components/TicketScannerModal';

export const OrganizerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [events, setEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showScanner, setShowScanner] = useState(false);
  const [selectedEventAttendees, setSelectedEventAttendees] = useState<{
    event: IEvent;
    attendees: IRegistration[];
  } | null>(null);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  // Participant Cancellation State
  const [cancelParticipantTarget, setCancelParticipantTarget] = useState<{
    registration: IRegistration;
    event: IEvent;
  } | null>(null);
  const [cancellingParticipant, setCancellingParticipant] = useState(false);
  const [participantFeedback, setParticipantFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, eventsRes] = await Promise.all([
        api.getOrganizerAnalytics(),
        api.getEvents({ organizerId: user?._id, status: '' })
      ]);
      setAnalytics(analyticsRes || null);
      setEvents(eventsRes?.events || []);
    } catch (err) {
      console.error('Failed to load organizer dashboard', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleOpenAttendees = async (event: IEvent) => {
    try {
      setLoadingAttendees(true);
      setParticipantFeedback(null);
      setCancelParticipantTarget(null);
      const res = await api.getEventAttendees(event._id);
      setSelectedEventAttendees({
        event,
        attendees: res?.attendees || []
      });
    } catch (err) {
      alert('Failed to load event attendee roster');
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleConfirmCancelParticipant = async () => {
    if (!cancelParticipantTarget) return;
    try {
      setCancellingParticipant(true);
      setParticipantFeedback(null);
      const res = await api.cancelRegistration(cancelParticipantTarget.registration._id);
      const successMsg = res.refundMessage || res.message || 'Participant registration cancelled successfully.';
      setParticipantFeedback({
        type: 'success',
        message: successMsg
      });

      // Refresh attendee list for this event
      const updatedRoster = await api.getEventAttendees(cancelParticipantTarget.event._id);
      setSelectedEventAttendees(prev => prev ? {
        ...prev,
        attendees: updatedRoster?.attendees || []
      } : null);

      // Refresh dashboard metrics
      await fetchDashboardData();
      setCancelParticipantTarget(null);
    } catch (err: any) {
      setParticipantFeedback({
        type: 'error',
        message: err.message || 'Failed to cancel participant registration.'
      });
    } finally {
      setCancellingParticipant(false);
    }
  };

  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleExportCsv = async (eventId: string, eventTitle: string) => {
    try {
      setExportingId(eventId);
      const blob = await api.exportAttendeesCsv(eventId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_')}-attendees.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export attendee roster');
    } finally {
      setExportingId(null);
    }
  };

  const handleCancelEvent = async (event: IEvent) => {
    if (!window.confirm(`Are you sure you want to cancel "${event.title}"? All registered attendees will receive a cancellation notification and new registrations will be blocked.`)) {
      return;
    }
    try {
      await api.cancelEvent(event._id);
      alert('Event cancelled successfully. Registered participants have been notified.');
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event? All associated registrations, tickets, feedback, and reports will also be permanently removed.')) {
      return;
    }
    try {
      await api.deleteEvent(eventId);
      alert('Event deleted successfully.');
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    }
  };

  const handleToggleStatus = async (event: IEvent, newStatus: string) => {
    try {
      await api.updateEventStatus(event._id, newStatus);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to change event status');
    }
  };

  const filteredEvents = (events || []).filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const summary = analytics?.summary || {
    totalEvents: 0,
    publishedEvents: 0,
    totalRegistrations: 0,
    totalCheckedIn: 0,
    totalWaitlisted: 0,
    attendanceRate: 0,
    capacityUtilization: 0
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            Organizer Command Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            {user?.organization || 'Apex Developer Network'} Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Real-time registration counts, ticket verification, and session attendance metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            <span>Launch QR Ticket Scanner</span>
          </button>

          <Link
            to="/events/create"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Event</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Total Events</span>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {summary.totalEvents}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Published</span>
          <p className="text-2xl font-bold text-blue-600 font-mono tabular-nums">
            {summary.publishedEvents}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Registrations</span>
          <p className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">
            {summary.totalRegistrations}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Checked In</span>
          <p className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
            {summary.totalCheckedIn}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Waitlisted</span>
          <p className="text-2xl font-bold text-amber-600 font-mono tabular-nums">
            {summary.totalWaitlisted}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Attendance Rate</span>
          <p className="text-2xl font-bold text-purple-600 font-mono tabular-nums">
            {summary.attendanceRate}%
          </p>
        </div>
      </div>

      {/* Analytics Visualizations with Recharts */}
      {analytics?.eventBreakdown && analytics.eventBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Capacity vs Registered Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Capacity Utilization & Attendance
              </h3>
              <span className="text-xs text-slate-400">By Event</span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.eventBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="title" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="capacity" name="Total Capacity" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="confirmed" name="Confirmed" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="checkedIn" name="Checked In" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Registration Trend Line */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Daily Registration Volume
              </h3>
              <span className="text-xs text-slate-400">Activity Over Time</span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }} />
                  <Line type="monotone" dataKey="registrations" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Events Management Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
        <div className="p-6 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              Managed Events ({events.length})
            </h2>
            <p className="text-xs text-slate-500">Edit agendas, track attendee check-in rates, and manage capacity</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search your events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No events found. Click "New Event" above to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-y border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Event</th>
                  <th className="py-3 px-4">Date & City</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4">Checked In</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((evt) => (
                  <tr key={evt._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <img
                          src={evt.poster}
                          alt={evt.title}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 max-w-xs">
                          <p className="font-bold text-slate-900 truncate font-display">{evt.title}</p>
                          <span className="text-[10px] text-slate-500">{evt.category} · {evt.eventType}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600">
                      <div>{new Date(evt.startDateTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{evt.city}</div>
                    </td>
                    <td className="py-4 px-4 font-mono tabular-nums text-slate-700">
                      {evt.capacity}
                    </td>
                    <td className="py-4 px-4 font-mono tabular-nums font-bold text-blue-600">
                      {evt.registeredCount || 0}
                    </td>
                    <td className="py-4 px-4 font-mono tabular-nums font-bold text-emerald-600">
                      {evt.status === 'published' ? (
                        <button
                          onClick={() => handleOpenAttendees(evt)}
                          className="hover:underline flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>View Roster</span>
                        </button>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          evt.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : evt.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenAttendees(evt)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Attendees Roster"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExportCsv(evt._id, evt.title)}
                        disabled={exportingId === evt._id}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Export Attendees (CSV)"
                      >
                        {exportingId === evt._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4" />
                        )}
                      </button>
                      <Link
                        to={`/events/${evt._id}/edit`}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors inline-block"
                        title="Edit Event"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      {evt.status !== 'cancelled' ? (
                        <button
                          onClick={() => handleCancelEvent(evt)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Cancel Event"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(evt, 'published')}
                          className="p-1.5 text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Re-publish Event"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <Link
                        to={`/events/${evt._id}`}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors inline-block"
                        title="View Public Page"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteEvent(evt._id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Scanner Modal */}
      {showScanner && (
        <TicketScannerModal
          onClose={() => setShowScanner(false)}
          onSuccessCheckIn={fetchDashboardData}
        />
      )}

      {/* Attendee Roster Drawer / Modal */}
      {selectedEventAttendees && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display">Registered Attendees Roster</h3>
                  <p className="text-xs text-slate-300 truncate max-w-sm">
                    {selectedEventAttendees.event.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedEventAttendees(null);
                  setParticipantFeedback(null);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback Alert within Roster */}
            {participantFeedback && (
              <div
                className={`mx-4 mt-3 p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                  participantFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <span>{participantFeedback.message}</span>
                <button
                  onClick={() => setParticipantFeedback(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {selectedEventAttendees.attendees.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No registrations yet for this event.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEventAttendees.attendees.map((reg) => (
                    <div
                      key={reg._id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={reg.attendee?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                            alt={reg.attendee?.name || 'Attendee'}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {reg.attendee?.name || 'Attendee'}
                              </span>
                              {reg.registrationType === 'team' ? (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md font-bold text-[10px]">
                                  Team: {reg.teamName || 'Team'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-medium text-[10px]">
                                  Individual
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px]">{reg.attendee?.email} · {reg.attendee?.phone || 'No phone'}</p>
                            <span className="font-mono text-[10px] text-blue-600 font-bold">
                              Ticket #{reg.ticketId}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {reg.paymentDetails && reg.paymentDetails.pricingType === 'paid' && (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                              Paid ₹{reg.paymentDetails.amount}
                            </span>
                          )}
                          {reg.status === 'cancelled' ? (
                            <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200">
                              Cancelled {reg.cancelledAt ? `(${new Date(reg.cancelledAt).toLocaleDateString()})` : ''}
                            </span>
                          ) : reg.attendanceStatus === 'checked_in' ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Checked In
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-slate-500 bg-slate-200 px-2.5 py-1 rounded-lg">
                                {reg.status === 'waitlisted' ? `Waitlisted (#${reg.waitlistPosition || 1})` : 'Not Checked In'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setParticipantFeedback(null);
                                  setCancelParticipantTarget({
                                    registration: reg,
                                    event: selectedEventAttendees.event
                                  });
                                }}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg border border-rose-200 text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                                title="Cancel this participant registration"
                              >
                                <UserX className="w-3 h-3 text-rose-600" />
                                <span>Cancel Registration</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Team Member List if Team Registration */}
                      {reg.registrationType === 'team' && reg.teamMembers && reg.teamMembers.length > 0 && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Team Members ({reg.teamMembers.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {reg.teamMembers.map((m, idx) => (
                              <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                                <p className="font-bold text-slate-900">
                                  {m.firstName} {m.lastName} {m.isLeader && <span className="text-indigo-600 font-normal">(Leader)</span>}
                                </p>
                                <p className="text-slate-500">{m.email} · {m.phone || 'No phone'}</p>
                                {m.college && <p className="text-slate-600 text-[10px]">{m.college}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Answers if present */}
                      {reg.customAnswers && Object.keys(reg.customAnswers).length > 0 && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-[11px]">
                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                            Custom Form Responses:
                          </span>
                          {Object.entries(reg.customAnswers).map(([k, val], idx) => (
                            <div key={idx} className="flex items-start gap-1">
                              <span className="font-medium text-slate-500">{k}:</span>
                              <span className="text-slate-800 font-semibold">{Array.isArray(val) ? val.join(', ') : String(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
              <span className="font-medium">Total Registrations: {selectedEventAttendees.attendees.length}</span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleExportCsv(selectedEventAttendees.event._id, selectedEventAttendees.event.title)}
                  disabled={exportingId === selectedEventAttendees.event._id || selectedEventAttendees.attendees.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  title="Export complete attendee roster to CSV file"
                >
                  {exportingId === selectedEventAttendees.event._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  )}
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setSelectedEventAttendees(null)}
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Close Roster
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Organizer Cancelling Participant Registration */}
      {cancelParticipantTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Cancel Participant Registration?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to cancel the registration for{' '}
                <strong className="text-slate-900 font-semibold">
                  {cancelParticipantTarget.registration.attendee?.name || 'this participant'}
                </strong>{' '}
                (Ticket <span className="font-mono text-blue-600 font-bold">{cancelParticipantTarget.registration.ticketId}</span>) for the event{' '}
                <strong className="text-slate-900 font-semibold">
                  "{cancelParticipantTarget.event.title}"
                </strong>?
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 text-left space-y-1">
                <p className="font-semibold">Important Notes:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
                  <li>The attendee will be notified of the cancellation.</li>
                  <li>Ticket pass #{cancelParticipantTarget.registration.ticketId} will be permanently invalidated and rejected at entrance scanning.</li>
                  <li>If eligible waitlisted participants exist, the next person in queue will be automatically promoted.</li>
                  {cancelParticipantTarget.registration.paymentDetails?.pricingType === 'paid' && (
                    <li>This is a paid ticket (₹{cancelParticipantTarget.registration.paymentDetails.amount}). Refunds must be processed through your payment gateway.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelParticipantTarget(null)}
                disabled={cancellingParticipant}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Keep Registration
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelParticipant}
                disabled={cancellingParticipant}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                {cancellingParticipant ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Registration</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

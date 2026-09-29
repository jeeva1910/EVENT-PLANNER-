import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  QrCode,
  AlertCircle,
  CheckCircle,
  Download,
  Star,
  ExternalLink,
  Compass,
  XCircle,
  Users,
  Send,
  Trash2,
  UserCheck,
  RefreshCw,
  Mail,
  Copy,
  Check,
  FileDown,
  Loader2,
  AlertTriangle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IRegistration, IEvent } from '../types';
import { TicketModal } from '../components/TicketModal';
import { FeedbackModal } from '../components/FeedbackModal';
import { downloadTicketPdf } from '../utils/ticketPdf';

export const AttendeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<IRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'confirmed' | 'teams' | 'waitlisted' | 'past' | 'cancelled'>('confirmed');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Active ticket modal
  const [selectedReg, setSelectedReg] = useState<{ reg: IRegistration; event: IEvent } | null>(null);

  // Remove Member Confirmation Dialog
  const [memberToRemove, setMemberToRemove] = useState<{
    registrationId: string;
    memberEmail: string;
    memberName: string;
  } | null>(null);

  // Feedback modal
  const [feedbackEvent, setFeedbackEvent] = useState<{ id: string; title: string } | null>(null);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const res = await api.getMyRegistrations();
      setRegistrations(res?.registrations || []);
    } catch (err) {
      console.error('Failed to load my registrations', err);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleDownloadTicket = async (reg: IRegistration) => {
    if (!reg.event) return;
    try {
      setDownloadingId(reg._id);
      setActionNotice(null);
      await downloadTicketPdf({
        registration: reg,
        event: reg.event,
        attendeeName: user?.name,
        attendeeEmail: user?.email
      });
      setActionNotice({
        message: `Ticket pass ${reg.ticketId} downloaded successfully as PDF!`,
        type: 'success'
      });
    } catch (err: any) {
      setActionNotice({
        message: err.message || 'Failed to generate ticket PDF.',
        type: 'error'
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Team Leader Actions
  const handleResendInvitation = async (invitationId: string) => {
    try {
      setActionLoadingId(invitationId);
      setActionNotice(null);
      const res = await api.resendTeamInvitation(invitationId);
      setActionNotice({ message: res.message || 'Invitation resent successfully!', type: 'success' });
      await fetchRegistrations();
    } catch (err: any) {
      setActionNotice({ message: err.message || 'Failed to resend invitation.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecuteRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      setActionLoadingId(memberToRemove.memberEmail);
      setActionNotice(null);
      await api.removeTeamMember(memberToRemove.registrationId, memberToRemove.memberEmail);
      setActionNotice({ message: `Removed ${memberToRemove.memberName} from team roster.`, type: 'success' });
      setMemberToRemove(null);
      await fetchRegistrations();
    } catch (err: any) {
      setActionNotice({ message: err.message || 'Failed to remove member.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyLink = (tokenOrUrl: string) => {
    const fullUrl = tokenOrUrl.startsWith('http') ? tokenOrUrl : `${window.location.origin}/invitations/${tokenOrUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(tokenOrUrl);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const safeList = registrations || [];
  const confirmedList = safeList.filter(
    r => r.status === 'confirmed' && (!r.event || new Date(r.event.endDateTime) >= new Date())
  );
  const teamList = safeList.filter(
    r => r.registrationType === 'team' || r.status === 'pending_members'
  );
  const waitlistedList = safeList.filter(r => r.status === 'waitlisted');
  const pastList = safeList.filter(
    r => r.status === 'confirmed' && r.event && new Date(r.event.endDateTime) < new Date()
  );
  const cancelledList = safeList.filter(r => r.status === 'cancelled');

  const renderMemberStatusChip = (status?: string, isLeader?: boolean) => {
    if (isLeader) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
          <UserCheck className="w-3 h-3" /> Team Leader
        </span>
      );
    }

    switch (status) {
      case 'accepted':
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Accepted
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Declined
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3 h-3" /> Expired
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3 h-3" /> Invitation Sent
          </span>
        );
      case 'pending':
      case 'pending_acceptance':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending Acceptance
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
            Attendee Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Manage your verified tickets, download official PDF passes, monitor team invitations, and sync upcoming event schedules.
          </p>
        </div>

        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 self-start sm:self-auto"
        >
          <Compass className="w-4 h-4" />
          <span>Discover More Events</span>
        </Link>
      </div>

      {actionNotice && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
              : 'bg-rose-50 text-rose-800 border border-rose-200 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Confirmed Passes</span>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {confirmedList.length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Team Registrations</span>
          <p className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">
            {teamList.length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Waitlisted Requests</span>
          <p className="text-2xl font-bold text-amber-600 font-mono tabular-nums">
            {waitlistedList.length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Events Attended</span>
          <p className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
            {pastList.length}
          </p>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl max-w-fit border border-slate-200">
        <button
          onClick={() => setActiveTab('confirmed')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'confirmed'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Upcoming Passes ({confirmedList.length})
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'teams'
              ? 'bg-white text-indigo-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>My Teams ({teamList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('waitlisted')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'waitlisted'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Waitlist ({waitlistedList.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'past'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Past Events ({pastList.length})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'cancelled'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Cancelled ({cancelledList.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading your registrations...</span>
        </div>
      ) : activeTab === 'teams' ? (
        /* Team Registrations & Invitations Management */
        teamList.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Team Registrations</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't formed or joined any teams yet. Register for hackathons and team competitions to manage members here.
            </p>
            <Link
              to="/explore"
              className="inline-block mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Explore Team Events
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {teamList.map(reg => {
              const evt = reg.event;
              if (!evt) return null;

              const isLeader = reg.teamLeaderId === user?._id || reg.attendeeId === user?._id;
              const members = reg.teamMembers || [];
              const acceptedMembersCount = members.filter(
                m => m.status === 'accepted' || m.status === 'confirmed' || m.isLeader
              ).length;
              const totalMembers = members.length || 1;
              const minTeam = evt.teamSettings?.minTeamSize || 2;
              const isPending = reg.status === 'pending_members';

              return (
                <div
                  key={reg._id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Team Card Header */}
                  <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                          {evt.category}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-medium">Team Roster</span>
                        <span className="text-slate-400">•</span>
                        {isPending ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Pending Acceptances ({acceptedMembersCount}/{totalMembers})
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Team Confirmed
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-900 font-display">
                        Team "{reg.teamName}"
                      </h2>
                      <p className="text-xs text-slate-600">
                        Competing in <Link to={`/events/${evt._id}`} className="font-semibold text-blue-600 hover:underline">{evt.title}</Link>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {reg.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => setSelectedReg({ reg, event: evt })}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>View Pass</span>
                          </button>
                          <button
                            onClick={() => handleDownloadTicket(reg)}
                            disabled={downloadingId === reg._id}
                            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                            title="Download PDF Ticket"
                          >
                            <FileDown className="w-3.5 h-3.5 text-blue-600" />
                            <span>PDF</span>
                          </button>
                        </>
                      )}


                      <Link
                        to={`/events/${evt._id}`}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                      >
                        Event Details
                      </Link>
                    </div>
                  </div>

                  {/* Pending Notice Message */}
                  {isPending && (
                    <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-100 text-xs text-amber-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Your team registration will be completed once all required members have accepted their invitations. (Minimum: {minTeam} members)
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-900 shrink-0">
                        {acceptedMembersCount} of {totalMembers} Accepted
                      </span>
                    </div>
                  )}

                  {/* Team Members List */}
                  <div className="p-5 sm:p-6 space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Members & Invitation Statuses
                    </h3>

                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                      {members.map((member, idx) => {
                        const isMemberLeader = member.isLeader || member.userId === reg.teamLeaderId;
                        return (
                          <div
                            key={idx}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 mt-0.5">
                                {isMemberLeader ? '👑' : idx + 1}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-slate-900">
                                    {member.firstName} {member.lastName || ''}
                                  </span>
                                  {renderMemberStatusChip(member.status, isMemberLeader)}
                                </div>
                                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    {member.email}
                                  </span>
                                  {member.college && <span>· {member.college}</span>}
                                  {member.course && <span>· {member.course}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Team Leader Actions for this member */}
                            {isLeader && !isMemberLeader && (
                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {(member.status === 'pending' || member.status === 'sent' || member.status === 'expired') && member.invitationId && (
                                  <button
                                    onClick={() => handleResendInvitation(member.invitationId!)}
                                    disabled={actionLoadingId === member.invitationId}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors disabled:opacity-50"
                                    title="Invalidates previous token and emails a fresh invitation link"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${actionLoadingId === member.invitationId ? 'animate-spin' : ''}`} />
                                    <span>Resend</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => setMemberToRemove({
                                    registrationId: reg._id,
                                    memberEmail: member.email,
                                    memberName: `${member.firstName} ${member.lastName || ''}`.trim()
                                  })}
                                  disabled={actionLoadingId === member.email}
                                  className="inline-flex items-center gap-1 p-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Remove Member from Team"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'confirmed' && confirmedList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <QrCode className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Active Tickets</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not have any upcoming registered events. Explore the directory to claim tickets!
          </p>
          <Link
            to="/explore"
            className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-colors"
          >
            Explore Events
          </Link>
        </div>
      ) : activeTab === 'waitlisted' && waitlistedList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Waitlisted Events</h3>
          <p className="text-xs text-slate-500">You are not currently in any waitlist queues.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'confirmed'
            ? confirmedList
            : activeTab === 'waitlisted'
            ? waitlistedList
            : activeTab === 'past'
            ? pastList
            : cancelledList
          ).map((reg) => {
            const evt = reg.event;
            if (!evt) return null;

            const startDate = new Date(evt.startDateTime);
            const formattedDate = !isNaN(startDate.getTime())
              ? startDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'TBD';

            return (
              <div
                key={reg._id}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-2xs"
              >
                {/* Event Info */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <img
                    src={evt.poster}
                    alt={evt.title}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 hidden sm:block"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-blue-600">{evt.category}</span>
                      <span>·</span>
                      <span className="font-mono">{formattedDate}</span>
                      <span>·</span>
                      <span className="font-mono font-bold text-slate-900">{reg.ticketId}</span>
                      {reg.teamName && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-indigo-600 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {reg.teamName}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 truncate font-display">
                      <Link to={`/events/${evt._id}`} className="hover:text-blue-600 transition-colors">
                        {evt.title}
                      </Link>
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {evt.venueName}, {evt.city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Status & Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  {reg.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => setSelectedReg({ reg, event: evt })}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>View Pass</span>
                      </button>

                      <button
                        onClick={() => handleDownloadTicket(reg)}
                        disabled={downloadingId === reg._id}
                        className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                        title="Download printable high-resolution PDF ticket"
                      >
                        {downloadingId === reg._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>Download PDF</span>
                      </button>

                      <a
                        href={api.getIcsDownloadUrl(evt._id)}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                        title="Download .ics Calendar"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                    </>
                  )}

                  {reg.status === 'waitlisted' && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                      Waitlist Position: #{reg.waitlistPosition || 1}
                    </span>
                  )}

                  {reg.status === 'cancelled' && (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">
                      Cancelled
                    </span>
                  )}

                  {activeTab === 'past' && (
                    <button
                      onClick={() => setFeedbackEvent({ id: evt._id, title: evt.title })}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-200 flex items-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>Review Event</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Modal */}
      {selectedReg && (
        <TicketModal
          registration={selectedReg.reg}
          event={selectedReg.event}
          onClose={() => setSelectedReg(null)}
        />
      )}

      {/* Custom Remove Member Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Remove Team Member?
                </h3>
                <p className="text-xs text-slate-600">
                  Are you sure you want to remove <span className="font-semibold text-slate-900">{memberToRemove.memberName}</span> ({memberToRemove.memberEmail}) from the team? Any active invitations for this email will be invalidated.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={actionLoadingId === memberToRemove.memberEmail}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRemoveMember}
                disabled={actionLoadingId === memberToRemove.memberEmail}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                {actionLoadingId === memberToRemove.memberEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Remove Member</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackEvent && (
        <FeedbackModal
          eventId={feedbackEvent.id}
          eventTitle={feedbackEvent.title}
          onClose={() => setFeedbackEvent(null)}
          onSuccess={() => {
            setActionNotice({ message: 'Feedback submitted successfully!', type: 'success' });
            fetchRegistrations();
          }}
        />
      )}
    </div>
  );
};

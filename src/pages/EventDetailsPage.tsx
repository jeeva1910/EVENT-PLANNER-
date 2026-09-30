import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Building,
  Globe,
  Share2,
  Bookmark,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Download,
  Star,
  MessageSquare,
  AlertTriangle,
  User,
  Phone,
  Mail,
  ArrowLeft,
  CreditCard,
  FileText,
  Sparkles,
  Info,
  Ban,
  Trophy,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { IEvent, IRegistration, IFeedback } from '../types';
import { useAuth } from '../context/AuthContext';
import { ScheduleTimeline } from '../components/ScheduleTimeline';
import { AccessibilityBadges } from '../components/AccessibilityBadges';
import { MapAndDirections } from '../components/MapAndDirections';
import { TicketModal } from '../components/TicketModal';
import { FeedbackModal } from '../components/FeedbackModal';
import { ReportModal } from '../components/ReportModal';
import { TeamRegistrationWizard } from '../components/TeamRegistrationWizard';
import { PrizesDisplay } from '../components/PrizesDisplay';

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<IEvent | null>(null);
  const [userRegistration, setUserRegistration] = useState<IRegistration | null>(null);
  const [feedbacks, setFeedbacks] = useState<IFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Modals
  const [showTeamWizard, setShowTeamWizard] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const fetchEventData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [evtRes, fbRes] = await Promise.all([
        api.getEventById(id),
        api.getEventFeedback(id)
      ]);
      setEvent(evtRes.event);
      setUserRegistration(evtRes.userRegistration);
      setFeedbacks(fbRes.feedbacks);
    } catch (err: any) {
      setError(err.message || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id, user]);

  const handleOpenRegistration = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowTeamWizard(true);
  };

  const handleOpenGoogleCalendar = async () => {
    if (!event) return;
    try {
      const res = await api.getGoogleCalendarUrl(event._id);
      window.open(res.url, '_blank');
    } catch (err) {
      console.error('Failed to open Google Calendar', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-semibold text-slate-600">Loading Event Details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 font-display">Event Not Found</h2>
        <p className="text-xs text-slate-600">{error || 'This event may have been removed or unpublished.'}</p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Link>
      </div>
    );
  }

  const isRegistered = Boolean(userRegistration);
  const isConfirmed = userRegistration?.status === 'confirmed';
  const isWaitlisted = userRegistration?.status === 'waitlisted';
  const isFull = (event.registeredCount || 0) >= event.capacity;

  const startDate = new Date(event.startDateTime);
  const formattedDate = startDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const formattedTime = startDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });

  const averageRating =
    feedbacks.length > 0
      ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1)
      : null;

  const teamSettings = event.teamSettings || {
    registrationType: 'individual',
    minTeamSize: 1,
    maxTeamSize: 4
  };

  const paymentConfig = event.paymentConfig;
  const isPaid = paymentConfig ? paymentConfig.pricingType === 'paid' && paymentConfig.fee > 0 : event.price > 0;
  const displayFee = paymentConfig && paymentConfig.fee > 0 ? paymentConfig.fee : event.price;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Share Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Events
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: event.title,
                  text: event.description.slice(0, 100),
                  url: window.location.href
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Event link copied to clipboard!');
              }
            }}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors text-xs shadow-2xs"
            title="Report inappropriate event content"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left 2 Cols: Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Poster Media Box */}
          <div className="relative aspect-16/9 rounded-3xl overflow-hidden bg-slate-900 shadow-lg border border-slate-200/80">
            <img
              src={event.poster}
              alt={event.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              {event.status === 'cancelled' ? (
                <span className="bg-rose-600/95 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Cancelled
                </span>
              ) : (
                <span className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm">
                  {event.category}
                </span>
              )}
              <span className="bg-blue-600/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-sm capitalize">
                {event.eventType} Event
              </span>
              {teamSettings.registrationType !== 'individual' && (
                <span className="bg-indigo-600/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-sm flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {teamSettings.registrationType === 'both' ? 'Individual / Team' : `Team (${teamSettings.minTeamSize}-${teamSettings.maxTeamSize} Members)`}
                </span>
              )}
              {event.prizes && event.prizes.length > 0 && (
                <span className="bg-amber-500/95 backdrop-blur-md text-slate-950 text-xs font-extrabold px-3 py-1 rounded-lg shadow-sm flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-slate-950" />
                  <span>{event.prizes.length} {event.prizes.length === 1 ? 'Prize Tier' : 'Prizes'}</span>
                </span>
              )}
            </div>
          </div>

          {event.status === 'cancelled' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-rose-900">This event has been cancelled by the organizer</p>
                <p className="text-rose-700 leading-relaxed">
                  Registrations are closed for this event. All registered attendees have received an email notification. Existing tickets and registration records remain viewable in your attendee dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Event Header */}
          <div className="space-y-4">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display leading-tight">
              {event.title}
            </h1>

            {/* Unboxed Metadata Line */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1 text-slate-800">
                <Calendar className="w-4 h-4 text-blue-600" />
                {formattedDate}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-slate-800">
                <Clock className="w-4 h-4 text-blue-600" />
                {formattedTime}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-slate-800">
                <MapPin className="w-4 h-4 text-blue-600" />
                {event.venueName}, {event.city}
              </span>
              {averageRating && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-amber-600 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {averageRating} ({feedbacks.length} reviews)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Registration Info Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="font-bold">
                  {teamSettings.registrationType === 'individual'
                    ? 'Individual Participation'
                    : teamSettings.registrationType === 'both'
                    ? 'Flexible: Register Solo or Form a Team'
                    : `Team Event: ${teamSettings.minTeamSize} to ${teamSettings.maxTeamSize} Members required`}
                </span>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Customized registration questionnaire configured by event organizers.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] text-slate-500 font-medium block">Registration Deadline</span>
              <span className="font-mono font-bold text-slate-800">
                {new Date(event.registrationDeadline).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Feedback message banner */}
          {message && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200/80">
            <h3 className="text-base font-bold text-slate-900 font-display">About this Event</h3>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {event.description}
            </div>

            {event.tags && event.tags.length > 0 && (
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium mr-1">Tags:</span>
                {event.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Prizes & Rewards */}
          {event.prizes && event.prizes.length > 0 && (
            <PrizesDisplay prizes={event.prizes} />
          )}

          {/* Online Submission Form (Optional) */}
          {event.submissionFormUrl && (
            <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white p-5 rounded-3xl border border-blue-200/80 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                      Online Submission
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                        External Form
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Submit your project/work using the form below.
                    </p>
                  </div>
                </div>

                <a
                  href={event.submissionFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                >
                  <span>Open Submission Form</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="text-[10.5px] text-slate-400 flex items-center gap-1 pt-1 border-t border-blue-100/60">
                <span>↗ Opens external link in a new tab ({(() => {
                  try {
                    return new URL(event.submissionFormUrl).hostname;
                  } catch {
                    return 'external site';
                  }
                })()}).</span>
              </div>
            </div>
          )}

          {/* Agenda / Schedule */}
          <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Schedule & Sessions
              </h3>
              <span className="text-xs font-mono text-slate-500">
                {event.schedule?.length || 0} Scheduled Sessions
              </span>
            </div>
            <ScheduleTimeline schedule={event.schedule || []} />
          </div>

          {/* Keynote Speakers */}
          {event.speakers && event.speakers.length > 0 && (
            <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Featured Speakers & Instructors
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {event.speakers.map((spk) => (
                  <div
                    key={spk.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start gap-3"
                  >
                    <img
                      src={spk.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                      alt={spk.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{spk.name}</h4>
                      <p className="text-[11px] font-medium text-blue-600 truncate">{spk.role}</p>
                      <p className="text-[10px] text-slate-500 truncate">{spk.company}</p>
                      {spk.bio && (
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{spk.bio}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Venue Accessibility Checklist */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80">
            <AccessibilityBadges accessibility={event.accessibility} />
          </div>

          {/* Map & Smart Route Guidance */}
          <MapAndDirections event={event} />

          {/* Attendee Reviews & Feedback */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  Attendee Ratings & Reviews
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified feedback from registered participants
                </p>
              </div>

              {isConfirmed && (
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Write Review
                </button>
              )}
            </div>

            {feedbacks.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No reviews yet. Be the first registered participant to review this event!
              </div>
            ) : (
              <div className="space-y-3">
                {feedbacks.map((fb) => (
                  <div key={fb._id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={fb.attendee?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                          alt={fb.attendee?.name || 'User'}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          {fb.attendee?.name || 'Participant'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < fb.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{fb.comment}</p>
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(fb.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Registration Box & Organizer Bio */}
        <div className="space-y-6">
          {/* Registration Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-6 sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs text-slate-400 font-medium">Admission Fee</span>
                <p className="text-2xl font-extrabold text-slate-900 font-display">
                  {!isPaid ? (
                    'Free Admission'
                  ) : (
                    <span>
                      ₹{displayFee}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        {paymentConfig?.feeType === 'per_team' ? '/ team' : '/ person'}
                      </span>
                    </span>
                  )}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 font-medium">Availability</span>
                <p className="text-xs font-bold text-slate-800">
                  {isFull ? (
                    <span className="text-amber-600 font-semibold">Capacity Reached</span>
                  ) : (
                    <span className="text-emerald-700 font-mono tabular-nums">
                      {event.availableSeats ?? event.capacity} spots left
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>{event.registeredCount || 0} Registered</span>
                <span>Max: {event.capacity}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isFull ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(((event.registeredCount || 0) / event.capacity) * 100)
                    )}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Action CTA Buttons */}
            <div className="space-y-3">
              {event.status === 'cancelled' ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-rose-800 text-xs font-bold">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Event Cancelled</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    This event has been cancelled by the organizer. Registrations are closed.
                  </p>
                  {isConfirmed && (
                    <button
                      onClick={() => setShowTicketModal(true)}
                      className="w-full mt-1 py-2.5 bg-white border border-rose-200 hover:bg-rose-50/50 text-rose-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                      <span>View Pass Record</span>
                    </button>
                  )}
                </div>
              ) : isConfirmed ? (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {userRegistration?.registrationType === 'team'
                        ? `Registered as Team "${userRegistration.teamName || 'Team'}"!`
                        : 'You are registered for this event!'}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowTicketModal(true)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>View Digital Ticket & QR Pass</span>
                  </button>

                  {event.submissionFormUrl && (
                    <a
                      href={event.submissionFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs text-center cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Submit Project / Work ↗</span>
                    </a>
                  )}
                </div>
              ) : isWaitlisted ? (
                <div className="space-y-2">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold">
                    <span>You are #{userRegistration?.waitlistPosition || 1} on the waitlist</span>
                    <p className="text-[11px] font-normal text-amber-800 mt-1">
                      You will be automatically confirmed if an attendee registration is cancelled.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleOpenRegistration}
                  disabled={actionLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isFull
                      ? 'Join Priority Waitlist'
                      : teamSettings.registrationType === 'team'
                      ? 'Register Team Now'
                      : 'Register for Event'}
                  </span>
                </button>
              )}
            </div>

            {/* Calendar Integration Actions */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Sync with Your Calendar
              </span>

              <button
                onClick={handleOpenGoogleCalendar}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Add to Google Calendar</span>
              </button>

              <a
                href={api.getIcsDownloadUrl(event._id)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2 text-center"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Apple / Outlook .ICS</span>
              </a>
            </div>

            {/* Organizer Profile Card */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Event Organizer</span>
              <div className="flex items-center gap-3">
                <img
                  src={event.organizer?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={event.organizer?.name || 'Organizer'}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {event.organizer?.name || 'Verified Community Organizer'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {event.organizer?.organization || 'EventHub Certified'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 pt-1">
                {event.contactEmail && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{event.contactEmail}</span>
                  </div>
                )}
                {event.contactPhone && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{event.contactPhone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team & Custom Registration Wizard Modal (PHASE 2) */}
      {showTeamWizard && user && (
        <TeamRegistrationWizard
          event={event}
          currentUser={user}
          isOpen={showTeamWizard}
          onClose={() => setShowTeamWizard(false)}
          onSuccess={(reg) => {
            setShowTeamWizard(false);
            setUserRegistration(reg);
            setMessage('Registration completed successfully! Ticket generated.');
            confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
            fetchEventData();
          }}
        />
      )}

      {/* Ticket Modal */}
      {showTicketModal && userRegistration && (
        <TicketModal
          registration={userRegistration}
          event={event}
          onClose={() => setShowTicketModal(false)}
        />
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal
          eventId={event._id}
          eventTitle={event.title}
          onClose={() => setShowFeedbackModal(false)}
          onSuccess={fetchEventData}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          eventId={event._id}
          eventTitle={event.title}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => alert('Thank you. Your report has been submitted to platform administrators.')}
        />
      )}
    </div>
  );
};

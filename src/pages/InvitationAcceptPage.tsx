import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  UserCheck,
  XCircle,
  ArrowRight,
  LogOut,
  Building,
  Mail,
  Lock,
  User
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IEvent, IRegistration } from '../types';

export const InvitationAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const initialAction = searchParams.get('action'); // 'accept' or 'decline' from email link

  const { user: currentUser, login, register, logout } = useAuth();
  const navigate = useNavigate();

  const [invitationData, setInvitationData] = useState<any>(null);
  const [eventData, setEventData] = useState<IEvent | null>(null);
  const [registrationData, setRegistrationData] = useState<IRegistration | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isTeamConfirmed, setIsTeamConfirmed] = useState(false);

  // Auth toggle for unauthenticated invitees
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Decline state
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    if (!token) return;
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInvitation(token!);
      setInvitationData(data.invitation);
      setEventData(data.event);
      setRegistrationData(data.registration);
      setIsExpired(data.isExpired);
      if (data.invitation?.memberName) {
        setAuthName(data.invitation.memberName);
      }
    } catch (err: any) {
      setError(err.message || 'Invitation not found or invalid link.');
    } finally {
      setLoading(false);
    }
  };

  // Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationData) return;
    setAuthError(null);
    setActionLoading(true);

    try {
      if (authMode === 'login') {
        await login(invitationData.memberEmail, authPassword);
      } else {
        await register({
          name: authName.trim() || invitationData.memberName || 'Team Member',
          email: invitationData.memberEmail,
          password: authPassword,
          role: 'attendee'
        });
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Accept
  const handleAcceptInvitation = async () => {
    if (!token) return;
    try {
      setActionLoading(true);
      setError(null);
      const res = await api.acceptInvitation(token);
      setSuccessMessage(res.message);
      setIsTeamConfirmed(res.isTeamFullyConfirmed);
      setInvitationData(res.invitation);
      setRegistrationData(res.registration);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Decline
  const handleDeclineInvitation = async () => {
    if (!token) return;
    try {
      setActionLoading(true);
      setError(null);
      await api.declineInvitation(token, declineReason);
      setShowDeclineModal(false);
      setSuccessMessage('You have declined the team invitation. The team leader has been notified.');
      setInvitationData({ ...invitationData, status: 'declined' });
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading team invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Invalid or Expired Invitation</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Return to EventHub Home
          </button>
        </div>
      </div>
    );
  }

  const invitedEmail = (invitationData?.memberEmail || '').toLowerCase().trim();
  const currentEmail = (currentUser?.email || '').toLowerCase().trim();
  const isMatchingUser = currentUser && currentEmail === invitedEmail;
  const isDifferentUser = currentUser && currentEmail !== invitedEmail;

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 p-6 sm:p-8 border-b border-slate-800 text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" /> Team Invitation
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Join Team "{invitationData?.teamName}"
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Invited by <strong>{invitationData?.teamLeaderName}</strong> ({invitationData?.teamLeaderEmail})
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {/* Success State */}
            {successMessage && (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Invitation Response Recorded!</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">{successMessage}</p>
                {isTeamConfirmed && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                    🎉 Your team is fully confirmed! Your digital ticket pass is active in your dashboard.
                  </div>
                )}
                <button
                  onClick={() => navigate('/dashboard/attendee')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Go to Attendee Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {!successMessage && (
              <>
                {/* Event Summary Card */}
                {eventData && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                        {eventData.category}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-400 capitalize">{eventData.eventType}</span>
                    </div>

                    <h3 className="text-lg font-bold text-white line-clamp-1">{eventData.title}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span>{new Date(eventData.startDateTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="line-clamp-1">{eventData.venueName}, {eventData.city}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expiry Warning */}
                {isExpired ? (
                  <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block mb-0.5">Invitation Expired</span>
                      This invitation has expired. Please reach out to your team leader <strong>{invitationData?.teamLeaderName}</strong> to resend your invitation link.
                    </div>
                  </div>
                ) : invitationData?.status === 'accepted' ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      You have already accepted this invitation.
                    </span>
                    <button
                      onClick={() => navigate('/dashboard/attendee')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                    >
                      View Pass
                    </button>
                  </div>
                ) : invitationData?.status === 'declined' ? (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    This invitation was previously declined.
                  </div>
                ) : (
                  <>
                    {/* Registration details that will be shared with the organizer */}
                    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
                      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        Details Shared with Organizer
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block">Invited Member</span>
                          <span className="text-white font-medium">{invitationData?.memberName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Invited Email</span>
                          <span className="text-white font-medium">{invitationData?.memberEmail}</span>
                        </div>
                        {invitationData?.memberDetails?.college && (
                          <div className="col-span-2">
                            <span className="text-slate-500 block">College / Institute</span>
                            <span className="text-slate-300">{invitationData.memberDetails.college}</span>
                          </div>
                        )}
                        {invitationData?.memberDetails?.course && (
                          <div>
                            <span className="text-slate-500 block">Course / Degree</span>
                            <span className="text-slate-300">{invitationData.memberDetails.course}</span>
                          </div>
                        )}
                        {invitationData?.memberDetails?.graduatingYear && (
                          <div>
                            <span className="text-slate-500 block">Graduation Year</span>
                            <span className="text-slate-300">{invitationData.memberDetails.graduatingYear}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Authentication Check */}
                    {!currentUser ? (
                      /* Not Authenticated: Prompt to Log in or Register with the invited email */
                      <div className="p-5 rounded-2xl bg-slate-800/60 border border-indigo-500/30 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                          <span className="text-sm font-bold text-white">Sign In to Confirm Acceptance</span>
                          <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-700 text-xs">
                            <button
                              type="button"
                              onClick={() => setAuthMode('login')}
                              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                                authMode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Log In
                            </button>
                            <button
                              type="button"
                              onClick={() => setAuthMode('register')}
                              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                                authMode === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Create Account
                            </button>
                          </div>
                        </div>

                        {authError && (
                          <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                            {authError}
                          </p>
                        )}

                        <form onSubmit={handleAuthSubmit} className="space-y-3">
                          {authMode === 'register' && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                              <div className="relative">
                                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                                <input
                                  type="text"
                                  value={authName}
                                  onChange={e => setAuthName(e.target.value)}
                                  placeholder="Full Name"
                                  required
                                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Invited Email Address
                            </label>
                            <div className="relative">
                              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                              <input
                                type="email"
                                value={invitationData?.memberEmail || ''}
                                readOnly
                                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-300 text-xs cursor-not-allowed font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              {authMode === 'login' ? 'Password' : 'Create Password'}
                            </label>
                            <div className="relative">
                              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                              <input
                                type="password"
                                value={authPassword}
                                onChange={e => setAuthPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={actionLoading}
                            className="w-full py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                          >
                            {actionLoading ? 'Verifying...' : authMode === 'login' ? 'Log In & Continue' : 'Create Account & Continue'}
                          </button>
                        </form>
                      </div>
                    ) : isDifferentUser ? (
                      /* Authenticated with DIFFERENT email */
                      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                        <div className="flex items-start gap-2.5 text-amber-300 text-xs">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-white block mb-0.5">Account Mismatch</span>
                            You are logged in as <strong>{currentUser.email}</strong>, but this team invitation was issued specifically to <strong>{invitationData.memberEmail}</strong>.
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => logout()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Log Out to Switch Account
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Authenticated with MATCHING email: Ready to Accept or Decline */
                      <div className="space-y-4 pt-2">
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>
                            Verified as <strong>{currentUser.name}</strong> ({currentUser.email}). You are ready to accept!
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={handleAcceptInvitation}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-sm shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                          >
                            {actionLoading ? 'Processing...' : 'Accept Invitation'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowDeclineModal(true)}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-sm transition-all"
                          >
                            Decline Invitation
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Decline Confirmation Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Decline Team Invitation?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to decline joining team "{invitationData?.teamName}"? The team leader will be notified.
              </p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Optional note to leader</label>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="e.g. Schedule conflict"
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeclineInvitation}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                {actionLoading ? 'Declining...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  User,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Mail,
  Phone,
  Building,
  GraduationCap,
  Calendar,
  Copy,
  Check,
  Send,
  Clock,
  UserCheck,
  QrCode,
  Info
} from 'lucide-react';
import { IEvent, IUser, ITeamMember, IParticipantDetails, TeamInvitationStatus } from '../types';
import { api } from '../services/api';

interface TeamRegistrationWizardProps {
  event: IEvent;
  currentUser: IUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (registration: any) => void;
}

export const TeamRegistrationWizard: React.FC<TeamRegistrationWizardProps> = ({
  event,
  currentUser,
  isOpen,
  onClose,
  onSuccess
}) => {
  const teamSettings = event.teamSettings || {
    registrationType: 'individual',
    minTeamSize: 1,
    maxTeamSize: 4,
    includeLeaderInTeamSize: true,
    allowAddMembersDuringRegistration: true,
    allowInviteMembersLater: true,
    isMemberDetailsMandatory: true,
    requireOrganizerApproval: false,
    allowIndividualRegistrationWhenBoth: true
  };

  const formConfig = event.registrationFormConfig;
  const paymentConfig = event.paymentConfig;
  const customQuestions = formConfig?.customQuestions || [];

  const allowsBoth = teamSettings.registrationType === 'both';
  const isTeamOnly = teamSettings.registrationType === 'team';
  const defaultType: 'individual' | 'team' = isTeamOnly ? 'team' : 'individual';

  // Step state
  const [step, setStep] = useState<number>(allowsBoth ? 1 : 2);
  const [registrationType, setRegistrationType] = useState<'individual' | 'team'>(defaultType);

  // Team state
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<ITeamMember[]>([
    {
      userId: currentUser._id,
      firstName: currentUser.name?.split(' ')[0] || 'Leader',
      lastName: currentUser.name?.split(' ').slice(1).join(' ') || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      college: currentUser.organization || currentUser.department || currentUser.college || '',
      gender: currentUser.gender || '',
      userType: currentUser.userType || 'College Student',
      domain: currentUser.domain || '',
      course: currentUser.course || '',
      specialization: currentUser.specialization || '',
      yearOfStudy: currentUser.yearOfStudy || '3rd Year',
      graduatingYear: currentUser.graduatingYear || '2026',
      courseDuration: currentUser.courseDuration || '4 Years',
      cityState: currentUser.cityState || '',
      linkedin: currentUser.linkedin || '',
      dateOfBirth: currentUser.dateOfBirth || '',
      customAnswers: {},
      isLeader: true,
      status: 'confirmed'
    }
  ]);

  // Individual participant details state
  const [participantDetails, setParticipantDetails] = useState<IParticipantDetails>({
    firstName: currentUser.name?.split(' ')[0] || '',
    lastName: currentUser.name?.split(' ').slice(1).join(' ') || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    college: currentUser.organization || currentUser.department || currentUser.college || '',
    gender: currentUser.gender || '',
    userType: currentUser.userType || 'College Student',
    domain: currentUser.domain || '',
    course: currentUser.course || '',
    specialization: currentUser.specialization || '',
    yearOfStudy: currentUser.yearOfStudy || '3rd Year',
    graduatingYear: currentUser.graduatingYear || '2026',
    courseDuration: currentUser.courseDuration || '4 Years',
    cityState: currentUser.cityState || '',
    linkedin: currentUser.linkedin || '',
    dateOfBirth: currentUser.dateOfBirth || '',
    customAnswers: {}
  });

  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [notes, setNotes] = useState('');

  // Processing state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [registeredResult, setRegisteredResult] = useState<any>(null);
  const [invitationsResult, setInvitationsResult] = useState<any[]>([]);
  const [emailWarningMsg, setEmailWarningMsg] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Member Modal State (Add or Edit)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMemberIdx, setEditingMemberIdx] = useState<number | null>(null);
  const [memberFormData, setMemberFormData] = useState<Partial<ITeamMember>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    college: '',
    gender: '',
    course: '',
    specialization: '',
    graduatingYear: ''
  });
  const [memberModalErrors, setMemberModalErrors] = useState<Record<string, string>>({});

  // Remove confirmation modal
  const [removingMemberIdx, setRemovingMemberIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setFieldErrors({});
      setStep(allowsBoth ? 1 : 2);
      setRegistrationType(isTeamOnly ? 'team' : 'individual');
      setTeamName('');
      setTermsAccepted(false);
      setRegisteredResult(null);
      setInvitationsResult([]);
      setEmailWarningMsg(null);

      // Initialize team leader
      setTeamMembers([
        {
          userId: currentUser._id,
          firstName: currentUser.name?.split(' ')[0] || 'Leader',
          lastName: currentUser.name?.split(' ').slice(1).join(' ') || '',
          email: currentUser.email || '',
          phone: currentUser.phone || '',
          college: currentUser.organization || currentUser.department || currentUser.college || '',
          gender: currentUser.gender || '',
          userType: currentUser.userType || 'College Student',
          domain: currentUser.domain || '',
          course: currentUser.course || '',
          specialization: currentUser.specialization || '',
          yearOfStudy: currentUser.yearOfStudy || '3rd Year',
          graduatingYear: currentUser.graduatingYear || '2026',
          courseDuration: currentUser.courseDuration || '4 Years',
          cityState: currentUser.cityState || '',
          linkedin: currentUser.linkedin || '',
          dateOfBirth: currentUser.dateOfBirth || '',
          customAnswers: {},
          isLeader: true,
          status: 'confirmed'
        }
      ]);

      setParticipantDetails({
        firstName: currentUser.name?.split(' ')[0] || '',
        lastName: currentUser.name?.split(' ').slice(1).join(' ') || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        college: currentUser.organization || currentUser.department || currentUser.college || '',
        gender: currentUser.gender || '',
        userType: currentUser.userType || 'College Student',
        domain: currentUser.domain || '',
        course: currentUser.course || '',
        specialization: currentUser.specialization || '',
        yearOfStudy: currentUser.yearOfStudy || '3rd Year',
        graduatingYear: currentUser.graduatingYear || '2026',
        courseDuration: currentUser.courseDuration || '4 Years',
        cityState: currentUser.cityState || '',
        linkedin: currentUser.linkedin || '',
        dateOfBirth: currentUser.dateOfBirth || '',
        customAnswers: {}
      });
    }
  }, [isOpen, event, currentUser, allowsBoth, isTeamOnly]);

  if (!isOpen) return null;

  const minTeam = teamSettings.minTeamSize || 2;
  const maxTeam = teamSettings.maxTeamSize || 4;

  const perParticipantFee = paymentConfig?.pricingType === 'paid' ? Number(paymentConfig.fee || event.price || 0) : 0;
  const isFeePerTeam = paymentConfig?.feeType === 'per_team';
  const currentMemberCount = registrationType === 'team' ? teamMembers.length : 1;
  const totalAmount = paymentConfig?.pricingType === 'paid'
    ? (isFeePerTeam ? perParticipantFee : perParticipantFee * currentMemberCount)
    : 0;

  // Helpers for Status Badges
  const renderStatusBadge = (status?: string, isLeader?: boolean) => {
    if (isLeader) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <UserCheck className="w-3 h-3" /> Team Leader
        </span>
      );
    }

    switch (status) {
      case 'accepted':
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" /> Accepted
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <X className="w-3 h-3" /> Declined
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            <Clock className="w-3 h-3" /> Expired
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Send className="w-3 h-3" /> Invitation Sent
          </span>
        );
      case 'pending':
      case 'pending_acceptance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Pending Acceptance
          </span>
        );
      case 'not_invited':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/60 text-slate-300 border border-slate-600">
            Not Invited
          </span>
        );
    }
  };

  // Open modal for Adding Member
  const handleOpenAddMemberModal = () => {
    if (teamMembers.length >= maxTeam) {
      setError(`Maximum team size is ${maxTeam} members.`);
      return;
    }
    setError(null);
    setMemberModalErrors({});
    setEditingMemberIdx(null);
    setMemberFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      college: teamMembers[0]?.college || '',
      gender: '',
      course: '',
      specialization: '',
      graduatingYear: '2026'
    });
    setIsMemberModalOpen(true);
  };

  // Open modal for Editing Member
  const handleOpenEditMemberModal = (index: number) => {
    if (index === 0) return; // Cannot edit leader this way
    setError(null);
    setMemberModalErrors({});
    setEditingMemberIdx(index);
    const m = teamMembers[index];
    setMemberFormData({
      firstName: m.firstName || '',
      lastName: m.lastName || '',
      email: m.email || '',
      phone: m.phone || '',
      college: m.college || '',
      gender: m.gender || '',
      course: m.course || '',
      specialization: m.specialization || '',
      graduatingYear: m.graduatingYear || '2026'
    });
    setIsMemberModalOpen(true);
  };

  // Save member from modal
  const handleSaveMemberFromModal = () => {
    const errs: Record<string, string> = {};

    if (!memberFormData.firstName?.trim()) {
      errs.firstName = 'First Name is required.';
    }

    const emailTrimmed = (memberFormData.email || '').toLowerCase().trim();
    if (!emailTrimmed) {
      errs.email = 'Email Address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errs.email = 'Please enter a valid email address.';
    } else {
      // Check for duplicate emails within team
      const existingEmailIdx = teamMembers.findIndex(
        (m, idx) => idx !== editingMemberIdx && (m.email || '').toLowerCase().trim() === emailTrimmed
      );
      if (existingEmailIdx !== -1) {
        errs.email = 'A team member with this email address already exists in this team.';
      }
    }

    if (formConfig?.phone?.enabled && formConfig.phone.required && !memberFormData.phone?.trim()) {
      errs.phone = 'Mobile Phone Number is required.';
    }

    if (formConfig?.college?.enabled && formConfig.college.required && !memberFormData.college?.trim()) {
      errs.college = 'College / Institution Name is required.';
    }

    if (formConfig?.gender?.enabled && formConfig.gender.required && !memberFormData.gender?.trim()) {
      errs.gender = 'Gender is required.';
    }

    if (formConfig?.course?.enabled && formConfig.course.required && !memberFormData.course?.trim()) {
      errs.course = 'Course / Degree is required.';
    }

    if (formConfig?.specialization?.enabled && formConfig.specialization.required && !memberFormData.specialization?.trim()) {
      errs.specialization = 'Course Specialization is required.';
    }

    if (formConfig?.graduatingYear?.enabled && formConfig.graduatingYear.required && !memberFormData.graduatingYear?.trim()) {
      errs.graduatingYear = 'Graduation Year is required.';
    }

    if (Object.keys(errs).length > 0) {
      setMemberModalErrors(errs);
      return;
    }

    const newMember: ITeamMember = {
      firstName: memberFormData.firstName!.trim(),
      lastName: memberFormData.lastName?.trim() || '',
      email: emailTrimmed,
      phone: memberFormData.phone?.trim() || '',
      college: memberFormData.college?.trim() || '',
      gender: memberFormData.gender?.trim() || '',
      course: memberFormData.course?.trim() || '',
      specialization: memberFormData.specialization?.trim() || '',
      graduatingYear: memberFormData.graduatingYear?.trim() || '',
      userType: 'College Student',
      yearOfStudy: '3rd Year',
      isLeader: false,
      status: 'not_invited'
    };

    if (editingMemberIdx !== null) {
      const updated = [...teamMembers];
      updated[editingMemberIdx] = {
        ...updated[editingMemberIdx],
        ...newMember
      };
      setTeamMembers(updated);
    } else {
      setTeamMembers([...teamMembers, newMember]);
    }

    setIsMemberModalOpen(false);
    setMemberModalErrors({});
  };

  // Confirm removal of member
  const handleConfirmRemoveMember = () => {
    if (removingMemberIdx === null || removingMemberIdx === 0) return;
    const updated = teamMembers.filter((_, i) => i !== removingMemberIdx);
    setTeamMembers(updated);
    setRemovingMemberIdx(null);
  };

  // Validation
  const validateCurrentStep = (): boolean => {
    setError(null);
    setFieldErrors({});

    if (step === 1) {
      return true;
    }

    if (step === 2 && registrationType === 'team') {
      const errs: Record<string, string> = {};
      if (!teamName.trim() || teamName.trim().length < 2) {
        errs.teamName = 'Please enter a valid Team Name (minimum 2 characters).';
      }

      if (teamMembers.length < minTeam) {
        errs.teamSize = `Please add at least ${minTeam - teamMembers.length} more member${minTeam - teamMembers.length > 1 ? 's' : ''} to meet the minimum team size of ${minTeam}.`;
      }

      if (teamMembers.length > maxTeam) {
        errs.teamSize = `Team size cannot exceed ${maxTeam} members.`;
      }

      // Check unique emails
      const emails = teamMembers.map(m => (m.email || '').toLowerCase().trim()).filter(Boolean);
      if (new Set(emails).size !== emails.length) {
        errs.teamMembers = 'Duplicate email addresses detected. Each member must have a unique email.';
      }

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        setError(Object.values(errs)[0]);
        return false;
      }
      return true;
    }

    if (step === 2 && registrationType === 'individual') {
      const errs: Record<string, string> = {};
      if (!participantDetails.firstName?.trim()) {
        errs.firstName = 'First Name is required.';
      }
      if (!participantDetails.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participantDetails.email.trim())) {
        errs.email = 'A valid email address is required.';
      }
      if (formConfig?.phone?.enabled && formConfig.phone.required && !participantDetails.phone?.trim()) {
        errs.phone = 'Mobile Phone Number is required.';
      }
      if (formConfig?.college?.enabled && formConfig.college.required && !participantDetails.college?.trim()) {
        errs.college = 'College / Institution Name is required.';
      }

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        setError(Object.values(errs)[0]);
        return false;
      }
      return true;
    }

    if (step === 3) {
      // Validate custom questions if any
      if (customQuestions.length > 0) {
        for (const q of customQuestions) {
          if (q.required) {
            const ans = customAnswers[q.id];
            if (ans === undefined || ans === null || String(ans).trim() === '') {
              setError(`Please answer the required question: "${q.label}".`);
              return false;
            }
          }
        }
      }

      if (event.termsAndConditions?.isMandatory && !termsAccepted) {
        setError('Please read and agree to the Terms & Conditions before confirming.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      handleSubmitRegistration();
    }
  };

  const handleBack = () => {
    setError(null);
    setFieldErrors({});
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      if (allowsBoth) {
        setStep(1);
      }
    }
  };

  // Submit Registration
  const handleSubmitRegistration = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload: any = {
        registrationType,
        teamName: registrationType === 'team' ? teamName.trim() : undefined,
        teamMembers: registrationType === 'team' ? teamMembers : undefined,
        participantDetails: registrationType === 'individual' ? participantDetails : teamMembers[0],
        customAnswers,
        termsAccepted,
        notes: notes.trim() || undefined,
        sendInvitations: true
      };

      if (totalAmount > 0) {
        payload.paymentDetails = {
          pricingType: 'paid',
          amount: totalAmount,
          currency: paymentConfig?.currency || 'INR',
          feeType: paymentConfig?.feeType || 'per_participant',
          paymentStatus: 'completed',
          paidAt: new Date().toISOString(),
          gateway: 'direct'
        };
      }

      const res = await api.registerForEvent(event._id, payload);
      setRegisteredResult(res.registration);
      setInvitationsResult(res.invitations || []);
      if (res.emailWarning) {
        setEmailWarningMsg(res.emailWarning);
      }
      setStep(4);
      onSuccess(res.registration);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check the details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = (token: string) => {
    const origin = window.location.origin;
    const url = `${origin}/invitations/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Current step index and labels
  const stepsList = allowsBoth
    ? ['Registration Type', registrationType === 'team' ? 'Team Details' : 'Participant Details', 'Review & Invitations']
    : [registrationType === 'team' ? 'Team Details' : 'Participant Details', 'Review & Invitations'];

  const currentStepDisplayIdx = allowsBoth ? step : step - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold uppercase tracking-wider">
                  {event.category}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {registrationType === 'team' ? 'Team Event' : 'Individual Event'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white line-clamp-1">{event.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Organized by {event.organizer?.name || 'EventHub Organizer'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Indicator */}
          {step <= 3 && (
            <div className="mt-5 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                {stepsList.map((label, idx) => {
                  const stepNumber = allowsBoth ? idx + 1 : idx + 2;
                  const isActive = step === stepNumber;
                  const isDone = step > stepNumber;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 ${
                        isActive ? 'text-indigo-400' : isDone ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-md'
                            : isDone
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </span>
                      <span className="hidden sm:inline">{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
                  style={{
                    width: `${((currentStepDisplayIdx - 1) / (stepsList.length - 1)) * 100}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* ================= STEP 1: REGISTRATION TYPE ================= */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-white">Select Registration Format</h3>
                <p className="text-sm text-slate-400">
                  This event accepts both Individual participants and Teams. Select your registration preference below.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setRegistrationType('individual')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    registrationType === 'individual'
                      ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                      : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    {registrationType === 'individual' && (
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-base mb-1">Individual Registration</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Participate as a solo attendee. Attend all sessions, network, and receive your personalized QR access pass.
                  </p>
                </div>

                <div
                  onClick={() => setRegistrationType('team')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    registrationType === 'team'
                      ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                      : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    {registrationType === 'team' && (
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-base mb-1">Team Registration</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Form a team of {minTeam} to {maxTeam} members. Invite teammates via email and track their confirmation status.
                  </p>
                </div>
              </div>

              {/* Requirements Banner */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <div className="font-semibold text-white mb-0.5">Registration Requirements</div>
                  Team registration will remain pending until all required team members have accepted their invitations. Make sure you have valid email addresses for your team members.
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: TEAM DETAILS ================= */}
          {step === 2 && registrationType === 'team' && (
            <div className="space-y-6">
              {/* Team Name Input */}
              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-white">
                    Team Name <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-medium">
                    {teamMembers.length} / {maxTeam} Members (Min: {minTeam})
                  </span>
                </div>
                <input
                  type="text"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. CyberVanguards, CodeCrafters"
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-900 border ${
                    fieldErrors.teamName ? 'border-rose-500' : 'border-slate-700'
                  } text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500`}
                />
                {fieldErrors.teamName && (
                  <p className="text-xs text-rose-400">{fieldErrors.teamName}</p>
                )}
              </div>

              {/* Team Members Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      Team Roster ({teamMembers.length} / {maxTeam})
                    </h4>
                    <p className="text-xs text-slate-400">
                      Team Leader is verified automatically. Add required members below.
                    </p>
                  </div>
                  {teamMembers.length < maxTeam && (
                    <button
                      type="button"
                      onClick={handleOpenAddMemberModal}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Member
                    </button>
                  )}
                </div>

                {fieldErrors.teamSize && (
                  <p className="text-xs text-rose-400">{fieldErrors.teamSize}</p>
                )}

                {/* Team Members Cards */}
                <div className="space-y-3">
                  {teamMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all ${
                        member.isLeader
                          ? 'bg-indigo-950/20 border-indigo-500/30'
                          : 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                              member.isLeader
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 border border-slate-700 text-slate-300'
                            }`}
                          >
                            {member.isLeader ? '👑' : idx + 1}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">
                                {member.firstName} {member.lastName || ''}
                              </span>
                              {renderStatusBadge(member.status, member.isLeader)}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {member.email}
                              </span>
                              {member.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  {member.phone}
                                </span>
                              )}
                              {member.college && (
                                <span className="flex items-center gap-1">
                                  <Building className="w-3 h-3 text-slate-500" />
                                  {member.college}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {!member.isLeader && (
                          <div className="flex items-center gap-1 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/50 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenEditMemberModal(idx)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit Member Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemovingMemberIdx(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Remove Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: INDIVIDUAL DETAILS ================= */}
          {step === 2 && registrationType === 'individual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    First Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={participantDetails.firstName || ''}
                    onChange={e => setParticipantDetails({ ...participantDetails, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={participantDetails.lastName || ''}
                    onChange={e => setParticipantDetails({ ...participantDetails, lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={participantDetails.email || ''}
                    onChange={e => setParticipantDetails({ ...participantDetails, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mobile Phone {formConfig?.phone?.required && <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    type="tel"
                    value={participantDetails.phone || ''}
                    onChange={e => setParticipantDetails({ ...participantDetails, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  College / Institute {formConfig?.college?.required && <span className="text-rose-400">*</span>}
                </label>
                <input
                  type="text"
                  value={participantDetails.college || ''}
                  onChange={e => setParticipantDetails({ ...participantDetails, college: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* ================= STEP 3: REVIEW & INVITATIONS ================= */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Progress Summary Card */}
              {registrationType === 'team' && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" />
                      Team Status Summary
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      Pending Acceptances
                    </span>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-indigo-500/20 text-xs">
                    {teamMembers.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <strong>{m.firstName} {m.lastName || ''}</strong> ({m.email})
                        </span>
                        <span>{idx === 0 ? '✓ Leader Registered' : '⏳ Invitation Will Be Dispatched'}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-amber-300/90 pt-1 italic">
                    "Your team registration will be completed once all required members have accepted their invitations."
                  </p>
                </div>
              )}

              {/* Custom Questions if enabled by organizer */}
              {customQuestions.length > 0 && (
                <div className="space-y-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Additional Event Questions
                  </h4>
                  {customQuestions.map(q => (
                    <div key={q.id}>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {q.label} {q.required && <span className="text-rose-400">*</span>}
                      </label>
                      <input
                        type="text"
                        value={customAnswers[q.id] || ''}
                        onChange={e => setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })}
                        placeholder={q.placeholder || ''}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing breakdown if paid */}
              {totalAmount > 0 && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Registration Fee</span>
                    <span className="font-mono text-white">₹{totalAmount}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700 flex justify-between font-bold text-white">
                    <span>Total Amount</span>
                    <span className="font-mono text-emerald-400">₹{totalAmount}</span>
                  </div>
                </div>
              )}

              {/* Terms and conditions */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="mt-1 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900 w-4 h-4"
                  />
                  <div className="text-xs text-slate-300 leading-relaxed">
                    <span>
                      I agree to the <strong>Terms & Conditions</strong>, Code of Conduct, and event participation guidelines.
                    </span>
                    {event.termsAndConditions?.text && (
                      <p className="text-slate-400 mt-1 italic">
                        "{event.termsAndConditions.text}"
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ================= STEP 4: CONFIRMATION & INVITATION STATUS ================= */}
          {step === 4 && registeredResult && (
            <div className="space-y-6 py-2">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  {registeredResult.status === 'confirmed'
                    ? 'Registration Confirmed!'
                    : 'Team Registration Initialized!'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  {registeredResult.status === 'confirmed'
                    ? `Your registration is verified and your ticket pass is active.`
                    : `Your team "${registeredResult.teamName}" has been created. Invitations have been generated for your team members.`}
                </p>
              </div>

              {emailWarningMsg && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Email Delivery Note</span>
                    {emailWarningMsg}. Your invitations are safely stored in MongoDB. You can copy the unique invitation links below to share directly with your teammates.
                  </div>
                </div>
              )}

              {/* Team Invitations List with Copy Links */}
              {invitationsResult.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Dispatched Team Invitations ({invitationsResult.length})
                  </h4>
                  <div className="space-y-2.5">
                    {invitationsResult.map((inv, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{inv.memberName}</span>
                            <span className="text-slate-400">({inv.memberEmail})</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Status: <span className="text-amber-400 capitalize">{inv.status}</span> • Expires in 48 hours
                          </div>
                        </div>

                        {inv.token && (
                          <button
                            type="button"
                            onClick={() => copyInvitationLink(inv.token)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium transition-colors self-start sm:self-center"
                          >
                            {copiedToken === inv.token ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300">Copied Link!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Invitation Link</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Digital Pass Preview if confirmed */}
              {registeredResult.status === 'confirmed' && (
                <div className="max-w-sm mx-auto p-4 rounded-xl bg-slate-800 border border-slate-700 text-left space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                    <span className="text-xs text-indigo-400 font-bold uppercase">Pass Verified</span>
                    <QrCode className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-slate-500">Ticket Code: </span>
                      <span className="font-mono font-bold text-white">{registeredResult.ticketId}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white text-sm shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Done & View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {step <= 3 && (
          <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending Invitations...
                  </span>
                ) : step === 3 ? (
                  registrationType === 'team' ? 'Confirm Team & Send Invitations' : 'Confirm Registration'
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= ADD / EDIT MEMBER MODAL ================= */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-5 sm:p-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                {editingMemberIdx !== null ? 'Edit Team Member Details' : 'Add Team Member'}
              </h3>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    First Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={memberFormData.firstName || ''}
                    onChange={e => setMemberFormData({ ...memberFormData, firstName: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-800 border ${
                      memberModalErrors.firstName ? 'border-rose-500' : 'border-slate-700'
                    } text-white text-sm focus:outline-none focus:border-indigo-500`}
                  />
                  {memberModalErrors.firstName && (
                    <p className="text-[11px] text-rose-400 mt-1">{memberModalErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={memberFormData.lastName || ''}
                    onChange={e => setMemberFormData({ ...memberFormData, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={memberFormData.email || ''}
                  onChange={e => setMemberFormData({ ...memberFormData, email: e.target.value })}
                  placeholder="member@university.edu"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-800 border ${
                    memberModalErrors.email ? 'border-rose-500' : 'border-slate-700'
                  } text-white text-sm focus:outline-none focus:border-indigo-500`}
                />
                {memberModalErrors.email && (
                  <p className="text-[11px] text-rose-400 mt-1">{memberModalErrors.email}</p>
                )}
              </div>

              {/* Show only fields required or enabled by organizer */}
              {formConfig?.phone?.enabled && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mobile Number {formConfig.phone.required && <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    type="tel"
                    value={memberFormData.phone || ''}
                    onChange={e => setMemberFormData({ ...memberFormData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className={`w-full px-3 py-2 rounded-xl bg-slate-800 border ${
                      memberModalErrors.phone ? 'border-rose-500' : 'border-slate-700'
                    } text-white text-sm focus:outline-none focus:border-indigo-500`}
                  />
                  {memberModalErrors.phone && (
                    <p className="text-[11px] text-rose-400 mt-1">{memberModalErrors.phone}</p>
                  )}
                </div>
              )}

              {formConfig?.college?.enabled && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    College / Institution Name {formConfig.college.required && <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    type="text"
                    value={memberFormData.college || ''}
                    onChange={e => setMemberFormData({ ...memberFormData, college: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-800 border ${
                      memberModalErrors.college ? 'border-rose-500' : 'border-slate-700'
                    } text-white text-sm focus:outline-none focus:border-indigo-500`}
                  />
                  {memberModalErrors.college && (
                    <p className="text-[11px] text-rose-400 mt-1">{memberModalErrors.college}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {formConfig?.gender?.enabled && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Gender {formConfig.gender.required && <span className="text-rose-400">*</span>}
                    </label>
                    <select
                      value={memberFormData.gender || ''}
                      onChange={e => setMemberFormData({ ...memberFormData, gender: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                )}

                {formConfig?.graduatingYear?.enabled && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Graduation Year {formConfig.graduatingYear.required && <span className="text-rose-400">*</span>}
                    </label>
                    <input
                      type="text"
                      value={memberFormData.graduatingYear || ''}
                      onChange={e => setMemberFormData({ ...memberFormData, graduatingYear: e.target.value })}
                      placeholder="2026"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {(formConfig?.course?.enabled || formConfig?.specialization?.enabled) && (
                <div className="grid grid-cols-2 gap-3">
                  {formConfig.course?.enabled && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Course {formConfig.course.required && <span className="text-rose-400">*</span>}
                      </label>
                      <input
                        type="text"
                        value={memberFormData.course || ''}
                        onChange={e => setMemberFormData({ ...memberFormData, course: e.target.value })}
                        placeholder="e.g. B.Tech"
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {formConfig.specialization?.enabled && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Specialization {formConfig.specialization.required && <span className="text-rose-400">*</span>}
                      </label>
                      <input
                        type="text"
                        value={memberFormData.specialization || ''}
                        onChange={e => setMemberFormData({ ...memberFormData, specialization: e.target.value })}
                        placeholder="e.g. Computer Science"
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMemberFromModal}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-colors"
              >
                Save Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REMOVE MEMBER CONFIRMATION DIALOG ================= */}
      {removingMemberIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Remove Team Member?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to remove <strong>{teamMembers[removingMemberIdx]?.firstName} {teamMembers[removingMemberIdx]?.lastName}</strong> ({teamMembers[removingMemberIdx]?.email}) from this team?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRemovingMemberIdx(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Keep Member
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

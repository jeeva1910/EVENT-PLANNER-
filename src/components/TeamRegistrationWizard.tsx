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
  Clock,
  UserCheck,
  QrCode,
  Info,
  CreditCard,
  FileText,
  MapPin,
  Accessibility,
  ExternalLink
} from 'lucide-react';
import { IEvent, IUser, ITeamMember, IParticipantDetails } from '../types';
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

  // Step state: 1 = Personal Details, 2 = Academic/Professional, 3 = Team Details, 4 = Payment/Review, 5 = Confirmed
  const [step, setStep] = useState<number>(1);
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
      location: currentUser.cityState || '',
      differentlyAbledStatus: 'no',
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
    location: currentUser.cityState || '',
    differentlyAbledStatus: 'no',
    linkedin: currentUser.linkedin || '',
    dateOfBirth: currentUser.dateOfBirth || '',
    customAnswers: {}
  });

  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [notes, setNotes] = useState('');

  // Payment states (UPI)
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Processing state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [registeredResult, setRegisteredResult] = useState<any>(null);
  const [invitationsResult, setInvitationsResult] = useState<any[]>([]);
  const [emailWarningMsg, setEmailWarningMsg] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);

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
    graduatingYear: '2026',
    courseDuration: '4 Years',
    userType: 'College Student',
    domain: '',
    location: '',
    differentlyAbledStatus: 'no'
  });
  const [memberModalErrors, setMemberModalErrors] = useState<Record<string, string>>({});

  // Remove confirmation modal
  const [removingMemberIdx, setRemovingMemberIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setFieldErrors({});
      setStep(1);
      setRegistrationType(isTeamOnly ? 'team' : 'individual');
      setTeamName('');
      setTermsAccepted(false);
      setUtrNumber('');
      setPaymentConfirmed(false);
      setCopiedUpi(false);
      setRegisteredResult(null);
      setInvitationsResult([]);
      setEmailWarningMsg(null);

      const initialLeader: ITeamMember = {
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
        location: currentUser.cityState || '',
        differentlyAbledStatus: 'no',
        linkedin: currentUser.linkedin || '',
        dateOfBirth: currentUser.dateOfBirth || '',
        customAnswers: {},
        isLeader: true,
        status: 'confirmed'
      };

      setTeamMembers([initialLeader]);

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
        location: currentUser.cityState || '',
        differentlyAbledStatus: 'no',
        linkedin: currentUser.linkedin || '',
        dateOfBirth: currentUser.dateOfBirth || '',
        customAnswers: {}
      });
    }
  }, [isOpen, event, currentUser, allowsBoth, isTeamOnly]);

  // Synchronize leader member info with participant details
  const updateParticipantField = (field: keyof IParticipantDetails, value: any) => {
    setParticipantDetails(prev => {
      const next = { ...prev, [field]: value };
      // Keep leader in sync
      setTeamMembers(members => {
        if (!members.length) return members;
        const leader = { ...members[0], [field]: value };
        return [leader, ...members.slice(1)];
      });
      return next;
    });

    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <UserCheck className="w-3 h-3" /> Team Leader
        </span>
      );
    }

    switch (status) {
      case 'accepted':
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Accepted
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <X className="w-3 h-3" /> Declined
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3 h-3" /> Expired
          </span>
        );
      case 'sent':
      case 'pending':
      case 'pending_acceptance':
      case 'not_invited':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Invitation Pending
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
      college: participantDetails.college || '',
      gender: '',
      course: participantDetails.course || '',
      specialization: participantDetails.specialization || '',
      graduatingYear: participantDetails.graduatingYear || '2026',
      courseDuration: participantDetails.courseDuration || '4 Years',
      userType: participantDetails.userType || 'College Student',
      domain: participantDetails.domain || '',
      location: participantDetails.location || participantDetails.cityState || '',
      differentlyAbledStatus: 'no'
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
      graduatingYear: m.graduatingYear || '2026',
      courseDuration: m.courseDuration || '4 Years',
      userType: m.userType || 'College Student',
      domain: m.domain || '',
      location: m.location || m.cityState || '',
      differentlyAbledStatus: m.differentlyAbledStatus || 'no'
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
      graduatingYear: memberFormData.graduatingYear?.trim() || '2026',
      courseDuration: memberFormData.courseDuration?.trim() || '4 Years',
      userType: memberFormData.userType?.trim() || 'College Student',
      domain: memberFormData.domain?.trim() || '',
      location: memberFormData.location?.trim() || '',
      cityState: memberFormData.location?.trim() || '',
      differentlyAbledStatus: memberFormData.differentlyAbledStatus || 'no',
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

  // Step Validation
  const validateCurrentStep = (): boolean => {
    setError(null);
    const errs: Record<string, string> = {};

    // STEP 1: Personal Details
    if (step === 1) {
      if (!participantDetails.firstName?.trim()) {
        errs.firstName = 'First Name is required.';
      }
      if (!participantDetails.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participantDetails.email.trim())) {
        errs.email = 'A valid email address is required.';
      }
      if (formConfig?.phone?.required && !participantDetails.phone?.trim()) {
        errs.phone = 'Mobile Phone Number is required.';
      }

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return false;
      }
      return true;
    }

    // STEP 2: Academic / Professional Details
    if (step === 2) {
      if (formConfig?.college?.required && !participantDetails.college?.trim()) {
        errs.college = 'College / Institute Name is required.';
      }
      if (formConfig?.course?.required && !participantDetails.course?.trim()) {
        errs.course = 'Course / Degree is required.';
      }
      if (formConfig?.specialization?.required && !participantDetails.specialization?.trim()) {
        errs.specialization = 'Specialization is required.';
      }

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return false;
      }
      return true;
    }

    // STEP 3: Team Details & Custom Questions
    if (step === 3) {
      if (registrationType === 'team') {
        if (!teamName.trim() || teamName.trim().length < 2) {
          errs.teamName = 'Please enter a valid Team Name (minimum 2 characters).';
        }

        if (teamMembers.length < minTeam) {
          errs.teamSize = `Please add at least ${minTeam - teamMembers.length} more member${minTeam - teamMembers.length > 1 ? 's' : ''} to meet the minimum team size of ${minTeam}.`;
        }

        if (teamMembers.length > maxTeam) {
          errs.teamSize = `Team size cannot exceed ${maxTeam} members.`;
        }

        const emails = teamMembers.map(m => (m.email || '').toLowerCase().trim()).filter(Boolean);
        if (new Set(emails).size !== emails.length) {
          errs.teamMembers = 'Duplicate email addresses detected in team roster.';
        }
      }

      // Validate custom questions if any
      if (customQuestions.length > 0) {
        for (const q of customQuestions) {
          if (q.required) {
            const ans = customAnswers[q.id];
            if (ans === undefined || ans === null || String(ans).trim() === '') {
              errs[`custom_${q.id}`] = `Please answer "${q.label}".`;
            }
          }
        }
      }

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return false;
      }
      return true;
    }

    // STEP 4: Terms, Payment & Confirmation
    if (step === 4) {
      if (totalAmount > 0) {
        if (!utrNumber.trim()) {
          errs.utrNumber = 'Please enter your UPI UTR / Transaction reference ID.';
        }
        if (!paymentConfirmed) {
          errs.paymentConfirmed = 'Please confirm that you have completed the UPI payment.';
        }
      }

      if (event.termsAndConditions?.isMandatory !== false && !termsAccepted) {
        errs.terms = 'You must agree to the Terms & Conditions and Code of Conduct to proceed.';
      }

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (step < 4) {
      setStep(prev => prev + 1);
    } else if (step === 4) {
      handleSubmitRegistration();
    }
  };

  const handleBack = () => {
    setError(null);
    setFieldErrors({});
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  // Submit Registration to MongoDB API
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
        utrNumber: utrNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        sendInvitations: true
      };

      if (totalAmount > 0) {
        payload.paymentDetails = {
          pricingType: 'paid',
          amount: totalAmount,
          currency: paymentConfig?.currency || 'INR',
          feeType: paymentConfig?.feeType || 'per_participant',
          paymentStatus: 'pending',
          utrNumber: utrNumber.trim(),
          paymentAmount: totalAmount,
          paymentSubmittedAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
          gateway: 'upi'
        };
      }

      const res = await api.registerForEvent(event._id, payload);
      setRegisteredResult(res.registration);
      setInvitationsResult(res.invitations || []);
      if (res.emailWarning) {
        setEmailWarningMsg(res.emailWarning);
      }
      setStep(5); // Show confirmation step
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

  const copyTicketId = (ticketId: string) => {
    navigator.clipboard.writeText(ticketId);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2500);
  };

  const stepLabels = [
    { title: 'Personal Details', subtitle: 'Identity & contact' },
    { title: 'Academic / Professional', subtitle: 'Education & domain' },
    { title: 'Team & Event Options', subtitle: 'Roster & preferences' },
    { title: 'Review & Payment', subtitle: 'Verification & terms' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-medium">
                <span className="font-semibold text-blue-600">{event.category}</span>
                <span aria-hidden="true">·</span>
                <span>{registrationType === 'team' ? 'Team Registration' : 'Individual Registration'}</span>
                {totalAmount > 0 ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-slate-900">₹{totalAmount}</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-emerald-600">Free Event</span>
                  </>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight line-clamp-1">
                {event.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Organized by {event.organizer?.name || 'EventHub Organizer'}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close registration form"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Clean Stepper Progress Indicator */}
          {step <= 4 && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {stepLabels.map((s, idx) => {
                  const stepNumber = idx + 1;
                  const isActive = step === stepNumber;
                  const isDone = step > stepNumber;
                  return (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isActive
                              ? 'bg-blue-600 text-white ring-4 ring-blue-50 shadow-xs'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isDone ? '✓' : stepNumber}
                        </div>
                        <span
                          className={`text-xs font-semibold truncate hidden md:inline ${
                            isActive ? 'text-blue-700' : isDone ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {s.title}
                        </span>
                      </div>
                      <div
                        className={`h-1 w-full rounded-full transition-all ${
                          isDone ? 'bg-emerald-600' : isActive ? 'bg-blue-600' : 'bg-slate-100'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-white text-slate-900">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: PERSONAL DETAILS                                                  */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Personal Details</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Please provide your personal information for your digital entry pass and official event credentials.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={participantDetails.firstName || ''}
                    onChange={e => updateParticipantField('firstName', e.target.value)}
                    placeholder="e.g. John"
                    className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border ${
                      fieldErrors.firstName
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10'
                    } rounded-xl focus:outline-none focus:ring-3 transition-colors`}
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={participantDetails.lastName || ''}
                    onChange={e => updateParticipantField('lastName', e.target.value)}
                    placeholder="e.g. Doe"
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 rounded-xl focus:outline-none focus:ring-3 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={participantDetails.email || ''}
                    onChange={e => updateParticipantField('email', e.target.value)}
                    placeholder="john.doe@example.com"
                    className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border ${
                      fieldErrors.email
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10'
                    } rounded-xl focus:outline-none focus:ring-3 transition-colors`}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mobile Number {formConfig?.phone?.required && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="tel"
                    value={participantDetails.phone || ''}
                    onChange={e => updateParticipantField('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border ${
                      fieldErrors.phone
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10'
                    } rounded-xl focus:outline-none focus:ring-3 transition-colors`}
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={participantDetails.gender || ''}
                    onChange={e => updateParticipantField('gender', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 rounded-xl focus:outline-none focus:ring-3 transition-colors"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Location (City / State)
                  </label>
                  <input
                    type="text"
                    value={participantDetails.location || participantDetails.cityState || ''}
                    onChange={e => {
                      updateParticipantField('location', e.target.value);
                      updateParticipantField('cityState', e.target.value);
                    }}
                    placeholder="e.g. Bangalore, India"
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 rounded-xl focus:outline-none focus:ring-3 transition-colors"
                  />
                </div>

                {/* Differently Abled Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Differently Abled Status
                  </label>
                  <select
                    value={participantDetails.differentlyAbledStatus || 'no'}
                    onChange={e => updateParticipantField('differentlyAbledStatus', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 rounded-xl focus:outline-none focus:ring-3 transition-colors"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes (Assistance Requested)</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: ACADEMIC / PROFESSIONAL DETAILS                                   */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Academic / Professional Details</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Specify your background to facilitate networking, team grouping, and certificate generation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* User Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    User Type
                  </label>
                  <select
                    value={participantDetails.userType || 'College Student'}
                    onChange={e => updateParticipantField('userType', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 rounded-xl focus:outline-none focus:ring-3 transition-colors"
                  >
                    <option value="College Student">College Student</option>
                    <option value="Working Professional">Working Professional</option>
                    <option value="Researcher / Academician">Researcher / Academician</option>
                    <option value="School Student">School Student</option>
                    <option value="Freelancer / Entrepreneur">Freelancer / Entrepreneur</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* College / Institute / Company */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    College / Institute Name {formConfig?.college?.required && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={participantDetails.college || ''}
                    onChange={e => {
                      updateParticipantField('college', e.target.value);
                      updateParticipantField('instituteName', e.target.value);
                    }}
                    placeholder="e.g. National Institute of Technology"
                    className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border ${
                      fieldErrors.college
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10'
                    } rounded-xl focus:outline-none focus:ring-3 transition-colors`}
                  />
                  {fieldErrors.college && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.college}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Course */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Course / Degree {formConfig?.course?.required && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={participantDetails.course || ''}
                    onChange={e => updateParticipantField('course', e.target.value)}
                    placeholder="e.g. B.Tech / B.E."
                    className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border ${
                      fieldErrors.course
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10'
                    } rounded-xl focus:outline-none focus:ring-3 transition-colors`}
                  />
                  {fieldErrors.course && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.course}</p>
                  )}
                </div>

                {/* Specialization */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={participantDetails.specialization || ''}
                    onChange={e => updateParticipantField('specialization', e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 rounded-xl focus:outline-none focus:ring-3 transition-colors"
                  />
                </div>

                {/* Domain */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Domain / Field
                  </label>
                  <select
                    value={participantDetails.domain || ''}
                    onChange={e => updateParticipantField('domain', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 rounded-xl focus:outline-none focus:ring-3 transition-colors"
                  >
                    <option value="">Select Domain</option>
                    <option value="Technology & Software">Technology & Software</option>
                    <option value="Artificial Intelligence / Data Science">AI & Data Science</option>
                    <option value="Design & UI/UX">Design & Creative</option>
                    <option value="Business & Entrepreneurship">Business & Management</option>
                    <option value="Engineering & Robotics">Core Engineering</option>
                    <option value="Healthcare & Life Sciences">Healthcare & Sciences</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Graduation Year */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Graduation Year
                  </label>
                  <select
                    value={participantDetails.graduatingYear || '2026'}
                    onChange={e => updateParticipantField('graduatingYear', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 rounded-xl focus:outline-none focus:ring-3 transition-colors"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                    <option value="2029">2029</option>
                    <option value="2030+">2030 or later</option>
                  </select>
                </div>

                {/* Course Duration */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Course Duration
                  </label>
                  <select
                    value={participantDetails.courseDuration || '4 Years'}
                    onChange={e => updateParticipantField('courseDuration', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 rounded-xl focus:outline-none focus:ring-3 transition-colors"
                  >
                    <option value="4 Years">4 Years</option>
                    <option value="3 Years">3 Years</option>
                    <option value="2 Years">2 Years</option>
                    <option value="1 Year">1 Year</option>
                    <option value="5 Years">5 Years</option>
                    <option value="N/A">Not Applicable</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: TEAM DETAILS & EVENT OPTIONS                                      */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Team Details & Event Preferences</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose your participation format and manage team members if participating with a group.
                </p>
              </div>

              {/* Individual / Team registration selection (when both allowed) */}
              {allowsBoth && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setRegistrationType('individual')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      registrationType === 'individual'
                        ? 'bg-blue-50/50 border-blue-600 ring-2 ring-blue-600/10 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          registrationType === 'individual'
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {registrationType === 'individual' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="font-semibold text-slate-900 text-sm">Individual Registration</div>
                    <div className="text-xs text-slate-500 mt-0.5">Participate as a solo attendee with your own pass.</div>
                  </div>

                  <div
                    onClick={() => setRegistrationType('team')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      registrationType === 'team'
                        ? 'bg-blue-50/50 border-blue-600 ring-2 ring-blue-600/10 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          registrationType === 'team'
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {registrationType === 'team' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="font-semibold text-slate-900 text-sm">Team Registration</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Register a group of {minTeam} to {maxTeam} members and invite teammates.
                    </div>
                  </div>
                </div>
              )}

              {/* TEAM SECTION */}
              {registrationType === 'team' && (
                <div className="space-y-5">
                  {/* Team Name */}
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-800">
                        Team Name <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-xs font-medium text-slate-500">
                        Required Size: {minTeam} – {maxTeam} Members
                      </span>
                    </div>
                    <input
                      type="text"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      placeholder="e.g. ApexInnovators"
                      className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border ${
                        fieldErrors.teamName
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                          : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10'
                      } rounded-xl focus:outline-none focus:ring-3 transition-colors`}
                    />
                    {fieldErrors.teamName && (
                      <p className="text-xs text-rose-600 font-medium">{fieldErrors.teamName}</p>
                    )}
                  </div>

                  {/* Team Members List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Team Members ({teamMembers.length} / {maxTeam})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {teamMembers.length < minTeam
                            ? `Add ${minTeam - teamMembers.length} more member to meet minimum required team size.`
                            : `Team roster meets minimum required size.`}
                        </p>
                      </div>

                      {teamMembers.length < maxTeam && (
                        <button
                          type="button"
                          onClick={handleOpenAddMemberModal}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Team Member
                        </button>
                      )}
                    </div>

                    {fieldErrors.teamSize && (
                      <p className="text-xs text-rose-600 font-medium">{fieldErrors.teamSize}</p>
                    )}
                    {fieldErrors.teamMembers && (
                      <p className="text-xs text-rose-600 font-medium">{fieldErrors.teamMembers}</p>
                    )}

                    {/* Member Cards */}
                    <div className="space-y-2.5">
                      {teamMembers.map((member, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                            member.isLeader
                              ? 'bg-white border-blue-200/80 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                  member.isLeader
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {member.isLeader ? '1' : idx + 1}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-900 text-sm">
                                    {member.firstName} {member.lastName || ''}
                                  </span>
                                  {renderStatusBadge(member.status, member.isLeader)}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    {member.email}
                                  </span>
                                  {member.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {member.phone}
                                    </span>
                                  )}
                                  {member.college && (
                                    <span className="flex items-center gap-1">
                                      <Building className="w-3 h-3 text-slate-400" />
                                      {member.college}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {!member.isLeader && (
                              <div className="flex items-center gap-1.5 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMemberModal(idx)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Member"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRemovingMemberIdx(idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remove Member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

              {/* INDIVIDUAL REGISTRATION NOTICE */}
              {registrationType === 'individual' && !allowsBoth && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <User className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-900 block font-semibold mb-0.5">Individual Event Participation</strong>
                    You are registering as a solo attendee. Upon confirmation, a unique ticket QR code and registration ID will be generated for you.
                  </div>
                </div>
              )}

              {/* Custom Event Questions (Configured by Organizer) */}
              {customQuestions.length > 0 && (
                <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Additional Event Questions
                  </h4>
                  {customQuestions.map(q => (
                    <div key={q.id}>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {q.label} {q.required && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={customAnswers[q.id] || ''}
                        onChange={e => setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })}
                        placeholder={q.placeholder || 'Enter your response'}
                        className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 rounded-xl focus:outline-none focus:ring-3 transition-colors"
                      />
                      {fieldErrors[`custom_${q.id}`] && (
                        <p className="mt-1 text-xs text-rose-600 font-medium">
                          {fieldErrors[`custom_${q.id}`]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Special Requests / Dietary Requirements (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Share any accessibility requests, food allergies, or notes for event organizers..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 rounded-xl focus:outline-none focus:ring-3 transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: PAYMENT / CONFIRMATION                                            */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review & Confirmation</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Please review your information, fee breakdown, and event policies before finalizing your registration.
                </p>
              </div>

              {/* Registration Summary Card */}
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Registration Summary
                  </span>
                  <span className="text-xs font-medium text-slate-600 capitalize">
                    {registrationType} Registration
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Attendee / Leader</span>
                    <span className="font-semibold text-slate-900">
                      {participantDetails.firstName} {participantDetails.lastName || ''}
                    </span>
                    <span className="text-slate-500 block">{participantDetails.email}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">College / Institution</span>
                    <span className="font-medium text-slate-800">
                      {participantDetails.college || 'Not specified'}
                    </span>
                    <span className="text-slate-500 block">
                      {participantDetails.course || ''} {participantDetails.specialization ? `(${participantDetails.specialization})` : ''}
                    </span>
                  </div>
                </div>

                {registrationType === 'team' && (
                  <div className="pt-3 border-t border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Team: {teamName}</span>
                      <span className="text-slate-500">{teamMembers.length} Members</span>
                    </div>
                    <div className="space-y-1">
                      {teamMembers.map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-600">
                          <span>
                            {i === 0 ? '👑 Leader: ' : '• Member: '}
                            <strong>{m.firstName} {m.lastName || ''}</strong> ({m.email})
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {i === 0 ? 'Confirmed' : 'Invitation Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* PAYMENT SECTION (If paid event) */}
              {totalAmount > 0 ? (
                <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 bg-linear-to-b from-blue-50/50 to-white space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        UPI Payment Details
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Payment Verification Pending
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>
                        Fee ({isFeePerTeam ? 'Per Team' : `₹${perParticipantFee} × ${currentMemberCount} attendee${currentMemberCount > 1 ? 's' : ''}`})
                      </span>
                      <span className="font-medium text-slate-900">₹{totalAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Convenience / Platform Charges</span>
                      <span className="font-medium text-emerald-600">Free (₹0)</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
                      <span>Registration Fee Payable</span>
                      <span className="text-base font-extrabold text-blue-700">₹{totalAmount}</span>
                    </div>
                  </div>

                  {/* UPI ID & QR Code Container */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                    {/* UPI ID Box */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Organizer UPI ID
                      </label>
                      <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200">
                        <span className="font-mono font-bold text-slate-800 text-xs truncate">
                          {event.upiId || event.paymentConfig?.upiId || 'eventhub@upi'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const upi = event.upiId || event.paymentConfig?.upiId || '';
                            if (upi) {
                              navigator.clipboard.writeText(upi);
                              setCopiedUpi(true);
                              setTimeout(() => setCopiedUpi(false), 2000);
                            }
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 shrink-0"
                        >
                          {copiedUpi ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-blue-600" />
                              <span>Copy UPI ID</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* QR Code if present */}
                    {(event.upiQrCodeUrl || event.paymentConfig?.upiQrCodeUrl) && (
                      <div className="pt-2 border-t border-slate-200 flex flex-col items-center text-center space-y-2">
                        <span className="text-[11px] font-semibold text-slate-600">Scan QR Code to Pay</span>
                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <img
                            src={event.upiQrCodeUrl || event.paymentConfig?.upiQrCodeUrl}
                            alt="UPI QR Code"
                            className="w-36 h-36 object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* Payment Instructions */}
                    <div className="pt-2 border-t border-slate-200 text-slate-600 space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 block">Payment Instructions:</span>
                      <p className="text-[11.5px] leading-relaxed text-slate-600">
                        {event.paymentInstructions ||
                          event.paymentConfig?.paymentInstructions ||
                          'Pay using the UPI ID or scan the QR code. After payment, enter your UTR / Transaction ID below.'}
                      </p>
                    </div>
                  </div>

                  {/* UTR / Transaction ID Input Field */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-bold text-slate-900">
                      UTR / Transaction ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={utrNumber}
                      onChange={(e) => {
                        setUtrNumber(e.target.value);
                        if (fieldErrors.utrNumber) {
                          setFieldErrors(prev => {
                            const next = { ...prev };
                            delete next.utrNumber;
                            return next;
                          });
                        }
                      }}
                      placeholder="e.g. 12-digit UTR (e.g. 429384918234) or Reference ID"
                      className="w-full p-2.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                    />
                    {fieldErrors.utrNumber && (
                      <p className="text-xs text-rose-600 font-medium">{fieldErrors.utrNumber}</p>
                    )}
                  </div>

                  {/* Payment Confirmation Checkbox */}
                  <div className="space-y-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paymentConfirmed}
                        onChange={(e) => {
                          setPaymentConfirmed(e.target.checked);
                          if (fieldErrors.paymentConfirmed) {
                            setFieldErrors(prev => {
                              const next = { ...prev };
                              delete next.paymentConfirmed;
                              return next;
                            });
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600/20 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs text-slate-700 leading-normal">
                        I have completed the payment of ₹{totalAmount} via UPI. <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    {fieldErrors.paymentConfirmed && (
                      <p className="text-xs text-rose-600 font-medium">{fieldErrors.paymentConfirmed}</p>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 italic bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/60">
                    ℹ️ Note: Payment is not automatically marked as verified. The organizer will review your UTR / transaction ID and verify your registration.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Free Event Registration — No fee required.</span>
                  </div>
                  <span className="font-bold text-emerald-700">₹0</span>
                </div>
              )}

              {/* TERMS & CONDITIONS SECTION */}
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Terms & Conditions
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 max-h-28 overflow-y-auto leading-relaxed">
                  {event.termsAndConditions?.text ||
                    'By registering for this event, you agree to adhere to the EventHub community guidelines, respect venue rules, follow organizer instructions, and present your digital QR pass upon arrival.'}
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={e => {
                      setTermsAccepted(e.target.checked);
                      if (fieldErrors.terms) {
                        setFieldErrors(prev => {
                          const next = { ...prev };
                          delete next.terms;
                          return next;
                        });
                      }
                    }}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600/20 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-normal">
                    I have read and agree to the event <strong>Terms & Conditions</strong>, Code of Conduct, and policies. <span className="text-rose-500">*</span>
                  </span>
                </label>
                {fieldErrors.terms && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.terms}</p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: REGISTRATION CONFIRMATION SCREEN (POST-SUBMIT)                    */}
          {/* ========================================================================= */}
          {step === 5 && registeredResult && (
            <div className="py-4 space-y-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-slate-900">
                  {registeredResult.status === 'confirmed'
                    ? 'Registration Confirmed!'
                    : 'Team Registration Initialized!'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  {registeredResult.status === 'confirmed'
                    ? 'Your pass has been created. A digital ticket and QR access pass are ready in your dashboard.'
                    : `Your team "${registeredResult.teamName}" has been recorded. Invitations have been generated for your teammates.`}
                </p>
              </div>

              {/* Online Submission Form Card (If configured by Organizer) */}
              {event.submissionFormUrl && (
                <div className="max-w-md mx-auto p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-left space-y-2.5">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Online Submission
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-700">
                    Submit your project/work using the form below.
                  </p>
                  <a
                    href={event.submissionFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    <span>Open Submission Form</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <p className="text-[10px] text-indigo-500">
                    You are opening an external submission form provided by the organizer.
                  </p>
                </div>
              )}

              {/* UPI Payment Status Notice */}
              {totalAmount > 0 && (
                <div className="max-w-md mx-auto p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900">Payment Status: Pending Verification</span>
                    <span className="text-[11px] font-mono text-amber-800 font-semibold">
                      ₹{totalAmount}
                    </span>
                  </div>
                  {utrNumber && (
                    <p className="text-amber-800 text-[11px]">
                      Submitted UTR / Ref: <span className="font-mono font-semibold">{utrNumber}</span>
                    </p>
                  )}
                  <p className="text-amber-700 text-[11px] leading-relaxed">
                    The organizer will verify your payment against their UPI statements. Once verified, your status will update in your dashboard.
                  </p>
                </div>
              )}

              {emailWarningMsg && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Email Delivery Status</span>
                    {emailWarningMsg}. Invitations are saved in your team dashboard and you can copy their direct invitation links below.
                  </div>
                </div>
              )}

              {/* Digital Pass Code Card */}
              {registeredResult.ticketId && (
                <div className="max-w-md mx-auto p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Digital Ticket Code</span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Verified
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-slate-900 tracking-wider">
                      {registeredResult.ticketId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyTicketId(registeredResult.ticketId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {copiedTicket ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Team Member Invitations List */}
              {invitationsResult.length > 0 && (
                <div className="max-w-lg mx-auto text-left space-y-2.5 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Teammate Invitations ({invitationsResult.length})
                  </h4>
                  <div className="space-y-2">
                    {invitationsResult.map((inv, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900">{inv.memberName}</div>
                          <div className="text-slate-500 text-[11px]">{inv.memberEmail}</div>
                          <div className="text-[11px] text-amber-700 font-medium">Status: Invitation Pending</div>
                        </div>

                        {inv.token && (
                          <button
                            type="button"
                            onClick={() => copyInvitationLink(inv.token)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors self-start sm:self-center cursor-pointer shrink-0"
                          >
                            {copiedToken === inv.token ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Link Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-blue-600" />
                                <span>Copy Invite Link</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-semibold bg-slate-900 hover:bg-slate-800 text-white text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Done & View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {step <= 4 && (
          <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-between flex-shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : step === 4 ? (
                  registrationType === 'team' ? 'Confirm Team & Send Invitations' : 'Submit Registration'
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT MEMBER MODAL (WHITE CLEAN MODAL)                               */}
      {/* ========================================================================= */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-5 sm:p-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingMemberIdx !== null ? 'Edit Team Member Details' : 'Add Team Member'}
              </h3>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={memberFormData.firstName || ''}
                    onChange={e => setMemberFormData({ ...memberFormData, firstName: e.target.value })}
                    placeholder="e.g. Alex"
                    className={`w-full px-3 py-2 text-xs text-slate-900 bg-white border ${
                      memberModalErrors.firstName ? 'border-rose-400' : 'border-slate-200 focus:border-blue-600'
                    } rounded-xl focus:outline-none transition-colors`}
                  />
                  {memberModalErrors.firstName && (
                    <p className="text-[11px] text-rose-600 mt-1">{memberModalErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={memberFormData.lastName || ''}
                    onChange={e => setMemberFormData({ ...memberFormData, lastName: e.target.value })}
                    placeholder="e.g. Smith"
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 focus:border-blue-600 rounded-xl focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={memberFormData.email || ''}
                  onChange={e => setMemberFormData({ ...memberFormData, email: e.target.value })}
                  placeholder="alex.smith@example.com"
                  className={`w-full px-3 py-2 text-xs text-slate-900 bg-white border ${
                    memberModalErrors.email ? 'border-rose-400' : 'border-slate-200 focus:border-blue-600'
                  } rounded-xl focus:outline-none transition-colors`}
                />
                {memberModalErrors.email && (
                  <p className="text-[11px] text-rose-600 mt-1">{memberModalErrors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Phone {formConfig?.phone?.required && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="tel"
                    value={memberFormData.phone || ''}
                    onChange={e => setMemberFormData({ ...memberFormData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 focus:border-blue-600 rounded-xl focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={memberFormData.gender || ''}
                    onChange={e => setMemberFormData({ ...memberFormData, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 focus:border-blue-600 rounded-xl focus:outline-none transition-colors"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  College / Institution Name {formConfig?.college?.required && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  value={memberFormData.college || ''}
                  onChange={e => setMemberFormData({ ...memberFormData, college: e.target.value })}
                  placeholder="e.g. Institute of Technology"
                  className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 focus:border-blue-600 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course / Degree</label>
                  <input
                    type="text"
                    value={memberFormData.course || ''}
                    onChange={e => setMemberFormData({ ...memberFormData, course: e.target.value })}
                    placeholder="e.g. B.Tech"
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 focus:border-blue-600 rounded-xl focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Graduation Year</label>
                  <select
                    value={memberFormData.graduatingYear || '2026'}
                    onChange={e => setMemberFormData({ ...memberFormData, graduatingYear: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 focus:border-blue-600 rounded-xl focus:outline-none transition-colors"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                    <option value="2029+">2029+</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMemberFromModal}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Save Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REMOVE MEMBER CONFIRMATION DIALOG (WHITE CLEAN CARD)                      */}
      {/* ========================================================================= */}
      {removingMemberIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 shadow-xl animate-scale-up">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Remove Team Member?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong>{teamMembers[removingMemberIdx]?.firstName} {teamMembers[removingMemberIdx]?.lastName}</strong> from this team roster?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRemovingMemberIdx(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Keep Member
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
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

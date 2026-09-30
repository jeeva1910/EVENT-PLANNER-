import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Upload,
  Plus,
  Trash2,
  Accessibility,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Settings,
  CreditCard,
  FileCheck,
  ShieldCheck,
  IndianRupee,
  Layers,
  HelpCircle,
  Info,
  Trophy,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ISession,
  ISpeaker,
  IAccessibility,
  ICategory,
  ITeamSettings,
  IRegistrationFormConfig,
  IPaymentConfig,
  ITermsAndConditions,
  IPrize,
  RegistrationType
} from '../types';
import { RegistrationFormBuilder } from '../components/RegistrationFormBuilder';
import { PrizesSectionBuilder } from '../components/PrizesSectionBuilder';

export const CreateEventPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active tab or section navigation
  const [activeSection, setActiveSection] = useState<'basic' | 'team' | 'form' | 'payment' | 'prizes' | 'schedule' | 'accessibility'>('basic');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical');
  const [eventType, setEventType] = useState<'offline' | 'online' | 'hybrid'>('offline');
  const [poster, setPoster] = useState('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80');
  const [posterPublicId, setPosterPublicId] = useState<string>('');
  const [uploadingPoster, setUploadingPoster] = useState<boolean>(false);
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');

  // Competition, Contest & Hackathon Prizes / Rewards
  const [prizes, setPrizes] = useState<IPrize[]>([]);

  // Optional Online Submission Form Link (Google Forms, Typeform, etc.)
  const [submissionFormUrl, setSubmissionFormUrl] = useState<string>('');

  // Phase 1: Team Settings State
  const [teamSettings, setTeamSettings] = useState<ITeamSettings>({
    registrationType: 'individual',
    minTeamSize: 1,
    maxTeamSize: 4,
    includeLeaderInTeamSize: true,
    allowAddMembersDuringRegistration: true,
    allowInviteMembersLater: true,
    isMemberDetailsMandatory: true,
    requireOrganizerApproval: false,
    allowIndividualRegistrationWhenBoth: true
  });

  // Phase 1: Registration Form Configuration State
  const [registrationFormConfig, setRegistrationFormConfig] = useState<IRegistrationFormConfig>({
    firstName: { enabled: true, required: true, label: 'First Name' },
    lastName: { enabled: true, required: false, label: 'Last Name' },
    email: { enabled: true, required: true, label: 'Email Address' },
    phone: { enabled: true, required: true, label: 'Mobile Number' },
    gender: { enabled: true, required: false, label: 'Gender' },
    dateOfBirth: { enabled: false, required: false, label: 'Date of Birth' },
    college: { enabled: true, required: true, label: 'College / Institute / Organization' },
    userType: { enabled: true, required: false, label: 'User Type' },
    domain: { enabled: false, required: false, label: 'Domain / Stream' },
    course: { enabled: true, required: false, label: 'Course / Degree' },
    specialization: { enabled: false, required: false, label: 'Course Specialization' },
    yearOfStudy: { enabled: true, required: false, label: 'Current Year of Study' },
    graduatingYear: { enabled: false, required: false, label: 'Graduating Year' },
    courseDuration: { enabled: false, required: false, label: 'Course Duration' },
    cityState: { enabled: false, required: false, label: 'City & State' },
    linkedin: { enabled: false, required: false, label: 'LinkedIn Profile' },
    customQuestions: []
  });

  // Phase 1 & 3: Payment & Pricing Configuration (UPI Direct Pay)
  const [paymentConfig, setPaymentConfig] = useState<IPaymentConfig>({
    pricingType: 'free',
    fee: 0,
    currency: 'INR',
    feeType: 'per_participant',
    paymentRequiredDuringRegistration: true,
    allowLimitedFreeRegistrations: false,
    limitedFreeCount: 0,
    refundPolicy: 'Non-refundable once registration is confirmed.',
    paymentInstructions: 'Pay the registration fee using the UPI ID or scan the QR code. After payment, enter your UTR/transaction ID during registration.',
    requirePaymentConfirmation: true,
    paymentRequired: false,
    registrationFee: 0,
    upiId: '',
    upiQrCodeUrl: '',
    upiQrCodePublicId: ''
  });
  const [uploadingQr, setUploadingQr] = useState(false);

  // Phase 1: Terms & Conditions State
  const [termsAndConditions, setTermsAndConditions] = useState<ITermsAndConditions>({
    text: 'By registering for this event, you agree to adhere to the EventHub code of conduct, respect all participants, and abide by venue safety protocols.',
    isMandatory: true
  });

  // Schedule builder
  const [schedule, setSchedule] = useState<ISession[]>([
    {
      id: 'ses_1',
      title: 'Opening Remarks & Keynote',
      description: 'Welcome and overview of event themes.',
      speaker: 'Keynote Speaker',
      startTime: '09:00 AM',
      endTime: '10:30 AM',
      location: 'Main Hall',
      category: 'Keynote'
    }
  ]);

  // Speakers builder
  const [speakers, setSpeakers] = useState<ISpeaker[]>([
    {
      id: 'spk_1',
      name: '',
      role: '',
      company: '',
      bio: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    }
  ]);

  // Accessibility checklist
  const [accessibility, setAccessibility] = useState<IAccessibility>({
    wheelchairEntrance: true,
    ramps: true,
    elevators: true,
    accessibleRestrooms: true,
    reservedSeating: true,
    accessibleParking: true,
    stepFreeRoutes: true,
    signLanguageSupport: false,
    hearingAssistance: false,
    customNotes: ''
  });

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.getCategories();
        setCategories(res.categories);
      } catch (err) {
        console.error(err);
      }
    }
    loadCategories();

    // Default dates: tomorrow 9am to tomorrow 5pm
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(17, 0, 0, 0);

    setStartDateTime(tomorrow.toISOString().slice(0, 16));
    setEndDateTime(tomorrowEnd.toISOString().slice(0, 16));
    setRegistrationDeadline(tomorrow.toISOString().slice(0, 16));
  }, []);

  const handleAddSession = () => {
    setSchedule([
      ...schedule,
      {
        id: `ses_${Date.now()}`,
        title: '',
        description: '',
        speaker: '',
        startTime: '11:00 AM',
        endTime: '12:30 PM',
        location: 'Main Auditorium',
        category: 'Session'
      }
    ]);
  };

  const handleRemoveSession = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  const handleAddSpeaker = () => {
    setSpeakers([
      ...speakers,
      {
        id: `spk_${Date.now()}`,
        name: '',
        role: '',
        company: '',
        bio: '',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      }
    ]);
  };

  const handleRemoveSpeaker = (index: number) => {
    setSpeakers(speakers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      setError('Event end date and time must be strictly after the start time.');
      return;
    }

    // Validate team sizes
    if (teamSettings.registrationType === 'team' || teamSettings.registrationType === 'both') {
      if (teamSettings.minTeamSize > teamSettings.maxTeamSize) {
        setError('Minimum team size cannot exceed maximum team size.');
        setActiveSection('team');
        return;
      }
      if (teamSettings.minTeamSize < 1) {
        setError('Minimum team size must be at least 1.');
        setActiveSection('team');
        return;
      }
    }

    // Validate prizes if any entered
    const invalidPrize = prizes.find(p => !p.position.trim() || !p.title.trim());
    if (invalidPrize) {
      setError('Please fill in both Position/Rank and Title for all configured prize tiers, or remove empty entries.');
      setActiveSection('prizes');
      return;
    }

    // Validate payment configuration if paid
    const isPaidEvent = paymentConfig.pricingType === 'paid' || paymentConfig.paymentRequired;
    if (isPaidEvent) {
      const fee = Number(paymentConfig.fee || paymentConfig.registrationFee || 0);
      if (fee <= 0) {
        setError('Registration fee must be greater than 0 for paid events.');
        setActiveSection('payment');
        return;
      }
      if (!paymentConfig.upiId?.trim()) {
        setError('UPI ID is required for paid events (e.g. yourname@upi).');
        setActiveSection('payment');
        return;
      }
    }

    // Validate submission form URL if provided
    if (submissionFormUrl.trim()) {
      try {
        const parsed = new URL(submissionFormUrl.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setError('Online submission form link must start with http:// or https://');
          setActiveSection('basic');
          return;
        }
      } catch {
        setError('Please enter a valid URL for the Online Submission Form (e.g. https://forms.google.com/...)');
        setActiveSection('basic');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const validSpeakers = speakers.filter(s => s.name.trim() !== '');
      const validSchedule = schedule.filter(s => s.title.trim() !== '');
      const validPrizes = prizes.filter(p => p.position.trim() !== '' && p.title.trim() !== '');
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const effectivePrice = isPaidEvent ? Math.max(1, Number(paymentConfig.fee || paymentConfig.registrationFee) || 0) : 0;
      const cleanUpiId = isPaidEvent ? (paymentConfig.upiId || '').trim() : '';
      const cleanQrUrl = isPaidEvent ? (paymentConfig.upiQrCodeUrl || '').trim() : '';
      const cleanQrPublicId = isPaidEvent ? (paymentConfig.upiQrCodePublicId || '').trim() : '';
      const cleanInstructions = isPaidEvent ? (paymentConfig.paymentInstructions || '').trim() : '';

      const res = await api.createEvent({
        title,
        description,
        category,
        eventType,
        poster,
        posterPublicId: posterPublicId || undefined,
        startDateTime: new Date(startDateTime).toISOString(),
        endDateTime: new Date(endDateTime).toISOString(),
        timezone,
        venueName: venueName || 'Virtual Link / TBD',
        address: address || '',
        city: city || 'Online',
        capacity: Number(capacity) || 100,
        price: effectivePrice,
        paymentRequired: isPaidEvent,
        registrationFee: effectivePrice,
        upiId: cleanUpiId || undefined,
        upiQrCodeUrl: cleanQrUrl || undefined,
        upiQrCodePublicId: cleanQrPublicId || undefined,
        paymentInstructions: cleanInstructions || undefined,
        registrationDeadline: new Date(registrationDeadline).toISOString(),
        schedule: validSchedule,
        speakers: validSpeakers,
        accessibility,
        contactEmail,
        contactPhone,
        tags,
        teamSettings,
        registrationFormConfig,
        paymentConfig: {
          ...paymentConfig,
          pricingType: isPaidEvent ? 'paid' : 'free',
          fee: effectivePrice,
          paymentRequired: isPaidEvent,
          registrationFee: effectivePrice,
          upiId: cleanUpiId,
          upiQrCodeUrl: cleanQrUrl,
          upiQrCodePublicId: cleanQrPublicId,
          paymentInstructions: cleanInstructions
        },
        termsAndConditions,
        prizes: validPrizes,
        submissionFormUrl: submissionFormUrl.trim() || undefined,
        status
      });

      navigate(`/events/${res.event._id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Organizer Event Suite
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display">
            Create & Configure Event
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure team settings, custom registration forms, pricing models, prize bounties, accessibility, and session agenda.
          </p>
        </div>

        {/* Quick Section Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          {[
            { id: 'basic', label: '1. Basic Info', icon: Layers },
            { id: 'team', label: '2. Team Settings', icon: Users },
            { id: 'form', label: '3. Form Builder', icon: Settings },
            { id: 'payment', label: '4. Payment & Fees', icon: CreditCard },
            { id: 'prizes', label: '5. Prizes & Rewards', icon: Trophy },
            { id: 'schedule', label: '6. Agenda & Schedule', icon: Calendar },
            { id: 'accessibility', label: '7. Accessibility', icon: Accessibility }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-xs font-semibold animate-shake">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ========================================================================= */}
        {/* Section 1: Basic Info */}
        {/* ========================================================================= */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'basic' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                01. Basic Event Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Define event title, format, dates, capacity, and cover visual.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('team')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              Next: Team Settings <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2026 National Hackathon & Innovation Summit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Format *
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="offline">In-Person Venue</option>
                  <option value="online">Online / Virtual</option>
                  <option value="hybrid">Hybrid (In-Person + Streaming)</option>
                </select>
              </div>
            </div>

            {/* Optional Online Submission Form Link */}
            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span>Online Submission Form</span>
                  <span className="text-[10px] font-normal text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded-md">
                    Optional
                  </span>
                </label>
                {(eventType === 'online' || eventType === 'hybrid' || category === 'Hackathon' || category === 'Technical') && (
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 self-start sm:self-auto">
                    Recommended for Online Events & Hackathons
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Add a link to Google Forms, Microsoft Forms, Typeform, or another submission form.
              </p>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://forms.google.com/..."
                  value={submissionFormUrl}
                  onChange={(e) => setSubmissionFormUrl(e.target.value)}
                  className="w-full p-2.5 pl-9 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 font-mono shadow-2xs"
                />
                <ExternalLink className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Description & Event Objective *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Detail the agenda, prerequisites, learning outcomes, networking opportunities, and participant perks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
              ></textarea>
            </div>

            {/* Poster Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Event Poster Banner *
              </label>

              {poster ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-16/9 max-w-xl group shadow-xs">
                  <img
                    src={poster}
                    alt="Event Poster Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-4">
                    <label className="px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-xl cursor-pointer shadow-md transition-transform active:scale-95 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>{uploadingPoster ? 'Uploading...' : 'Replace Poster'}</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        disabled={uploadingPoster}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingPoster(true);
                          const reader = new FileReader();
                          reader.onload = async () => {
                            try {
                              const base64 = reader.result as string;
                              const res = await api.uploadImage(base64, file.name);
                              setPoster(res.url);
                              setPosterPublicId(res.public_id || (res as any).publicId || '');
                            } catch (err: any) {
                              alert(err.message || 'Image upload failed');
                            } finally {
                              setUploadingPoster(false);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setPoster('');
                        setPosterPublicId('');
                      }}
                      className="px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                  {uploadingPoster && (
                    <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center gap-2 text-white text-xs font-bold">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Uploading to Cloudinary...</span>
                    </div>
                  )}
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/40 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer max-w-xl text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                    {uploadingPoster ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {uploadingPoster ? 'Uploading image...' : 'Click or drop to upload event poster'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Supports JPG, JPEG, PNG, WEBP (Max 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    disabled={uploadingPoster}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingPoster(true);
                      const reader = new FileReader();
                      reader.onload = async () => {
                        try {
                          const base64 = reader.result as string;
                          const res = await api.uploadImage(base64, file.name);
                          setPoster(res.url);
                          setPosterPublicId(res.public_id || (res as any).publicId || '');
                        } catch (err: any) {
                          alert(err.message || 'Image upload failed');
                        } finally {
                          setUploadingPoster(false);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}

              <div className="mt-2.5 flex items-center gap-2 max-w-xl">
                <input
                  type="text"
                  value={poster}
                  onChange={(e) => setPoster(e.target.value)}
                  placeholder="Or paste direct image URL (https://...)"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Dates and Deadlines */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registration Deadline *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Venue and Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Maximum Capacity *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Venue / Hall Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Innovation Hall"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100 University Ave"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City / State
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru, KA"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Contact Email & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organizer Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags / Keywords (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI, Hackathon, Python, Web3, College"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Section 2: Team Settings (PHASE 1.B) */}
        {/* ========================================================================= */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'team' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                02. Team Configuration & Participation Mode
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure whether participants register individually, as a team, or have the flexibility for both.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('form')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              Next: Form Builder <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Registration Type Selectable Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-3">
                Registration Type *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    type: 'individual' as RegistrationType,
                    title: 'Individual Only',
                    desc: 'Each participant registers solo. Team settings are disabled.',
                    icon: User
                  },
                  {
                    type: 'team' as RegistrationType,
                    title: 'Team Registration Only',
                    desc: 'Participants must form teams of configured minimum & maximum size.',
                    icon: Users
                  },
                  {
                    type: 'both' as RegistrationType,
                    title: 'Both (Individual & Team)',
                    desc: 'Attendees choose whether to register alone or create a team.',
                    icon: Sparkles
                  }
                ].map((option) => {
                  const Icon = option.icon;
                  const isSelected = teamSettings.registrationType === option.type;
                  return (
                    <div
                      key={option.type}
                      onClick={() =>
                        setTeamSettings({
                          ...teamSettings,
                          registrationType: option.type
                        })
                      }
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <input
                          type="radio"
                          name="registrationType"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{option.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">{option.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team Size & Advanced Configuration (Enabled when Team or Both) */}
            {teamSettings.registrationType === 'individual' ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-slate-600 text-xs">
                <Info className="w-5 h-5 text-slate-400 shrink-0" />
                <span>
                  <strong>Individual Registration Selected:</strong> Team parameters (sizes, member invites, approvals) are inactive. Participants will register with their individual profile.
                </span>
              </div>
            ) : (
              <div className="p-5 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-600" />
                    Team Size & Member Policy
                  </h3>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold">
                    Min: {teamSettings.minTeamSize} | Max: {teamSettings.maxTeamSize} Members
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Minimum Team Size *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={teamSettings.maxTeamSize}
                      value={teamSettings.minTeamSize}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value));
                        setTeamSettings({
                          ...teamSettings,
                          minTeamSize: val
                        });
                      }}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Minimum members needed to complete registration.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Maximum Team Size *
                    </label>
                    <input
                      type="number"
                      min={teamSettings.minTeamSize}
                      max="30"
                      value={teamSettings.maxTeamSize}
                      onChange={(e) => {
                        const val = Math.max(teamSettings.minTeamSize, Number(e.target.value));
                        setTeamSettings({
                          ...teamSettings,
                          maxTeamSize: val
                        });
                      }}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Maximum allowed members per team entry.</p>
                  </div>
                </div>

                {/* Team Policy Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-100 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={teamSettings.includeLeaderInTeamSize}
                      onChange={(e) =>
                        setTeamSettings({
                          ...teamSettings,
                          includeLeaderInTeamSize: e.target.checked
                        })
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Team Leader Counts in Team Size
                      </span>
                      <span className="text-[11px] text-slate-500">
                        E.g. for max 4, leader + 3 members total.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-100 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={teamSettings.allowAddMembersDuringRegistration}
                      onChange={(e) =>
                        setTeamSettings({
                          ...teamSettings,
                          allowAddMembersDuringRegistration: e.target.checked
                        })
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Add Members During Registration
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Leader can fill details and invite peers right inside the modal.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-100 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={teamSettings.isMemberDetailsMandatory}
                      onChange={(e) =>
                        setTeamSettings({
                          ...teamSettings,
                          isMemberDetailsMandatory: e.target.checked
                        })
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Mandatory Member Details
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Requires each team member's details before submission.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-100 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={teamSettings.requireOrganizerApproval}
                      onChange={(e) =>
                        setTeamSettings({
                          ...teamSettings,
                          requireOrganizerApproval: e.target.checked
                        })
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Require Organizer Approval
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Teams are marked 'Pending Approval' until reviewed.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Section 3: Registration Form Builder (PHASE 1.C) */}
        {/* ========================================================================= */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'form' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                03. Registration Form Builder & Custom Questions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Control which profile fields are collected from attendees, configure requirements, and create custom questions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('payment')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              Next: Payment & Fees <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <RegistrationFormBuilder
            config={registrationFormConfig}
            onChange={(newConfig) => setRegistrationFormConfig(newConfig)}
          />
        </div>

        {/* ========================================================================= */}
        {/* Section 4: Payment & Pricing Configuration (PHASE 3) */}
        {/* ========================================================================= */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'payment' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                04. Ticketing & Payment Model
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set free admission or paid registration fee (per participant vs per team) with mock gateway checkout.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('schedule')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              Next: Agenda <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Free vs Paid Toggle Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() =>
                  setPaymentConfig({
                    ...paymentConfig,
                    pricingType: 'free',
                    fee: 0
                  })
                }
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentConfig.pricingType === 'free'
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">Free Event</span>
                  <input
                    type="radio"
                    checked={paymentConfig.pricingType === 'free'}
                    onChange={() => {}}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-xs text-slate-600">Attendees register with zero registration charge.</p>
              </div>

              <div
                onClick={() =>
                  setPaymentConfig({
                    ...paymentConfig,
                    pricingType: 'paid',
                    fee: paymentConfig.fee > 0 ? paymentConfig.fee : 299
                  })
                }
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentConfig.pricingType === 'paid'
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">Paid Registration</span>
                  <input
                    type="radio"
                    checked={paymentConfig.pricingType === 'paid'}
                    onChange={() => {}}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-xs text-slate-600">Collect fee per attendee or flat team registration.</p>
              </div>
            </div>

            {/* Paid Settings */}
            {paymentConfig.pricingType === 'paid' && (
              <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Registration Fee (₹ INR) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        required
                        value={paymentConfig.fee || ''}
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            fee: Math.max(1, Number(e.target.value)),
                            registrationFee: Math.max(1, Number(e.target.value))
                          })
                        }
                        placeholder="e.g. 500"
                        className="w-full pl-7 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Organizer UPI ID *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={paymentConfig.upiId || ''}
                        onChange={(e) =>
                          setPaymentConfig({
                            ...paymentConfig,
                            upiId: e.target.value
                          })
                        }
                        placeholder="e.g. eventhub@upi or yourname@oksbi"
                        className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-1">Participants will pay registration fees to this UPI ID.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Fee Calculation Type *
                    </label>
                    <select
                      value={paymentConfig.feeType}
                      onChange={(e) =>
                        setPaymentConfig({
                          ...paymentConfig,
                          feeType: e.target.value as any
                        })
                      }
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="per_participant">Per Participant (Multiplied by Team Size)</option>
                      <option value="per_team">Per Team (Fixed Flat Amount)</option>
                    </select>
                  </div>
                </div>

                {/* UPI QR Code Upload */}
                <div className="pt-2 border-t border-emerald-100/80">
                  <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    <span>UPI QR Code (Optional)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Upload your UPI QR code image (GPay, PhonePe, Paytm, BHIM) so attendees can scan and pay easily.
                  </p>

                  {paymentConfig.upiQrCodeUrl ? (
                    <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-white border border-slate-200 rounded-2xl max-w-md">
                      <img
                        src={paymentConfig.upiQrCodeUrl}
                        alt="UPI QR Code Preview"
                        className="w-28 h-28 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1"
                      />
                      <div className="space-y-2 text-xs flex-1">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> QR Code Uploaded
                        </span>
                        <p className="text-[11px] text-slate-500">Attendees will scan this QR to pay ₹{paymentConfig.fee}.</p>
                        <div className="flex items-center gap-2 pt-1">
                          <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer transition-colors">
                            <span>Replace</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingQr}
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingQr(true);
                                const reader = new FileReader();
                                reader.onload = async () => {
                                  try {
                                    const base64 = reader.result as string;
                                    const res = await api.uploadImage(base64, file.name);
                                    setPaymentConfig({
                                      ...paymentConfig,
                                      upiQrCodeUrl: res.url,
                                      upiQrCodePublicId: res.public_id || (res as any).publicId || ''
                                    });
                                  } catch (err: any) {
                                    alert(err.message || 'QR upload failed');
                                  } finally {
                                    setUploadingQr(false);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setPaymentConfig({
                                ...paymentConfig,
                                upiQrCodeUrl: '',
                                upiQrCodePublicId: ''
                              })
                            }
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/30 transition-colors rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer max-w-md text-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                        {uploadingQr ? (
                          <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {uploadingQr ? 'Uploading QR Code...' : 'Click to upload UPI QR Code'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">JPG, PNG, WEBP (Max 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingQr}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingQr(true);
                          const reader = new FileReader();
                          reader.onload = async () => {
                            try {
                              const base64 = reader.result as string;
                              const res = await api.uploadImage(base64, file.name);
                              setPaymentConfig({
                                ...paymentConfig,
                                upiQrCodeUrl: res.url,
                                upiQrCodePublicId: res.public_id || (res as any).publicId || ''
                              });
                            } catch (err: any) {
                              alert(err.message || 'QR upload failed');
                            } finally {
                              setUploadingQr(false);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Payment Instructions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Payment Instructions for Attendees
                  </label>
                  <textarea
                    rows={2}
                    value={paymentConfig.paymentInstructions || ''}
                    onChange={(e) =>
                      setPaymentConfig({
                        ...paymentConfig,
                        paymentInstructions: e.target.value
                      })
                    }
                    placeholder="e.g. Pay using the UPI ID or scan QR code. After payment, enter your UTR/transaction reference ID during registration for verification."
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  />
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    Attendees will be asked to enter their UTR / Transaction ID after paying. You will verify payments from the organizer dashboard.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Refund & Cancellation Policy
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100% refund if cancelled 48 hours prior to the event."
                    value={paymentConfig.refundPolicy || ''}
                    onChange={(e) =>
                      setPaymentConfig({
                        ...paymentConfig,
                        refundPolicy: e.target.value
                      })
                    }
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Terms & Conditions Configuration */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-slate-700" />
                  Event Terms & Conditions
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={termsAndConditions.isMandatory}
                    onChange={(e) =>
                      setTermsAndConditions({
                        ...termsAndConditions,
                        isMandatory: e.target.checked
                      })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Mandatory Acceptance</span>
                </label>
              </div>

              <textarea
                rows={2}
                value={termsAndConditions.text}
                onChange={(e) =>
                  setTermsAndConditions({
                    ...termsAndConditions,
                    text: e.target.value
                  })
                }
                className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              ></textarea>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Section 5: Prizes & Rewards */}
        {/* ========================================================================= */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'prizes' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                05. Prizes, Rewards & Bounties
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure prize podiums, winner bounties, certificates, internships, and sponsor tracks for competitions and hackathons.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('schedule')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              Next: Schedule <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <PrizesSectionBuilder prizes={prizes} onChange={setPrizes} />
        </div>

        {/* ========================================================================= */}
        {/* Section 6: Schedule Builder */}
        {/* ========================================================================= */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'schedule' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                06. Agenda & Schedule Tracks
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Add timeline blocks, sessions, and keynote presentations.</p>
            </div>
            <button
              type="button"
              onClick={handleAddSession}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl hover:bg-blue-100 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Session
            </button>
          </div>

          <div className="space-y-3">
            {schedule.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Session #{idx + 1}</span>
                  {schedule.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSession(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Session Title"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].title = e.target.value;
                      setSchedule(updated);
                    }}
                    className="sm:col-span-2 p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Speaker Name"
                    value={item.speaker}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].speaker = e.target.value;
                      setSchedule(updated);
                    }}
                    className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Start Time (e.g. 10:00 AM)"
                    value={item.startTime}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].startTime = e.target.value;
                      setSchedule(updated);
                    }}
                    className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="End Time (e.g. 11:30 AM)"
                    value={item.endTime}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].endTime = e.target.value;
                      setSchedule(updated);
                    }}
                    className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="Room / Location (e.g. Hall A)"
                    value={item.location}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].location = e.target.value;
                      setSchedule(updated);
                    }}
                    className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Section 7: Accessibility Checklist */}
        {/* ========================================================================= */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'accessibility' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                <Accessibility className="w-5 h-5 text-emerald-600" />
                07. Venue Accessibility Confirmation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Highlight accessible facilities for attendees with special needs.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {[
              { key: 'wheelchairEntrance', label: 'Wheelchair Accessible Entrance' },
              { key: 'ramps', label: 'Wheelchair Ramps' },
              { key: 'elevators', label: 'Elevators / Lifts' },
              { key: 'accessibleRestrooms', label: 'Accessible Restrooms' },
              { key: 'reservedSeating', label: 'Reserved Accessible Seating' },
              { key: 'accessibleParking', label: 'Accessible Parking Bays' },
              { key: 'stepFreeRoutes', label: 'Step-Free Internal Routes' },
              { key: 'hearingAssistance', label: 'Hearing Induction Loop' },
              { key: 'signLanguageSupport', label: 'Sign Language (ASL/ISL)' }
            ].map((f) => (
              <label
                key={f.key}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/70"
              >
                <input
                  type="checkbox"
                  checked={Boolean((accessibility as any)[f.key])}
                  onChange={(e) =>
                    setAccessibility({
                      ...accessibility,
                      [f.key]: e.target.checked
                    })
                  }
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">{f.label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Accessibility Instructions & Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Quiet sensory room available on 2nd floor; power outlets at reserved seating."
              value={accessibility.customNotes || ''}
              onChange={(e) =>
                setAccessibility({
                  ...accessibility,
                  customNotes: e.target.value
                })
              }
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Global Footer Actions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700">Publication Status:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="p-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="published">Publish Live Immediately</option>
              <option value="draft">Save as Draft</option>
            </select>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? 'Publishing Event...' : 'Create & Publish Event'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

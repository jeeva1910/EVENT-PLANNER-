import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Accessibility,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Layers,
  Users,
  Settings,
  CreditCard,
  FileCheck,
  Sparkles,
  Info,
  User
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ISession,
  ISpeaker,
  IAccessibility,
  ICategory,
  IEvent,
  ITeamSettings,
  IRegistrationFormConfig,
  IPaymentConfig,
  ITermsAndConditions,
  RegistrationType
} from '../types';
import { RegistrationFormBuilder } from '../components/RegistrationFormBuilder';

export const EditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active section tab
  const [activeSection, setActiveSection] = useState<'basic' | 'team' | 'form' | 'payment' | 'schedule' | 'accessibility'>('basic');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical');
  const [eventType, setEventType] = useState<'offline' | 'online' | 'hybrid'>('offline');
  const [poster, setPoster] = useState('');
  const [posterPublicId, setPosterPublicId] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<'published' | 'draft' | 'cancelled'>('published');

  // Team settings state
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

  // Registration form configuration
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

  // Payment configuration
  const [paymentConfig, setPaymentConfig] = useState<IPaymentConfig>({
    pricingType: 'free',
    fee: 0,
    currency: 'INR',
    feeType: 'per_participant',
    paymentRequiredDuringRegistration: true,
    allowLimitedFreeRegistrations: false,
    limitedFreeCount: 0,
    refundPolicy: 'Non-refundable once registration is confirmed.',
    paymentInstructions: 'Scan QR code or use UPI / Card payment to complete registration fee.',
    requirePaymentConfirmation: true
  });

  // Terms and conditions
  const [termsAndConditions, setTermsAndConditions] = useState<ITermsAndConditions>({
    text: 'By registering for this event, you agree to adhere to the EventHub code of conduct, respect all participants, and abide by venue safety protocols.',
    isMandatory: true
  });

  const [schedule, setSchedule] = useState<ISession[]>([]);
  const [speakers, setSpeakers] = useState<ISpeaker[]>([]);
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
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        const [evtRes, catsRes] = await Promise.all([
          api.getEventById(id),
          api.getCategories()
        ]);
        const evt = evtRes.event;
        setTitle(evt.title);
        setDescription(evt.description);
        setCategory(evt.category);
        setEventType(evt.eventType);
        setPoster(evt.poster);
        setPosterPublicId((evt as any).posterPublicId || '');
        setStartDateTime(new Date(evt.startDateTime).toISOString().slice(0, 16));
        setEndDateTime(new Date(evt.endDateTime).toISOString().slice(0, 16));
        setRegistrationDeadline(evt.registrationDeadline ? new Date(evt.registrationDeadline).toISOString().slice(0, 16) : '');
        setVenueName(evt.venueName);
        setAddress(evt.address || '');
        setCity(evt.city || '');
        setCapacity(evt.capacity);
        setContactEmail(evt.contactEmail || '');
        setContactPhone(evt.contactPhone || '');
        setTagsInput((evt.tags || []).join(', '));
        setStatus(evt.status as any);
        setSchedule(evt.schedule || []);
        setSpeakers(evt.speakers || []);
        if (evt.accessibility) setAccessibility(evt.accessibility);
        if (evt.teamSettings) setTeamSettings(evt.teamSettings);
        if (evt.registrationFormConfig) setRegistrationFormConfig(evt.registrationFormConfig);
        if (evt.paymentConfig) setPaymentConfig(evt.paymentConfig);
        if (evt.termsAndConditions) setTermsAndConditions(evt.termsAndConditions);
        setCategories(catsRes.categories);
      } catch (err: any) {
        setError(err.message || 'Failed to load event for editing');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

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

    setSaving(true);
    setError(null);

    try {
      const validSpeakers = speakers.filter(s => s.name.trim() !== '');
      const validSchedule = schedule.filter(s => s.title.trim() !== '');
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const effectivePrice = paymentConfig.pricingType === 'paid' ? Number(paymentConfig.fee) || 0 : 0;

      await api.updateEvent(id, {
        title,
        description,
        category,
        eventType,
        poster,
        posterPublicId: posterPublicId || undefined,
        startDateTime: new Date(startDateTime).toISOString(),
        endDateTime: new Date(endDateTime).toISOString(),
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : undefined,
        venueName,
        address,
        city,
        capacity: Number(capacity),
        price: effectivePrice,
        contactEmail,
        contactPhone,
        tags,
        status,
        schedule: validSchedule,
        speakers: validSpeakers,
        accessibility,
        teamSettings,
        registrationFormConfig,
        paymentConfig: {
          ...paymentConfig,
          fee: effectivePrice
        },
        termsAndConditions
      });
      navigate(`/events/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto py-16 text-center text-xs text-slate-500">Loading editor...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Event Settings & Configuration
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display">
            Edit Event Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Update registration types, custom questions, team policies, pricing tiers, and session schedule.
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          {[
            { id: 'basic', label: '1. Basic Info', icon: Layers },
            { id: 'team', label: '2. Team Settings', icon: Users },
            { id: 'form', label: '3. Form Builder', icon: Settings },
            { id: 'payment', label: '4. Payment & Fees', icon: CreditCard },
            { id: 'schedule', label: '5. Schedule', icon: Calendar },
            { id: 'accessibility', label: '6. Accessibility', icon: Accessibility }
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
                    ? 'bg-white text-indigo-700 shadow-xs'
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
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'basic' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              01. Basic Event Details
            </h2>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Format</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="offline">In-Person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden leading-relaxed"
              />
            </div>

            {/* Poster banner */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Event Poster</label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={poster}
                  alt="Poster"
                  className="w-48 h-28 object-cover rounded-xl border border-slate-200"
                />
                <div className="flex-1 space-y-2 w-full">
                  <input
                    type="text"
                    value={poster}
                    onChange={(e) => setPoster(e.target.value)}
                    placeholder="Poster URL"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingPoster ? 'Uploading...' : 'Upload New Image'}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/*"
                      disabled={uploadingPoster}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingPoster(true);
                        const reader = new FileReader();
                        reader.onload = async () => {
                          try {
                            const res = await api.uploadImage(reader.result as string, file.name);
                            setPoster(res.url);
                            setPosterPublicId(res.public_id || (res as any).publicId || '');
                          } catch (err: any) {
                            alert(err.message || 'Upload failed');
                          } finally {
                            setUploadingPoster(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Dates & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registration Deadline</label>
                <input
                  type="datetime-local"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Venue Name</label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City / State</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Team Settings */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'team' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              02. Team Configuration & Participation Mode
            </h2>
            <button
              type="button"
              onClick={() => setActiveSection('form')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              Next: Form Builder <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-3">Registration Type *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { type: 'individual' as RegistrationType, title: 'Individual Only', desc: 'Each participant registers solo.', icon: User },
                  { type: 'team' as RegistrationType, title: 'Team Registration Only', desc: 'Teams of configured min/max size.', icon: Users },
                  { type: 'both' as RegistrationType, title: 'Both (Individual & Team)', desc: 'Flexible for individual or team.', icon: Sparkles }
                ].map((option) => {
                  const Icon = option.icon;
                  const isSelected = teamSettings.registrationType === option.type;
                  return (
                    <div
                      key={option.type}
                      onClick={() => setTeamSettings({ ...teamSettings, registrationType: option.type })}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-xs' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <input
                          type="radio"
                          name="editRegistrationType"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-indigo-600"
                        />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{option.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1">{option.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {teamSettings.registrationType !== 'individual' && (
              <div className="p-5 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Minimum Team Size</label>
                    <input
                      type="number"
                      min="1"
                      max={teamSettings.maxTeamSize}
                      value={teamSettings.minTeamSize}
                      onChange={(e) => setTeamSettings({ ...teamSettings, minTeamSize: Math.max(1, Number(e.target.value)) })}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Maximum Team Size</label>
                    <input
                      type="number"
                      min={teamSettings.minTeamSize}
                      max="30"
                      value={teamSettings.maxTeamSize}
                      onChange={(e) => setTeamSettings({ ...teamSettings, maxTeamSize: Math.max(teamSettings.minTeamSize, Number(e.target.value)) })}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-100 bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={teamSettings.includeLeaderInTeamSize}
                      onChange={(e) => setTeamSettings({ ...teamSettings, includeLeaderInTeamSize: e.target.checked })}
                      className="mt-0.5 rounded text-indigo-600 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Leader Counts in Team Size</span>
                      <span className="text-[11px] text-slate-500">Leader is counted towards team capacity</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-100 bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={teamSettings.allowAddMembersDuringRegistration}
                      onChange={(e) => setTeamSettings({ ...teamSettings, allowAddMembersDuringRegistration: e.target.checked })}
                      className="mt-0.5 rounded text-indigo-600 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Add Members During Registration</span>
                      <span className="text-[11px] text-slate-500">Allow filling teammates in modal</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-100 bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={teamSettings.isMemberDetailsMandatory}
                      onChange={(e) => setTeamSettings({ ...teamSettings, isMemberDetailsMandatory: e.target.checked })}
                      className="mt-0.5 rounded text-indigo-600 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Mandatory Member Details</span>
                      <span className="text-[11px] text-slate-500">Require all members info</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-100 bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={teamSettings.requireOrganizerApproval}
                      onChange={(e) => setTeamSettings({ ...teamSettings, requireOrganizerApproval: e.target.checked })}
                      className="mt-0.5 rounded text-indigo-600 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Require Approval</span>
                      <span className="text-[11px] text-slate-500">Organizer must accept registrations</span>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Registration Form Builder */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'form' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              03. Registration Form Builder & Custom Questions
            </h2>
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

        {/* Section 4: Payment Configuration */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'payment' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              04. Ticketing & Payment Model
            </h2>
            <button
              type="button"
              onClick={() => setActiveSection('schedule')}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              Next: Schedule <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setPaymentConfig({ ...paymentConfig, pricingType: 'free', fee: 0 })}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentConfig.pricingType === 'free' ? 'border-emerald-600 bg-emerald-50/40 shadow-xs' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">Free Event</span>
                  <input type="radio" checked={paymentConfig.pricingType === 'free'} onChange={() => {}} className="text-emerald-600" />
                </div>
                <p className="text-xs text-slate-600">Zero registration charge.</p>
              </div>

              <div
                onClick={() => setPaymentConfig({ ...paymentConfig, pricingType: 'paid', fee: paymentConfig.fee > 0 ? paymentConfig.fee : 299 })}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentConfig.pricingType === 'paid' ? 'border-emerald-600 bg-emerald-50/40 shadow-xs' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">Paid Registration</span>
                  <input type="radio" checked={paymentConfig.pricingType === 'paid'} onChange={() => {}} className="text-emerald-600" />
                </div>
                <p className="text-xs text-slate-600">Collect fee per attendee or team.</p>
              </div>
            </div>

            {paymentConfig.pricingType === 'paid' && (
              <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Registration Fee (₹ INR)</label>
                    <input
                      type="number"
                      min="1"
                      value={paymentConfig.fee}
                      onChange={(e) => setPaymentConfig({ ...paymentConfig, fee: Math.max(1, Number(e.target.value)) })}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Fee Calculation</label>
                    <select
                      value={paymentConfig.feeType}
                      onChange={(e) => setPaymentConfig({ ...paymentConfig, feeType: e.target.value as any })}
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="per_participant">Per Participant (Multiplied by Team Size)</option>
                      <option value="per_team">Per Team (Flat Amount)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="text-xs font-bold text-slate-900 block">Terms & Conditions</label>
              <textarea
                rows={2}
                value={termsAndConditions.text}
                onChange={(e) => setTermsAndConditions({ ...termsAndConditions, text: e.target.value })}
                className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Schedule Builder */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'schedule' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              05. Schedule Tracks
            </h2>
            <button
              type="button"
              onClick={handleAddSession}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl flex items-center gap-1"
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
                  <button type="button" onClick={() => handleRemoveSession(idx)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Title"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].title = e.target.value;
                      setSchedule(updated);
                    }}
                    className="sm:col-span-2 p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="Speaker"
                    value={item.speaker}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].speaker = e.target.value;
                      setSchedule(updated);
                    }}
                    className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="Start"
                    value={item.startTime}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].startTime = e.target.value;
                      setSchedule(updated);
                    }}
                    className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="End"
                    value={item.endTime}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].endTime = e.target.value;
                      setSchedule(updated);
                    }}
                    className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="Location / Room"
                    value={item.location}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].location = e.target.value;
                      setSchedule(updated);
                    }}
                    className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Accessibility Checklist */}
        <div className={`bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs ${activeSection !== 'accessibility' ? 'hidden' : 'block'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-emerald-600" />
              06. Venue Accessibility Confirmation
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              { key: 'wheelchairEntrance', label: 'Wheelchair Entrance' },
              { key: 'ramps', label: 'Wheelchair Ramps' },
              { key: 'elevators', label: 'Elevators / Lifts' },
              { key: 'accessibleRestrooms', label: 'Accessible Restrooms' },
              { key: 'reservedSeating', label: 'Reserved Seating' },
              { key: 'accessibleParking', label: 'Accessible Parking' },
              { key: 'hearingAssistance', label: 'Hearing Loop' },
              { key: 'signLanguageSupport', label: 'Sign Language' }
            ].map((f) => (
              <label key={f.key} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean((accessibility as any)[f.key])}
                  onChange={(e) => setAccessibility({ ...accessibility, [f.key]: e.target.checked })}
                  className="rounded text-emerald-600 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700">Status:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="p-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
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
              disabled={saving}
              className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              {saving ? 'Saving Changes...' : 'Save & Update Event'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

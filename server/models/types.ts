export type UserRole = 'attendee' | 'organizer' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  profileImage?: string;
  profileImagePublicId?: string;
  department?: string;
  organization?: string;
  phone?: string;
  bio?: string;
  interests?: string[];
  college?: string;
  gender?: string;
  userType?: string;
  domain?: string;
  course?: string;
  specialization?: string;
  yearOfStudy?: string;
  graduatingYear?: string;
  courseDuration?: string;
  cityState?: string;
  linkedin?: string;
  dateOfBirth?: string;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export type EventCategory =
  | 'Technical'
  | 'Workshop'
  | 'Hackathon'
  | 'Seminar'
  | 'Conference'
  | 'Cultural'
  | 'Competition'
  | 'Webinar'
  | 'Networking'
  | 'Community';

export type EventType = 'online' | 'offline' | 'hybrid';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type RegistrationType = 'individual' | 'team' | 'both';

export interface ISession {
  id: string;
  title: string;
  description: string;
  speaker: string;
  startTime: string; // ISO or time string
  endTime: string;
  location?: string;
  category?: string;
}

export interface ISpeaker {
  id: string;
  name: string;
  role: string;
  company: string;
  bio?: string;
  avatar?: string;
}

export interface IAccessibility {
  wheelchairEntrance: boolean;
  ramps: boolean;
  elevators: boolean;
  accessibleRestrooms: boolean;
  reservedSeating: boolean;
  accessibleParking: boolean;
  stepFreeRoutes: boolean;
  signLanguageSupport: boolean;
  hearingAssistance: boolean;
  customNotes?: string;
}

export interface ITeamSettings {
  registrationType: RegistrationType; // 'individual' | 'team' | 'both'
  minTeamSize: number;
  maxTeamSize: number;
  includeLeaderInTeamSize: boolean;
  allowAddMembersDuringRegistration: boolean;
  allowInviteMembersLater: boolean;
  isMemberDetailsMandatory: boolean;
  requireOrganizerApproval: boolean;
  allowIndividualRegistrationWhenBoth: boolean;
}

export interface IFormFieldSetting {
  enabled: boolean;
  required: boolean;
  label: string;
  helperText?: string;
  readOnly?: boolean;
}

export type CustomQuestionType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'dropdown'
  | 'single_choice'
  | 'multiple_choice'
  | 'checkbox'
  | 'date'
  | 'url';

export interface ICustomQuestion {
  id: string;
  label: string;
  type: CustomQuestionType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helperText?: string;
  order: number;
}

export interface IRegistrationFormConfig {
  templateType?: 'detailed_hackathon' | 'simple_general' | 'custom';
  academicDetailsEnabled?: boolean;
  availableUserTypes?: string[];
  availableDomains?: string[];
  availableGraduatingYears?: string[];
  availableCourseDurations?: string[];
  firstName: IFormFieldSetting;
  lastName: IFormFieldSetting;
  email: IFormFieldSetting;
  phone: IFormFieldSetting;
  gender: IFormFieldSetting;
  location?: IFormFieldSetting;
  differentlyAbledStatus?: IFormFieldSetting;
  dateOfBirth: IFormFieldSetting;
  college: IFormFieldSetting;
  instituteName?: IFormFieldSetting;
  userType: IFormFieldSetting;
  domain: IFormFieldSetting;
  course: IFormFieldSetting;
  specialization: IFormFieldSetting;
  yearOfStudy: IFormFieldSetting;
  graduatingYear: IFormFieldSetting;
  courseDuration: IFormFieldSetting;
  cityState: IFormFieldSetting;
  linkedin: IFormFieldSetting;
  customQuestions: ICustomQuestion[];
}

export interface IPaymentConfig {
  pricingType: 'free' | 'paid';
  fee: number; // in INR
  currency: string; // default 'INR'
  feeType: 'per_participant' | 'per_team';
  paymentRequiredDuringRegistration: boolean;
  allowLimitedFreeRegistrations: boolean;
  limitedFreeCount?: number;
  refundPolicy?: string;
  paymentInstructions?: string;
  requirePaymentConfirmation: boolean;
}

export interface ITermsAndConditions {
  text: string;
  isMandatory: boolean;
}

export interface IEvent {
  _id: string;
  title: string;
  description: string;
  category: EventCategory | string;
  eventType: EventType;
  poster: string;
  posterPublicId?: string;
  startDateTime: string;
  endDateTime: string;
  timezone: string;
  venueName: string;
  address: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  capacity: number;
  price: number; // 0 for free
  registrationDeadline: string;
  organizerId: string;
  organizer?: {
    _id: string;
    name: string;
    email: string;
    organization?: string;
    profileImage?: string;
  };
  schedule: ISession[];
  speakers: ISpeaker[];
  accessibility: IAccessibility;
  status: EventStatus;
  contactEmail: string;
  contactPhone?: string;
  tags: string[];
  registeredCount?: number;
  waitlistCount?: number;
  availableSeats?: number;

  // New Phase 1 & 3 Configuration:
  teamSettings?: ITeamSettings;
  registrationFormConfig?: IRegistrationFormConfig;
  paymentConfig?: IPaymentConfig;
  termsAndConditions?: ITermsAndConditions;

  createdAt: string;
  updatedAt: string;
}

export type RegistrationStatus =
  | 'confirmed'
  | 'waitlisted'
  | 'cancelled'
  | 'pending_approval'
  | 'pending_payment'
  | 'pending_members';

export type AttendanceStatus = 'not_checked_in' | 'checked_in';

export type TeamInvitationStatus =
  | 'not_invited'
  | 'sent'
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired';

export interface ITeamMember {
  userId?: string;
  invitationId?: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  gender?: string;
  location?: string;
  differentlyAbledStatus?: 'no' | 'yes' | 'prefer_not_to_say' | string;
  college?: string;
  instituteName?: string;
  userType?: string;
  domain?: string;
  course?: string;
  specialization?: string;
  yearOfStudy?: string;
  graduatingYear?: string;
  courseDuration?: string;
  cityState?: string;
  linkedin?: string;
  dateOfBirth?: string;
  roleOrContribution?: string;
  customAnswers?: Record<string, any>;
  isLeader?: boolean;
  status?: 'not_invited' | 'sent' | 'pending' | 'accepted' | 'declined' | 'expired' | 'confirmed';
}

export interface ITeamInvitation {
  _id: string;
  registrationId: string;
  eventId: string;
  eventTitle?: string;
  teamName: string;
  teamLeaderId: string;
  teamLeaderName: string;
  teamLeaderEmail: string;
  memberEmail: string;
  memberName: string;
  memberDetails: {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    location?: string;
    differentlyAbledStatus?: string;
    college?: string;
    instituteName?: string;
    gender?: string;
    course?: string;
    specialization?: string;
    graduatingYear?: string;
    courseDuration?: string;
    userType?: string;
    domain?: string;
    yearOfStudy?: string;
    roleOrContribution?: string;
    customAnswers?: Record<string, any>;
  };
  tokenHash: string;
  status: TeamInvitationStatus;
  expiresAt: string;
  sentAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  acceptedUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IParticipantDetails {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  location?: string;
  differentlyAbledStatus?: 'no' | 'yes' | 'prefer_not_to_say' | string;
  college?: string;
  instituteName?: string;
  userType?: string;
  domain?: string;
  course?: string;
  specialization?: string;
  yearOfStudy?: string;
  graduatingYear?: string;
  courseDuration?: string;
  cityState?: string;
  linkedin?: string;
  dateOfBirth?: string;
  roleOrContribution?: string;
  customAnswers?: Record<string, any>;
}

export interface IPaymentDetails {
  pricingType: 'free' | 'paid';
  amount: number;
  currency: string;
  feeType: 'per_participant' | 'per_team';
  paymentStatus: 'free' | 'pending' | 'completed' | 'failed' | 'refunded';
  orderId?: string;
  paymentId?: string;
  signature?: string;
  paidAt?: string;
  gateway?: 'razorpay' | 'mock_simulation' | 'direct';
}

export interface IRegistration {
  _id: string;
  attendeeId: string;
  attendee?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    organization?: string;
  };
  eventId: string;
  event?: IEvent;
  registrationType: 'individual' | 'team';
  teamName?: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  teamLeaderEmail?: string;
  teamMembers?: ITeamMember[];
  participantDetails?: IParticipantDetails;
  customAnswers?: Record<string, any>;
  status: RegistrationStatus;
  ticketId: string; // e.g. "EH-88921-TKT"
  qrData?: string;
  attendanceStatus: AttendanceStatus;
  checkedInAt?: string;
  paymentDetails?: IPaymentDetails;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  lookingForTeammates?: boolean;
  registeredAt: string;
  cancelledAt?: string;
  waitlistPosition?: number;
  notes?: string;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  status: 'active' | 'inactive';
  iconName: string;
  color: string;
  eventCount?: number;
}

export type NotificationType =
  | 'registration_confirmed'
  | 'registration_cancelled'
  | 'waitlist_joined'
  | 'waitlist_promoted'
  | 'event_reminder'
  | 'event_cancelled'
  | 'event_deleted'
  | 'schedule_update'
  | 'venue_update'
  | 'announcement'
  | 'attendance_marked'
  | 'account_alert';

export interface INotification {
  _id: string;
  recipientId: string;
  eventId?: string;
  eventTitle?: string;
  type: NotificationType;
  title: string;
  message: string;
  readStatus: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface IFeedback {
  _id: string;
  attendeeId: string;
  attendee?: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  eventId: string;
  eventTitle?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface IReport {
  _id: string;
  reporterId: string;
  reporterName?: string;
  eventId?: string;
  eventTitle?: string;
  targetUserId?: string;
  targetUserName?: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
}

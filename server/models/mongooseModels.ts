import mongoose, { Schema, Document } from 'mongoose';
import {
  IUser,
  IEvent,
  IRegistration,
  ICategory,
  INotification,
  IFeedback,
  IReport,
  ITeamInvitation
} from './types';

// 1. User Schema
export const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['attendee', 'organizer', 'admin'], default: 'attendee' },
    profileImage: { type: String },
    profileImagePublicId: { type: String },
    department: { type: String },
    organization: { type: String },
    phone: { type: String },
    bio: { type: String },
    interests: [{ type: String }],
    college: { type: String },
    gender: { type: String },
    userType: { type: String },
    domain: { type: String },
    course: { type: String },
    specialization: { type: String },
    yearOfStudy: { type: String },
    graduatingYear: { type: String },
    courseDuration: { type: String },
    cityState: { type: String },
    linkedin: { type: String },
    dateOfBirth: { type: String },
    accountStatus: { type: String, enum: ['active', 'suspended'], default: 'active' }
  },
  { timestamps: true }
);

// 2. Event Schema
export const EventSchema = new Schema<IEvent>(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    eventType: { type: String, enum: ['offline', 'online', 'hybrid'], default: 'offline' },
    poster: { type: String, required: true },
    posterPublicId: { type: String },
    startDateTime: { type: String, required: true, index: true },
    endDateTime: { type: String, required: true },
    timezone: { type: String, default: 'America/New_York' },
    venueName: { type: String, required: true },
    address: { type: String },
    city: { type: String, index: true },
    coordinates: {
      type: {
        lat: { type: Number },
        lng: { type: Number }
      },
      required: false,
      _id: false
    },
    capacity: { type: Number, required: true, min: 1 },
    price: { type: Number, default: 0 },
    registrationDeadline: { type: String, required: true },
    organizerId: { type: String, required: true, ref: 'User', index: true },
    schedule: [
      {
        id: { type: String },
        title: { type: String },
        description: { type: String },
        speaker: { type: String },
        startTime: { type: String },
        endTime: { type: String },
        location: { type: String },
        category: { type: String }
      }
    ],
    speakers: [
      {
        id: { type: String },
        name: { type: String },
        role: { type: String },
        company: { type: String },
        bio: { type: String },
        avatar: { type: String }
      }
    ],
    accessibility: {
      wheelchairEntrance: { type: Boolean, default: false },
      ramps: { type: Boolean, default: false },
      elevators: { type: Boolean, default: false },
      accessibleRestrooms: { type: Boolean, default: false },
      reservedSeating: { type: Boolean, default: false },
      accessibleParking: { type: Boolean, default: false },
      stepFreeRoutes: { type: Boolean, default: false },
      signLanguageSupport: { type: Boolean, default: false },
      hearingAssistance: { type: Boolean, default: false },
      customNotes: { type: String }
    },
    status: { type: String, enum: ['draft', 'published', 'cancelled', 'completed'], default: 'published', index: true },
    contactEmail: { type: String },
    contactPhone: { type: String },
    tags: [{ type: String }],

    // Team Configuration
    teamSettings: {
      registrationType: { type: String, enum: ['individual', 'team', 'both'], default: 'individual' },
      minTeamSize: { type: Number, default: 1 },
      maxTeamSize: { type: Number, default: 4 },
      includeLeaderInTeamSize: { type: Boolean, default: true },
      allowAddMembersDuringRegistration: { type: Boolean, default: true },
      allowInviteMembersLater: { type: Boolean, default: true },
      isMemberDetailsMandatory: { type: Boolean, default: true },
      requireOrganizerApproval: { type: Boolean, default: false },
      allowIndividualRegistrationWhenBoth: { type: Boolean, default: true }
    },

    // Registration Form Builder
    registrationFormConfig: {
      templateType: { type: String, enum: ['detailed_hackathon', 'simple_general', 'custom'], default: 'detailed_hackathon' },
      academicDetailsEnabled: { type: Boolean, default: true },
      availableUserTypes: [{ type: String }],
      availableDomains: [{ type: String }],
      availableGraduatingYears: [{ type: String }],
      availableCourseDurations: [{ type: String }],
      firstName: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'First Name' }, helperText: String, readOnly: Boolean },
      lastName: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: false }, label: { type: String, default: 'Last Name' }, helperText: String, readOnly: Boolean },
      email: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Email Address' }, helperText: String, readOnly: Boolean },
      phone: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Mobile Number' }, helperText: String, readOnly: Boolean },
      gender: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Gender' }, helperText: String, readOnly: Boolean },
      location: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Location' }, helperText: String, readOnly: Boolean },
      differentlyAbledStatus: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Differently Abled Status' }, helperText: String, readOnly: Boolean },
      dateOfBirth: { enabled: { type: Boolean, default: false }, required: { type: Boolean, default: false }, label: { type: String, default: 'Date of Birth' }, helperText: String, readOnly: Boolean },
      college: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'College / Institute / Organization' }, helperText: String, readOnly: Boolean },
      instituteName: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Institute Name' }, helperText: String, readOnly: Boolean },
      userType: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'User Type' }, helperText: String, readOnly: Boolean },
      domain: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Domain / Stream' }, helperText: String, readOnly: Boolean },
      course: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Course / Degree' }, helperText: String, readOnly: Boolean },
      specialization: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Course Specialization' }, helperText: String, readOnly: Boolean },
      yearOfStudy: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: false }, label: { type: String, default: 'Current Year of Study' }, helperText: String, readOnly: Boolean },
      graduatingYear: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Graduating Year' }, helperText: String, readOnly: Boolean },
      courseDuration: { enabled: { type: Boolean, default: true }, required: { type: Boolean, default: true }, label: { type: String, default: 'Course Duration' }, helperText: String, readOnly: Boolean },
      cityState: { enabled: { type: Boolean, default: false }, required: { type: Boolean, default: false }, label: { type: String, default: 'City & State' }, helperText: String, readOnly: Boolean },
      linkedin: { enabled: { type: Boolean, default: false }, required: { type: Boolean, default: false }, label: { type: String, default: 'LinkedIn Profile' }, helperText: String, readOnly: Boolean },
      customQuestions: [
        {
          id: { type: String },
          label: { type: String },
          type: { type: String },
          required: { type: Boolean, default: false },
          options: [{ type: String }],
          placeholder: { type: String },
          helperText: { type: String },
          order: { type: Number, default: 0 }
        }
      ]
    },

    // Payment & Pricing Configuration
    paymentConfig: {
      pricingType: { type: String, enum: ['free', 'paid'], default: 'free' },
      fee: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      feeType: { type: String, enum: ['per_participant', 'per_team'], default: 'per_participant' },
      paymentRequiredDuringRegistration: { type: Boolean, default: true },
      allowLimitedFreeRegistrations: { type: Boolean, default: false },
      limitedFreeCount: { type: Number },
      refundPolicy: { type: String },
      paymentInstructions: { type: String },
      requirePaymentConfirmation: { type: Boolean, default: true },
      paymentRequired: { type: Boolean, default: false },
      registrationFee: { type: Number, default: 0 },
      upiId: { type: String, default: '' },
      upiQrCodeUrl: { type: String, default: '' },
      upiQrCodePublicId: { type: String, default: '' }
    },

    // UPI Payment top-level convenience fields
    paymentRequired: { type: Boolean, default: false },
    registrationFee: { type: Number, default: 0 },
    upiId: { type: String, default: '' },
    upiQrCodeUrl: { type: String, default: '' },
    upiQrCodePublicId: { type: String, default: '' },
    paymentInstructions: { type: String, default: '' },

    // Terms and Conditions
    termsAndConditions: {
      text: { type: String, default: 'By registering, you agree to the EventHub terms of participation, code of conduct, and organizer guidelines.' },
      isMandatory: { type: Boolean, default: true }
    },

    // Competitions, Contests & Hackathon Prizes & Rewards
    prizes: [
      {
        id: { type: String },
        position: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, default: '' },
        value: { type: String, default: '' },
        type: { type: String, default: 'Cash' },
        numberOfWinners: { type: Number, default: 1 }
      }
    ],

    // Optional External Online Submission Form Link
    submissionFormUrl: { type: String, default: null }
  },
  { timestamps: true }
);

// 3. Registration Schema
export const RegistrationSchema = new Schema<IRegistration>(
  {
    _id: { type: String, required: true },
    attendeeId: { type: String, required: true, ref: 'User', index: true },
    eventId: { type: String, required: true, ref: 'Event', index: true },
    registrationType: { type: String, enum: ['individual', 'team'], default: 'individual', index: true },
    teamName: { type: String },
    teamLeaderId: { type: String, ref: 'User' },
    teamLeaderName: { type: String },
    teamLeaderEmail: { type: String },
    teamMembers: [
      {
        userId: { type: String, ref: 'User' },
        invitationId: { type: String, ref: 'TeamInvitation' },
        firstName: { type: String, required: true },
        lastName: { type: String },
        email: { type: String, required: true },
        phone: { type: String },
        gender: { type: String },
        location: { type: String },
        differentlyAbledStatus: { type: String },
        college: { type: String },
        instituteName: { type: String },
        userType: { type: String },
        domain: { type: String },
        course: { type: String },
        specialization: { type: String },
        yearOfStudy: { type: String },
        graduatingYear: { type: String },
        courseDuration: { type: String },
        cityState: { type: String },
        linkedin: { type: String },
        dateOfBirth: { type: String },
        roleOrContribution: { type: String },
        customAnswers: { type: Schema.Types.Mixed },
        isLeader: { type: Boolean, default: false },
        status: {
          type: String,
          enum: ['not_invited', 'sent', 'pending', 'accepted', 'declined', 'expired', 'confirmed'],
          default: 'confirmed'
        }
      }
    ],
    participantDetails: {
      firstName: { type: String },
      lastName: { type: String },
      email: { type: String },
      phone: { type: String },
      gender: { type: String },
      location: { type: String },
      differentlyAbledStatus: { type: String },
      college: { type: String },
      instituteName: { type: String },
      userType: { type: String },
      domain: { type: String },
      course: { type: String },
      specialization: { type: String },
      yearOfStudy: { type: String },
      graduatingYear: { type: String },
      courseDuration: { type: String },
      cityState: { type: String },
      linkedin: { type: String },
      dateOfBirth: { type: String },
      roleOrContribution: { type: String },
      customAnswers: { type: Schema.Types.Mixed }
    },
    customAnswers: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['confirmed', 'waitlisted', 'cancelled', 'pending_approval', 'pending_payment', 'pending_members'],
      default: 'confirmed',
      index: true
    },
    ticketId: { type: String, required: true, unique: true },
    qrData: { type: String },
    attendanceStatus: { type: String, enum: ['not_checked_in', 'checked_in'], default: 'not_checked_in' },
    checkedInAt: { type: String },
    paymentDetails: {
      pricingType: { type: String, enum: ['free', 'paid'], default: 'free' },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      feeType: { type: String, enum: ['per_participant', 'per_team'], default: 'per_participant' },
      paymentStatus: { type: String, default: 'not_required' },
      utrNumber: { type: String, default: '' },
      paymentAmount: { type: Number, default: 0 },
      paymentSubmittedAt: { type: String },
      paymentVerifiedAt: { type: String },
      paymentVerifiedBy: { type: String },
      orderId: { type: String },
      paymentId: { type: String },
      signature: { type: String },
      paidAt: { type: String },
      gateway: { type: String, default: 'direct' }
    },
    paymentStatus: { type: String, default: 'not_required', index: true },
    utrNumber: { type: String, default: '' },
    paymentAmount: { type: Number, default: 0 },
    paymentSubmittedAt: { type: String },
    paymentVerifiedAt: { type: String },
    paymentVerifiedBy: { type: String, ref: 'User' },
    termsAccepted: { type: Boolean, default: true },
    termsAcceptedAt: { type: String },
    lookingForTeammates: { type: Boolean, default: false },
    registeredAt: { type: String, default: () => new Date().toISOString() },
    cancelledAt: { type: String },
    waitlistPosition: { type: Number },
    notes: { type: String }
  },
  { timestamps: true }
);

// 4. Category Schema
export const CategorySchema = new Schema<ICategory>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    iconName: { type: String, default: 'Tag' },
    color: { type: String, default: '#3B82F6' }
  },
  { timestamps: true }
);

// 5. Notification Schema
export const NotificationSchema = new Schema<INotification>(
  {
    _id: { type: String, required: true },
    recipientId: { type: String, required: true, ref: 'User', index: true },
    eventId: { type: String, ref: 'Event' },
    eventTitle: { type: String },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    readStatus: { type: Boolean, default: false },
    actionUrl: { type: String }
  },
  { timestamps: true }
);

// 6. Feedback Schema
export const FeedbackSchema = new Schema<IFeedback>(
  {
    _id: { type: String, required: true },
    attendeeId: { type: String, required: true, ref: 'User' },
    eventId: { type: String, required: true, ref: 'Event', index: true },
    eventTitle: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true }
  },
  { timestamps: true }
);

// 7. Report Schema
export const ReportSchema = new Schema<IReport>(
  {
    _id: { type: String, required: true },
    reporterId: { type: String, required: true, ref: 'User' },
    reporterName: { type: String },
    eventId: { type: String, ref: 'Event' },
    eventTitle: { type: String },
    targetUserId: { type: String, ref: 'User' },
    targetUserName: { type: String },
    reason: { type: String, required: true },
    details: { type: String, required: true },
    status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
    adminNotes: { type: String }
  },
  { timestamps: true }
);

// 8. Team Invitation Schema
export const TeamInvitationSchema = new Schema<ITeamInvitation>(
  {
    _id: { type: String, required: true },
    registrationId: { type: String, required: true, ref: 'Registration', index: true },
    eventId: { type: String, required: true, ref: 'Event', index: true },
    eventTitle: { type: String },
    teamName: { type: String, required: true },
    teamLeaderId: { type: String, required: true, ref: 'User' },
    teamLeaderName: { type: String, required: true },
    teamLeaderEmail: { type: String, required: true },
    memberEmail: { type: String, required: true, lowercase: true, index: true },
    memberName: { type: String, required: true },
    memberDetails: { type: Schema.Types.Mixed, default: {} },
    tokenHash: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['not_invited', 'sent', 'pending', 'accepted', 'declined', 'expired'],
      default: 'sent',
      index: true
    },
    expiresAt: { type: String, required: true },
    sentAt: { type: String },
    acceptedAt: { type: String },
    declinedAt: { type: String },
    acceptedUserId: { type: String, ref: 'User' }
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const EventModel = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
export const RegistrationModel = mongoose.models.Registration || mongoose.model<IRegistration>('Registration', RegistrationSchema);
export const CategoryModel = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
export const NotificationModel = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export const FeedbackModel = mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);
export const ReportModel = mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);
export const TeamInvitationModel = mongoose.models.TeamInvitation || mongoose.model<ITeamInvitation>('TeamInvitation', TeamInvitationSchema);


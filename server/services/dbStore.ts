import '../config/env';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { LocalStore } from '../config/db';
import { paymentService } from './paymentService';
import { emailService } from './emailService';
import {
  UserModel,
  EventModel,
  RegistrationModel,
  CategoryModel,
  NotificationModel,
  FeedbackModel,
  ReportModel,
  TeamInvitationModel
} from '../models/mongooseModels';
import {
  IUser,
  IEvent,
  IRegistration,
  ICategory,
  INotification,
  IFeedback,
  IReport,
  RegistrationStatus,
  AttendanceStatus,
  ITeamSettings,
  IRegistrationFormConfig,
  IPaymentConfig,
  ITermsAndConditions,
  ITeamMember,
  IParticipantDetails,
  IPaymentDetails,
  ITeamInvitation,
  TeamInvitationStatus,
  IPrize
} from '../models/types';

export function sanitizePrizes(rawPrizes: any): IPrize[] {
  if (!Array.isArray(rawPrizes)) return [];
  return rawPrizes
    .filter(
      (p: any) =>
        p &&
        typeof p === 'object' &&
        typeof p.position === 'string' &&
        p.position.trim().length > 0 &&
        typeof p.title === 'string' &&
        p.title.trim().length > 0
    )
    .map((p: any, index: number) => ({
      id: p.id ? String(p.id).trim() : `prz_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      position: String(p.position).trim(),
      title: String(p.title).trim(),
      description: typeof p.description === 'string' ? p.description.trim() : '',
      value:
        typeof p.value === 'string'
          ? p.value.trim()
          : p.value !== undefined && p.value !== null
          ? String(p.value).trim()
          : '',
      type: typeof p.type === 'string' && p.type.trim() ? p.type.trim() : 'Cash',
      numberOfWinners: Math.max(1, Number(p.numberOfWinners) || 1)
    }));
}

export function sanitizeSubmissionFormUrl(rawUrl: any): string | null {
  if (rawUrl === undefined || rawUrl === null) return null;
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Submission form link must start with http:// or https://');
    }
    return parsed.href;
  } catch (err: any) {
    if (err.message && err.message.includes('Submission form link must start with')) {
      throw err;
    }
    throw new Error('Invalid submission form URL. Please enter a valid web URL (e.g. https://forms.google.com/...)');
  }
}

export interface IRegisterEventPayload {
  attendeeId: string;
  eventId: string;
  registrationType?: 'individual' | 'team';
  teamName?: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  teamLeaderEmail?: string;
  teamMembers?: ITeamMember[];
  participantDetails?: IParticipantDetails;
  customAnswers?: Record<string, any>;
  paymentDetails?: IPaymentDetails;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  lookingForTeammates?: boolean;
  notes?: string;
  sendInvitations?: boolean;
  appBaseUrl?: string;
}

// Helper to generate unique ID
export const generateId = (prefix = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const generateTicketId = (): string => {
  const code = Math.floor(100000 + Math.random() * 900000);
  return `EH-TKT-${code}`;
};

export class DbStoreService {
  private store = LocalStore.getInstance();
  private defaultPasswordHashes: { attendee: string; organizer: string; admin: string } | null = null;

  private isMongo(): boolean {
    return mongoose.connection.readyState === 1;
  }

  public ensureReady(): void {
    if (!this.isMongo()) {
      const allowFallback = process.env.ALLOW_LOCAL_FALLBACK !== 'false';
      if (!allowFallback) {
        throw new Error('Database connection unavailable: MongoDB Atlas is required and disconnected.');
      }
    }
  }

  private seedPromise: Promise<void> | null = null;

  constructor() {
    // Avoid import-time seeding so routers/tests can import this module without
    // kicking off a lengthy bcrypt rehash cycle or overlapping reset jobs.
  }

  public async isMongoConnected(): Promise<boolean> {
    return this.isMongo();
  }

  public getDataSourceName(): string {
    return this.isMongo() ? 'MongoDB Atlas' : 'Local Persistent Store';
  }

  public async initSeedData(forceReset = false) {
    if (!forceReset && this.seedPromise) {
      await this.seedPromise;
      return;
    }

    this.seedPromise = (async () => {
      try {
        if (!this.defaultPasswordHashes) {
          const salt = await bcrypt.genSalt(10);
          this.defaultPasswordHashes = {
            attendee: await bcrypt.hash('Attendee123!', salt),
            organizer: await bcrypt.hash('Organizer123!', salt),
            admin: await bcrypt.hash('Admin123!', salt)
          };
        }

        const { attendee: attendeePassword, organizer: organizerPassword, admin: adminPassword } = this.defaultPasswordHashes;

        const defaultUsers: IUser[] = [
        {
          _id: 'usr_admin_001',
          name: 'Sarah Jenkins',
          email: 'admin@eventhub.com',
          passwordHash: adminPassword,
          role: 'admin',
          profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
          department: 'Platform Governance',
          organization: 'EventHub Global',
          phone: '+1 (555) 019-2831',
          bio: 'Senior platform administrator and event operations director.',
          interests: ['Community', 'Technology', 'Security'],
          accountStatus: 'active',
          createdAt: new Date('2025-01-10').toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: 'usr_org_001',
          name: 'Marcus Vance',
          email: 'organizer@eventhub.com',
          passwordHash: organizerPassword,
          role: 'organizer',
          profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          department: 'Tech Innovation Labs',
          organization: 'Apex Developer Network',
          phone: '+1 (555) 432-8765',
          bio: 'Tech community builder & conference organizer for over 8 years.',
          interests: ['Hackathon', 'Technical', 'AI & ML', 'Cloud'],
          accountStatus: 'active',
          createdAt: new Date('2025-01-15').toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: 'usr_att_001',
          name: 'Alex Rivera',
          email: 'attendee@eventhub.com',
          passwordHash: attendeePassword,
          role: 'attendee',
          profileImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
          department: 'Computer Science & Engineering',
          organization: 'Metro State University',
          phone: '+1 (555) 789-0123',
          bio: 'Passionate developer, open source enthusiast, and hackathon competitor.',
          interests: ['Hackathon', 'Workshop', 'Technical', 'Webinar'],
          accountStatus: 'active',
          createdAt: new Date('2025-01-20').toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: 'usr_att_002',
          name: 'Elena Rostova',
          email: 'elena@eventhub.com',
          passwordHash: attendeePassword,
          role: 'attendee',
          profileImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
          department: 'Product Design',
          organization: 'Creatives United',
          phone: '+1 (555) 912-3456',
          bio: 'UI/UX Designer excited about design sprints and accessible design.',
          interests: ['Conference', 'Workshop', 'Cultural'],
          accountStatus: 'active',
          createdAt: new Date('2025-02-01').toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

        const defaultCategories: ICategory[] = [
        {
          _id: 'cat_tech',
          name: 'Technical',
          slug: 'technical',
          description: 'Software development, system architecture, DevOps, and cloud engineering sessions.',
          status: 'active',
          iconName: 'Code',
          color: '#3B82F6'
        },
        {
          _id: 'cat_hackathon',
          name: 'Hackathon',
          slug: 'hackathon',
          description: 'Intensive collaborative coding competitions and rapid prototyping sprints.',
          status: 'active',
          iconName: 'Cpu',
          color: '#8B5CF6'
        },
        {
          _id: 'cat_workshop',
          name: 'Workshop',
          slug: 'workshop',
          description: 'Hands-on interactive masterclasses led by veteran industry practitioners.',
          status: 'active',
          iconName: 'Wrench',
          color: '#10B981'
        },
        {
          _id: 'cat_conference',
          name: 'Conference',
          slug: 'conference',
          description: 'Multi-track industry summits, keynote showcases, and networking galas.',
          status: 'active',
          iconName: 'Users',
          color: '#EC4899'
        },
        {
          _id: 'cat_cultural',
          name: 'Cultural',
          slug: 'cultural',
          description: 'Collegiate arts, music, dance performances, and community celebrations.',
          status: 'active',
          iconName: 'Sparkles',
          color: '#F59E0B'
        },
        {
          _id: 'cat_seminar',
          name: 'Seminar',
          slug: 'seminar',
          description: 'Academic research papers, scientific breakthroughs, and guest lectures.',
          status: 'active',
          iconName: 'BookOpen',
          color: '#06B6D4'
        }
      ];

        const defaultEvents: IEvent[] = [
        {
          _id: 'evt_001_ai_summit',
          title: 'Global AI & Cloud Summit 2026',
          description: 'Join industry pioneers and senior engineers for deep dives into multimodal foundation models, distributed inference engines, and scalable cloud microservices. Featuring live keynote demos, code laboratories, and architectural roundtables.',
          category: 'Technical',
          eventType: 'hybrid',
          poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
          startDateTime: new Date(Date.now() + 86400000 * 3).toISOString(),
          endDateTime: new Date(Date.now() + 86400000 * 3 + 28800000).toISOString(),
          timezone: 'America/New_York',
          venueName: 'Moscone Center - North Pavilion',
          address: '747 Howard St',
          city: 'San Francisco, CA',
          coordinates: { lat: 37.7842, lng: -122.4016 },
          capacity: 500,
          price: 0,
          registrationDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
          organizerId: 'usr_org_001',
          schedule: [
            {
              id: 'ses_01',
              title: 'Welcome & Keynote: The Multimodal Horizon',
              description: 'Opening keynote on large-scale agentic systems.',
              speaker: 'Dr. Aris Thorne',
              startTime: '09:00 AM',
              endTime: '10:15 AM',
              location: 'Grand Ballroom A',
              category: 'Keynote'
            },
            {
              id: 'ses_02',
              title: 'Hands-on: Distributed MERN Architecture at Scale',
              description: 'Zero-downtime MongoDB sharding and high-throughput streaming.',
              speaker: 'Marcus Vance',
              startTime: '10:30 AM',
              endTime: '12:00 PM',
              location: 'Hall B - Tech Track',
              category: 'Engineering'
            }
          ],
          speakers: [
            {
              id: 'spk_01',
              name: 'Dr. Aris Thorne',
              role: 'VP of AI Research',
              company: 'Synthetix Core',
              bio: 'Pioneered zero-shot generative audio architectures and distributed neural compilation.',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
            },
            {
              id: 'spk_02',
              name: 'Marcus Vance',
              role: 'Chief Architect',
              company: 'Apex Developer Network',
              bio: 'Passionate organizer and author of High Performance Event Systems.',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
            }
          ],
          accessibility: {
            wheelchairEntrance: true,
            ramps: true,
            elevators: true,
            accessibleRestrooms: true,
            reservedSeating: true,
            accessibleParking: true,
            stepFreeRoutes: true,
            signLanguageSupport: true,
            hearingAssistance: true,
            customNotes: 'Dedicated quiet sensory space on 2nd floor; all entrances feature automatic low-energy power operators.'
          },
          status: 'published',
          contactEmail: 'organizer@eventhub.com',
          contactPhone: '+1 (555) 432-8765',
          tags: ['AI', 'Cloud', 'MERN', 'TypeScript'],
          createdAt: new Date('2026-02-01').toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: 'evt_002_hackathon',
          title: 'Apex HackFest 2026: 48-Hour Open Innovation Sprint',
          description: 'Assemble your team of developers, designers, and creators to build real-world open source projects solving urban sustainability and community accessibility challenges. Over $25,000 in bounties.',
          category: 'Hackathon',
          eventType: 'offline',
          poster: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80',
          startDateTime: new Date(Date.now() + 86400000 * 7).toISOString(),
          endDateTime: new Date(Date.now() + 86400000 * 9).toISOString(),
          timezone: 'America/New_York',
          venueName: 'Innovation Hub Silicon Hall',
          address: '450 Mission Bay Blvd',
          city: 'San Francisco, CA',
          coordinates: { lat: 37.7689, lng: -122.3922 },
          capacity: 150,
          price: 0,
          registrationDeadline: new Date(Date.now() + 86400000 * 6).toISOString(),
          organizerId: 'usr_org_001',
          schedule: [
            {
              id: 'ses_h1',
              title: 'Hackathon Kickoff & Challenge Reveal',
              description: 'Track disclosures and mentor matching.',
              speaker: 'Mentors Panel',
              startTime: '06:00 PM',
              endTime: '07:30 PM',
              location: 'Main Arena'
            }
          ],
          speakers: [
            {
              id: 'spk_h1',
              name: 'Marcus Vance',
              role: 'Hackathon Director',
              company: 'Apex Developer Network',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
            }
          ],
          accessibility: {
            wheelchairEntrance: true,
            ramps: true,
            elevators: true,
            accessibleRestrooms: true,
            reservedSeating: true,
            accessibleParking: true,
            stepFreeRoutes: true,
            signLanguageSupport: false,
            hearingAssistance: false,
            customNotes: '24/7 accessible entrance and sleeping pods available.'
          },
          status: 'published',
          contactEmail: 'organizer@eventhub.com',
          contactPhone: '+1 (555) 432-8765',
          tags: ['Hackathon', 'React', 'NodeJS', 'Innovation'],
          prizes: [
            {
              id: 'prz_h1',
              position: '1st Prize',
              title: 'Grand Innovation Champion',
              value: '₹1,00,000',
              type: 'Cash',
              description: '₹1,00,000 Cash Prize + Direct Incubation Entry + Winner Trophy + Certificate of Excellence',
              numberOfWinners: 1
            },
            {
              id: 'prz_h2',
              position: '2nd Prize',
              title: 'First Runner-Up',
              value: '₹50,000',
              type: 'Cash',
              description: '₹50,000 Cash Prize + Fast-track Interview Opportunity + Runner-up Trophy + Certificate',
              numberOfWinners: 1
            },
            {
              id: 'prz_h3',
              position: '3rd Prize',
              title: 'Second Runner-Up',
              value: '₹25,000',
              type: 'Cash',
              description: '₹25,000 Cash Prize + Cloud Credits worth $500 + Certificate',
              numberOfWinners: 1
            },
            {
              id: 'prz_h4',
              position: 'Best Innovation',
              title: 'Special Jury Innovation Award',
              value: '₹15,000',
              type: 'Goodies',
              description: '₹15,000 Hardware/Gadget Swag Kit + Exclusive Founder Mentorship Session + Certificate',
              numberOfWinners: 1
            }
          ],
          submissionFormUrl: 'https://forms.google.com/d/e/1FAIpQLSe-sample-apex-hackfest/viewform',
          createdAt: new Date('2026-02-10').toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

        const defaultRegistrations: IRegistration[] = [
        {
          _id: 'reg_001',
          attendeeId: 'usr_att_001',
          eventId: 'evt_001_ai_summit',
          registrationType: 'individual',
          status: 'confirmed',
          ticketId: 'EH-TKT-782194',
          qrData: JSON.stringify({ ticketId: 'EH-TKT-782194', eventId: 'evt_001_ai_summit', attendeeId: 'usr_att_001' }),
          attendanceStatus: 'not_checked_in',
          registeredAt: new Date('2026-02-15T10:00:00Z').toISOString()
        },
        {
          _id: 'reg_002',
          attendeeId: 'usr_att_002',
          eventId: 'evt_001_ai_summit',
          registrationType: 'individual',
          status: 'confirmed',
          ticketId: 'EH-TKT-491023',
          qrData: JSON.stringify({ ticketId: 'EH-TKT-491023', eventId: 'evt_001_ai_summit', attendeeId: 'usr_att_002' }),
          attendanceStatus: 'not_checked_in',
          registeredAt: new Date('2026-02-16T11:00:00Z').toISOString()
        }
      ];

      // 1. Seed LocalStore
      if (forceReset || this.store.data.users.length === 0) {
        this.store.data.users = defaultUsers;
        this.store.data.categories = defaultCategories;
        this.store.data.events = defaultEvents;
        this.store.data.registrations = defaultRegistrations;
        this.store.data.notifications = [];
        this.store.data.feedbacks = [];
        this.store.data.reports = [];
        this.store.data.teamInvitations = [];
        this.store.save();
      } else if (!Array.isArray(this.store.data.teamInvitations)) {
        this.store.data.teamInvitations = [];
        this.store.save();
      }

      // 2. If MongoDB is connected, ensure MongoDB collections are also initialized
      if (this.isMongo()) {
        if (forceReset) {
          await Promise.all([
            UserModel.deleteMany({}),
            CategoryModel.deleteMany({}),
            EventModel.deleteMany({}),
            RegistrationModel.deleteMany({}),
            NotificationModel.deleteMany({}),
            FeedbackModel.deleteMany({}),
            ReportModel.deleteMany({}),
            TeamInvitationModel.deleteMany({})
          ]);
        }
        const userCount = await UserModel.countDocuments();
        if (userCount === 0) {
          console.log('🍃 Seeding MongoDB Atlas collections...');
          await UserModel.insertMany(defaultUsers);
          await CategoryModel.insertMany(defaultCategories);
          await EventModel.insertMany(defaultEvents);
          await RegistrationModel.insertMany(defaultRegistrations);
          console.log('✅ MongoDB Atlas seeded successfully.');
        }
      }
    } catch (err) {
      console.error('Error during initSeedData:', err);
    }
    })();

    try {
      await this.seedPromise;
    } finally {
      this.seedPromise = null;
    }
  }

  // =========================================================================
  // 1. USER OPERATIONS
  // =========================================================================
  public async findUserByEmail(email: string): Promise<IUser | null> {
    this.ensureReady();
    const cleanEmail = (email || '').trim().toLowerCase();
    if (this.isMongo()) {
      const doc = await UserModel.findOne({ email: cleanEmail }).lean();
      return doc as IUser | null;
    }
    const user = this.store.data.users.find(u => u.email.toLowerCase() === cleanEmail);
    return user ? { ...user } : null;
  }

  public async findUserById(id: string): Promise<IUser | null> {
    this.ensureReady();
    if (this.isMongo()) {
      const doc = await UserModel.findById(id).lean();
      return doc as IUser | null;
    }
    const user = this.store.data.users.find(u => u._id === id);
    return user ? { ...user } : null;
  }

  public async getAllUsers(): Promise<IUser[]> {
    this.ensureReady();
    if (this.isMongo()) {
      const docs = await UserModel.find({}, { passwordHash: 0 }).lean();
      return docs as IUser[];
    }
    return this.store.data.users.map(u => {
      const { passwordHash, ...rest } = u;
      return rest as IUser;
    });
  }

  public async createUser(userData: Partial<IUser>): Promise<IUser> {
    this.ensureReady();
    const newUser: IUser = {
      _id: generateId('usr'),
      name: (userData.name || '').trim(),
      email: (userData.email || '').trim().toLowerCase(),
      passwordHash: userData.passwordHash,
      role: userData.role === 'organizer' ? 'organizer' : 'attendee', // Admin can only be promoted by existing admin
      profileImage: userData.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      department: userData.department || '',
      organization: userData.organization || '',
      phone: userData.phone || '',
      bio: userData.bio || '',
      interests: Array.isArray(userData.interests) ? userData.interests : [],
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.isMongo()) {
      await UserModel.create(newUser);
    } else {
      this.store.data.users.push(newUser);
      this.store.save();
    }
    return { ...newUser };
  }

  public async updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    this.ensureReady();
    const now = new Date().toISOString();
    if (this.isMongo()) {
      const updated = await UserModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: now },
        { new: true }
      ).lean();
      return updated as IUser | null;
    }

    const index = this.store.data.users.findIndex(u => u._id === id);
    if (index === -1) return null;
    this.store.data.users[index] = {
      ...this.store.data.users[index],
      ...updates,
      updatedAt: now
    };
    this.store.save();
    return { ...this.store.data.users[index] };
  }

  public async updateUserProfilePicture(
    userId: string,
    profileImageUrl: string,
    profileImagePublicId?: string
  ): Promise<IUser | null> {
    this.ensureReady();
    const currentUser = await this.findUserById(userId);
    if (!currentUser) return null;

    const oldPublicId = currentUser.profileImagePublicId;

    const updated = await this.updateUser(userId, {
      profileImage: profileImageUrl,
      profileImagePublicId
    });

    if (oldPublicId && oldPublicId !== profileImagePublicId && !oldPublicId.startsWith('local_')) {
      try {
        const { v2: cloudinary } = await import('cloudinary');
        if (process.env.CLOUDINARY_API_KEY) {
          await cloudinary.uploader.destroy(oldPublicId);
        }
      } catch (err) {
        console.warn('Could not remove replaced Cloudinary avatar:', err);
      }
    }

    return updated;
  }

  // =========================================================================
  // 2. EVENT OPERATIONS (WITH STRICT VISIBILITY & OWNERSHIP)
  // =========================================================================
  public async getEvents(filter: {
    search?: string;
    category?: string;
    eventType?: string;
    city?: string;
    organizerId?: string;
    status?: string;
    accessibility?: string;
    registrationType?: string; // 'all' | 'individual' | 'team' | 'both'
    minTeamSize?: number;
    maxTeamSize?: number;
    paymentType?: string; // 'all' | 'free' | 'paid'
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'upcoming' | 'recent' | 'popular';
    page?: number;
    limit?: number;
    requesterUserId?: string;
    requesterRole?: string;
  }): Promise<{ events: IEvent[]; total: number; page: number; totalPages: number }> {
    this.ensureReady();
    const isAdmin = filter.requesterRole === 'admin';
    let rawEvents: IEvent[] = [];

    if (this.isMongo()) {
      const query: any = {};

      if (filter.status) {
        query.status = filter.status;
      } else if (!isAdmin) {
        if (filter.requesterUserId) {
          query.$or = [
            { status: 'published' },
            { organizerId: filter.requesterUserId }
          ];
        } else {
          query.status = 'published';
        }
      }

      if (filter.organizerId) {
        query.organizerId = filter.organizerId;
      }

      if (filter.category && filter.category !== 'All') {
        query.category = { $regex: new RegExp(`^${filter.category}$`, 'i') };
      }

      if (filter.eventType && filter.eventType !== 'all') {
        query.eventType = filter.eventType;
      }

      if (filter.city) {
        query.city = { $regex: new RegExp(filter.city, 'i') };
      }

      if (filter.accessibility) {
        query[`accessibility.${filter.accessibility}`] = true;
      }

      // Registration Type filter
      if (filter.registrationType && filter.registrationType !== 'all') {
        if (filter.registrationType === 'individual') {
          query.$or = [
            { 'teamSettings.registrationType': 'individual' },
            { 'teamSettings.registrationType': 'both' },
            { teamSettings: { $exists: false } }
          ];
        } else if (filter.registrationType === 'team') {
          query['teamSettings.registrationType'] = { $in: ['team', 'both'] };
        } else if (filter.registrationType === 'both') {
          query['teamSettings.registrationType'] = 'both';
        }
      }

      // Team Size filter
      if (filter.minTeamSize) {
        query['teamSettings.minTeamSize'] = { $gte: Number(filter.minTeamSize) };
      }
      if (filter.maxTeamSize) {
        query['teamSettings.maxTeamSize'] = { $lte: Number(filter.maxTeamSize) };
      }

      // Payment Type filter
      if (filter.paymentType && filter.paymentType !== 'all') {
        if (filter.paymentType === 'free') {
          query.$and = query.$and || [];
          query.$and.push({
            $or: [
              { price: 0 },
              { 'paymentConfig.pricingType': 'free' },
              { paymentConfig: { $exists: false }, price: 0 }
            ]
          });
        } else if (filter.paymentType === 'paid') {
          query.$and = query.$and || [];
          query.$and.push({
            $or: [
              { price: { $gt: 0 } },
              { 'paymentConfig.pricingType': 'paid', 'paymentConfig.fee': { $gt: 0 } }
            ]
          });
        }
      }

      // Price Range filter
      if (filter.minPrice !== undefined && filter.minPrice !== null && !isNaN(Number(filter.minPrice))) {
        query.price = query.price || {};
        query.price.$gte = Number(filter.minPrice);
      }
      if (filter.maxPrice !== undefined && filter.maxPrice !== null && !isNaN(Number(filter.maxPrice))) {
        query.price = query.price || {};
        query.price.$lte = Number(filter.maxPrice);
      }

      if (filter.search) {
        const regex = new RegExp(filter.search, 'i');
        const searchConditions = [
          { title: regex },
          { description: regex },
          { venueName: regex },
          { city: regex },
          { tags: { $in: [regex] } }
        ];
        if (query.$or) {
          query.$and = query.$and || [];
          query.$and.push({ $or: searchConditions });
        } else {
          query.$or = searchConditions;
        }
      }

      rawEvents = (await EventModel.find(query).lean()) as IEvent[];
    } else {
      let list = [...this.store.data.events];

      if (filter.status) {
        list = list.filter(e => e.status === filter.status);
      } else if (!isAdmin) {
        if (filter.requesterUserId) {
          list = list.filter(e => e.status === 'published' || e.organizerId === filter.requesterUserId);
        } else {
          list = list.filter(e => e.status === 'published');
        }
      }

      if (filter.organizerId) {
        list = list.filter(e => e.organizerId === filter.organizerId);
      }

      if (filter.category && filter.category !== 'All') {
        list = list.filter(e => e.category.toLowerCase() === filter.category!.toLowerCase());
      }

      if (filter.eventType && filter.eventType !== 'all') {
        list = list.filter(e => e.eventType.toLowerCase() === filter.eventType!.toLowerCase());
      }

      if (filter.city) {
        list = list.filter(e => e.city.toLowerCase().includes(filter.city!.toLowerCase()));
      }

      if (filter.accessibility) {
        const key = filter.accessibility as keyof IEvent['accessibility'];
        list = list.filter(e => e.accessibility && e.accessibility[key] === true);
      }

      // Registration Type filter
      if (filter.registrationType && filter.registrationType !== 'all') {
        if (filter.registrationType === 'individual') {
          list = list.filter(e => !e.teamSettings || e.teamSettings.registrationType === 'individual' || e.teamSettings.registrationType === 'both');
        } else if (filter.registrationType === 'team') {
          list = list.filter(e => e.teamSettings && (e.teamSettings.registrationType === 'team' || e.teamSettings.registrationType === 'both'));
        } else if (filter.registrationType === 'both') {
          list = list.filter(e => e.teamSettings && e.teamSettings.registrationType === 'both');
        }
      }

      // Team Size filter
      if (filter.minTeamSize) {
        list = list.filter(e => e.teamSettings && e.teamSettings.minTeamSize >= Number(filter.minTeamSize));
      }
      if (filter.maxTeamSize) {
        list = list.filter(e => e.teamSettings && e.teamSettings.maxTeamSize <= Number(filter.maxTeamSize));
      }

      // Payment Type filter
      if (filter.paymentType && filter.paymentType !== 'all') {
        if (filter.paymentType === 'free') {
          list = list.filter(e => (e.price === 0 || e.paymentConfig?.pricingType === 'free'));
        } else if (filter.paymentType === 'paid') {
          list = list.filter(e => (e.price > 0 || (e.paymentConfig?.pricingType === 'paid' && (e.paymentConfig.fee || 0) > 0)));
        }
      }

      // Price range
      if (filter.minPrice !== undefined && filter.minPrice !== null && !isNaN(Number(filter.minPrice))) {
        list = list.filter(e => (e.price || e.paymentConfig?.fee || 0) >= Number(filter.minPrice));
      }
      if (filter.maxPrice !== undefined && filter.maxPrice !== null && !isNaN(Number(filter.maxPrice))) {
        list = list.filter(e => (e.price || e.paymentConfig?.fee || 0) <= Number(filter.maxPrice));
      }

      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter(
          e =>
            e.title.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            e.venueName.toLowerCase().includes(q) ||
            e.city.toLowerCase().includes(q) ||
            (e.tags && e.tags.some((t: string) => t.toLowerCase().includes(q)))
        );
      }

      rawEvents = list;
    }

    // Attach computed registrations and organizer details
    const populated = await Promise.all(
      rawEvents.map(async evt => {
        let regCount = 0;
        let waitCount = 0;
        let organizer: IUser | null = null;

        if (this.isMongo()) {
          [regCount, waitCount, organizer] = await Promise.all([
            RegistrationModel.countDocuments({ eventId: evt._id, status: 'confirmed' }),
            RegistrationModel.countDocuments({ eventId: evt._id, status: 'waitlisted' }),
            UserModel.findById(evt.organizerId).lean() as Promise<IUser | null>
          ]);
        } else {
          regCount = this.store.data.registrations.filter(
            r => r.eventId === evt._id && r.status === 'confirmed'
          ).length;
          waitCount = this.store.data.registrations.filter(
            r => r.eventId === evt._id && r.status === 'waitlisted'
          ).length;
          organizer = this.store.data.users.find(u => u._id === evt.organizerId) || null;
        }

        return {
          ...evt,
          registeredCount: regCount,
          waitlistCount: waitCount,
          availableSeats: Math.max(0, evt.capacity - regCount),
          organizer: organizer
            ? {
                _id: organizer._id,
                name: organizer.name,
                email: organizer.email,
                organization: organizer.organization,
                profileImage: organizer.profileImage
              }
            : undefined
        };
      })
    );

    // Sorting
    if (filter.sortBy === 'popular') {
      populated.sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0));
    } else if (filter.sortBy === 'recent') {
      populated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // Default: upcoming first
      populated.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Number(filter.limit) || 12);
    const startIndex = (page - 1) * limit;
    const paginatedEvents = populated.slice(startIndex, startIndex + limit);

    return {
      events: paginatedEvents,
      total: populated.length,
      page,
      totalPages: Math.ceil(populated.length / limit) || 1
    };
  }

  public async getEventById(id: string, requesterUserId?: string, requesterRole?: string): Promise<IEvent | null> {
    this.ensureReady();
    let evt: IEvent | null = null;
    if (this.isMongo()) {
      evt = (await EventModel.findById(id).lean()) as IEvent | null;
    } else {
      evt = this.store.data.events.find(e => e._id === id) || null;
    }

    if (!evt) return null;

    // Check visibility: if event is draft, only owner or admin can view. Cancelled events are public so attendees can view status.
    const isAdmin = requesterRole === 'admin';
    const isOwner = requesterUserId && evt.organizerId === requesterUserId;
    if (evt.status === 'draft' && !isAdmin && !isOwner) {
      return null;
    }

    let regCount = 0;
    let waitCount = 0;
    let organizer: IUser | null = null;

    if (this.isMongo()) {
      [regCount, waitCount, organizer] = await Promise.all([
        RegistrationModel.countDocuments({ eventId: evt._id, status: 'confirmed' }),
        RegistrationModel.countDocuments({ eventId: evt._id, status: 'waitlisted' }),
        UserModel.findById(evt.organizerId).lean() as Promise<IUser | null>
      ]);
    } else {
      regCount = this.store.data.registrations.filter(
        r => r.eventId === evt!._id && r.status === 'confirmed'
      ).length;
      waitCount = this.store.data.registrations.filter(
        r => r.eventId === evt!._id && r.status === 'waitlisted'
      ).length;
      organizer = this.store.data.users.find(u => u._id === evt!.organizerId) || null;
    }

    return {
      ...evt,
      registeredCount: regCount,
      waitlistCount: waitCount,
      availableSeats: Math.max(0, evt.capacity - regCount),
      organizer: organizer
        ? {
            _id: organizer._id,
            name: organizer.name,
            email: organizer.email,
            organization: organizer.organization,
            profileImage: organizer.profileImage
          }
        : undefined
    };
  }

  public async createEvent(data: Partial<IEvent>, organizerId: string): Promise<IEvent> {
    this.ensureReady();

    // Validate team settings if provided
    if (data.teamSettings) {
      const min = Math.max(1, Number(data.teamSettings.minTeamSize) || 1);
      const max = Math.max(min, Number(data.teamSettings.maxTeamSize) || min);
      if (min > max) {
        throw new Error('Minimum team size cannot be greater than maximum team size.');
      }
      data.teamSettings.minTeamSize = min;
      data.teamSettings.maxTeamSize = max;
    }

    const price = data.paymentConfig?.pricingType === 'paid'
      ? Math.max(0, Number(data.paymentConfig.fee) || Number(data.price) || 0)
      : Math.max(0, Number(data.price) || 0);

    const defaultFormConfig: IRegistrationFormConfig = {
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
    };

    const newEvent: IEvent = {
      _id: generateId('evt'),
      title: (data.title || 'Untitled Event').trim(),
      description: (data.description || '').trim(),
      category: data.category || 'Technical',
      eventType: data.eventType || 'offline',
      poster: data.poster || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
      posterPublicId: data.posterPublicId || undefined,
      startDateTime: data.startDateTime || new Date(Date.now() + 86400000 * 7).toISOString(),
      endDateTime: data.endDateTime || new Date(Date.now() + 86400000 * 7 + 14400000).toISOString(),
      timezone: data.timezone || 'America/New_York',
      venueName: (data.venueName || 'Main Venue').trim(),
      address: (data.address || '').trim(),
      city: (data.city || '').trim(),
      coordinates:
        data.coordinates &&
        typeof data.coordinates.lat === 'number' &&
        typeof data.coordinates.lng === 'number' &&
        !isNaN(data.coordinates.lat) &&
        !isNaN(data.coordinates.lng) &&
        (data.coordinates.lat !== 0 || data.coordinates.lng !== 0)
          ? { lat: data.coordinates.lat, lng: data.coordinates.lng }
          : undefined,
      capacity: Math.max(1, Number(data.capacity) || 100),
      price,
      registrationDeadline: data.registrationDeadline || data.startDateTime || new Date(Date.now() + 86400000 * 6).toISOString(),
      organizerId,
      schedule: Array.isArray(data.schedule) ? data.schedule : [],
      speakers: Array.isArray(data.speakers) ? data.speakers : [],
      accessibility: data.accessibility || {
        wheelchairEntrance: false,
        ramps: false,
        elevators: false,
        accessibleRestrooms: false,
        reservedSeating: false,
        accessibleParking: false,
        stepFreeRoutes: false,
        signLanguageSupport: false,
        hearingAssistance: false,
        customNotes: ''
      },
      status: data.status || 'published',
      contactEmail: data.contactEmail || '',
      contactPhone: data.contactPhone || '',
      tags: Array.isArray(data.tags) ? data.tags : [],

      // Extended Configuration
      teamSettings: data.teamSettings || {
        registrationType: 'individual',
        minTeamSize: 1,
        maxTeamSize: 4,
        includeLeaderInTeamSize: true,
        allowAddMembersDuringRegistration: true,
        allowInviteMembersLater: true,
        isMemberDetailsMandatory: true,
        requireOrganizerApproval: false,
        allowIndividualRegistrationWhenBoth: true
      },
      registrationFormConfig: data.registrationFormConfig || defaultFormConfig,
      paymentConfig: {
        pricingType: (data.paymentRequired || data.paymentConfig?.pricingType === 'paid' || price > 0) ? 'paid' : 'free',
        fee: (data.paymentRequired || data.paymentConfig?.pricingType === 'paid' || price > 0) ? (Number(data.registrationFee || data.paymentConfig?.fee || price) || 0) : 0,
        currency: data.paymentConfig?.currency || 'INR',
        feeType: data.paymentConfig?.feeType || 'per_participant',
        paymentRequiredDuringRegistration: data.paymentConfig?.paymentRequiredDuringRegistration !== false,
        allowLimitedFreeRegistrations: Boolean(data.paymentConfig?.allowLimitedFreeRegistrations),
        requirePaymentConfirmation: data.paymentConfig?.requirePaymentConfirmation !== false,
        paymentRequired: Boolean(data.paymentRequired || data.paymentConfig?.pricingType === 'paid' || price > 0),
        registrationFee: (data.paymentRequired || data.paymentConfig?.pricingType === 'paid' || price > 0) ? (Number(data.registrationFee || data.paymentConfig?.fee || price) || 0) : 0,
        upiId: (data.upiId || data.paymentConfig?.upiId || '').trim(),
        upiQrCodeUrl: (data.upiQrCodeUrl || data.paymentConfig?.upiQrCodeUrl || '').trim(),
        upiQrCodePublicId: (data.upiQrCodePublicId || data.paymentConfig?.upiQrCodePublicId || '').trim(),
        paymentInstructions: (data.paymentInstructions || data.paymentConfig?.paymentInstructions || '').trim()
      },
      paymentRequired: Boolean(data.paymentRequired || data.paymentConfig?.pricingType === 'paid' || price > 0),
      registrationFee: (data.paymentRequired || data.paymentConfig?.pricingType === 'paid' || price > 0) ? (Number(data.registrationFee || data.paymentConfig?.fee || price) || 0) : 0,
      upiId: (data.upiId || data.paymentConfig?.upiId || '').trim(),
      upiQrCodeUrl: (data.upiQrCodeUrl || data.paymentConfig?.upiQrCodeUrl || '').trim(),
      upiQrCodePublicId: (data.upiQrCodePublicId || data.paymentConfig?.upiQrCodePublicId || '').trim(),
      paymentInstructions: (data.paymentInstructions || data.paymentConfig?.paymentInstructions || '').trim(),

      termsAndConditions: data.termsAndConditions || {
        text: 'By registering, you agree to the EventHub terms of participation, code of conduct, and organizer guidelines.',
        isMandatory: true
      },
      prizes: sanitizePrizes(data.prizes),
      submissionFormUrl: sanitizeSubmissionFormUrl(data.submissionFormUrl),

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.isMongo()) {
      await EventModel.create(newEvent);
    } else {
      this.store.data.events.push(newEvent);
      this.store.save();
    }
    return newEvent;
  }

  public async updateEvent(
    id: string,
    updates: Partial<IEvent>,
    organizerId?: string,
    isAdmin = false
  ): Promise<IEvent | null> {
    this.ensureReady();
    const existing = await this.getEventById(id, organizerId, isAdmin ? 'admin' : undefined);
    if (!existing) return null;

    if (!isAdmin && (!organizerId || String(existing.organizerId) !== String(organizerId))) {
      throw new Error('Unauthorized: You can only edit your own events.');
    }

    // Validate team settings if provided
    if (updates.teamSettings) {
      const min = Math.max(1, Number(updates.teamSettings.minTeamSize) || 1);
      const max = Math.max(min, Number(updates.teamSettings.maxTeamSize) || min);
      if (min > max) {
        throw new Error('Minimum team size cannot be greater than maximum team size.');
      }
      updates.teamSettings.minTeamSize = min;
      updates.teamSettings.maxTeamSize = max;
    }

    if (updates.paymentConfig || updates.paymentRequired !== undefined || updates.registrationFee !== undefined || updates.upiId !== undefined) {
      const isPaid = Boolean(
        updates.paymentRequired ??
        (updates.paymentConfig?.pricingType === 'paid' || updates.paymentConfig?.paymentRequired) ??
        (existing.paymentRequired || existing.paymentConfig?.pricingType === 'paid')
      );

      const fee = Math.max(
        0,
        Number(
          updates.registrationFee ??
          updates.paymentConfig?.fee ??
          updates.paymentConfig?.registrationFee ??
          updates.price ??
          existing.registrationFee ??
          existing.paymentConfig?.fee ??
          existing.price ??
          0
        )
      );

      const upiId = (updates.upiId ?? updates.paymentConfig?.upiId ?? existing.upiId ?? existing.paymentConfig?.upiId ?? '').trim();
      const upiQrCodeUrl = (updates.upiQrCodeUrl ?? updates.paymentConfig?.upiQrCodeUrl ?? existing.upiQrCodeUrl ?? existing.paymentConfig?.upiQrCodeUrl ?? '').trim();
      const upiQrCodePublicId = (updates.upiQrCodePublicId ?? updates.paymentConfig?.upiQrCodePublicId ?? existing.upiQrCodePublicId ?? existing.paymentConfig?.upiQrCodePublicId ?? '').trim();
      const paymentInstructions = (updates.paymentInstructions ?? updates.paymentConfig?.paymentInstructions ?? existing.paymentInstructions ?? existing.paymentConfig?.paymentInstructions ?? '').trim();

      const mergedPaymentConfig: IPaymentConfig = {
        ...(existing.paymentConfig || { currency: 'INR', feeType: 'per_participant' }),
        ...(updates.paymentConfig || {}),
        pricingType: isPaid ? 'paid' : 'free',
        fee: isPaid ? fee : 0,
        paymentRequired: isPaid,
        registrationFee: isPaid ? fee : 0,
        upiId: isPaid ? upiId : '',
        upiQrCodeUrl: isPaid ? upiQrCodeUrl : '',
        upiQrCodePublicId: isPaid ? upiQrCodePublicId : '',
        paymentInstructions: isPaid ? paymentInstructions : ''
      };

      updates.paymentConfig = mergedPaymentConfig;
      updates.paymentRequired = isPaid;
      updates.registrationFee = isPaid ? fee : 0;
      updates.price = isPaid ? fee : 0;
      updates.upiId = isPaid ? upiId : '';
      updates.upiQrCodeUrl = isPaid ? upiQrCodeUrl : '';
      updates.upiQrCodePublicId = isPaid ? upiQrCodePublicId : '';
      updates.paymentInstructions = isPaid ? paymentInstructions : '';
    }

    if (updates.prizes !== undefined) {
      updates.prizes = sanitizePrizes(updates.prizes);
    }

    if (updates.submissionFormUrl !== undefined) {
      updates.submissionFormUrl = sanitizeSubmissionFormUrl(updates.submissionFormUrl);
    }

    const now = new Date().toISOString();
    const cleanUpdates: any = { ...updates, updatedAt: now };

    // If address, city, or venueName is modified, check coordinates
    const addressChanged =
      (updates.address !== undefined && updates.address !== existing.address) ||
      (updates.city !== undefined && updates.city !== existing.city) ||
      (updates.venueName !== undefined && updates.venueName !== existing.venueName);

    if (addressChanged) {
      const hasValidNewCoords =
        updates.coordinates &&
        typeof updates.coordinates.lat === 'number' &&
        typeof updates.coordinates.lng === 'number' &&
        !isNaN(updates.coordinates.lat) &&
        !isNaN(updates.coordinates.lng) &&
        (updates.coordinates.lat !== 0 || updates.coordinates.lng !== 0) &&
        updates.coordinates !== existing.coordinates;

      if (hasValidNewCoords) {
        cleanUpdates.coordinates = { lat: updates.coordinates!.lat, lng: updates.coordinates!.lng };
      } else {
        // Clear old stale coordinates so Google Maps resolves the new address directly
        cleanUpdates.coordinates = undefined;
      }
    } else if (updates.coordinates !== undefined) {
      if (
        updates.coordinates &&
        typeof updates.coordinates.lat === 'number' &&
        typeof updates.coordinates.lng === 'number' &&
        !isNaN(updates.coordinates.lat) &&
        !isNaN(updates.coordinates.lng) &&
        (updates.coordinates.lat !== 0 || updates.coordinates.lng !== 0)
      ) {
        cleanUpdates.coordinates = { lat: updates.coordinates.lat, lng: updates.coordinates.lng };
      } else {
        cleanUpdates.coordinates = undefined;
      }
    }

    // Clean up old Cloudinary image if replaced
    if (
      existing.posterPublicId &&
      cleanUpdates.posterPublicId &&
      existing.posterPublicId !== cleanUpdates.posterPublicId &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        const { v2: cloudinary } = await import('cloudinary');
        await cloudinary.uploader.destroy(existing.posterPublicId);
      } catch (err) {
        console.warn('Could not remove replaced Cloudinary poster', err);
      }
    }

    if (this.isMongo()) {
      if (cleanUpdates.coordinates === undefined && (addressChanged || updates.coordinates === null)) {
        await EventModel.findByIdAndUpdate(id, {
          ...cleanUpdates,
          $unset: { coordinates: 1 }
        });
      } else {
        await EventModel.findByIdAndUpdate(id, cleanUpdates);
      }
    } else {
      const index = this.store.data.events.findIndex(e => e._id === id);
      if (index !== -1) {
        if (cleanUpdates.coordinates === undefined && (addressChanged || updates.coordinates === null)) {
          const { coordinates, ...rest } = this.store.data.events[index];
          this.store.data.events[index] = {
            ...rest,
            ...cleanUpdates,
            coordinates: undefined
          };
        } else {
          this.store.data.events[index] = {
            ...this.store.data.events[index],
            ...cleanUpdates
          };
        }
        this.store.save();
      }
    }

    // If event was transitioned to 'cancelled', run full cancellation workflow
    if (cleanUpdates.status === 'cancelled' && existing.status !== 'cancelled') {
      await this.cancelEvent(id, organizerId, isAdmin);
    }

    return this.getEventById(id, organizerId, isAdmin ? 'admin' : undefined);
  }

  /**
   * Cancel an event, preserve registration records, update MongoDB status, and notify all registered attendees via in-app & email
   */
  public async cancelEvent(
    id: string,
    organizerId?: string,
    isAdmin = false,
    reason?: string
  ): Promise<{ event: IEvent; notifiedCount: number }> {
    this.ensureReady();

    let existing: IEvent | null = null;
    if (this.isMongo()) {
      existing = (await EventModel.findById(id).lean()) as IEvent | null;
    } else {
      existing = this.store.data.events.find(e => e._id === id) || null;
    }

    if (!existing) {
      throw new Error('Event not found.');
    }

    if (!isAdmin && (!organizerId || String(existing.organizerId) !== String(organizerId))) {
      throw new Error('Unauthorized: You can only cancel your own events.');
    }

    const now = new Date().toISOString();

    if (this.isMongo()) {
      await EventModel.findOneAndUpdate(
        { _id: id },
        {
          status: 'cancelled',
          updatedAt: now
        }
      );
    }
    const idx = this.store.data.events.findIndex(e => e._id === id);
    if (idx !== -1) {
      this.store.data.events[idx] = {
        ...this.store.data.events[idx],
        status: 'cancelled',
        updatedAt: now
      };
      this.store.save();
    }

    // Query all registered attendees for this event (confirmed, waitlisted, pending_members)
    let registeredAttendees: IRegistration[] = [];
    if (this.isMongo()) {
      registeredAttendees = (await RegistrationModel.find({
        eventId: id,
        status: { $in: ['confirmed', 'waitlisted', 'pending_members'] }
      }).lean()) as IRegistration[];
    } else {
      registeredAttendees = this.store.data.registrations.filter(
        r => r.eventId === id && ['confirmed', 'waitlisted', 'pending_members'].includes(r.status)
      );
    }

    // In-app notifications & email dispatch
    const uniqueEmails = new Map<string, string>(); // email -> recipientName
    for (const r of registeredAttendees) {
      // Create in-app notification for attendee
      await this.createNotification({
        recipientId: r.attendeeId,
        eventId: id,
        eventTitle: existing.title,
        type: 'event_cancelled',
        title: '⚠️ Event Cancelled',
        message: `Important update: The organizer has cancelled the event "${existing.title}". We apologize for any inconvenience.`,
        actionUrl: '/dashboard/attendee'
      });

      // Collect primary registrant email
      if (r.participantDetails?.email) {
        uniqueEmails.set(
          r.participantDetails.email.toLowerCase().trim(),
          r.participantDetails.firstName
            ? `${r.participantDetails.firstName} ${r.participantDetails.lastName || ''}`.trim()
            : 'Attendee'
        );
      } else {
        // Look up user by attendeeId if email not in participantDetails
        const user = this.isMongo()
          ? ((await UserModel.findById(r.attendeeId).lean()) as IUser | null)
          : this.store.data.users.find(u => u._id === r.attendeeId) || null;
        if (user?.email) {
          uniqueEmails.set(user.email.toLowerCase().trim(), user.name || 'Attendee');
        }
      }

      // If team registration, also collect team member emails
      if (r.teamMembers && Array.isArray(r.teamMembers)) {
        for (const tm of r.teamMembers) {
          if (tm.email) {
            uniqueEmails.set(
              tm.email.toLowerCase().trim(),
              tm.firstName ? `${tm.firstName} ${tm.lastName || ''}`.trim() : 'Team Member'
            );
          }
        }
      }
    }

    // Dispatch cancellation email via emailService to each registered attendee
    for (const [email, name] of uniqueEmails.entries()) {
      try {
        await emailService.sendEventCancelledNotification({
          to: email,
          recipientName: name,
          eventTitle: existing.title,
          eventDate: existing.startDateTime ? new Date(existing.startDateTime).toLocaleDateString() : undefined,
          eventVenue: existing.venueName || existing.city || undefined,
          reason: reason?.trim() || undefined
        });
      } catch (emailErr: any) {
        console.warn(`[EmailService] Failed to send event cancellation email to ${email}:`, emailErr.message);
      }
    }

    const fullUpdated = await this.getEventById(id, organizerId, isAdmin ? 'admin' : undefined);
    return {
      event: fullUpdated || { ...existing, status: 'cancelled', updatedAt: now },
      notifiedCount: uniqueEmails.size
    };
  }

  public async deleteEvent(id: string, organizerId?: string, isAdmin = false): Promise<boolean> {
    this.ensureReady();

    let existing: IEvent | null = null;
    if (this.isMongo()) {
      existing = (await EventModel.findById(id).lean()) as IEvent | null;
    } else {
      existing = this.store.data.events.find(e => e._id === id) || null;
    }
    if (!existing) return false;

    if (!isAdmin && (!organizerId || String(existing.organizerId) !== String(organizerId))) {
      throw new Error('Unauthorized: You can only delete your own events.');
    }

    // Clean up Cloudinary poster asset
    if (
      existing.posterPublicId &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        const { v2: cloudinary } = await import('cloudinary');
        await cloudinary.uploader.destroy(existing.posterPublicId);
      } catch (err) {
        console.warn('Could not delete poster from Cloudinary on event delete', err);
      }
    }

    // Notify registered attendees before deletion
    let activeRegs: IRegistration[] = [];
    if (this.isMongo()) {
      activeRegs = (await RegistrationModel.find({
        eventId: id,
        status: { $in: ['confirmed', 'waitlisted'] }
      }).lean()) as IRegistration[];
    } else {
      activeRegs = this.store.data.registrations.filter(
        r => r.eventId === id && ['confirmed', 'waitlisted'].includes(r.status)
      );
    }

    for (const r of activeRegs) {
      await this.createNotification({
        recipientId: r.attendeeId,
        eventId: id,
        eventTitle: existing.title,
        type: 'event_deleted',
        title: '⚠️ Event Removed',
        message: `Notice: The event "${existing.title}" has been removed by the organizer.`,
        actionUrl: '/dashboard/attendee'
      });
    }

    if (this.isMongo()) {
      await Promise.all([
        EventModel.deleteOne({ _id: id }),
        RegistrationModel.deleteMany({ eventId: id }),
        NotificationModel.deleteMany({ eventId: id }),
        FeedbackModel.deleteMany({ eventId: id }),
        ReportModel.deleteMany({ eventId: id }),
        TeamInvitationModel.deleteMany({ eventId: id })
      ]);
    }
    const index = this.store.data.events.findIndex(e => e._id === id);
    if (index !== -1) {
      this.store.data.events.splice(index, 1);
      this.store.data.registrations = this.store.data.registrations.filter(r => r.eventId !== id);
      this.store.data.notifications = this.store.data.notifications.filter(n => n.eventId !== id);
      this.store.data.feedbacks = this.store.data.feedbacks.filter(f => f.eventId !== id);
      this.store.data.reports = this.store.data.reports.filter(r => r.eventId !== id);
      this.store.data.teamInvitations = (this.store.data.teamInvitations || []).filter(ti => ti.eventId !== id);
      this.store.save();
    }
    return true;
  }

  // =========================================================================
  // 3. REGISTRATIONS, TEAMS, CONCURRENCY & ORDERED WAITLIST PROMOTION
  // =========================================================================
  public async registerForEvent(
    attendeeOrPayload: string | IRegisterEventPayload,
    eventIdArg?: string,
    notesArg?: string
  ): Promise<{
    registration: IRegistration;
    status: RegistrationStatus;
    message: string;
    emailWarning?: string | null;
    invitations?: any[];
  }> {
    this.ensureReady();

    let payload: IRegisterEventPayload;
    if (typeof attendeeOrPayload === 'string') {
      payload = {
        attendeeId: attendeeOrPayload,
        eventId: eventIdArg!,
        notes: notesArg
      };
    } else {
      payload = attendeeOrPayload;
    }

    const {
      attendeeId,
      eventId,
      registrationType = 'individual',
      teamName,
      teamMembers = [],
      participantDetails,
      customAnswers = {},
      paymentDetails,
      termsAccepted = true,
      notes
    } = payload;

    const event = await this.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found.');
    }

    if (event.status === 'cancelled') {
      throw new Error('This event has been cancelled by the organizer and is not accepting registrations.');
    }

    if (event.status !== 'published') {
      throw new Error('This event is not open for registration.');
    }

    const now = new Date();
    if (event.registrationDeadline && new Date(event.registrationDeadline) < now) {
      throw new Error('Registration deadline for this event has passed.');
    }

    // 1. Validate Registration Type against Event Settings
    const eventRegType = event.teamSettings?.registrationType || 'individual';
    if (eventRegType === 'individual' && registrationType === 'team') {
      throw new Error('This event only permits individual registrations.');
    }
    if (eventRegType === 'team' && registrationType === 'individual') {
      throw new Error('This event requires team registration.');
    }

    // 2. Validate Team Settings
    if (registrationType === 'team') {
      if (!teamName || typeof teamName !== 'string' || teamName.trim().length < 2) {
        throw new Error('Team name is required (minimum 2 characters).');
      }

      const minTeamSize = event.teamSettings?.minTeamSize || 2;
      const maxTeamSize = event.teamSettings?.maxTeamSize || 4;
      const actualSize = teamMembers.length;

      if (actualSize < minTeamSize) {
        throw new Error(`Minimum team size for this event is ${minTeamSize} member${minTeamSize > 1 ? 's' : ''}.`);
      }
      if (actualSize > maxTeamSize) {
        throw new Error(`Maximum team size for this event is ${maxTeamSize} members.`);
      }

      const leaderUser = await this.findUserById(attendeeId);
      const leaderEmail = (leaderUser?.email || '').toLowerCase().trim();

      // Check for duplicate emails inside the team & validate self-invitation
      const memberEmails: string[] = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      for (let i = 0; i < teamMembers.length; i++) {
        const m = teamMembers[i];
        const mEmail = (m.email || '').toLowerCase().trim();
        if (!mEmail) continue;

        if (!emailRegex.test(mEmail)) {
          throw new Error(`Invalid email address provided for team member: ${mEmail}`);
        }

        if (i > 0 && leaderEmail && mEmail === leaderEmail) {
          throw new Error('Team leader cannot invite themselves as a teammate.');
        }

        if (memberEmails.includes(mEmail)) {
          throw new Error('Duplicate team members detected. Each team member must have a unique email address.');
        }
        memberEmails.push(mEmail);
      }
    }

    // 3. Check existing active registration for the user
    let existingReg: IRegistration | null = null;
    if (this.isMongo()) {
      existingReg = (await RegistrationModel.findOne({
        attendeeId,
        eventId,
        status: { $in: ['confirmed', 'waitlisted', 'pending_approval', 'pending_payment'] }
      }).lean()) as IRegistration | null;
    } else {
      existingReg = this.store.data.registrations.find(
        r => r.attendeeId === attendeeId && r.eventId === eventId && r.status !== 'cancelled'
      ) || null;
    }

    if (existingReg) {
      throw new Error(`You already have an active registration (${existingReg.status.toUpperCase()}) for this event.`);
    }

    // 4. Form Builder Validation (Step 1 Basic & Step 2 Academic)
    if (participantDetails) {
      if (participantDetails.firstName !== undefined && !participantDetails.firstName.trim()) {
        throw new Error('First name is required.');
      }
      if (participantDetails.email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!participantDetails.email.trim() || !emailRegex.test(participantDetails.email.trim())) {
          throw new Error('A valid email address is required.');
        }
      }
      if (participantDetails.phone !== undefined && participantDetails.phone.trim()) {
        const phoneClean = participantDetails.phone.replace(/[\s\-()+]/g, '');
        if (phoneClean.length < 7 || phoneClean.length > 15 || !/^\d+$/.test(phoneClean)) {
          throw new Error('A valid mobile phone number is required.');
        }
      }
      if (participantDetails.gender !== undefined && participantDetails.gender.trim()) {
        const validGenders = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];
        if (!validGenders.includes(participantDetails.gender)) {
          throw new Error('Please select a valid gender option.');
        }
      }
      if (participantDetails.location !== undefined && !participantDetails.location.trim()) {
        throw new Error('Location is required.');
      }
      if (participantDetails.differentlyAbledStatus !== undefined && participantDetails.differentlyAbledStatus.trim()) {
        const validStatuses = ['No', 'Yes', 'Prefer not to say', 'no', 'yes', 'prefer_not_to_say'];
        if (!validStatuses.includes(participantDetails.differentlyAbledStatus)) {
          throw new Error('Please select a valid differently abled status.');
        }
      }

      // Academic details validation if enabled for competitions/hackathons
      const isAcademicRequired = event.registrationFormConfig?.academicDetailsEnabled !== false &&
        (event.category === 'Hackathon' || event.registrationFormConfig?.templateType === 'detailed_hackathon');

      if (isAcademicRequired) {
        if (!participantDetails.userType?.trim()) {
          throw new Error('User type is required.');
        }
        const effectiveInstitute = (participantDetails.instituteName || participantDetails.college || '').trim();
        if (!effectiveInstitute) {
          throw new Error('Institute name is required.');
        }
        if (!participantDetails.domain?.trim()) {
          throw new Error('Domain / Stream is required.');
        }
        if (!participantDetails.course?.trim()) {
          throw new Error('Course / Degree is required.');
        }
        if (!participantDetails.specialization?.trim()) {
          throw new Error('Course specialization is required.');
        }
        if (!participantDetails.graduatingYear?.trim()) {
          throw new Error('Graduating year is required.');
        }
        if (!participantDetails.courseDuration?.trim()) {
          throw new Error('Course duration is required.');
        }
      }
    }

    if (event.registrationFormConfig) {
      const config = event.registrationFormConfig;
      const attendee = await this.findUserById(attendeeId);
      const leadMember = teamMembers && teamMembers[0] ? teamMembers[0] : null;

      const effectiveCollege = (
        participantDetails?.instituteName ||
        participantDetails?.college ||
        leadMember?.college ||
        attendee?.college ||
        attendee?.organization ||
        attendee?.department ||
        ''
      ).trim();

      const effectivePhone = (
        participantDetails?.phone ||
        leadMember?.phone ||
        attendee?.phone ||
        ''
      ).trim();

      if (participantDetails && config.college?.enabled && config.college?.required && !effectiveCollege) {
        throw new Error('College / Institute / Organization is required.');
      }
      if (participantDetails && config.phone?.enabled && config.phone?.required && !effectivePhone) {
        throw new Error('Mobile phone number is required.');
      }

      // Validate custom questions
      if (Array.isArray(config.customQuestions)) {
        for (const q of config.customQuestions) {
          if (q.required) {
            const answer = customAnswers[q.id];
            if (answer === undefined || answer === null || String(answer).trim() === '') {
              throw new Error(`Required question: "${q.label}" must be answered.`);
            }
          }
        }
      }
    }

    // 5. Terms & Conditions Validation
    if (event.termsAndConditions?.isMandatory && !termsAccepted) {
      throw new Error('You must accept the terms and conditions to complete registration.');
    }

    // 6. Payment Amount & Details Verification
    const calculatedFee = paymentService.calculateFee(
      event,
      registrationType,
      registrationType === 'team' ? teamMembers.length : 1
    );

    const isPaidEvent = calculatedFee > 0;
    const utrNumber = (paymentDetails?.utrNumber || (payload as any).utrNumber || '').trim();
    const paymentStatus = isPaidEvent ? 'pending' : 'not_required';
    const nowIso = new Date().toISOString();

    let recordedPayment: IPaymentDetails = {
      pricingType: isPaidEvent ? 'paid' : 'free',
      amount: calculatedFee,
      currency: event.paymentConfig?.currency || 'INR',
      feeType: event.paymentConfig?.feeType || 'per_participant',
      paymentStatus,
      utrNumber: utrNumber || undefined,
      paymentAmount: calculatedFee,
      paymentSubmittedAt: isPaidEvent ? nowIso : undefined,
      paidAt: isPaidEvent ? nowIso : undefined,
      gateway: 'upi'
    };

    // 7. Concurrency-safe capacity evaluation
    let confirmedCount = 0;
    let waitlistCount = 0;

    if (this.isMongo()) {
      [confirmedCount, waitlistCount] = await Promise.all([
        RegistrationModel.countDocuments({ eventId, status: 'confirmed' }),
        RegistrationModel.countDocuments({ eventId, status: 'waitlisted' })
      ]);
    } else {
      confirmedCount = this.store.data.registrations.filter(
        r => r.eventId === eventId && r.status === 'confirmed'
      ).length;
      waitlistCount = this.store.data.registrations.filter(
        r => r.eventId === eventId && r.status === 'waitlisted'
      ).length;
    }

    let regStatus: RegistrationStatus = 'confirmed';
    let waitlistPosition: number | undefined = undefined;

    if (confirmedCount >= event.capacity) {
      regStatus = 'waitlisted';
      waitlistPosition = waitlistCount + 1;
    }

    // Generate unique ticket code
    const ticketId = generateTicketId();
    const leaderUser = await this.findUserById(attendeeId);
    const regId = generateId('reg');

    let processedMembers: ITeamMember[] = [];
    const generatedInvitations: Array<{ invitation: ITeamInvitation; rawToken: string }> = [];
    let emailDeliveryWarning: string | null = null;
    let anyEmailDelivered = false;

    if (registrationType === 'team') {
      const leaderMember: ITeamMember = {
        ...(teamMembers[0] || {}),
        userId: attendeeId,
        firstName: teamMembers[0]?.firstName || leaderUser?.name?.split(' ')[0] || 'Leader',
        lastName: teamMembers[0]?.lastName || leaderUser?.name?.split(' ').slice(1).join(' ') || '',
        email: leaderUser?.email || teamMembers[0]?.email || '',
        phone: teamMembers[0]?.phone || leaderUser?.phone || '',
        college: teamMembers[0]?.college || leaderUser?.college || leaderUser?.organization || '',
        isLeader: true,
        status: 'confirmed'
      };
      processedMembers.push(leaderMember);

      // Process invitees (teamMembers from index 1 onward)
      for (let i = 1; i < teamMembers.length; i++) {
        const m = teamMembers[i];
        if (!m.email) continue;
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const invId = generateId('inv');
        const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

        const existingMemberUser = await this.findUserByEmail(m.email);

        const invDoc: ITeamInvitation = {
          _id: invId,
          registrationId: regId,
          eventId: event._id,
          eventTitle: event.title,
          teamName: (teamName || '').trim(),
          teamLeaderId: attendeeId,
          teamLeaderName: leaderUser?.name || 'Team Leader',
          teamLeaderEmail: leaderUser?.email || '',
          memberEmail: m.email.toLowerCase().trim(),
          memberName: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email,
          memberDetails: { ...m },
          tokenHash,
          status: 'pending',
          expiresAt,
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        let memberStatus: 'not_invited' | 'sent' | 'pending' = 'pending';

        if (payload.sendInvitations !== false) {
          try {
            await emailService.sendTeamInvitation({
              to: m.email.toLowerCase().trim(),
              memberName: invDoc.memberName,
              teamName: invDoc.teamName,
              eventTitle: event.title,
              eventDate: event.startDateTime,
              eventVenue: `${event.venueName}, ${event.city}`,
              leaderName: leaderUser?.name || 'Team Leader',
              leaderEmail: leaderUser?.email || '',
              token: rawToken,
              expiresAt,
              appBaseUrl: payload.appBaseUrl
            });
            invDoc.status = 'sent';
            memberStatus = 'sent';
            anyEmailDelivered = true;
          } catch (err: any) {
            emailDeliveryWarning = err.message || 'Email delivery failed.';
            invDoc.status = 'pending';
            memberStatus = 'pending';
          }
        }

        if (this.isMongo()) {
          await TeamInvitationModel.create(invDoc);
        } else {
          if (!Array.isArray(this.store.data.teamInvitations)) {
            this.store.data.teamInvitations = [];
          }
          this.store.data.teamInvitations.push(invDoc);
          this.store.save();
        }

        generatedInvitations.push({ invitation: invDoc, rawToken });

        processedMembers.push({
          ...m,
          userId: existingMemberUser?._id,
          invitationId: invId,
          isLeader: false,
          status: memberStatus
        });
      }

      // Check if registration should be pending member acceptances
      if (regStatus !== 'waitlisted') {
        const acceptedCount = processedMembers.filter(m => m.status === 'accepted' || m.status === 'confirmed').length;
        if (processedMembers.length > 1 && acceptedCount < processedMembers.length) {
          regStatus = 'pending_members';
        }
      }
    }

    const newReg: IRegistration = {
      _id: regId,
      attendeeId,
      eventId,
      registrationType,
      teamName: registrationType === 'team' ? (teamName || '').trim() : undefined,
      teamLeaderId: registrationType === 'team' ? attendeeId : undefined,
      teamLeaderName: registrationType === 'team' ? (leaderUser?.name || 'Leader') : undefined,
      teamLeaderEmail: registrationType === 'team' ? (leaderUser?.email || '') : undefined,
      teamMembers: registrationType === 'team' ? processedMembers : undefined,
      participantDetails: participantDetails || undefined,
      customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
      status: regStatus,
      ticketId,
      qrData: JSON.stringify({ ticketId, eventId, attendeeId, teamName: teamName || undefined }),
      attendanceStatus: 'not_checked_in',
      paymentDetails: recordedPayment,
      paymentStatus,
      utrNumber: utrNumber || undefined,
      paymentAmount: calculatedFee,
      paymentSubmittedAt: isPaidEvent ? nowIso : undefined,
      termsAccepted,
      termsAcceptedAt: termsAccepted ? (payload.termsAcceptedAt || new Date().toISOString()) : undefined,
      lookingForTeammates: Boolean(payload.lookingForTeammates),
      registeredAt: new Date().toISOString(),
      waitlistPosition,
      notes: notes ? notes.trim() : undefined
    };

    if (this.isMongo()) {
      await RegistrationModel.create(newReg);
    } else {
      this.store.data.registrations.push(newReg);
      this.store.save();
    }

    // Send confirmation or pending notification to leader
    if (leaderUser) {
      if (regStatus === 'confirmed') {
        await this.createNotification({
          recipientId: attendeeId,
          eventId: event._id,
          eventTitle: event.title,
          type: 'registration_confirmed',
          title: registrationType === 'team' ? `Team Registration Confirmed: ${teamName}` : 'Registration Confirmed!',
          message: `Your ticket (${ticketId}) for ${event.title} is confirmed. ${registrationType === 'team' ? `Team: ${teamName} (${teamMembers.length} members)` : ''} View your QR pass in your dashboard.`,
          actionUrl: '/dashboard/attendee'
        });

        // Dispatch registration confirmation email if email service is available
        if (leaderUser.email) {
          try {
            await emailService.sendRegistrationConfirmed({
              to: leaderUser.email,
              recipientName: leaderUser.name || 'Attendee',
              teamName: registrationType === 'team' ? teamName : undefined,
              eventTitle: event.title,
              ticketId,
              eventDate: event.startDateTime,
              eventVenue: `${event.venueName}, ${event.city}`
            });
          } catch (emailErr: any) {
            // Non-fatal: registration and ticket remain securely saved in database
            console.log(`ℹ️ [Email] Confirmation email not dispatched: ${emailErr.message}`);
          }
        }
      } else if (regStatus === 'pending_members') {
        await this.createNotification({
          recipientId: attendeeId,
          eventId: event._id,
          eventTitle: event.title,
          type: 'announcement',
          title: `Team Registration Pending: ${teamName}`,
          message: `Invitations have been dispatched to your team members. Your team registration will be completed once all required members have accepted their invitations.`,
          actionUrl: '/dashboard/attendee'
        });
      } else {
        await this.createNotification({
          recipientId: attendeeId,
          eventId: event._id,
          eventTitle: event.title,
          type: 'waitlist_joined',
          title: 'Added to Priority Waitlist',
          message: `You are placed at position #${waitlistPosition} on the waitlist for ${event.title}. If a seat opens up, you will be promoted automatically!`,
          actionUrl: '/dashboard/attendee'
        });
      }
    }

    // Notify registered accounts invited to the team
    if (registrationType === 'team' && Array.isArray(processedMembers)) {
      for (const member of processedMembers) {
        if (member.userId && member.userId !== attendeeId) {
          await this.createNotification({
            recipientId: member.userId,
            eventId: event._id,
            eventTitle: event.title,
            type: 'announcement',
            title: `Team Invitation: "${teamName}" for ${event.title}`,
            message: `${leaderUser?.name || 'Your team leader'} invited you to join team "${teamName}" for ${event.title}. Please review and accept your invitation.`,
            actionUrl: '/dashboard/attendee'
          });
        }
      }
    }

    let returnMessage = 'Registration successful! Digital QR pass issued.';
    if (regStatus === 'pending_members') {
      returnMessage = 'Team registration created. Your team registration will be completed once all required members have accepted their invitations.';
    } else if (regStatus === 'confirmed') {
      returnMessage = registrationType === 'team'
        ? `Team "${teamName}" registered successfully! Digital pass issued.`
        : 'Registration successful! Digital QR pass issued.';
    } else {
      returnMessage = `Event is at capacity. You are placed at position #${waitlistPosition} on the priority waitlist.`;
    }

    return {
      registration: newReg,
      status: regStatus,
      message: returnMessage,
      emailWarning: emailDeliveryWarning,
      invitations: generatedInvitations.map(g => ({
        id: g.invitation._id,
        memberEmail: g.invitation.memberEmail,
        memberName: g.invitation.memberName,
        status: g.invitation.status,
        expiresAt: g.invitation.expiresAt,
        token: g.rawToken // Provided to leader response securely so test/UI can render invitation link
      }))
    };
  }

  public async cancelRegistration(
    registrationOrTicketId: string,
    requesterUserId: string,
    isAdmin = false
  ): Promise<{
    success: boolean;
    registration: IRegistration;
    promotedAttendeeId?: string;
    refundStatus: 'not_applicable' | 'manual_review_required' | 'refunded';
    refundMessage: string;
  }> {
    this.ensureReady();
    const cleanId = (registrationOrTicketId || '').trim();
    if (!cleanId) {
      throw new Error('Registration ID or Ticket ID is required.');
    }

    let reg: IRegistration | null = null;

    if (this.isMongo()) {
      if (mongoose.isValidObjectId(cleanId)) {
        reg = (await RegistrationModel.findById(cleanId).lean()) as IRegistration | null;
      }
      if (!reg) {
        reg = (await RegistrationModel.findOne({
          $or: [{ _id: cleanId }, { ticketId: cleanId.toUpperCase() }]
        }).lean()) as IRegistration | null;
      }
    } else {
      reg = this.store.data.registrations.find(
        r => r._id === cleanId || r.ticketId?.toUpperCase() === cleanId.toUpperCase()
      ) || null;
    }

    if (!reg) {
      throw new Error('Registration record not found for the provided ID or ticket code.');
    }

    const event = await this.getEventById(reg.eventId);
    if (!event) {
      throw new Error('Associated event not found for this registration.');
    }

    const isAuthorizedOrganizer = !isAdmin && requesterUserId && event.organizerId === requesterUserId;
    if (!isAdmin && !isAuthorizedOrganizer) {
      throw new Error('Unauthorized: Only authorized event organizers or administrators can cancel registrations.');
    }

    if (reg.status === 'cancelled') {
      throw new Error('This registration is already cancelled.');
    }

    if (reg.attendanceStatus === 'checked_in') {
      throw new Error('Cannot cancel a ticket that has already been checked in at the venue.');
    }

    const wasConfirmed = reg.status === 'confirmed';
    const now = new Date().toISOString();

    // 1. If Team Registration, handle team member invitations safely
    if (reg.registrationType === 'team') {
      if (this.isMongo()) {
        await TeamInvitationModel.updateMany(
          { registrationId: reg._id, status: { $in: ['pending', 'sent'] } },
          { status: 'expired' }
        );
      } else {
        this.store.data.teamInvitations.forEach(inv => {
          if (inv.registrationId === reg!._id && (inv.status === 'pending' || inv.status === 'sent')) {
            inv.status = 'expired';
          }
        });
        this.store.save();
      }

      // Notify accepted team members
      if (Array.isArray(reg.teamMembers)) {
        for (const member of reg.teamMembers) {
          if (member.userId && member.userId !== requesterUserId) {
            await this.createNotification({
              recipientId: member.userId,
              eventId: reg.eventId,
              eventTitle: event?.title || 'Event',
              type: 'registration_cancelled',
              title: 'Team Registration Cancelled by Organizer',
              message: `The registration for team "${reg.teamName || 'your team'}" in "${event?.title || 'the event'}" has been cancelled by the event organizer.`,
              actionUrl: '/dashboard/attendee'
            });
          }
        }
      }
    }

    // 2. Persist cancellation in MongoDB / LocalStore
    let updatedReg: IRegistration;
    if (this.isMongo()) {
      const doc = await RegistrationModel.findByIdAndUpdate(
        reg._id,
        {
          status: 'cancelled',
          cancelledAt: now,
          waitlistPosition: null
        },
        { new: true }
      ).lean();
      updatedReg = (doc as unknown) as IRegistration;
    } else {
      const idx = this.store.data.registrations.findIndex(r => r._id === reg!._id);
      if (idx !== -1) {
        this.store.data.registrations[idx].status = 'cancelled';
        this.store.data.registrations[idx].cancelledAt = now;
        this.store.data.registrations[idx].waitlistPosition = undefined;
        this.store.save();
        updatedReg = this.store.data.registrations[idx];
      } else {
        updatedReg = { ...reg, status: 'cancelled', cancelledAt: now };
      }
    }

    // 3. Send cancellation notification to attendee
    await this.createNotification({
      recipientId: reg.attendeeId,
      eventId: reg.eventId,
      eventTitle: event?.title || 'Event',
      type: 'registration_cancelled',
      title: 'Registration Cancelled by Organizer',
      message: `Your registration for "${event?.title || 'the event'}" (Ticket ${reg.ticketId}) has been cancelled by the event organizer.`,
      actionUrl: '/dashboard/attendee'
    });

    // 4. Safe FIFO Waitlist Auto-Promotion
    let promotedAttendeeId: string | undefined;

    if (wasConfirmed) {
      let nextWaitlisted: IRegistration | null = null;

      if (this.isMongo()) {
        nextWaitlisted = (await RegistrationModel.findOne({
          eventId: reg.eventId,
          status: 'waitlisted'
        }).sort({ registeredAt: 1 }).lean()) as IRegistration | null;

        if (nextWaitlisted) {
          await RegistrationModel.findByIdAndUpdate(nextWaitlisted._id, {
            status: 'confirmed',
            waitlistPosition: null
          });
          promotedAttendeeId = nextWaitlisted.attendeeId;
        }
      } else {
        const queue = this.store.data.registrations
          .filter(r => r.eventId === reg!.eventId && r.status === 'waitlisted')
          .sort((a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime());

        if (queue.length > 0) {
          const firstInQueue = queue[0];
          firstInQueue.status = 'confirmed';
          firstInQueue.waitlistPosition = undefined;
          nextWaitlisted = firstInQueue;
          promotedAttendeeId = firstInQueue.attendeeId;
          this.store.save();
        }
      }

      if (nextWaitlisted) {
        await this.createNotification({
          recipientId: nextWaitlisted.attendeeId,
          eventId: reg.eventId,
          eventTitle: event?.title || 'Event',
          type: 'waitlist_promoted',
          title: '🎉 Promoted from Waitlist!',
          message: `Great news! A seat opened up for ${event?.title || 'your event'}. Your digital QR ticket (${nextWaitlisted.ticketId}) is now active!`,
          actionUrl: '/dashboard/attendee'
        });
      }
    }

    // 5. Explicitly distinguish cancellation from payment refund
    const isPaid =
      Boolean(reg.paymentDetails && (reg.paymentDetails.pricingType === 'paid' || (reg.paymentDetails.amount && reg.paymentDetails.amount > 0))) ||
      Boolean(event.price && event.price > 0) ||
      event.paymentConfig?.pricingType === 'paid';
    const refundStatus: 'not_applicable' | 'manual_review_required' | 'refunded' = isPaid
      ? 'manual_review_required'
      : 'not_applicable';
    const refundMessage = isPaid
      ? 'Participant registration cancelled. Any eligible refund is subject to organizer review and payment gateway terms.'
      : 'Participant registration cancelled successfully.';

    return {
      success: true,
      registration: updatedReg,
      promotedAttendeeId,
      refundStatus,
      refundMessage
    };
  }

  public async getMyRegistrations(attendeeId: string): Promise<IRegistration[]> {
    this.ensureReady();
    let list: IRegistration[] = [];

    if (this.isMongo()) {
      list = (await RegistrationModel.find({
        $or: [
          { attendeeId },
          { 'teamMembers.userId': attendeeId },
          { 'teamMembers.email': attendeeId }
        ]
      })
        .sort({ registeredAt: -1 })
        .lean()) as IRegistration[];
    } else {
      list = this.store.data.registrations
        .filter(r => r.attendeeId === attendeeId || r.teamMembers?.some((m: any) => m.userId === attendeeId || m.email?.toLowerCase() === attendeeId.toLowerCase()))
        .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
    }

    return Promise.all(
      list.map(async r => {
        let event: IEvent | null = null;
        if (this.isMongo()) {
          event = (await EventModel.findById(r.eventId).lean()) as IEvent | null;
        } else {
          event = this.store.data.events.find(e => e._id === r.eventId) || null;
        }
        return { ...r, event: event || undefined };
      })
    );
  }

  public async getEventAttendees(eventId: string, organizerId?: string, isAdmin = false): Promise<IRegistration[]> {
    this.ensureReady();
    const event = await this.getEventById(eventId, organizerId, isAdmin ? 'admin' : undefined);
    if (!event) throw new Error('Event not found.');

    if (!isAdmin && organizerId && event.organizerId !== organizerId) {
      throw new Error('Unauthorized: You can only view attendees for your own events.');
    }

    let list: IRegistration[] = [];
    if (this.isMongo()) {
      list = (await RegistrationModel.find({ eventId })
        .sort({ registeredAt: 1 })
        .lean()) as IRegistration[];
    } else {
      list = this.store.data.registrations.filter(r => r.eventId === eventId);
    }

    return Promise.all(
      list.map(async r => {
        let attendee: IUser | null = null;
        if (this.isMongo()) {
          attendee = (await UserModel.findById(r.attendeeId, { passwordHash: 0 }).lean()) as IUser | null;
        } else {
          attendee = this.store.data.users.find(u => u._id === r.attendeeId) || null;
        }

        return {
          ...r,
          attendee: attendee
            ? {
                _id: attendee._id,
                name: attendee.name,
                email: attendee.email,
                phone: attendee.phone,
                profileImage: attendee.profileImage,
                organization: attendee.organization
              }
            : undefined
        };
      })
    );
  }

  public async getRegistrationById(id: string): Promise<IRegistration | null> {
    this.ensureReady();
    const cleanId = (id || '').trim();
    if (!cleanId) return null;

    let reg: IRegistration | null = null;
    if (this.isMongo()) {
      if (mongoose.isValidObjectId(cleanId)) {
        reg = (await RegistrationModel.findById(cleanId).lean()) as IRegistration | null;
      }
      if (!reg) {
        reg = (await RegistrationModel.findOne({
          $or: [{ _id: cleanId }, { ticketId: cleanId.toUpperCase() }]
        }).lean()) as IRegistration | null;
      }
    } else {
      reg = this.store.data.registrations.find(
        r => r._id === cleanId || r.ticketId?.toUpperCase() === cleanId.toUpperCase()
      ) || null;
    }
    return reg;
  }

  public async verifyPayment(
    registrationId: string,
    organizerId: string,
    isAdmin = false
  ): Promise<{ registration: IRegistration; message: string }> {
    this.ensureReady();
    const reg = await this.getRegistrationById(registrationId);
    if (!reg) {
      throw new Error('Registration record not found.');
    }

    const event = await this.getEventById(reg.eventId);
    if (!event) {
      throw new Error('Associated event not found.');
    }

    if (!isAdmin && String(event.organizerId) !== String(organizerId)) {
      throw new Error('Unauthorized: You can only verify payments for your own events.');
    }

    const now = new Date().toISOString();
    const updatedPaymentDetails: IPaymentDetails = {
      ...(reg.paymentDetails || {
        pricingType: 'paid',
        amount: reg.paymentAmount || event.price || 0,
        currency: 'INR',
        feeType: 'per_participant'
      }),
      paymentStatus: 'verified',
      paymentVerifiedAt: now,
      paymentVerifiedBy: organizerId
    };

    if (this.isMongo()) {
      await RegistrationModel.findByIdAndUpdate(reg._id, {
        paymentStatus: 'verified',
        paymentVerifiedAt: now,
        paymentVerifiedBy: organizerId,
        paymentDetails: updatedPaymentDetails,
        updatedAt: now
      });
    }

    const idx = this.store.data.registrations.findIndex(r => r._id === reg._id);
    if (idx !== -1) {
      this.store.data.registrations[idx] = {
        ...this.store.data.registrations[idx],
        paymentStatus: 'verified',
        paymentVerifiedAt: now,
        paymentVerifiedBy: organizerId,
        paymentDetails: updatedPaymentDetails
      };
      this.store.save();
    }

    // Send confirmation notification & email to attendee
    await this.createNotification({
      recipientId: reg.attendeeId,
      eventId: event._id,
      eventTitle: event.title,
      type: 'registration_confirmed',
      title: '✅ Payment Verified & Confirmed!',
      message: `Your payment of ₹${reg.paymentAmount || reg.paymentDetails?.amount || event.price} (UTR: ${reg.utrNumber || reg.paymentDetails?.utrNumber || 'Submitted Reference'}) for "${event.title}" has been verified by the organizer. Your ticket (#${reg.ticketId}) is active!`,
      actionUrl: '/dashboard/attendee'
    });

    const attendeeUser = await this.findUserById(reg.attendeeId);
    const targetEmail = reg.participantDetails?.email || attendeeUser?.email;
    const targetName = reg.participantDetails?.firstName
      ? `${reg.participantDetails.firstName} ${reg.participantDetails.lastName || ''}`.trim()
      : attendeeUser?.name || 'Attendee';

    if (targetEmail) {
      try {
        await emailService.sendRegistrationConfirmed({
          to: targetEmail,
          recipientName: targetName,
          teamName: reg.teamName,
          eventTitle: event.title,
          ticketId: reg.ticketId,
          eventDate: event.startDateTime,
          eventVenue: `${event.venueName}, ${event.city}`
        });
      } catch (e: any) {
        console.log(`ℹ️ [Email] Verification confirmation email note: ${e.message}`);
      }
    }

    const updated = await this.getRegistrationById(reg._id);
    return {
      registration: updated || reg,
      message: 'Payment has been successfully verified and attendee notified.'
    };
  }

  public async rejectPayment(
    registrationId: string,
    reason: string | undefined,
    organizerId: string,
    isAdmin = false
  ): Promise<{ registration: IRegistration; message: string }> {
    this.ensureReady();
    const reg = await this.getRegistrationById(registrationId);
    if (!reg) {
      throw new Error('Registration record not found.');
    }

    const event = await this.getEventById(reg.eventId);
    if (!event) {
      throw new Error('Associated event not found.');
    }

    if (!isAdmin && String(event.organizerId) !== String(organizerId)) {
      throw new Error('Unauthorized: You can only manage payments for your own events.');
    }

    const now = new Date().toISOString();
    const updatedPaymentDetails: IPaymentDetails = {
      ...(reg.paymentDetails || {
        pricingType: 'paid',
        amount: reg.paymentAmount || event.price || 0,
        currency: 'INR',
        feeType: 'per_participant'
      }),
      paymentStatus: 'rejected',
      paymentVerifiedAt: now,
      paymentVerifiedBy: organizerId
    };

    const notes = reason ? `Payment Rejected: ${reason}` : 'Payment Rejected by Organizer';

    if (this.isMongo()) {
      await RegistrationModel.findByIdAndUpdate(reg._id, {
        paymentStatus: 'rejected',
        paymentVerifiedAt: now,
        paymentVerifiedBy: organizerId,
        paymentDetails: updatedPaymentDetails,
        notes: reg.notes ? `${reg.notes} | ${notes}` : notes,
        updatedAt: now
      });
    }

    const idx = this.store.data.registrations.findIndex(r => r._id === reg._id);
    if (idx !== -1) {
      this.store.data.registrations[idx] = {
        ...this.store.data.registrations[idx],
        paymentStatus: 'rejected',
        paymentVerifiedAt: now,
        paymentVerifiedBy: organizerId,
        paymentDetails: updatedPaymentDetails,
        notes: reg.notes ? `${reg.notes} | ${notes}` : notes
      };
      this.store.save();
    }

    await this.createNotification({
      recipientId: reg.attendeeId,
      eventId: event._id,
      eventTitle: event.title,
      type: 'account_alert',
      title: '❌ Payment Verification Issue',
      message: `Your payment reference (UTR: ${reg.utrNumber || reg.paymentDetails?.utrNumber || 'N/A'}) for "${event.title}" could not be verified by the organizer.${reason ? ` Reason: ${reason}` : ''} Please check and contact the organizer.`,
      actionUrl: '/dashboard/attendee'
    });

    const updated = await this.getRegistrationById(reg._id);
    return {
      registration: updated || reg,
      message: 'Payment has been rejected. Record and notes have been updated.'
    };
  }

  // =========================================================================
  // TEAM INVITATIONS & ACCEPTANCE WORKFLOW
  // =========================================================================

  public async getInvitationByToken(rawToken: string): Promise<{
    invitation: ITeamInvitation;
    event: IEvent;
    registration: IRegistration;
    isExpired: boolean;
  }> {
    this.ensureReady();
    if (!rawToken || typeof rawToken !== 'string') {
      throw new Error('Valid invitation token is required.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

    let invitation: ITeamInvitation | null = null;
    if (this.isMongo()) {
      invitation = (await TeamInvitationModel.findOne({ tokenHash }).lean()) as ITeamInvitation | null;
    } else {
      invitation = this.store.data.teamInvitations.find(inv => inv.tokenHash === tokenHash) || null;
    }

    if (!invitation) {
      throw new Error('Invitation not found or invalid invitation link.');
    }

    const event = await this.getEventById(invitation.eventId);
    if (!event) {
      throw new Error('The event associated with this invitation is no longer available.');
    }

    let registration: IRegistration | null = null;
    if (this.isMongo()) {
      registration = (await RegistrationModel.findById(invitation.registrationId).lean()) as IRegistration | null;
    } else {
      registration = this.store.data.registrations.find(r => r._id === invitation!.registrationId) || null;
    }

    if (!registration) {
      throw new Error('The team registration associated with this invitation was not found.');
    }

    const isExpired = new Date(invitation.expiresAt).getTime() < Date.now();
    if (isExpired && invitation.status !== 'accepted' && invitation.status !== 'declined') {
      invitation.status = 'expired';
      if (this.isMongo()) {
        await TeamInvitationModel.findByIdAndUpdate(invitation._id, { status: 'expired' });
      } else {
        const stored = this.store.data.teamInvitations.find(i => i._id === invitation!._id);
        if (stored) {
          stored.status = 'expired';
          this.store.save();
        }
      }
    }

    return {
      invitation,
      event,
      registration,
      isExpired
    };
  }

  public async acceptInvitation(
    rawToken: string,
    acceptingUser: IUser
  ): Promise<{
    invitation: ITeamInvitation;
    registration: IRegistration;
    isTeamFullyConfirmed: boolean;
    message: string;
  }> {
    this.ensureReady();
    if (!rawToken) {
      throw new Error('Invitation token is required.');
    }
    if (!acceptingUser) {
      throw new Error('Authentication is required to accept an invitation.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

    let invitation: any = null;
    if (this.isMongo()) {
      invitation = await TeamInvitationModel.findOne({ tokenHash });
    } else {
      invitation = this.store.data.teamInvitations.find(inv => inv.tokenHash === tokenHash) || null;
    }

    if (!invitation) {
      throw new Error('Invitation not found or token has expired.');
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      invitation.status = 'expired';
      if (this.isMongo()) {
        await TeamInvitationModel.findByIdAndUpdate(invitation._id, { status: 'expired' });
      } else {
        this.store.save();
      }
      throw new Error('This invitation has expired. Please contact your team leader to resend an invitation.');
    }

    if (invitation.status === 'accepted') {
      throw new Error('This invitation has already been accepted.');
    }

    if (invitation.status === 'declined') {
      throw new Error('This invitation was previously declined and is no longer valid.');
    }

    // Verify email match (case-insensitive)
    const userEmail = (acceptingUser.email || '').toLowerCase().trim();
    const invitedEmail = (invitation.memberEmail || '').toLowerCase().trim();

    if (userEmail !== invitedEmail) {
      throw new Error(
        `Email mismatch: This invitation was issued for ${invitation.memberEmail}, but you are currently authenticated as ${acceptingUser.email}. Please log in with the invited email address.`
      );
    }

    // Update invitation
    const nowIso = new Date().toISOString();
    invitation.status = 'accepted';
    invitation.acceptedAt = nowIso;
    invitation.acceptedUserId = acceptingUser._id;

    if (this.isMongo()) {
      await invitation.save();
    } else {
      this.store.save();
    }

    // Update Team Registration
    let registration: any = null;
    if (this.isMongo()) {
      registration = await RegistrationModel.findById(invitation.registrationId);
    } else {
      registration = this.store.data.registrations.find(r => r._id === invitation.registrationId) || null;
    }

    if (!registration) {
      throw new Error('Associated team registration not found.');
    }

    // Update member record in teamMembers
    if (Array.isArray(registration.teamMembers)) {
      for (const m of registration.teamMembers) {
        if (
          (m.invitationId && m.invitationId === invitation._id) ||
          (m.email && m.email.toLowerCase().trim() === invitedEmail)
        ) {
          m.userId = acceptingUser._id;
          m.status = 'accepted';
          m.firstName = acceptingUser.name?.split(' ')[0] || m.firstName;
          m.lastName = acceptingUser.name?.split(' ').slice(1).join(' ') || m.lastName;
          break;
        }
      }
    }

    const event = await this.getEventById(registration.eventId);
    const minTeamSize = event?.teamSettings?.minTeamSize || 2;
    const totalMembers = registration.teamMembers?.length || 1;
    const acceptedCount = (registration.teamMembers || []).filter(
      (m: any) => m.status === 'accepted' || m.status === 'confirmed' || m.isLeader
    ).length;

    // Check if team meets confirmation threshold
    const hasPendingMembers = (registration.teamMembers || []).some(
      (m: any) => m.status === 'pending' || m.status === 'sent' || m.status === 'not_invited'
    );
    const isTeamFullyConfirmed = acceptedCount >= minTeamSize && !hasPendingMembers;

    if (isTeamFullyConfirmed && registration.status !== 'confirmed') {
      registration.status = 'confirmed';
      if (!registration.ticketId) {
        registration.ticketId = generateTicketId();
      }
      registration.qrData = JSON.stringify({
        ticketId: registration.ticketId,
        eventId: registration.eventId,
        teamName: registration.teamName
      });
    }

    if (this.isMongo()) {
      await registration.save();
    } else {
      this.store.save();
    }

    // Notifications & Emails
    const leaderId = registration.teamLeaderId || registration.attendeeId;

    if (isTeamFullyConfirmed) {
      // Notify Leader of full confirmation
      await this.createNotification({
        recipientId: leaderId,
        eventId: registration.eventId,
        eventTitle: event?.title || 'Event',
        type: 'registration_confirmed',
        title: `🎉 Team Registration Confirmed: ${registration.teamName}`,
        message: `All members of "${registration.teamName}" have accepted! Your official team ticket (${registration.ticketId}) is now active.`,
        actionUrl: '/dashboard/attendee'
      });

      // Send Leader Confirmation Email
      try {
        await emailService.sendInvitationAcceptedNotification({
          leaderEmail: registration.teamLeaderEmail || '',
          leaderName: registration.teamLeaderName || 'Team Leader',
          memberName: acceptingUser.name,
          memberEmail: acceptingUser.email,
          teamName: registration.teamName || 'Team',
          eventTitle: event?.title || 'Event',
          isTeamFullyConfirmed: true
        });

        await emailService.sendRegistrationConfirmed({
          to: registration.teamLeaderEmail || '',
          recipientName: registration.teamLeaderName || 'Team Leader',
          teamName: registration.teamName,
          eventTitle: event?.title || 'Event',
          ticketId: registration.ticketId,
          eventDate: event?.startDateTime,
          eventVenue: `${event?.venueName}, ${event?.city}`
        });
      } catch (e) {
        console.warn('Could not dispatch leader confirmation email', e);
      }

      // Notify and email all accepted members
      if (Array.isArray(registration.teamMembers)) {
        for (const m of registration.teamMembers) {
          if (m.userId && m.userId !== leaderId) {
            await this.createNotification({
              recipientId: m.userId,
              eventId: registration.eventId,
              eventTitle: event?.title || 'Event',
              type: 'registration_confirmed',
              title: `🎉 Team Registration Confirmed: ${registration.teamName}`,
              message: `Your team "${registration.teamName}" is officially confirmed for ${event?.title}! Ticket: ${registration.ticketId}`,
              actionUrl: '/dashboard/attendee'
            });

            try {
              await emailService.sendRegistrationConfirmed({
                to: m.email,
                recipientName: `${m.firstName} ${m.lastName || ''}`.trim() || m.email,
                teamName: registration.teamName,
                eventTitle: event?.title || 'Event',
                ticketId: registration.ticketId,
                eventDate: event?.startDateTime,
                eventVenue: `${event?.venueName}, ${event?.city}`
              });
            } catch (e) {
              console.warn('Could not dispatch member confirmation email', e);
            }
          }
        }
      }
    } else {
      // Partial acceptance notification to leader
      await this.createNotification({
        recipientId: leaderId,
        eventId: registration.eventId,
        eventTitle: event?.title || 'Event',
        type: 'announcement',
        title: `Member Joined Team: ${acceptingUser.name}`,
        message: `${acceptingUser.name} (${acceptingUser.email}) accepted the invitation to join "${registration.teamName}". (${acceptedCount}/${totalMembers} members accepted)`,
        actionUrl: '/dashboard/attendee'
      });

      try {
        await emailService.sendInvitationAcceptedNotification({
          leaderEmail: registration.teamLeaderEmail || '',
          leaderName: registration.teamLeaderName || 'Team Leader',
          memberName: acceptingUser.name,
          memberEmail: acceptingUser.email,
          teamName: registration.teamName || 'Team',
          eventTitle: event?.title || 'Event',
          isTeamFullyConfirmed: false
        });
      } catch (e) {
        console.warn('Could not dispatch leader acceptance notification email', e);
      }
    }

    const cleanInvitation = invitation.toObject ? invitation.toObject() : invitation;
    const cleanRegistration = registration.toObject ? registration.toObject() : registration;

    return {
      invitation: cleanInvitation,
      registration: cleanRegistration,
      isTeamFullyConfirmed,
      message: isTeamFullyConfirmed
        ? `Invitation accepted! Your team registration is now fully confirmed with Ticket Code ${registration.ticketId}.`
        : `Invitation accepted! Your response has been recorded. Team registration will be finalized once all members accept.`
    };
  }

  public async declineInvitation(
    rawToken: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    this.ensureReady();
    if (!rawToken) throw new Error('Invitation token is required.');

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

    let invitation: any = null;
    if (this.isMongo()) {
      invitation = await TeamInvitationModel.findOne({ tokenHash });
    } else {
      invitation = this.store.data.teamInvitations.find(inv => inv.tokenHash === tokenHash) || null;
    }

    if (!invitation) {
      throw new Error('Invitation not found or invalid link.');
    }

    if (invitation.status === 'accepted') {
      throw new Error('Cannot decline an invitation that has already been accepted.');
    }

    invitation.status = 'declined';
    invitation.declinedAt = new Date().toISOString();

    if (this.isMongo()) {
      await invitation.save();
    } else {
      this.store.save();
    }

    // Update registration member status
    let registration: any = null;
    if (this.isMongo()) {
      registration = await RegistrationModel.findById(invitation.registrationId);
    } else {
      registration = this.store.data.registrations.find(r => r._id === invitation.registrationId) || null;
    }

    if (registration && Array.isArray(registration.teamMembers)) {
      for (const m of registration.teamMembers) {
        if (
          (m.invitationId && m.invitationId === invitation._id) ||
          (m.email && m.email.toLowerCase().trim() === invitation.memberEmail.toLowerCase().trim())
        ) {
          m.status = 'declined';
          break;
        }
      }
      if (this.isMongo()) {
        await registration.save();
      } else {
        this.store.save();
      }
    }

    // Notify team leader
    const leaderId = invitation.teamLeaderId;
    await this.createNotification({
      recipientId: leaderId,
      eventId: invitation.eventId,
      eventTitle: invitation.eventTitle,
      type: 'announcement',
      title: `Invitation Declined: ${invitation.memberName}`,
      message: `${invitation.memberName} (${invitation.memberEmail}) declined the invitation to join "${invitation.teamName}". You can invite a replacement member from your dashboard.`,
      actionUrl: '/dashboard/attendee'
    });

    try {
      await emailService.sendInvitationDeclinedNotification({
        leaderEmail: invitation.teamLeaderEmail,
        leaderName: invitation.teamLeaderName,
        memberName: invitation.memberName,
        memberEmail: invitation.memberEmail,
        teamName: invitation.teamName,
        eventTitle: invitation.eventTitle || 'Event',
        reason
      });
    } catch (e) {
      console.warn('Could not dispatch leader decline notification email', e);
    }

    return {
      success: true,
      message: 'You have declined the team invitation.'
    };
  }

  public async resendInvitation(
    invitationId: string,
    leaderUserId: string,
    appBaseUrl?: string
  ): Promise<{ success: boolean; message: string; rawToken: string; expiresAt: string }> {
    this.ensureReady();
    let invitation: any = null;
    if (this.isMongo()) {
      invitation = await TeamInvitationModel.findById(invitationId);
    } else {
      invitation = this.store.data.teamInvitations.find(i => i._id === invitationId) || null;
    }

    if (!invitation) throw new Error('Invitation record not found.');

    if (invitation.teamLeaderId !== leaderUserId) {
      throw new Error('Unauthorized: Only the team leader can resend team invitations.');
    }

    if (invitation.status === 'accepted') {
      throw new Error('This member has already accepted the invitation.');
    }

    // Invalidate old token and issue fresh token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const sentAt = new Date().toISOString();

    invitation.tokenHash = tokenHash;
    invitation.expiresAt = expiresAt;
    invitation.sentAt = sentAt;
    invitation.status = 'sent';

    if (this.isMongo()) {
      await invitation.save();
    } else {
      this.store.save();
    }

    // Update Registration member status
    let reg: any = null;
    if (this.isMongo()) {
      reg = await RegistrationModel.findById(invitation.registrationId);
    } else {
      reg = this.store.data.registrations.find(r => r._id === invitation.registrationId) || null;
    }

    if (reg && Array.isArray(reg.teamMembers)) {
      for (const m of reg.teamMembers) {
        if (
          (m.invitationId && m.invitationId === invitation._id) ||
          (m.email && m.email.toLowerCase().trim() === invitation.memberEmail.toLowerCase().trim())
        ) {
          m.status = 'sent';
          break;
        }
      }
      if (this.isMongo()) {
        await reg.save();
      } else {
        this.store.save();
      }
    }

    // Deliver email
    const event = await this.getEventById(invitation.eventId);
    await emailService.sendTeamInvitation({
      to: invitation.memberEmail,
      memberName: invitation.memberName,
      teamName: invitation.teamName,
      eventTitle: event?.title || invitation.eventTitle || 'Event',
      eventDate: event?.startDateTime,
      eventVenue: event ? `${event.venueName}, ${event.city}` : undefined,
      leaderName: invitation.teamLeaderName,
      leaderEmail: invitation.teamLeaderEmail,
      token: rawToken,
      expiresAt,
      appBaseUrl
    });

    return {
      success: true,
      message: `Invitation resent successfully to ${invitation.memberEmail}.`,
      rawToken,
      expiresAt
    };
  }

  public async removeTeamMember(
    registrationId: string,
    memberEmail: string,
    leaderUserId: string
  ): Promise<{ success: boolean; message: string; registration: IRegistration }> {
    this.ensureReady();
    let reg: any = null;
    if (this.isMongo()) {
      reg = await RegistrationModel.findById(registrationId);
    } else {
      reg = this.store.data.registrations.find(r => r._id === registrationId) || null;
    }

    if (!reg) throw new Error('Registration not found.');
    if (reg.teamLeaderId !== leaderUserId && reg.attendeeId !== leaderUserId) {
      throw new Error('Unauthorized: Only the team leader can remove team members.');
    }

    const cleanEmail = memberEmail.toLowerCase().trim();
    if (!Array.isArray(reg.teamMembers)) {
      throw new Error('No team members found.');
    }

    const memberIndex = reg.teamMembers.findIndex((m: any) => m.email?.toLowerCase().trim() === cleanEmail);
    if (memberIndex === -1) {
      throw new Error('Member not found in team.');
    }

    if (reg.teamMembers[memberIndex].isLeader || reg.teamMembers[memberIndex].userId === leaderUserId) {
      throw new Error('Cannot remove team leader.');
    }

    // Invalidate invitation in DB if exists
    if (this.isMongo()) {
      await TeamInvitationModel.deleteMany({ registrationId, memberEmail: cleanEmail });
    } else {
      this.store.data.teamInvitations = this.store.data.teamInvitations.filter(
        i => !(i.registrationId === registrationId && i.memberEmail === cleanEmail)
      );
      this.store.save();
    }

    reg.teamMembers.splice(memberIndex, 1);

    // Recheck status
    const event = await this.getEventById(reg.eventId);
    const minTeam = event?.teamSettings?.minTeamSize || 2;
    const acceptedCount = reg.teamMembers.filter((m: any) => m.status === 'accepted' || m.status === 'confirmed').length;
    const hasPending = reg.teamMembers.some((m: any) => m.status === 'pending' || m.status === 'sent' || m.status === 'not_invited');

    if (acceptedCount >= minTeam && !hasPending) {
      reg.status = 'confirmed';
    } else {
      reg.status = 'pending_members';
    }

    if (this.isMongo()) {
      await reg.save();
    } else {
      this.store.save();
    }

    const cleanReg = reg.toObject ? reg.toObject() : reg;
    return {
      success: true,
      message: 'Member removed from team.',
      registration: cleanReg
    };
  }

  public async toggleLookingForTeammates(
    registrationId: string,
    userId: string,
    lookingForTeammates: boolean
  ): Promise<{ success: boolean; lookingForTeammates: boolean; message: string }> {
    this.ensureReady();
    let reg: any = null;
    if (this.isMongo()) {
      reg = await RegistrationModel.findById(registrationId);
    } else {
      reg = this.store.data.registrations.find(r => r._id === registrationId) || null;
    }

    if (!reg) throw new Error('Registration not found.');
    if (reg.teamLeaderId !== userId && reg.attendeeId !== userId) {
      throw new Error('Unauthorized: Only the team leader can toggle teammate search status.');
    }

    reg.lookingForTeammates = Boolean(lookingForTeammates);

    if (this.isMongo()) {
      await reg.save();
    } else {
      this.store.save();
    }

    return {
      success: true,
      lookingForTeammates: reg.lookingForTeammates,
      message: reg.lookingForTeammates
        ? 'Team is now marked as looking for teammates.'
        : 'Team is no longer actively looking for teammates.'
    };
  }

  public async getTeamsLookingForTeammates(
    eventId: string
  ): Promise<Array<{ teamName: string; leaderName: string; memberCount: number; maxTeamSize: number; registrationId: string }>> {
    this.ensureReady();
    const event = await this.getEventById(eventId);
    if (!event) throw new Error('Event not found.');

    let regs: IRegistration[] = [];
    if (this.isMongo()) {
      regs = (await RegistrationModel.find({
        eventId,
        registrationType: 'team',
        lookingForTeammates: true,
        status: { $in: ['confirmed', 'pending_members'] }
      }).lean()) as IRegistration[];
    } else {
      regs = this.store.data.registrations.filter(
        r => r.eventId === eventId && r.registrationType === 'team' && r.lookingForTeammates && (r.status === 'confirmed' || r.status === 'pending_members')
      );
    }

    return regs.map(r => ({
      registrationId: r._id,
      teamName: r.teamName || 'Team',
      leaderName: r.teamLeaderName || 'Leader',
      memberCount: (r.teamMembers || []).length,
      maxTeamSize: event.teamSettings?.maxTeamSize || 4
    }));
  }

  public async getTeamRegistrationDetails(
    registrationId: string,
    userId: string
  ): Promise<{ registration: IRegistration; invitations: ITeamInvitation[]; event: IEvent }> {
    this.ensureReady();
    let reg: IRegistration | null = null;
    if (this.isMongo()) {
      reg = (await RegistrationModel.findById(registrationId).lean()) as IRegistration | null;
    } else {
      reg = this.store.data.registrations.find(r => r._id === registrationId) || null;
    }

    if (!reg) throw new Error('Registration not found.');

    const isLeader = reg.teamLeaderId === userId || reg.attendeeId === userId;
    const isMember = reg.teamMembers?.some(m => m.userId === userId || m.email?.toLowerCase() === userId.toLowerCase());

    if (!isLeader && !isMember) {
      throw new Error('Unauthorized: You are not a member of this team.');
    }

    const event = await this.getEventById(reg.eventId);
    if (!event) throw new Error('Event not found.');

    let invitations: ITeamInvitation[] = [];
    if (this.isMongo()) {
      invitations = (await TeamInvitationModel.find({ registrationId }).lean()) as ITeamInvitation[];
    } else {
      invitations = this.store.data.teamInvitations.filter(i => i.registrationId === registrationId);
    }

    return {
      registration: reg,
      invitations,
      event
    };
  }

  // =========================================================================
  // 4. QR TICKET VERIFICATION & CHECK-IN
  // =========================================================================
  public async verifyTicketAndCheckIn(
    ticketId: string,
    organizerId?: string,
    isAdmin = false
  ): Promise<{ registration: IRegistration; event: IEvent; message: string }> {
    this.ensureReady();
    const cleanTicket = (ticketId || '').trim().toUpperCase();
    if (!cleanTicket) {
      throw new Error('Ticket code is required.');
    }

    let reg: IRegistration | null = null;
    if (this.isMongo()) {
      reg = (await RegistrationModel.findOne({ ticketId: cleanTicket }).lean()) as IRegistration | null;
    } else {
      reg = this.store.data.registrations.find(
        r => r.ticketId.trim().toUpperCase() === cleanTicket
      ) || null;
    }

    if (!reg) {
      throw new Error(`Ticket code "${cleanTicket}" is invalid or does not exist.`);
    }

    const event = await this.getEventById(reg.eventId, organizerId, isAdmin ? 'admin' : undefined);
    if (!event) throw new Error('Event associated with this ticket was not found.');

    if (!isAdmin && organizerId && event.organizerId !== organizerId) {
      throw new Error('Unauthorized: You are not authorized to check in attendees for this event.');
    }

    if (reg.status === 'cancelled') {
      throw new Error('This ticket has been cancelled and cannot be used for venue check-in.');
    }

    if (reg.status === 'waitlisted') {
      throw new Error('This ticket is currently waitlisted and not confirmed.');
    }

    const attendee = await this.findUserById(reg.attendeeId);

    // Check for duplicate check-in
    if (reg.attendanceStatus === 'checked_in') {
      return {
        registration: { ...reg, attendee: attendee as any },
        event,
        message: `⚠️ Already Checked In: Attendee was checked in on ${new Date(reg.checkedInAt!).toLocaleTimeString()}.`
      };
    }

    const now = new Date().toISOString();

    if (this.isMongo()) {
      await RegistrationModel.findByIdAndUpdate(reg._id, {
        attendanceStatus: 'checked_in',
        checkedInAt: now
      });
      reg.attendanceStatus = 'checked_in';
      reg.checkedInAt = now;
    } else {
      const idx = this.store.data.registrations.findIndex(r => r._id === reg!._id);
      if (idx !== -1) {
        this.store.data.registrations[idx].attendanceStatus = 'checked_in';
        this.store.data.registrations[idx].checkedInAt = now;
        this.store.save();
      }
      reg.attendanceStatus = 'checked_in';
      reg.checkedInAt = now;
    }

    // Send check-in confirmation notification
    await this.createNotification({
      recipientId: reg.attendeeId,
      eventId: event._id,
      eventTitle: event.title,
      type: 'attendance_marked',
      title: 'Welcome! Check-In Verified',
      message: `You have successfully checked in for ${event.title}. Enjoy your session!`,
      actionUrl: '/dashboard/attendee'
    });

    return {
      registration: { ...reg, attendee: attendee as any },
      event,
      message: `✅ Verified: Check-in confirmed for ${attendee?.name || 'Attendee'}.`
    };
  }

  public async getRegistrationByTicketId(
    ticketId: string,
    userId?: string,
    isAdmin = false
  ): Promise<{ registration: IRegistration; event: IEvent } | null> {
    this.ensureReady();
    const cleanTicket = (ticketId || '').trim().toUpperCase();
    if (!cleanTicket) return null;

    let reg: IRegistration | null = null;
    if (this.isMongo()) {
      reg = (await RegistrationModel.findOne({
        $or: [{ ticketId: cleanTicket }, { _id: ticketId.trim() }]
      }).lean()) as IRegistration | null;
    } else {
      reg = this.store.data.registrations.find(
        r => r.ticketId.trim().toUpperCase() === cleanTicket || r._id === ticketId.trim()
      ) || null;
    }

    if (!reg) return null;

    const event = await this.getEventById(reg.eventId);
    if (!event) return null;

    // Security check if requested by a user
    if (userId && !isAdmin) {
      const isOwner = String(reg.attendeeId) === String(userId);
      const isOrganizer = String(event.organizerId) === String(userId);
      const isTeamMember = reg.teamMembers?.some(m => String(m.userId) === String(userId));
      if (!isOwner && !isOrganizer && !isTeamMember) {
        throw new Error('Unauthorized: You cannot access this ticket pass.');
      }
    }

    const attendee = await this.findUserById(reg.attendeeId);

    return {
      registration: { ...reg, attendee: attendee as any },
      event
    };
  }

  // =========================================================================
  // 5. NOTIFICATIONS
  // =========================================================================
  public async getNotifications(recipientId: string): Promise<INotification[]> {
    this.ensureReady();
    if (this.isMongo()) {
      const docs = await NotificationModel.find({ recipientId })
        .sort({ createdAt: -1 })
        .lean();
      return docs as INotification[];
    }
    return this.store.data.notifications
      .filter(n => n.recipientId === recipientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createNotification(data: Partial<INotification>): Promise<INotification> {
    this.ensureReady();
    const notif: INotification = {
      _id: generateId('notif'),
      recipientId: data.recipientId || '',
      eventId: data.eventId,
      eventTitle: data.eventTitle,
      type: data.type || 'announcement',
      title: data.title || 'EventHub Notification',
      message: data.message || '',
      readStatus: false,
      actionUrl: data.actionUrl || '/dashboard',
      createdAt: new Date().toISOString()
    };

    if (this.isMongo()) {
      await NotificationModel.create(notif);
    } else {
      this.store.data.notifications.unshift(notif);
      this.store.save();
    }
    return notif;
  }

  public async markNotificationRead(id: string, recipientId: string): Promise<boolean> {
    this.ensureReady();
    if (this.isMongo()) {
      const res = await NotificationModel.updateOne(
        { _id: id, recipientId },
        { readStatus: true }
      );
      return res.modifiedCount > 0;
    }
    const notif = this.store.data.notifications.find(n => n._id === id && n.recipientId === recipientId);
    if (!notif) return false;
    notif.readStatus = true;
    this.store.save();
    return true;
  }

  public async markAllNotificationsRead(recipientId: string): Promise<boolean> {
    this.ensureReady();
    if (this.isMongo()) {
      await NotificationModel.updateMany({ recipientId }, { readStatus: true });
      return true;
    }
    this.store.data.notifications.forEach(n => {
      if (n.recipientId === recipientId) n.readStatus = true;
    });
    this.store.save();
    return true;
  }

  // =========================================================================
  // 6. FEEDBACK & REVIEWS
  // =========================================================================
  public async createFeedback(
    attendeeId: string,
    eventId: string,
    rating: number,
    comment: string
  ): Promise<IFeedback> {
    this.ensureReady();
    const attendee = await this.findUserById(attendeeId);
    const event = await this.getEventById(eventId);
    if (!event) throw new Error('Event not found.');

    const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
    const feedback: IFeedback = {
      _id: generateId('fb'),
      attendeeId,
      attendee: attendee
        ? {
            _id: attendee._id,
            name: attendee.name,
            profileImage: attendee.profileImage
          }
        : undefined,
      eventId,
      eventTitle: event.title,
      rating: cleanRating,
      comment: (comment || '').trim(),
      createdAt: new Date().toISOString()
    };

    if (this.isMongo()) {
      await FeedbackModel.create(feedback);
    } else {
      this.store.data.feedbacks.unshift(feedback);
      this.store.save();
    }
    return feedback;
  }

  public async getEventFeedback(eventId: string): Promise<IFeedback[]> {
    this.ensureReady();
    if (this.isMongo()) {
      const docs = await FeedbackModel.find({ eventId })
        .sort({ createdAt: -1 })
        .lean();
      return docs as IFeedback[];
    }
    return this.store.data.feedbacks
      .filter(f => f.eventId === eventId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // =========================================================================
  // 7. REPORTS & CONTENT MODERATION
  // =========================================================================
  public async createReport(data: Partial<IReport>): Promise<IReport> {
    this.ensureReady();
    const report: IReport = {
      _id: generateId('rep'),
      reporterId: data.reporterId || '',
      reporterName: data.reporterName,
      eventId: data.eventId,
      eventTitle: data.eventTitle,
      targetUserId: data.targetUserId,
      targetUserName: data.targetUserName,
      reason: data.reason || 'Policy Violation',
      details: (data.details || '').trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (this.isMongo()) {
      await ReportModel.create(report);
    } else {
      this.store.data.reports.unshift(report);
      this.store.save();
    }
    return report;
  }

  public async getReports(): Promise<IReport[]> {
    this.ensureReady();
    if (this.isMongo()) {
      const docs = await ReportModel.find().sort({ createdAt: -1 }).lean();
      return docs as IReport[];
    }
    return this.store.data.reports;
  }

  public async updateReportStatus(
    id: string,
    status: 'pending' | 'resolved' | 'dismissed',
    adminNotes?: string
  ): Promise<IReport | null> {
    this.ensureReady();
    if (this.isMongo()) {
      const updated = await ReportModel.findByIdAndUpdate(
        id,
        { status, ...(adminNotes ? { adminNotes } : {}) },
        { new: true }
      ).lean();
      return updated as IReport | null;
    }

    const rep = this.store.data.reports.find(r => r._id === id);
    if (!rep) return null;
    rep.status = status;
    if (adminNotes) rep.adminNotes = adminNotes;
    this.store.save();
    return rep;
  }

  // =========================================================================
  // 8. CATEGORIES
  // =========================================================================
  public async getCategories(): Promise<ICategory[]> {
    this.ensureReady();
    let list: ICategory[] = [];
    if (this.isMongo()) {
      list = (await CategoryModel.find({ status: 'active' }).lean()) as ICategory[];
    } else {
      list = this.store.data.categories.filter(c => c.status === 'active');
    }

    return Promise.all(
      list.map(async c => {
        let count = 0;
        if (this.isMongo()) {
          count = await EventModel.countDocuments({
            category: { $regex: new RegExp(`^${c.name}$`, 'i') },
            status: 'published'
          });
        } else {
          count = this.store.data.events.filter(
            e => e.category.toLowerCase() === c.name.toLowerCase() && e.status === 'published'
          ).length;
        }
        return { ...c, eventCount: count };
      })
    );
  }

  public async createCategory(data: Partial<ICategory>): Promise<ICategory> {
    this.ensureReady();
    const newCat: ICategory = {
      _id: generateId('cat'),
      name: (data.name || '').trim(),
      slug: (data.name || '').toLowerCase().trim().replace(/\s+/g, '-'),
      description: (data.description || '').trim(),
      status: 'active',
      iconName: data.iconName || 'Tag',
      color: data.color || '#4F46E5'
    };

    if (this.isMongo()) {
      await CategoryModel.create(newCat);
    } else {
      this.store.data.categories.push(newCat);
      this.store.save();
    }
    return newCat;
  }

  public async updateCategory(id: string, updates: Partial<ICategory>): Promise<ICategory | null> {
    this.ensureReady();
    if (this.isMongo()) {
      const updated = await CategoryModel.findByIdAndUpdate(id, updates, { new: true }).lean();
      return updated as ICategory | null;
    }
    const index = this.store.data.categories.findIndex(c => c._id === id);
    if (index === -1) return null;
    this.store.data.categories[index] = { ...this.store.data.categories[index], ...updates };
    this.store.save();
    return this.store.data.categories[index];
  }

  public async deleteCategory(id: string): Promise<boolean> {
    this.ensureReady();
    if (this.isMongo()) {
      const res = await CategoryModel.findByIdAndDelete(id);
      return Boolean(res);
    }
    const index = this.store.data.categories.findIndex(c => c._id === id);
    if (index === -1) return false;
    this.store.data.categories.splice(index, 1);
    this.store.save();
    return true;
  }

  // =========================================================================
  // 9. ANALYTICS (ORGANIZER & ADMIN)
  // =========================================================================
  public async getOrganizerAnalytics(organizerId: string) {
    this.ensureReady();
    let myEvents: IEvent[] = [];
    if (this.isMongo()) {
      myEvents = (await EventModel.find({ organizerId }).lean()) as IEvent[];
    } else {
      myEvents = this.store.data.events.filter(e => e.organizerId === organizerId);
    }

    const eventIds = myEvents.map(e => e._id);
    let myRegistrations: IRegistration[] = [];

    if (this.isMongo()) {
      myRegistrations = (await RegistrationModel.find({
        eventId: { $in: eventIds }
      }).lean()) as IRegistration[];
    } else {
      myRegistrations = this.store.data.registrations.filter(r => eventIds.includes(r.eventId));
    }

    const confirmedRegs = myRegistrations.filter(r => r.status === 'confirmed');
    const checkedInRegs = myRegistrations.filter(r => r.attendanceStatus === 'checked_in');
    const waitlistedRegs = myRegistrations.filter(r => r.status === 'waitlisted');
    const cancelledRegs = myRegistrations.filter(r => r.status === 'cancelled');

    // Team and payment statistics
    const individualRegs = confirmedRegs.filter(r => r.registrationType !== 'team');
    const teamRegs = confirmedRegs.filter(r => r.registrationType === 'team');
    const totalTeams = teamRegs.length;
    const totalTeamMembers = teamRegs.reduce((acc, r) => acc + (r.teamMembers?.length || 0), 0);

    const paidRegs = confirmedRegs.filter(r => r.paymentDetails?.pricingType === 'paid');
    const freeRegs = confirmedRegs.filter(r => r.paymentDetails?.pricingType !== 'paid');
    const totalRevenue = paidRegs.reduce((acc, r) => acc + (r.paymentDetails?.amount || 0), 0);
    const pendingPayments = myRegistrations.filter(r => r.paymentDetails?.paymentStatus === 'pending').length;
    const failedPayments = myRegistrations.filter(r => r.paymentDetails?.paymentStatus === 'failed').length;

    const totalCapacity = myEvents.reduce((acc, e) => acc + (e.capacity || 0), 0);
    const attendanceRate = confirmedRegs.length > 0
      ? Math.round((checkedInRegs.length / confirmedRegs.length) * 100)
      : 0;
    const capacityUtilization = totalCapacity > 0
      ? Math.round((confirmedRegs.length / totalCapacity) * 100)
      : 0;

    const eventBreakdown = myEvents.map(e => {
      const eRegs = myRegistrations.filter(r => r.eventId === e._id);
      const eConfirmed = eRegs.filter(r => r.status === 'confirmed');
      const eCheckedIn = eRegs.filter(r => r.attendanceStatus === 'checked_in').length;
      const eWaitlist = eRegs.filter(r => r.status === 'waitlisted').length;
      const eIndividual = eConfirmed.filter(r => r.registrationType !== 'team').length;
      const eTeams = eConfirmed.filter(r => r.registrationType === 'team').length;
      const eRevenue = eConfirmed.reduce((acc, r) => acc + (r.paymentDetails?.amount || 0), 0);

      return {
        id: e._id,
        title: e.title,
        category: e.category,
        registrationType: e.teamSettings?.registrationType || 'individual',
        capacity: e.capacity,
        confirmed: eConfirmed.length,
        individualCount: eIndividual,
        teamCount: eTeams,
        revenue: eRevenue,
        checkedIn: eCheckedIn,
        waitlist: eWaitlist,
        attendanceRate: eConfirmed.length > 0 ? Math.round((eCheckedIn / eConfirmed.length) * 100) : 0,
        status: e.status
      };
    });

    const registrationsByDate: { [date: string]: number } = {};
    myRegistrations.forEach(r => {
      const d = r.registeredAt ? r.registeredAt.split('T')[0] : '2026-03-01';
      registrationsByDate[d] = (registrationsByDate[d] || 0) + 1;
    });

    const trendData = Object.keys(registrationsByDate)
      .sort()
      .map(date => ({
        date,
        registrations: registrationsByDate[date]
      }));

    return {
      summary: {
        totalEvents: myEvents.length,
        publishedEvents: myEvents.filter(e => e.status === 'published').length,
        draftEvents: myEvents.filter(e => e.status === 'draft').length,
        totalRegistrations: confirmedRegs.length,
        individualRegistrations: individualRegs.length,
        teamRegistrations: teamRegs.length,
        totalTeams,
        totalTeamMembers,
        paidRegistrations: paidRegs.length,
        freeRegistrations: freeRegs.length,
        totalRevenue,
        pendingPayments,
        failedPayments,
        totalCheckedIn: checkedInRegs.length,
        totalWaitlisted: waitlistedRegs.length,
        totalCancelled: cancelledRegs.length,
        attendanceRate,
        capacityUtilization
      },
      eventBreakdown,
      trendData
    };
  }

  public async getAdminAnalytics() {
    this.ensureReady();
    let totalUsers = 0;
    let attendees = 0;
    let organizers = 0;
    let totalEvents = 0;
    let publishedEvents = 0;
    let totalRegistrations = 0;
    let totalCheckedIn = 0;
    let pendingReports = 0;
    let categoryData: { name: string; count: number }[] = [];
    let allRegistrations: IRegistration[] = [];
    let allEvents: IEvent[] = [];

    if (this.isMongo()) {
      [
        totalUsers,
        attendees,
        organizers,
        totalEvents,
        publishedEvents,
        totalRegistrations,
        totalCheckedIn,
        pendingReports,
        allRegistrations,
        allEvents
      ] = await Promise.all([
        UserModel.countDocuments(),
        UserModel.countDocuments({ role: 'attendee' }),
        UserModel.countDocuments({ role: 'organizer' }),
        EventModel.countDocuments(),
        EventModel.countDocuments({ status: 'published' }),
        RegistrationModel.countDocuments({ status: 'confirmed' }),
        RegistrationModel.countDocuments({ attendanceStatus: 'checked_in' }),
        ReportModel.countDocuments({ status: 'pending' }),
        RegistrationModel.find({ status: 'confirmed' }).lean() as Promise<IRegistration[]>,
        EventModel.find().lean() as Promise<IEvent[]>
      ]);

      const categories = await CategoryModel.find({ status: 'active' }).lean();
      categoryData = await Promise.all(
        categories.map(async c => ({
          name: c.name,
          count: await EventModel.countDocuments({ category: c.name, status: 'published' })
        }))
      );
    } else {
      totalUsers = this.store.data.users.length;
      attendees = this.store.data.users.filter(u => u.role === 'attendee').length;
      organizers = this.store.data.users.filter(u => u.role === 'organizer').length;
      totalEvents = this.store.data.events.length;
      publishedEvents = this.store.data.events.filter(e => e.status === 'published').length;
      totalRegistrations = this.store.data.registrations.filter(r => r.status === 'confirmed').length;
      totalCheckedIn = this.store.data.registrations.filter(r => r.attendanceStatus === 'checked_in').length;
      pendingReports = this.store.data.reports.filter(r => r.status === 'pending').length;
      allRegistrations = this.store.data.registrations.filter(r => r.status === 'confirmed');
      allEvents = this.store.data.events;

      const categoryCounts: { [cat: string]: number } = {};
      this.store.data.events.forEach(e => {
        categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
      });
      categoryData = Object.keys(categoryCounts).map(name => ({
        name,
        count: categoryCounts[name]
      }));
    }

    const teamEventsCount = allEvents.filter(e => e.teamSettings?.registrationType === 'team' || e.teamSettings?.registrationType === 'both').length;
    const freeEventsCount = allEvents.filter(e => e.price === 0 || e.paymentConfig?.pricingType === 'free').length;
    const paidEventsCount = allEvents.filter(e => e.price > 0 || e.paymentConfig?.pricingType === 'paid').length;
    const totalPlatformRevenue = allRegistrations.reduce((acc, r) => acc + (r.paymentDetails?.amount || 0), 0);

    const usersByRole = [
      { name: 'Attendees', count: attendees, fill: '#3B82F6' },
      { name: 'Organizers', count: organizers, fill: '#8B5CF6' },
      { name: 'Admins', count: Math.max(0, totalUsers - (attendees + organizers)), fill: '#10B981' }
    ];

    return {
      summary: {
        totalUsers,
        attendees,
        organizers,
        totalEvents,
        publishedEvents,
        teamEventsCount,
        freeEventsCount,
        paidEventsCount,
        totalRegistrations,
        totalPlatformRevenue,
        totalCheckedIn,
        overallAttendanceRate: totalRegistrations > 0 ? Math.round((totalCheckedIn / totalRegistrations) * 100) : 0,
        pendingReports
      },
      categoryData,
      usersByRole
    };
  }
}

export const dbService = new DbStoreService();

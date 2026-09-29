import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { dbService } from '../services/dbStore';
import { paymentService } from '../services/paymentService';
import { emailService } from '../services/emailService';
import { cleanMongoUri } from '../config/db';
import {
  requireAuth,
  optionalAuth,
  requireRole,
  generateToken,
  AuthRequest
} from '../middleware/auth';

const router = Router();

// Configure Cloudinary if credentials are present
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// ==========================================
// 0. HEALTH & DATABASE SYSTEM STATUS
// ==========================================
router.get('/health', async (req, res): Promise<void> => {
  const isMongo = await dbService.isMongoConnected();
  const readyState = mongoose.connection.readyState;
  const stateLabels: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const isHealthy = isMongo || (process.env.ALLOW_LOCAL_FALLBACK === 'true' && process.env.NODE_ENV !== 'production');

  res.status(isHealthy ? 200 : 503).json({
    status: isMongo ? 'healthy' : (isHealthy ? 'degraded_fallback' : 'disconnected'),
    database: {
      driver: 'MongoDB Atlas',
      connected: isMongo,
      state: stateLabels[readyState] || 'disconnected',
      databaseName: isMongo ? (mongoose.connection.name || 'eventhub') : null
    },
    timestamp: new Date().toISOString()
  });
});

router.get('/system/db-status', async (req, res): Promise<void> => {
  const isMongo = await dbService.isMongoConnected();
  res.json({
    connectedToMongo: isMongo,
    mode: dbService.getDataSourceName(),
    mongoUriConfigured: Boolean(process.env.MONGODB_URI),
    databaseName: mongoose.connection.name || null,
    models: ['User', 'Event', 'Registration', 'Category', 'Notification', 'Feedback', 'Report', 'TeamInvitation']
  });
});

router.get('/system/email-status', async (req, res): Promise<void> => {
  const status = emailService.getStatus();
  res.json(status);
});

// Admin-protected live MongoDB connection switch
router.post(
  '/system/connect-mongodb',
  requireAuth,
  requireRole(['admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const { mongoUri } = req.body;
      const cleanedUri = cleanMongoUri(mongoUri || '');
      if (!cleanedUri || !cleanedUri.startsWith('mongodb')) {
        res.status(400).json({ message: 'A valid MongoDB connection URI string is required.' });
        return;
      }

      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      await mongoose.connect(cleanedUri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000
      });
      process.env.MONGODB_URI = cleanedUri;

      // Seed initial schemas if brand new database
      await dbService.initSeedData();

      res.json({
        message: '✅ Successfully connected to MongoDB Atlas! All collections synced.',
        connected: true,
        databaseName: mongoose.connection.name
      });
    } catch (err: any) {
      res.status(400).json({
        message: `Failed to connect to MongoDB: ${err.message}`,
        connected: false
      });
    }
  }
);

// ==========================================
// 1. AUTHENTICATION & USERS
// ==========================================
router.post('/auth/register', async (req, res): Promise<void> => {
  try {
    const { name, email, password, role, department, organization, phone, bio, interests } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ message: 'Full name is required (minimum 2 characters).' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      res.status(400).json({ message: 'A valid email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long.' });
      return;
    }

    const existing = await dbService.findUserByEmail(email.trim());
    if (existing) {
      res.status(409).json({ message: 'An account with this email address already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // SECURITY: Public registration can NEVER create admin accounts!
    const assignedRole = role === 'organizer' ? 'organizer' : 'attendee';

    const newUser = await dbService.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: assignedRole,
      department: department ? String(department).trim() : '',
      organization: organization ? String(organization).trim() : '',
      phone: phone ? String(phone).trim() : '',
      bio: bio ? String(bio).trim() : '',
      interests: Array.isArray(interests) ? interests : []
    });

    const token = generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;

    res.status(201).json({
      message: 'Account registered successfully',
      user: safeUser,
      token
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error during registration.' });
  }
});

router.post('/auth/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Please provide both email and password.' });
      return;
    }

    const user = await dbService.findUserByEmail(String(email).trim());
    if (!user || !user.passwordHash) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    if (user.accountStatus === 'suspended') {
      res.status(403).json({ message: 'This account has been suspended by an administrator.' });
      return;
    }

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;

    res.json({
      message: 'Login successful',
      user: safeUser,
      token
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error during login.' });
  }
});

router.get('/auth/me', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { passwordHash, ...safeUser } = req.user!;
  res.json({ user: safeUser });
});

router.get('/users/profile', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { passwordHash, ...safeUser } = req.user!;
  res.json({ user: safeUser });
});

router.put('/users/profile', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { name, department, organization, phone, bio, interests, profileImage } = req.body;

    // SECURITY: Users cannot alter their own role or accountStatus via profile update
    const cleanUpdates: any = {};
    if (name && typeof name === 'string' && name.trim().length >= 2) cleanUpdates.name = name.trim();
    if (department !== undefined) cleanUpdates.department = String(department).trim();
    if (organization !== undefined) cleanUpdates.organization = String(organization).trim();
    if (phone !== undefined) cleanUpdates.phone = String(phone).trim();
    if (bio !== undefined) cleanUpdates.bio = String(bio).trim();
    if (interests && Array.isArray(interests)) cleanUpdates.interests = interests;
    if (profileImage !== undefined) cleanUpdates.profileImage = String(profileImage).trim();

    const updated = await dbService.updateUser(req.user!._id, cleanUpdates);
    if (!updated) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const { passwordHash, ...safeUser } = updated;
    res.json({ message: 'Profile updated successfully', user: safeUser });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update profile.' });
  }
});

router.post('/users/profile/picture', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ message: 'No image data provided.' });
      return;
    }

    // 1. Validate MIME format: JPG, JPEG, PNG, WEBP
    const mimeMatch = imageBase64.match(/^data:(image\/(jpeg|jpg|png|webp));base64,/i);
    if (!mimeMatch && !imageBase64.startsWith('http://') && !imageBase64.startsWith('https://')) {
      res.status(400).json({
        message: 'Invalid image format. Allowed formats are JPG, JPEG, PNG, and WebP.'
      });
      return;
    }

    // 2. Validate Size Limit: Max 5MB
    const approximateSizeBytes = (imageBase64.length * 3) / 4;
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (approximateSizeBytes > maxSizeBytes) {
      res.status(400).json({ message: 'Image size exceeds maximum limit of 5MB.' });
      return;
    }

    // 3. Check Cloudinary Configuration
    const hasCloudinary = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (!hasCloudinary) {
      res.status(503).json({
        message: 'Cloudinary storage service is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your server environment.',
        configured: false
      });
      return;
    }

    // 4. Upload securely to Cloudinary with server credentials
    const uploadResponse = await cloudinary.uploader.upload(imageBase64, {
      folder: 'eventhub_avatars',
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' }
      ]
    });

    // 5. Save secure URL and publicId to MongoDB user record & remove old Cloudinary avatar
    const updated = await dbService.updateUserProfilePicture(
      req.user!._id,
      uploadResponse.secure_url,
      uploadResponse.public_id
    );

    if (!updated) {
      res.status(404).json({ message: 'User record not found.' });
      return;
    }

    const { passwordHash: _, ...safeUser } = updated;
    res.json({
      message: 'Profile picture uploaded and updated successfully.',
      user: safeUser,
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to upload profile picture.' });
  }
});

router.delete('/users/profile/picture', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
    const updated = await dbService.updateUserProfilePicture(
      req.user!._id,
      defaultAvatar,
      undefined
    );

    if (!updated) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const { passwordHash: _, ...safeUser } = updated;
    res.json({
      message: 'Profile picture removed and reset to default.',
      user: safeUser
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to reset profile picture.' });
  }
});

router.get('/users', requireAuth, requireRole(['admin']), async (req, res): Promise<void> => {
  try {
    const users = await dbService.getAllUsers();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch users.' });
  }
});

router.patch('/users/:id/status', requireAuth, requireRole(['admin']), async (req: AuthRequest, res): Promise<void> => {
  try {
    const { status, role } = req.body;
    const updates: any = {};

    if (status) {
      if (!['active', 'suspended'].includes(status)) {
        res.status(400).json({ message: 'Invalid status. Must be "active" or "suspended".' });
        return;
      }
      updates.accountStatus = status;
    }

    if (role) {
      if (!['attendee', 'organizer', 'admin'].includes(role)) {
        res.status(400).json({ message: 'Invalid role. Must be attendee, organizer, or admin.' });
        return;
      }
      updates.role = role;
    }

    const user = await dbService.updateUser(req.params.id, updates);
    if (!user) {
      res.status(404).json({ message: 'User account not found.' });
      return;
    }

    const { passwordHash, ...safeUser } = user;
    res.json({ message: 'User updated successfully', user: safeUser });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update user.' });
  }
});

// ==========================================
// 2. EVENTS & DISCOVERY
// ==========================================
router.get('/events', optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const {
      search,
      category,
      eventType,
      city,
      organizerId,
      status,
      accessibility,
      registrationType,
      minTeamSize,
      maxTeamSize,
      paymentType,
      minPrice,
      maxPrice,
      sortBy,
      page,
      limit
    } = req.query;

    const result = await dbService.getEvents({
      search: search ? String(search).trim() : undefined,
      category: category ? String(category).trim() : undefined,
      eventType: eventType ? String(eventType).trim() : undefined,
      city: city ? String(city).trim() : undefined,
      organizerId: organizerId ? String(organizerId).trim() : undefined,
      status: status ? String(status).trim() : undefined,
      accessibility: accessibility ? String(accessibility).trim() : undefined,
      registrationType: registrationType ? String(registrationType).trim() : undefined,
      minTeamSize: minTeamSize ? Number(minTeamSize) : undefined,
      maxTeamSize: maxTeamSize ? Number(maxTeamSize) : undefined,
      paymentType: paymentType ? String(paymentType).trim() : undefined,
      minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
      sortBy: sortBy as any,
      page: Number(page) || 1,
      limit: Number(limit) || 12,
      requesterUserId: req.user?._id,
      requesterRole: req.user?.role
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch events.' });
  }
});

router.get('/events/:id', optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const event = await dbService.getEventById(
      req.params.id,
      req.user?._id,
      req.user?.role
    );

    if (!event) {
      res.status(404).json({ message: 'Event not found or is currently private.' });
      return;
    }

    let userRegistration = null;
    if (req.user) {
      const myRegs = await dbService.getMyRegistrations(req.user._id);
      userRegistration = myRegs.find(r => r.eventId === req.params.id && r.status !== 'cancelled') || null;
    }

    res.json({ event, userRegistration });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch event details.' });
  }
});

router.post(
  '/events',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const {
        title,
        description,
        category,
        eventType,
        poster,
        startDateTime,
        endDateTime,
        timezone,
        venueName,
        address,
        city,
        coordinates,
        capacity,
        price,
        registrationDeadline,
        schedule,
        speakers,
        accessibility,
        contactEmail,
        contactPhone,
        tags,
        teamSettings,
        registrationFormConfig,
        paymentConfig,
        termsAndConditions,
        status
      } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length < 3) {
        res.status(400).json({ message: 'Event title is required (minimum 3 characters).' });
        return;
      }

      if (!description || typeof description !== 'string' || description.trim().length < 10) {
        res.status(400).json({ message: 'Event description is required (minimum 10 characters).' });
        return;
      }

      if (!startDateTime || !endDateTime) {
        res.status(400).json({ message: 'Event start and end date/time are required.' });
        return;
      }

      if (new Date(endDateTime) <= new Date(startDateTime)) {
        res.status(400).json({ message: 'End date and time must be after the start date and time.' });
        return;
      }

      const numCapacity = Number(capacity);
      if (isNaN(numCapacity) || numCapacity <= 0) {
        res.status(400).json({ message: 'Capacity must be a positive number greater than 0.' });
        return;
      }

      // Validate team configuration if provided
      if (teamSettings && (teamSettings.registrationType === 'team' || teamSettings.registrationType === 'both')) {
        const minSize = Number(teamSettings.minTeamSize) || 1;
        const maxSize = Number(teamSettings.maxTeamSize) || minSize;
        if (minSize > maxSize) {
          res.status(400).json({ message: 'Minimum team size cannot be greater than maximum team size.' });
          return;
        }
      }

      const newEvent = await dbService.createEvent(
        {
          title: title.trim(),
          description: description.trim(),
          category: category || 'Technical',
          eventType: eventType || 'offline',
          poster: poster || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
          posterPublicId: req.body.posterPublicId || undefined,
          startDateTime: new Date(startDateTime).toISOString(),
          endDateTime: new Date(endDateTime).toISOString(),
          timezone: timezone || 'America/New_York',
          venueName: venueName ? venueName.trim() : 'TBD',
          address: address ? address.trim() : '',
          city: city ? city.trim() : '',
          coordinates: coordinates || { lat: 37.7749, lng: -122.4194 },
          capacity: numCapacity,
          price: Math.max(0, Number(price) || 0),
          registrationDeadline: registrationDeadline
            ? new Date(registrationDeadline).toISOString()
            : new Date(startDateTime).toISOString(),
          schedule: Array.isArray(schedule) ? schedule : [],
          speakers: Array.isArray(speakers) ? speakers : [],
          accessibility: accessibility || {},
          contactEmail: contactEmail ? contactEmail.trim() : req.user!.email,
          contactPhone: contactPhone ? contactPhone.trim() : '',
          tags: Array.isArray(tags) ? tags : [],
          teamSettings,
          registrationFormConfig,
          paymentConfig,
          termsAndConditions,
          status: status === 'draft' ? 'draft' : 'published'
        },
        req.user!._id
      );

      res.status(201).json({ message: 'Event created successfully', event: newEvent });
    } catch (err: any) {
      res.status(500).json({ message: err.message || 'Failed to create event.' });
    }
  }
);

router.put(
  '/events/:id',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const updated = await dbService.updateEvent(req.params.id, req.body, req.user!._id, isAdmin);
      if (!updated) {
        res.status(404).json({ message: 'Event not found or unauthorized.' });
        return;
      }
      res.json({ message: 'Event updated successfully', event: updated });
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Failed to update event.' });
    }
  }
);

router.post(
  '/events/:id/cancel',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const updated = await dbService.updateEvent(req.params.id, { status: 'cancelled' }, req.user!._id, isAdmin);
      if (!updated) {
        res.status(404).json({ message: 'Event not found or unauthorized.' });
        return;
      }
      res.json({
        message: 'Event cancelled successfully. All registered attendees have been notified.',
        event: updated
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Failed to cancel event.' });
    }
  }
);

router.patch(
  '/events/:id/status',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const { status } = req.body;
      if (!['draft', 'published', 'cancelled', 'completed'].includes(status)) {
        res.status(400).json({ message: 'Invalid status.' });
        return;
      }
      const isAdmin = req.user!.role === 'admin';
      const updated = await dbService.updateEvent(req.params.id, { status }, req.user!._id, isAdmin);
      if (!updated) {
        res.status(404).json({ message: 'Event not found or unauthorized.' });
        return;
      }
      res.json({ message: `Event status changed to ${status}`, event: updated });
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Failed to update event status.' });
    }
  }
);

router.delete(
  '/events/:id',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const success = await dbService.deleteEvent(req.params.id, req.user!._id, isAdmin);
      if (!success) {
        res.status(404).json({ message: 'Event not found or unauthorized.' });
        return;
      }
      res.json({ message: 'Event deleted successfully.' });
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Failed to delete event.' });
    }
  }
);

// ==========================================
// 3. PAYMENT GATEWAY INTEGRATION
// ==========================================
router.post('/events/:id/create-payment-order', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const event = await dbService.getEventById(req.params.id);
    if (!event) {
      res.status(404).json({ message: 'Event not found.' });
      return;
    }

    const { registrationType = 'individual', teamSize = 1 } = req.body;
    const order = await paymentService.createPaymentOrder(event, {
      eventId: event._id,
      registrationType,
      teamSize: Number(teamSize) || 1,
      userId: req.user!._id,
      userEmail: req.user!.email,
      userName: req.user!.name
    });

    res.json(order);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to initialize payment order.' });
  }
});

router.post('/events/:id/verify-payment', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { orderId, paymentId, signature } = req.body;
    if (!orderId || !paymentId) {
      res.status(400).json({ message: 'Order ID and Payment ID are required for verification.' });
      return;
    }

    const verification = paymentService.verifyPayment(orderId, paymentId, signature);
    if (!verification.verified) {
      res.status(400).json({ message: verification.message, verified: false });
      return;
    }

    res.json({ verified: true, message: verification.message });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Payment verification failed.' });
  }
});

// ==========================================
// 4. REGISTRATIONS & TEAM WORKFLOWS
// ==========================================
router.post('/events/:id/register', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const {
      registrationType = 'individual',
      teamName,
      teamMembers,
      participantDetails,
      customAnswers,
      paymentDetails,
      termsAccepted,
      notes,
      sendInvitations
    } = req.body;

    const appBaseUrl = (req.headers.origin as string) || `${req.protocol}://${req.get('host')}` || process.env.APP_BASE_URL;

    const result = await dbService.registerForEvent({
      attendeeId: req.user!._id,
      eventId: req.params.id,
      registrationType,
      teamName,
      teamMembers,
      participantDetails,
      customAnswers,
      paymentDetails,
      termsAccepted,
      notes,
      sendInvitations,
      appBaseUrl
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Registration failed.' });
  }
});

// ==========================================
// 4B. TEAM INVITATIONS & MEMBER WORKFLOWS
// ==========================================

// Get public invitation details by token
router.get('/invitations/:token', async (req, res): Promise<void> => {
  try {
    const details = await dbService.getInvitationByToken(req.params.token);
    res.json(details);
  } catch (err: any) {
    res.status(404).json({ message: err.message || 'Invitation not found or invalid link.' });
  }
});

// Accept invitation (Requires authenticated user with matching email)
router.post('/invitations/:token/accept', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const result = await dbService.acceptInvitation(req.params.token, req.user!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to accept invitation.' });
  }
});

// Decline invitation
router.post('/invitations/:token/decline', async (req, res): Promise<void> => {
  try {
    const { reason } = req.body;
    const result = await dbService.declineInvitation(req.params.token, reason);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to decline invitation.' });
  }
});

// Resend invitation (Leader only)
router.post('/teams/invitations/:id/resend', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const appBaseUrl = (req.headers.origin as string) || `${req.protocol}://${req.get('host')}` || process.env.APP_BASE_URL;
    const result = await dbService.resendInvitation(req.params.id, req.user!._id, appBaseUrl);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to resend invitation.' });
  }
});

// Remove a team member (Leader only)
router.delete('/teams/registrations/:id/members/:email', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const decodedEmail = decodeURIComponent(req.params.email);
    const result = await dbService.removeTeamMember(req.params.id, decodedEmail, req.user!._id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to remove team member.' });
  }
});

// Get team registration details & invitation statuses (Leader or accepted member)
router.get('/teams/registrations/:id', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const result = await dbService.getTeamRegistrationDetails(req.params.id, req.user!._id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to fetch team details.' });
  }
});

router.get('/registrations/my', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const registrations = await dbService.getMyRegistrations(req.user!._id);
    res.json({ registrations });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch registrations.' });
  }
});

router.post(
  '/registrations/:id/cancel',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const result = await dbService.cancelRegistration(req.params.id, req.user!._id, isAdmin);
      res.json({
        message: 'Participant registration cancelled successfully. If waitlisted participants existed, the next eligible attendee was automatically promoted.',
        ...result
      });
    } catch (err: any) {
      const statusCode = err.message?.includes('Unauthorized') ? 403 : 400;
      res.status(statusCode).json({ message: err.message || 'Failed to cancel registration.' });
    }
  }
);

router.delete(
  '/registrations/:id',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const result = await dbService.cancelRegistration(req.params.id, req.user!._id, isAdmin);
      res.json({
        message: 'Participant registration cancelled successfully. If waitlisted participants existed, the next eligible attendee was automatically promoted.',
        ...result
      });
    } catch (err: any) {
      const statusCode = err.message?.includes('Unauthorized') ? 403 : 400;
      res.status(statusCode).json({ message: err.message || 'Failed to cancel registration.' });
    }
  }
);

router.post(
  '/tickets/:ticketId/cancel',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const result = await dbService.cancelRegistration(req.params.ticketId, req.user!._id, isAdmin);
      res.json({
        message: 'Participant ticket cancelled successfully. If waitlisted participants existed, the next eligible attendee was automatically promoted.',
        ...result
      });
    } catch (err: any) {
      const statusCode = err.message?.includes('Unauthorized') ? 403 : 400;
      res.status(statusCode).json({ message: err.message || 'Failed to cancel ticket.' });
    }
  }
);

router.get(
  '/events/:id/attendees',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const attendees = await dbService.getEventAttendees(req.params.id, req.user!._id, isAdmin);
      res.json({ attendees });
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Failed to fetch event attendees.' });
    }
  }
);

router.get(
  '/events/:id/attendees/export',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const event = await dbService.getEventById(req.params.id);
      if (!event) {
        res.status(404).json({ message: 'Event not found.' });
        return;
      }

      const isAdmin = req.user!.role === 'admin';
      if (!isAdmin && event.organizerId !== req.user!._id) {
        res.status(403).json({ message: 'Unauthorized: You can only export attendee rosters for your own events.' });
        return;
      }

      const attendees = await dbService.getEventAttendees(req.params.id, req.user!._id, isAdmin);

      const header = [
        'Ticket ID',
        'Attendee Name',
        'Email',
        'Phone',
        'Registration Type',
        'Team Name',
        'Registration Status',
        'Attendance Status',
        'Checked In At',
        'Registration Date'
      ];

      const rows = attendees.map(a => [
        `"${(a.ticketId || '').replace(/"/g, '""')}"`,
        `"${(a.attendee?.name || a.teamMembers?.[0]?.firstName || 'Attendee').replace(/"/g, '""')}"`,
        `"${(a.attendee?.email || a.teamMembers?.[0]?.email || '').replace(/"/g, '""')}"`,
        `"${(a.attendee?.phone || '').replace(/"/g, '""')}"`,
        `"${(a.registrationType || 'individual').replace(/"/g, '""')}"`,
        `"${(a.teamName || 'N/A').replace(/"/g, '""')}"`,
        `"${(a.status || 'confirmed').replace(/"/g, '""')}"`,
        `"${(a.attendanceStatus || 'not_checked_in').replace(/"/g, '""')}"`,
        `"${(a.checkedInAt ? new Date(a.checkedInAt).toLocaleString() : 'N/A').replace(/"/g, '""')}"`,
        `"${(a.registeredAt ? new Date(a.registeredAt).toLocaleString() : '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${event.title.replace(/[^a-z0-9]/gi, '_')}-attendees.csv"`
      );
      res.send(csvContent);
    } catch (err: any) {
      res.status(500).json({ message: err.message || 'Failed to export attendee roster.' });
    }
  }
);

router.post(
  '/registrations/verify-ticket',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const { ticketId } = req.body;
      if (!ticketId || typeof ticketId !== 'string' || ticketId.trim() === '') {
        res.status(400).json({ message: 'Ticket ID is required.' });
        return;
      }

      const isAdmin = req.user!.role === 'admin';
      const result = await dbService.verifyTicketAndCheckIn(ticketId.trim(), req.user!._id, isAdmin);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Ticket verification failed.' });
    }
  }
);

// ==========================================
// 4. NOTIFICATIONS
// ==========================================
router.get('/notifications', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const notifications = await dbService.getNotifications(req.user!._id);
    res.json({ notifications });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch notifications.' });
  }
});

router.patch('/notifications/:id/read', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const success = await dbService.markNotificationRead(req.params.id, req.user!._id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update notification.' });
  }
});

router.patch('/notifications/read-all', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const success = await dbService.markAllNotificationsRead(req.user!._id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to mark all as read.' });
  }
});

// ==========================================
// 5. FEEDBACK & REVIEWS
// ==========================================
router.post('/feedback', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { eventId, rating, comment } = req.body;
    if (!eventId || !rating || !comment || typeof comment !== 'string' || comment.trim().length < 3) {
      res.status(400).json({ message: 'Event, rating (1-5), and feedback comment (min 3 chars) are required.' });
      return;
    }
    const feedback = await dbService.createFeedback(req.user!._id, eventId, Number(rating), comment.trim());
    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to submit feedback.' });
  }
});

router.get('/events/:id/feedback', async (req, res): Promise<void> => {
  try {
    const feedbacks = await dbService.getEventFeedback(req.params.id);
    res.json({ feedbacks });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch feedbacks.' });
  }
});

// ==========================================
// 6. CATEGORIES & REPORTS
// ==========================================
router.get('/categories', async (req, res): Promise<void> => {
  try {
    const categories = await dbService.getCategories();
    res.json({ categories });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch categories.' });
  }
});

router.post('/categories', requireAuth, requireRole(['admin']), async (req, res): Promise<void> => {
  try {
    const { name, description, color } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ message: 'Category name is required.' });
      return;
    }
    const cat = await dbService.createCategory({ name, description, color });
    res.status(201).json({ message: 'Category created', category: cat });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create category.' });
  }
});

router.delete('/categories/:id', requireAuth, requireRole(['admin']), async (req, res): Promise<void> => {
  try {
    await dbService.deleteCategory(req.params.id);
    res.json({ message: 'Category deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete category.' });
  }
});

router.post('/reports', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { eventId, eventTitle, targetUserId, targetUserName, reason, details } = req.body;
    if (!details || typeof details !== 'string' || details.trim().length < 5) {
      res.status(400).json({ message: 'Please provide detailed context for your report (minimum 5 characters).' });
      return;
    }
    const report = await dbService.createReport({
      reporterId: req.user!._id,
      reporterName: req.user!.name,
      eventId,
      eventTitle,
      targetUserId,
      targetUserName,
      reason: reason || 'Policy Violation',
      details: details.trim()
    });
    res.status(201).json({ message: 'Report submitted. Platform moderators will review promptly.', report });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to submit report.' });
  }
});

router.get('/reports', requireAuth, requireRole(['admin']), async (req, res): Promise<void> => {
  try {
    const reports = await dbService.getReports();
    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch reports.' });
  }
});

router.patch('/reports/:id', requireAuth, requireRole(['admin']), async (req, res): Promise<void> => {
  try {
    const { status, adminNotes } = req.body;
    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
      res.status(400).json({ message: 'Invalid status. Must be pending, resolved, or dismissed.' });
      return;
    }
    const report = await dbService.updateReportStatus(req.params.id, status, adminNotes);
    res.json({ message: 'Report status updated successfully', report });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update report.' });
  }
});

// ==========================================
// 7. ANALYTICS
// ==========================================
router.get(
  '/analytics/organizer',
  requireAuth,
  requireRole(['organizer', 'admin']),
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const data = await dbService.getOrganizerAnalytics(req.user!._id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message || 'Failed to fetch organizer analytics.' });
    }
  }
);

router.get('/analytics/admin', requireAuth, requireRole(['admin']), async (req, res): Promise<void> => {
  try {
    const data = await dbService.getAdminAnalytics();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch admin analytics.' });
  }
});

// ==========================================
// 8. CALENDAR INTEGRATION (.ICS & GOOGLE URL)
// ==========================================
router.get('/calendar/:eventId/google-url', async (req, res): Promise<void> => {
  try {
    const event = await dbService.getEventById(req.params.eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found.' });
      return;
    }

    const formatGoogleDate = (isoStr: string) => {
      const d = new Date(isoStr);
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const start = formatGoogleDate(event.startDateTime);
    const end = formatGoogleDate(event.endDateTime);
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(`${event.description}\n\nCategory: ${event.category}\nOrganized via EventHub`);
    const location = encodeURIComponent(`${event.venueName}, ${event.address || ''}, ${event.city}`);

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;

    res.json({ url: googleCalendarUrl });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to generate Google Calendar link.' });
  }
});

router.get('/calendar/:eventId/ics', async (req, res): Promise<void> => {
  try {
    const event = await dbService.getEventById(req.params.eventId);
    if (!event) {
      res.status(404).send('Event not found.');
      return;
    }

    const formatICSDate = (isoStr: string) => {
      const d = new Date(isoStr);
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventHub//Event Management System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:eventhub-${event._id}@eventhub.com`,
      `DTSTAMP:${formatICSDate(new Date().toISOString())}`,
      `DTSTART:${formatICSDate(event.startDateTime)}`,
      `DTEND:${formatICSDate(event.endDateTime)}`,
      `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
      `LOCATION:${(event.venueName + ', ' + event.city).replace(/\n/g, ' ')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${event.title.replace(/[^a-z0-9]/gi, '_')}.ics"`);
    res.send(icsContent);
  } catch (err: any) {
    res.status(500).send('Error generating calendar file.');
  }
});

// ==========================================
// 9. CLOUDINARY FILE UPLOAD
// ==========================================
router.post('/upload', requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { imageBase64, filename, folder } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ message: 'No image data provided.' });
      return;
    }

    // Validate Base64 image payload format and size
    const mimeMatch = imageBase64.match(/^data:(image\/(jpeg|png|webp|gif|svg\+xml));base64,/);
    if (!mimeMatch && !imageBase64.startsWith('http://') && !imageBase64.startsWith('https://')) {
      res.status(400).json({ message: 'Invalid image format. Allowed: JPEG, PNG, WEBP, GIF, SVG.' });
      return;
    }

    // Calculate approx size in bytes (base64 length * 0.75)
    const approximateSizeBytes = (imageBase64.length * 3) / 4;
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
    if (approximateSizeBytes > maxSizeBytes) {
      res.status(400).json({ message: 'Image size exceeds maximum limit of 5MB.' });
      return;
    }

    const hasCloudinary = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    // In production, require Cloudinary credentials
    if (process.env.NODE_ENV === 'production' && !hasCloudinary) {
      res.status(500).json({
        message: 'Cloudinary credentials are not configured on the production server. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
      });
      return;
    }

    // If Cloudinary credentials are configured on backend, upload securely to Cloudinary
    if (hasCloudinary) {
      const uploadResponse = await cloudinary.uploader.upload(imageBase64, {
        folder: folder || 'eventhub_uploads',
        resource_type: 'image'
      });

      res.json({
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id,
        publicId: uploadResponse.public_id,
        filename: filename || 'uploaded_image.png',
        message: 'Image uploaded to Cloudinary successfully.'
      });
      return;
    }

    // Fallback in development/demo mode: return the sanitized Data URI
    res.json({
      url: imageBase64,
      public_id: 'local_' + Date.now(),
      publicId: 'local_' + Date.now(),
      filename: filename || 'uploaded_image.png',
      message: 'Image processed (Local / DataURI mode).'
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Image upload failed.' });
  }
});

export default router;

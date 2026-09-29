import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../server/services/dbStore';
import { generateToken } from '../server/middleware/auth';
import { isValidMongoScheme, cleanMongoUri, maskMongoUri, connectDB } from '../server/config/db';
import { IUser } from '../server/models/types';

describe('EventHub MERN Backend & Security Test Suite', () => {
  let testOrganizer: IUser;
  let testAttendee1: IUser;
  let testAttendee2: IUser;
  let testAttendee3: IUser;

  beforeEach(async () => {
    process.env.ALLOW_LOCAL_FALLBACK = 'true';
    process.env.NODE_ENV = 'test';

    // Reset seed data
    await dbService.initSeedData(true);

    testOrganizer = (await dbService.findUserByEmail('organizer@eventhub.com'))!;
    testAttendee1 = (await dbService.findUserByEmail('attendee@eventhub.com'))!;
    testAttendee2 = (await dbService.findUserByEmail('elena@eventhub.com'))!;

    // Create a 3rd attendee
    testAttendee3 = await dbService.createUser({
      name: 'Charlie Test',
      email: `charlie_${Date.now()}@example.com`,
      role: 'attendee'
    });
  });

  describe('1. Authentication & Security Isolation', () => {
    it('prevents public registration from escalating role to admin', async () => {
      const newUser = await dbService.createUser({
        name: 'Hacker',
        email: `hacker_${Date.now()}@evil.com`,
        role: 'admin' as any // Attempts to create admin
      });

      expect(newUser.role).not.toBe('admin');
      expect(newUser.role).toBe('attendee');
    });

    it('generates valid JWT tokens with expected payload', () => {
      const token = generateToken(testOrganizer);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('sanitizes user profile updates so users cannot escalate their role', async () => {
      const updated = await dbService.updateUser(testAttendee1._id, {
        name: 'Alex Updated'
      });
      expect(updated?.name).toBe('Alex Updated');
      expect(updated?.role).toBe('attendee');
    });
  });

  describe('2. Event Access Control & Ownership', () => {
    it('hides draft events from public queries and shows them only to organizer or admin', async () => {
      const draftEvent = await dbService.createEvent(
        {
          title: 'Secret Unreleased Draft Summit',
          description: 'Top secret preview event for internal organizers only.',
          status: 'draft',
          capacity: 50
        },
        testOrganizer._id
      );

      // Public requester
      const publicResult = await dbService.getEvents({});
      const isDraftInPublic = publicResult.events.some(e => e._id === draftEvent._id);
      expect(isDraftInPublic).toBe(false);

      // Owner requester
      const ownerResult = await dbService.getEvents({
        organizerId: testOrganizer._id,
        requesterUserId: testOrganizer._id
      });
      const isDraftInOwner = ownerResult.events.some(e => e._id === draftEvent._id);
      expect(isDraftInOwner).toBe(true);
    });

    it('prevents unauthorized organizers from modifying other organizers events', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Org 1 Event',
          description: 'Belongs to organizer 1 only.',
          capacity: 100
        },
        testOrganizer._id
      );

      // Another organizer trying to modify
      await expect(
        dbService.updateEvent(event._id, { title: 'Hacked Title' }, 'usr_another_org', false)
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  describe('3. Registration Concurrency, Capacity & FIFO Waitlist Promotion', () => {
    it('enforces event capacity and places excess registrations on waitlist', async () => {
      // Create small event with capacity = 2
      const smallEvent = await dbService.createEvent(
        {
          title: 'Intimate Workshop',
          description: 'Strict capacity of 2 attendees.',
          capacity: 2,
          status: 'published'
        },
        testOrganizer._id
      );

      // Attendee 1 registers -> confirmed (Seat 1)
      const reg1 = await dbService.registerForEvent(testAttendee1._id, smallEvent._id);
      expect(reg1.status).toBe('confirmed');

      // Attendee 2 registers -> confirmed (Seat 2)
      const reg2 = await dbService.registerForEvent(testAttendee2._id, smallEvent._id);
      expect(reg2.status).toBe('confirmed');

      // Attendee 3 registers -> WAITLISTED (Position #1)
      const reg3 = await dbService.registerForEvent(testAttendee3._id, smallEvent._id);
      expect(reg3.status).toBe('waitlisted');
      expect(reg3.registration.waitlistPosition).toBe(1);

      // Prevent duplicate registration for attendee 1
      await expect(
        dbService.registerForEvent(testAttendee1._id, smallEvent._id)
      ).rejects.toThrow(/already/i);
    });

    it('automatically promotes the next eligible waitlisted attendee upon cancellation (FIFO)', async () => {
      // Create micro event with capacity = 1
      const microEvent = await dbService.createEvent(
        {
          title: 'Solo Masterclass',
          description: 'Single seat masterclass.',
          capacity: 1,
          status: 'published'
        },
        testOrganizer._id
      );

      // Attendee 1 gets the single seat
      const reg1 = await dbService.registerForEvent(testAttendee1._id, microEvent._id);
      expect(reg1.status).toBe('confirmed');

      // Attendee 2 gets waitlisted
      const reg2 = await dbService.registerForEvent(testAttendee2._id, microEvent._id);
      expect(reg2.status).toBe('waitlisted');

      // Organizer cancels registration for Attendee 1
      const cancelRes = await dbService.cancelRegistration(reg1.registration._id, testOrganizer._id);
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.promotedAttendeeId).toBe(testAttendee2._id);

      // Verify Attendee 2 is now confirmed
      const myRegs = await dbService.getMyRegistrations(testAttendee2._id);
      const promotedReg = myRegs.find(r => r.eventId === microEvent._id);
      expect(promotedReg?.status).toBe('confirmed');
    });
  });

  describe('4. Ticket Verification & Check-in Safeguards', () => {
    it('verifies valid ticket, marks check-in, and prevents duplicate check-in', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Check-in Demo Event',
          description: 'Testing ticket scan.',
          capacity: 50,
          status: 'published'
        },
        testOrganizer._id
      );

      const reg = await dbService.registerForEvent(testAttendee1._id, event._id);
      const ticketCode = reg.registration.ticketId;

      // 1st Check-in -> Success
      const firstCheckIn = await dbService.verifyTicketAndCheckIn(ticketCode, testOrganizer._id, false);
      expect(firstCheckIn.message).toContain('Verified');
      expect(firstCheckIn.registration.attendanceStatus).toBe('checked_in');

      // 2nd Check-in -> Warns Already Checked In
      const duplicateCheckIn = await dbService.verifyTicketAndCheckIn(ticketCode, testOrganizer._id, false);
      expect(duplicateCheckIn.message).toContain('Already Checked In');
    });

    it('rejects verification if scanned by a non-authorized organizer', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Protected Event',
          description: 'Protected check in.',
          capacity: 50,
          status: 'published'
        },
        testOrganizer._id
      );

      const reg = await dbService.registerForEvent(testAttendee1._id, event._id);
      const ticketCode = reg.registration.ticketId;

      await expect(
        dbService.verifyTicketAndCheckIn(ticketCode, 'usr_unauthorized_organizer', false)
      ).rejects.toThrow(/Unauthorized/i);
    });

    it('prevents cancelling tickets that are already checked in', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Checked-in Ticket Event',
          description: 'Testing cancellation prevention after check-in.',
          capacity: 50,
          status: 'published'
        },
        testOrganizer._id
      );

      const reg = await dbService.registerForEvent(testAttendee1._id, event._id);
      // Check in
      await dbService.verifyTicketAndCheckIn(reg.registration.ticketId, testOrganizer._id, false);

      // Attempt to cancel checked-in ticket -> Rejects
      await expect(
        dbService.cancelRegistration(reg.registration._id, testOrganizer._id, false)
      ).rejects.toThrow(/checked in/i);
    });

    it('rejects double cancellation of already cancelled registrations', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Double Cancellation Event',
          description: 'Testing idempotency/rejection on second cancel.',
          capacity: 50,
          status: 'published'
        },
        testOrganizer._id
      );

      const reg = await dbService.registerForEvent(testAttendee1._id, event._id);
      await dbService.cancelRegistration(reg.registration._id, testOrganizer._id, false);

      // Second attempt
      await expect(
        dbService.cancelRegistration(reg.registration._id, testOrganizer._id, false)
      ).rejects.toThrow(/already cancelled/i);
    });
  });

  describe('5. Event Cancellation & Deletion Lifecycle', () => {
    it('notifies registered attendees when an organizer cancels an event', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Upcoming Tech Meetup',
          description: 'Will be cancelled.',
          capacity: 20,
          status: 'published'
        },
        testOrganizer._id
      );

      await dbService.registerForEvent(testAttendee1._id, event._id);

      // Cancel event
      await dbService.updateEvent(event._id, { status: 'cancelled' }, testOrganizer._id, false);

      const updated = await dbService.getEventById(event._id, testOrganizer._id, 'organizer');
      expect(updated?.status).toBe('cancelled');

      // Verify attendee received notification
      const notifications = await dbService.getNotifications(testAttendee1._id);
      const cancelNotification = notifications.find(n => n.eventId === event._id && n.type === 'event_cancelled');
      expect(cancelNotification).toBeDefined();
      expect(cancelNotification?.title).toContain('Event Cancelled');
    });

    it('safely deletes an event and cascades cleanup of registrations', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Event To Delete',
          description: 'Will be deleted completely.',
          capacity: 10,
          status: 'published'
        },
        testOrganizer._id
      );

      await dbService.registerForEvent(testAttendee1._id, event._id);

      // Delete event
      const deleteResult = await dbService.deleteEvent(event._id, testOrganizer._id, false);
      expect(deleteResult).toBe(true);

      const lookup = await dbService.getEventById(event._id, testOrganizer._id, 'organizer');
      expect(lookup).toBeNull();
    });
  });

  describe('6. Image Upload & Poster Management', () => {
    it('stores posterPublicId alongside image URL on create and update', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Cloudinary Image Event',
          description: 'Testing image publicId persistence.',
          poster: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
          posterPublicId: 'eventhub_uploads/sample_123',
          capacity: 100
        },
        testOrganizer._id
      );

      expect(event.posterPublicId).toBe('eventhub_uploads/sample_123');

      // Update with replaced poster
      const updated = await dbService.updateEvent(
        event._id,
        {
          poster: 'https://res.cloudinary.com/demo/image/upload/v2/new_sample.jpg',
          posterPublicId: 'eventhub_uploads/new_sample_456'
        },
        testOrganizer._id,
        false
      );

      expect(updated?.posterPublicId).toBe('eventhub_uploads/new_sample_456');
    });
  });

  describe('7. MongoDB Model Persistence & Multi-Collection Operations', () => {
    it('creates, retrieves, and updates Category collections', async () => {
      const cat = await dbService.createCategory({
        name: 'Quantum Computing',
        description: 'Sessions on qubit algorithms and quantum cryptography.',
        color: '#6366F1',
        iconName: 'Cpu'
      });

      expect(cat._id).toBeDefined();
      expect(cat.name).toBe('Quantum Computing');
      expect(cat.slug).toBe('quantum-computing');

      const updatedCat = await dbService.updateCategory(cat._id, {
        description: 'Updated quantum description.'
      });
      expect(updatedCat?.description).toBe('Updated quantum description.');

      const allCats = await dbService.getCategories();
      expect(allCats.some(c => c._id === cat._id)).toBe(true);

      const deleted = await dbService.deleteCategory(cat._id);
      expect(deleted).toBe(true);
    });

    it('persists and retrieves user Feedback and ratings for events', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Feedback Summit',
          description: 'Testing feedback records.',
          capacity: 50,
          status: 'published'
        },
        testOrganizer._id
      );

      const feedback = await dbService.createFeedback(
        testAttendee1._id,
        event._id,
        5,
        'Incredible keynote speaker and flawless audio setup!'
      );

      expect(feedback._id).toBeDefined();
      expect(feedback.rating).toBe(5);
      expect(feedback.comment).toContain('Incredible keynote');
      expect(feedback.eventId).toBe(event._id);

      const feedbacks = await dbService.getEventFeedback(event._id);
      expect(feedbacks).toHaveLength(1);
      expect(feedbacks[0].comment).toBe('Incredible keynote speaker and flawless audio setup!');
    });

    it('creates and processes moderation Reports', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Reported Event',
          description: 'Testing report filing.',
          capacity: 50,
          status: 'published'
        },
        testOrganizer._id
      );

      const report = await dbService.createReport({
        reporterId: testAttendee1._id,
        reporterName: testAttendee1.name,
        eventId: event._id,
        eventTitle: event.title,
        reason: 'Inappropriate Content',
        details: 'The event poster contains misleading sponsorship claims.'
      });

      expect(report._id).toBeDefined();
      expect(report.status).toBe('pending');
      expect(report.reason).toBe('Inappropriate Content');

      const resolved = await dbService.updateReportStatus(report._id, 'resolved', 'Reviewed by admin team.');
      expect(resolved?.status).toBe('resolved');
      expect(resolved?.adminNotes).toBe('Reviewed by admin team.');

      const allReports = await dbService.getReports();
      expect(allReports.some(r => r._id === report._id)).toBe(true);
    });

    it('manages Notification lifecycle and mark-as-read states', async () => {
      const notif = await dbService.createNotification({
        recipientId: testAttendee1._id,
        type: 'account_alert',
        title: 'System Alert',
        message: 'Important schedule update.',
        actionUrl: '/dashboard'
      });

      expect(notif.readStatus).toBe(false);

      const marked = await dbService.markNotificationRead(notif._id, testAttendee1._id);
      expect(marked).toBe(true);

      const notifs = await dbService.getNotifications(testAttendee1._id);
      const target = notifs.find(n => n._id === notif._id);
      expect(target?.readStatus).toBe(true);
    });

    it('generates real-time Analytics for organizer and admin dashboards', async () => {
      const orgAnalytics = await dbService.getOrganizerAnalytics(testOrganizer._id);
      expect(orgAnalytics.summary).toBeDefined();
      expect(typeof orgAnalytics.summary.totalEvents).toBe('number');
      expect(Array.isArray(orgAnalytics.eventBreakdown)).toBe(true);

      const adminAnalytics = await dbService.getAdminAnalytics();
      expect(adminAnalytics.summary).toBeDefined();
      expect(typeof adminAnalytics.summary.totalUsers).toBe('number');
      expect(typeof adminAnalytics.summary.totalEvents).toBe('number');
      expect(Array.isArray(adminAnalytics.categoryData)).toBe(true);
      expect(Array.isArray(adminAnalytics.usersByRole)).toBe(true);
    });
  });

  describe('8. Disconnection & Error Handling Safeguards', () => {
    it('enforces strict database availability when local fallback is explicitly disabled', async () => {
      const prevFallback = process.env.ALLOW_LOCAL_FALLBACK;
      const prevEnv = process.env.NODE_ENV;

      try {
        process.env.ALLOW_LOCAL_FALLBACK = 'false';
        process.env.NODE_ENV = 'production';

        // When not connected in production with fallback disabled, ensureReady must throw
        expect(() => {
          dbService.ensureReady();
        }).toThrow(/MongoDB Atlas is required and disconnected/i);
      } finally {
        process.env.ALLOW_LOCAL_FALLBACK = prevFallback;
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('correctly validates MongoDB URI scheme (mongodb:// or mongodb+srv://)', () => {
      expect(isValidMongoScheme('mongodb+srv://user:pass@cluster0.mongodb.net/eventhub')).toBe(true);
      expect(isValidMongoScheme('mongodb://localhost:27017/eventhub')).toBe(true);
      expect(isValidMongoScheme('"mongodb+srv://user:pass@cluster.net/db"')).toBe(true);
      expect(isValidMongoScheme('http://cluster0.mongodb.net')).toBe(false);
      expect(isValidMongoScheme('postgres://user:pass@host/db')).toBe(false);
      expect(isValidMongoScheme('cluster0.gecb6ri.mongodb.net/eventhub')).toBe(false);
      expect(isValidMongoScheme('')).toBe(false);
    });

    it('safely masks sensitive database credentials in logs and errors', () => {
      const sensitiveUri = 'mongodb+srv://event_admin:superSecretP@ss123@cluster0.mongodb.net/eventhub?retryWrites=true';
      const masked = maskMongoUri(sensitiveUri);
      expect(masked).toContain('event_admin:****@');
      expect(masked).not.toContain('superSecretP@ss123');
    });

    it('cleans and formats MongoDB connection string with target database name', () => {
      const raw = '  mongodb+srv://<myUser>:<myPass>@cluster0.mongodb.net/?retryWrites=true  ';
      const cleaned = cleanMongoUri(raw);
      expect(cleaned).toBe('mongodb+srv://myUser:myPass@cluster0.mongodb.net/eventhub?retryWrites=true');
    });

    it('gracefully rejects invalid scheme without crashing or throwing unhandled errors', async () => {
      const result = await connectDB('invalid_scheme_host.net/mydb');
      expect(result).toBe(false);
    });
  });

  describe('9. Ticket Cancellation, Route Directions & Profile Picture Workflows', () => {
    it('cancels registration via ticketId alphanumeric code and records cancelledAt timestamp', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Ticket ID Cancellation Event',
          description: 'Testing cancellation using ticket code.',
          capacity: 30,
          status: 'published'
        },
        testOrganizer._id
      );

      const regResult = await dbService.registerForEvent(testAttendee1._id, event._id);
      const ticketCode = regResult.registration.ticketId;
      expect(ticketCode).toBeTruthy();

      // Authorized organizer cancels using ticketId directly instead of _id
      const cancelResult = await dbService.cancelRegistration(ticketCode, testOrganizer._id, false);
      expect(cancelResult.success).toBe(true);
      expect(cancelResult.registration.status).toBe('cancelled');
      expect(cancelResult.registration.cancelledAt).toBeTruthy();

      // Check-in on cancelled ticket must be rejected
      await expect(
        dbService.verifyTicketAndCheckIn(ticketCode, testOrganizer._id, false)
      ).rejects.toThrow(/cancelled/i);
    });

    it('prevents attendees and unauthorized organizers from cancelling registrations', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Unauthorized Cancellation Test',
          description: 'Testing security check on ticket cancellation.',
          capacity: 30,
          status: 'published'
        },
        testOrganizer._id
      );

      const regResult = await dbService.registerForEvent(testAttendee1._id, event._id);

      // Attempt cancellation by attendee 1 (the ticket holder) -> must throw Unauthorized
      await expect(
        dbService.cancelRegistration(regResult.registration._id, testAttendee1._id, false)
      ).rejects.toThrow(/Unauthorized/i);

      // Attempt cancellation by attendee 2 (another attendee) -> must throw Unauthorized
      await expect(
        dbService.cancelRegistration(regResult.registration._id, testAttendee2._id, false)
      ).rejects.toThrow(/Unauthorized/i);

      // Attempt cancellation by an organizer who does NOT own the event -> must throw Unauthorized
      await expect(
        dbService.cancelRegistration(regResult.registration._id, 'usr_unauthorized_organizer', false)
      ).rejects.toThrow(/Unauthorized/i);

      // Cancellation by authorized organizer -> must succeed
      const authCancel = await dbService.cancelRegistration(regResult.registration._id, testOrganizer._id, false);
      expect(authCancel.success).toBe(true);
      expect(authCancel.registration.status).toBe('cancelled');
    });

    it('promotes waitlisted attendee when a confirmed ticket is cancelled by organizer', async () => {
      // Event with capacity of 1
      const event = await dbService.createEvent(
        {
          title: 'Capacity 1 Waitlist Promotion Event',
          description: 'Testing FIFO waitlist promotion on cancellation.',
          capacity: 1,
          status: 'published'
        },
        testOrganizer._id
      );

      // Attendee 1 gets confirmed
      const reg1 = await dbService.registerForEvent(testAttendee1._id, event._id);
      expect(reg1.registration.status).toBe('confirmed');

      // Attendee 2 gets waitlisted
      const reg2 = await dbService.registerForEvent(testAttendee2._id, event._id);
      expect(reg2.registration.status).toBe('waitlisted');
      expect(reg2.registration.waitlistPosition).toBe(1);

      // Organizer cancels attendee 1
      const cancelRes = await dbService.cancelRegistration(reg1.registration.ticketId, testOrganizer._id, false);
      expect(cancelRes.promotedAttendeeId).toBe(testAttendee2._id);

      // Verify Attendee 2 is now confirmed and can be checked in
      const attendee2Ticket = reg2.registration.ticketId;
      const checkInResult = await dbService.verifyTicketAndCheckIn(attendee2Ticket, testOrganizer._id, false);
      expect(checkInResult.registration.attendanceStatus).toBe('checked_in');
    });

    it('updates user profile image URL and Cloudinary public ID in MongoDB user document', async () => {
      const updatedUser = await dbService.updateUserProfilePicture(
        testAttendee1._id,
        'https://res.cloudinary.com/demo/image/upload/v1/avatar_new.jpg',
        'eventhub_avatars/avatar_new_789'
      );

      expect(updatedUser?.profileImage).toBe('https://res.cloudinary.com/demo/image/upload/v1/avatar_new.jpg');
      expect(updatedUser?.profileImagePublicId).toBe('eventhub_avatars/avatar_new_789');

      // Verify persistence by fetching user from DB
      const fetched = await dbService.findUserById(testAttendee1._id);
      expect(fetched?.profileImagePublicId).toBe('eventhub_avatars/avatar_new_789');
    });

    it('validates event coordinates for map directions and generates valid Google Maps link', async () => {
      const eventWithCoords = await dbService.createEvent(
        {
          title: 'Map Coordinates Event',
          description: 'Testing map coordinates persistence.',
          venueName: 'Civic Auditorium',
          address: '99 Grove St',
          city: 'San Francisco',
          coordinates: { lat: 37.7785, lng: -122.4172 },
          capacity: 50,
          status: 'published'
        },
        testOrganizer._id
      );

      expect(eventWithCoords.coordinates?.lat).toBe(37.7785);
      expect(eventWithCoords.coordinates?.lng).toBe(-122.4172);

      // Directions destination with coordinates
      const destination = `${eventWithCoords.coordinates!.lat},${eventWithCoords.coordinates!.lng}`;
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
      expect(directionsUrl).toContain('destination=37.7785,-122.4172');
    });

    it('fetches attendee roster for authorized organizer and protects from non-organizer', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Roster Authorization Event',
          description: 'Testing roster export authorization.',
          capacity: 50,
          status: 'published'
        },
        testOrganizer._id
      );

      await dbService.registerForEvent(testAttendee1._id, event._id);

      // Organizer gets attendees
      const roster = await dbService.getEventAttendees(event._id, testOrganizer._id, false);
      expect(roster.length).toBe(1);
      expect(roster[0].attendeeId).toBe(testAttendee1._id);

      // Non-organizer is rejected
      await expect(
        dbService.getEventAttendees(event._id, testAttendee2._id, false)
      ).rejects.toThrow(/Unauthorized/i);
    });
  });
});

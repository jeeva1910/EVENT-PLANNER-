import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dbService } from '../server/services/dbStore';
import { emailService } from '../server/services/emailService';
import { IUser, IEvent } from '../server/models/types';

describe('Organizer Dashboard Event Management: Cancel & Delete Test Suite', () => {
  let organizerA: IUser;
  let organizerB: IUser;
  let attendee1: IUser;
  let attendee2: IUser;

  beforeEach(async () => {
    process.env.ALLOW_LOCAL_FALLBACK = 'true';
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_SIMULATE = 'true';

    await dbService.initSeedData(true);

    organizerA = (await dbService.findUserByEmail('organizer@eventhub.com'))!;
    attendee1 = (await dbService.findUserByEmail('attendee@eventhub.com'))!;
    attendee2 = (await dbService.findUserByEmail('elena@eventhub.com'))!;

    // Create a second organizer for ownership isolation tests
    const existingOrgB = await dbService.findUserByEmail('organizer_b@eventhub.com');
    if (existingOrgB) {
      organizerB = existingOrgB;
    } else {
      organizerB = await dbService.createUser({
        name: 'Organizer B',
        email: `organizer_b@eventhub.com`,
        role: 'organizer',
        organization: 'Apex Beta Labs'
      });
    }
  });

  describe('1. Cancel Event Functionality & Persistence', () => {
    it('allows an organizer to cancel their own event and updates status to cancelled', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Event to Cancel',
          description: 'A test event that will be cancelled by its creator.',
          capacity: 50,
          status: 'published'
        },
        organizerA._id
      );

      const cancelResult = await dbService.cancelEvent(
        event._id,
        organizerA._id,
        false,
        'Venue maintenance scheduled unexpectedly.'
      );

      expect(cancelResult.event).toBeDefined();
      expect(cancelResult.event.status).toBe('cancelled');

      // Verify persistence in database
      const fetched = await dbService.getEventById(event._id, organizerA._id);
      expect(fetched).not.toBeNull();
      expect(fetched?.status).toBe('cancelled');
    });

    it('preserves existing registration records when an event is cancelled', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Preserved Registrations Event',
          description: 'Testing that attendee history remains intact when event is cancelled.',
          capacity: 25,
          status: 'published'
        },
        organizerA._id
      );

      // Register attendees
      const reg1 = await dbService.registerForEvent({
        attendeeId: attendee1._id,
        eventId: event._id,
        participantDetails: {
          firstName: 'Alice',
          lastName: 'Smith',
          email: attendee1.email
        }
      });
      expect(reg1.status).toBe('confirmed');

      const reg2 = await dbService.registerForEvent({
        attendeeId: attendee2._id,
        eventId: event._id,
        participantDetails: {
          firstName: 'Elena',
          lastName: 'Rostova',
          email: attendee2.email
        }
      });
      expect(reg2.status).toBe('confirmed');

      // Cancel event
      await dbService.cancelEvent(event._id, organizerA._id, false);

      // Registrations must remain in database for organizer reporting and history
      const attendees = await dbService.getEventAttendees(event._id, organizerA._id, false);
      expect(Array.isArray(attendees)).toBe(true);
      expect(attendees.length).toBeGreaterThanOrEqual(2);
      expect(attendees.map(a => a.attendeeId)).toContain(attendee1._id);
      expect(attendees.map(a => a.attendeeId)).toContain(attendee2._id);
    });

    it('strictly prevents new registrations on cancelled events', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Closed Registration Cancelled Event',
          description: 'Testing registration rejection.',
          capacity: 10,
          status: 'published'
        },
        organizerA._id
      );

      // Cancel the event
      await dbService.cancelEvent(event._id, organizerA._id, false);

      // Attempt to register a new participant
      await expect(
        dbService.registerForEvent({
          attendeeId: attendee1._id,
          eventId: event._id,
          participantDetails: {
            firstName: 'Late',
            lastName: 'Registrant',
            email: attendee1.email
          }
        })
      ).rejects.toThrow(/cancelled/i);
    });

    it('triggers cancellation notification emails to all registered attendees', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Notification Trigger Event',
          description: 'Verifying that emailService is invoked upon event cancellation.',
          capacity: 20,
          status: 'published'
        },
        organizerA._id
      );

      // Register an attendee
      await dbService.registerForEvent({
        attendeeId: attendee1._id,
        eventId: event._id,
        participantDetails: {
          firstName: 'Alex',
          lastName: 'Attendee',
          email: 'alex.attendee@example.com'
        }
      });

      // Spy on sendEventCancelledNotification
      const emailSpy = vi.spyOn(emailService, 'sendEventCancelledNotification');

      const result = await dbService.cancelEvent(
        event._id,
        organizerA._id,
        false,
        'Inclement weather conditions.'
      );

      expect(emailSpy).toHaveBeenCalled();
      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'alex.attendee@example.com',
          eventTitle: 'Notification Trigger Event',
          reason: 'Inclement weather conditions.'
        })
      );
      expect(result.notifiedCount).toBeGreaterThanOrEqual(1);

      emailSpy.mockRestore();
    });
  });

  describe('2. Delete Event Functionality & Persistence', () => {
    it('allows an organizer to delete their own event and permanently removes it from database', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Event to Delete',
          description: 'Event that should be permanently removed.',
          capacity: 15,
          status: 'published'
        },
        organizerA._id
      );

      // Delete the event
      const deleted = await dbService.deleteEvent(event._id, organizerA._id, false);
      expect(deleted).toBe(true);

      // Fetching event by ID should return null
      const fetched = await dbService.getEventById(event._id, organizerA._id, 'organizer');
      expect(fetched).toBeNull();
    });

    it('removes associated registrations and notifications upon permanent event deletion', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Cascading Delete Event',
          description: 'Verifying cleanup on permanent deletion.',
          capacity: 30,
          status: 'published'
        },
        organizerA._id
      );

      // Register attendee
      await dbService.registerForEvent({
        attendeeId: attendee1._id,
        eventId: event._id,
        participantDetails: {
          firstName: 'Attendee',
          email: attendee1.email
        }
      });

      // Delete the event
      const success = await dbService.deleteEvent(event._id, organizerA._id, false);
      expect(success).toBe(true);

      // Associated event attendees query should now throw Event not found because event is deleted
      await expect(
        dbService.getEventAttendees(event._id, organizerA._id, false)
      ).rejects.toThrow(/Event not found/i);
    });
  });

  describe('3. Security & Ownership Isolation Enforcements', () => {
    it('strictly prevents Organizer B from cancelling an event owned by Organizer A', async () => {
      const eventA = await dbService.createEvent(
        {
          title: 'Organizer A Private Event',
          description: 'Only Organizer A has authority over this event.',
          capacity: 40,
          status: 'published'
        },
        organizerA._id
      );

      // Organizer B tries to cancel Organizer A's event
      await expect(
        dbService.cancelEvent(eventA._id, organizerB._id, false)
      ).rejects.toThrow(/Unauthorized/i);

      // Event status should remain published
      const checkEvent = await dbService.getEventById(eventA._id, organizerA._id);
      expect(checkEvent?.status).toBe('published');
    });

    it('strictly prevents Organizer B from deleting an event owned by Organizer A', async () => {
      const eventA = await dbService.createEvent(
        {
          title: 'Organizer A Protected Event',
          description: 'Only Organizer A can delete this event.',
          capacity: 25,
          status: 'published'
        },
        organizerA._id
      );

      // Organizer B tries to delete Organizer A's event
      await expect(
        dbService.deleteEvent(eventA._id, organizerB._id, false)
      ).rejects.toThrow(/Unauthorized/i);

      // Event should still exist in database
      const checkEvent = await dbService.getEventById(eventA._id, organizerA._id);
      expect(checkEvent).not.toBeNull();
    });

    it('allows an administrator to cancel or delete an event regardless of owner', async () => {
      const adminUser = (await dbService.findUserByEmail('admin@eventhub.com'))!;

      const event = await dbService.createEvent(
        {
          title: 'Admin Moderation Event',
          description: 'Testing admin cancellation override authority.',
          capacity: 10,
          status: 'published'
        },
        organizerA._id
      );

      // Admin cancels event
      const cancelRes = await dbService.cancelEvent(event._id, adminUser._id, true);
      expect(cancelRes.event.status).toBe('cancelled');

      // Admin deletes event
      const deleteRes = await dbService.deleteEvent(event._id, adminUser._id, true);
      expect(deleteRes).toBe(true);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../server/services/dbStore';
import { IUser } from '../server/models/types';

describe('Attendee Cancellation Removal & Organizer Cancellation Authority Test Suite', () => {
  let organizer1: IUser;
  let organizer2: IUser;
  let attendee1: IUser;
  let attendee2: IUser;
  let adminUser: IUser;

  beforeEach(async () => {
    process.env.ALLOW_LOCAL_FALLBACK = 'true';
    process.env.NODE_ENV = 'test';

    await dbService.initSeedData(true);

    organizer1 = (await dbService.findUserByEmail('organizer@eventhub.com'))!;
    attendee1 = (await dbService.findUserByEmail('attendee@eventhub.com'))!;
    attendee2 = (await dbService.findUserByEmail('elena@eventhub.com'))!;
    adminUser = (await dbService.findUserByEmail('admin@eventhub.com'))!;

    // Create a second organizer who does NOT own organizer1's events
    organizer2 = await dbService.createUser({
      name: 'Second Organizer',
      email: `organizer2_${Date.now()}@eventhub.com`,
      role: 'organizer'
    });
  });

  describe('1. Attendee Self-Cancellation Blocking', () => {
    it('strictly forbids attendees from cancelling their own registration', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Attendee Cancellation Protection Test',
          description: 'Ensuring attendees cannot self-cancel.',
          capacity: 25,
          status: 'published'
        },
        organizer1._id
      );

      const reg = await dbService.registerForEvent(attendee1._id, event._id);
      expect(reg.status).toBe('confirmed');

      // Attempt cancellation as attendee (ticket holder)
      await expect(
        dbService.cancelRegistration(reg.registration._id, attendee1._id, false)
      ).rejects.toThrow(/Unauthorized: Only authorized event organizers or administrators/i);

      // Verify registration remains confirmed and active in store
      const myRegs = await dbService.getMyRegistrations(attendee1._id);
      const unchangedReg = myRegs.find(r => r._id === reg.registration._id);
      expect(unchangedReg?.status).toBe('confirmed');
      expect(unchangedReg?.cancelledAt).toBeFalsy();
    });

    it('strictly forbids attendees from cancelling via ticket alphanumeric code', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Ticket Code Attendee Cancel Test',
          description: 'Ensuring ticket code cancel is also blocked for attendees.',
          capacity: 10,
          status: 'published'
        },
        organizer1._id
      );

      const reg = await dbService.registerForEvent(attendee1._id, event._id);
      const ticketCode = reg.registration.ticketId;

      await expect(
        dbService.cancelRegistration(ticketCode, attendee1._id, false)
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  describe('2. Organizer-Authorized Participant Cancellation', () => {
    it('allows event owner organizer to cancel a participant registration and records timestamp', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Organizer Managed Event',
          description: 'Organizer cancels participant registration.',
          capacity: 20,
          status: 'published'
        },
        organizer1._id
      );

      const reg = await dbService.registerForEvent(attendee1._id, event._id);
      const regId = reg.registration._id;

      // Authorized organizer cancels participant registration
      const result = await dbService.cancelRegistration(regId, organizer1._id, false);
      expect(result.success).toBe(true);
      expect(result.registration.status).toBe('cancelled');
      expect(result.registration.cancelledAt).toBeDefined();

      // Verify record is preserved in the database (not deleted)
      const myRegs = await dbService.getMyRegistrations(attendee1._id);
      const preservedRecord = myRegs.find(r => r._id === regId);
      expect(preservedRecord).toBeDefined();
      expect(preservedRecord?.status).toBe('cancelled');
      expect(preservedRecord?.cancelledAt).toBeDefined();
    });

    it('allows administrator to cancel a registration across any event', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Admin Oversight Event',
          description: 'Admin cancels participant registration.',
          capacity: 20,
          status: 'published'
        },
        organizer1._id
      );

      const reg = await dbService.registerForEvent(attendee1._id, event._id);
      const result = await dbService.cancelRegistration(reg.registration._id, adminUser._id, true);
      expect(result.success).toBe(true);
      expect(result.registration.status).toBe('cancelled');
    });

    it('sends cancellation notification to attendee when organizer cancels their registration', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Notification Verification Event',
          description: 'Verifying notification dispatch.',
          capacity: 20,
          status: 'published'
        },
        organizer1._id
      );

      const reg = await dbService.registerForEvent(attendee1._id, event._id);
      await dbService.cancelRegistration(reg.registration._id, organizer1._id, false);

      const notifications = await dbService.getNotifications(attendee1._id);
      const cancelNotification = notifications.find(
        n => n.type === 'registration_cancelled' && n.eventId === event._id
      );

      expect(cancelNotification).toBeDefined();
      expect(cancelNotification?.title).toContain('Organizer');
      expect(cancelNotification?.message).toContain('cancelled by the event organizer');
    });
  });

  describe('3. Cross-Organizer Security Isolation', () => {
    it('prevents an organizer from cancelling registrations for an event owned by another organizer', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Organizer 1 Event',
          description: 'Protected from Organizer 2.',
          capacity: 15,
          status: 'published'
        },
        organizer1._id
      );

      const reg = await dbService.registerForEvent(attendee1._id, event._id);

      // Organizer 2 attempts to cancel participant from Organizer 1's event
      await expect(
        dbService.cancelRegistration(reg.registration._id, organizer2._id, false)
      ).rejects.toThrow(/Unauthorized: Only authorized event organizers or administrators/i);

      // Verify registration remains untouched
      const myRegs = await dbService.getMyRegistrations(attendee1._id);
      const stillActive = myRegs.find(r => r._id === reg.registration._id);
      expect(stillActive?.status).toBe('confirmed');
    });
  });

  describe('4. Capacity, Waitlist & Venue Check-In Integrity', () => {
    it('auto-promotes the first waitlisted participant when organizer cancels a confirmed registration', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Single-Seat Summit',
          description: 'Capacity 1 to verify FIFO queue promotion.',
          capacity: 1,
          status: 'published'
        },
        organizer1._id
      );

      // Attendee 1 takes the 1 slot
      const reg1 = await dbService.registerForEvent(attendee1._id, event._id);
      expect(reg1.registration.status).toBe('confirmed');

      // Attendee 2 is placed on the waitlist
      const reg2 = await dbService.registerForEvent(attendee2._id, event._id);
      expect(reg2.registration.status).toBe('waitlisted');
      expect(reg2.registration.waitlistPosition).toBe(1);

      // Organizer 1 cancels attendee 1's registration
      const cancelRes = await dbService.cancelRegistration(reg1.registration._id, organizer1._id, false);
      expect(cancelRes.promotedAttendeeId).toBe(attendee2._id);

      // Verify Attendee 2 has been automatically promoted to confirmed
      const attendee2Regs = await dbService.getMyRegistrations(attendee2._id);
      const promotedReg = attendee2Regs.find(r => r.eventId === event._id);
      expect(promotedReg?.status).toBe('confirmed');
      expect(promotedReg?.waitlistPosition).toBeFalsy();

      // Promoted attendee ticket must now verify and check in successfully
      const checkInResult = await dbService.verifyTicketAndCheckIn(
        promotedReg!.ticketId,
        organizer1._id,
        false
      );
      expect(checkInResult.registration.attendanceStatus).toBe('checked_in');
    });

    it('rejects venue entrance check-in on cancelled registrations', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Check-In Rejection Test',
          description: 'Testing entrance block on cancelled ticket.',
          capacity: 10,
          status: 'published'
        },
        organizer1._id
      );

      const reg = await dbService.registerForEvent(attendee1._id, event._id);
      const ticketId = reg.registration.ticketId;

      // Organizer cancels ticket
      await dbService.cancelRegistration(ticketId, organizer1._id, false);

      // Check-in scan attempt must fail
      await expect(
        dbService.verifyTicketAndCheckIn(ticketId, organizer1._id, false)
      ).rejects.toThrow(/cancelled and cannot be used for venue check-in/i);
    });

    it('does not falsely claim a paid registration has been refunded without gateway confirmation', async () => {
      const event = await dbService.createEvent(
        {
          title: 'Paid Conference',
          description: 'Paid event cancellation review.',
          capacity: 50,
          status: 'published',
          price: 999
        },
        organizer1._id
      );

      // Register with paid details
      const reg = await dbService.registerForEvent({
        attendeeId: attendee1._id,
        eventId: event._id,
        paymentDetails: {
          pricingType: 'paid',
          amount: 999,
          currency: 'INR',
          feeType: 'per_participant',
          orderId: 'ORD_TEST_123',
          paymentId: 'TXN_TEST_123',
          paymentStatus: 'completed'
        }
      });

      const result = await dbService.cancelRegistration(reg.registration._id, organizer1._id, false);
      expect(result.refundStatus).toBe('manual_review_required');
      expect(result.refundMessage).toContain('subject to organizer review and payment gateway terms');
      expect(result.refundStatus).not.toBe('refunded');
    });
  });
});

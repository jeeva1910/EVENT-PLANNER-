import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../server/services/dbStore';
import { IUser, IEvent, IRegistration } from '../server/models/types';

describe('Ticket Navigation & Camera Scanner Test Suite', () => {
  let organizer: IUser;
  let attendee: IUser;
  let unauthorizedOrganizer: IUser;
  let event: IEvent;
  let confirmedReg: IRegistration;

  beforeEach(async () => {
    process.env.ALLOW_LOCAL_FALLBACK = 'true';
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_SIMULATE = 'true';
    await dbService.initSeedData(true);

    organizer = (await dbService.findUserByEmail('organizer@eventhub.com'))!;
    attendee = (await dbService.findUserByEmail('attendee@eventhub.com'))!;

    const existingOtherOrg = await dbService.findUserByEmail('other_org@eventhub.com');
    if (existingOtherOrg) {
      unauthorizedOrganizer = existingOtherOrg;
    } else {
      unauthorizedOrganizer = await dbService.createUser({
        name: 'Other Organizer',
        email: 'other_org@eventhub.com',
        role: 'organizer',
        organization: 'Other Org'
      });
    }

    event = (await dbService.getEventById('evt_001_ai_summit'))!;
    const regs = await dbService.getEventAttendees(event._id, organizer._id, false);
    confirmedReg = regs.find((r) => r.status === 'confirmed')!;
  });

  describe('1. Ticket Page Data Retrieval & Permissions', () => {
    it('retrieves ticket details by ticketId with populated event and attendee details for ticket owner', async () => {
      const result = await dbService.getRegistrationByTicketId(
        confirmedReg.ticketId,
        confirmedReg.attendeeId,
        false
      );

      expect(result).not.toBeNull();
      expect(result?.registration.ticketId).toBe(confirmedReg.ticketId);
      expect(result?.event._id).toBe(event._id);
      expect(result?.registration.attendee?.name).toBeDefined();
    });

    it('allows event owner organizer and admin to retrieve ticket details', async () => {
      const orgResult = await dbService.getRegistrationByTicketId(
        confirmedReg.ticketId,
        organizer._id,
        false
      );
      expect(orgResult).not.toBeNull();

      const adminResult = await dbService.getRegistrationByTicketId(
        confirmedReg.ticketId,
        undefined,
        true // isAdmin
      );
      expect(adminResult).not.toBeNull();
    });

    it('rejects unauthorized users from retrieving private ticket details of another attendee', async () => {
      await expect(
        dbService.getRegistrationByTicketId(
          confirmedReg.ticketId,
          'usr_unauthorized_stranger',
          false
        )
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  describe('2. Live Ticket Verification & Check-In Workflow', () => {
    it('successfully verifies and checks in attendee with valid ticket code', async () => {
      // Create fresh user
      const freshAttendee = await dbService.createUser({
        name: 'Fresh Attendee',
        email: `fresh_att_${Date.now()}@eventhub.com`,
        role: 'attendee'
      });

      const resReg = await dbService.registerForEvent({
        eventId: event._id,
        attendeeId: freshAttendee._id,
        registrationType: 'individual'
      });

      const res = await dbService.verifyTicketAndCheckIn(resReg.registration.ticketId, organizer._id, false);
      expect(res.message).toMatch(/Verified: Check-in confirmed/i);
      expect(res.registration.attendanceStatus).toBe('checked_in');
      expect(res.registration.checkedInAt).toBeDefined();
    });

    it('gracefully handles duplicate scans of the same ticket with informative already checked in status', async () => {
      const freshAttendee2 = await dbService.createUser({
        name: 'Fresh Attendee 2',
        email: `fresh_att2_${Date.now()}@eventhub.com`,
        role: 'attendee'
      });

      const resReg = await dbService.registerForEvent({
        eventId: event._id,
        attendeeId: freshAttendee2._id,
        registrationType: 'individual'
      });

      // First scan
      await dbService.verifyTicketAndCheckIn(resReg.registration.ticketId, organizer._id, false);

      // Second scan
      const secondScan = await dbService.verifyTicketAndCheckIn(resReg.registration.ticketId, organizer._id, false);
      expect(secondScan.message).toMatch(/Already Checked In/i);
    });

    it('strictly prevents unauthorized organizers from checking in attendees of events they do not own', async () => {
      await expect(
        dbService.verifyTicketAndCheckIn(
          confirmedReg.ticketId,
          unauthorizedOrganizer._id,
          false
        )
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  describe('3. QR Code Extraction Logic', () => {
    function extractTicketId(scannedText: string): string {
      const trimmed = scannedText.trim();
      if (!trimmed) return '';
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && parsed.ticketId) {
          return String(parsed.ticketId).trim();
        }
      } catch {}
      const urlMatch = trimmed.match(/\/tickets\/([A-Za-z0-9_-]+)/i);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1].trim();
      }
      return trimmed;
    }

    it('extracts ticketId from structured JSON QR payloads', () => {
      const jsonPayload = JSON.stringify({
        ticketId: 'EH-TKT-998877',
        eventId: 'evt_001_ai_summit',
        attendeeId: 'usr_123'
      });
      expect(extractTicketId(jsonPayload)).toBe('EH-TKT-998877');
    });

    it('extracts ticketId from deep link URL payloads', () => {
      const urlPayload = 'https://eventhub.app/tickets/EH-TKT-554433';
      expect(extractTicketId(urlPayload)).toBe('EH-TKT-554433');
    });

    it('extracts ticketId from plain alphanumeric code', () => {
      expect(extractTicketId('EH-TKT-112233')).toBe('EH-TKT-112233');
      expect(extractTicketId('  EH-TKT-112233  ')).toBe('EH-TKT-112233');
    });
  });
});

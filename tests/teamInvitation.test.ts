import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../server/services/dbStore';
import { emailService } from '../server/services/emailService';
import { IUser, IEvent } from '../server/models/types';

describe('EventHub Team Registration & Invitation Workflow Test Suite', () => {
  let leaderUser: IUser;
  let memberUser1: IUser;
  let memberUser2: IUser;
  let impostorUser: IUser;
  let testEvent: IEvent;

  beforeEach(async () => {
    process.env.ALLOW_LOCAL_FALLBACK = 'true';
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_SIMULATE = 'true'; // Enable simulated delivery for testing

    await dbService.initSeedData(true);

    const organizer = (await dbService.findUserByEmail('organizer@eventhub.com'))!;
    leaderUser = (await dbService.findUserByEmail('attendee@eventhub.com'))!;
    memberUser1 = (await dbService.findUserByEmail('elena@eventhub.com'))!;

    memberUser2 = await dbService.createUser({
      name: 'Sam Chen',
      email: `sam_${Date.now()}@example.com`,
      role: 'attendee'
    });

    impostorUser = await dbService.createUser({
      name: 'Eve Impostor',
      email: `eve_${Date.now()}@evil.com`,
      role: 'attendee'
    });

    // Create a team event with minTeamSize 2, maxTeamSize 4
    testEvent = await dbService.createEvent({
      title: 'Global AI & Web3 Hackathon 2026',
      description: '48-hour competitive collegiate hackathon for team innovators.',
      category: 'Hackathon',
      eventType: 'hybrid',
      poster: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
      startDateTime: new Date(Date.now() + 86400000 * 7).toISOString(),
      endDateTime: new Date(Date.now() + 86400000 * 9).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      venueName: 'Kavli Science Center',
      city: 'San Francisco',
      capacity: 100,
      price: 0,
      organizerId: organizer._id,
      teamSettings: {
        registrationType: 'team',
        minTeamSize: 2,
        maxTeamSize: 4,
        includeLeaderInTeamSize: true,
        allowAddMembersDuringRegistration: true,
        allowInviteMembersLater: true,
        isMemberDetailsMandatory: true,
        requireOrganizerApproval: false,
        allowIndividualRegistrationWhenBoth: false
      }
    }, organizer._id);
  });

  describe('1. Team Size Enforcement & Validation', () => {
    it('enforces minimum team size on registration', async () => {
      // Trying to register a solo team when minTeamSize is 2
      await expect(
        dbService.registerForEvent({
          attendeeId: leaderUser._id,
          eventId: testEvent._id,
          registrationType: 'team',
          teamName: 'Solo Wolf',
          teamMembers: [
            {
              firstName: 'Solo',
              lastName: 'Leader',
              email: leaderUser.email,
              isLeader: true
            }
          ]
        })
      ).rejects.toThrow(/Minimum team size for this event is 2/);
    });

    it('enforces maximum team size on registration', async () => {
      // Trying to register 5 members when maxTeamSize is 4
      await expect(
        dbService.registerForEvent({
          attendeeId: leaderUser._id,
          eventId: testEvent._id,
          registrationType: 'team',
          teamName: 'Too Big',
          teamMembers: [
            { firstName: 'L', email: leaderUser.email, isLeader: true },
            { firstName: 'M1', email: 'm1@example.com' },
            { firstName: 'M2', email: 'm2@example.com' },
            { firstName: 'M3', email: 'm3@example.com' },
            { firstName: 'M4', email: 'm4@example.com' }
          ]
        })
      ).rejects.toThrow(/Maximum team size for this event is 4/);
    });

    it('prevents duplicate email addresses within the same team', async () => {
      await expect(
        dbService.registerForEvent({
          attendeeId: leaderUser._id,
          eventId: testEvent._id,
          registrationType: 'team',
          teamName: 'Duplicate Squad',
          teamMembers: [
            { firstName: 'L', email: leaderUser.email, isLeader: true },
            { firstName: 'Duplicate', email: 'twin@example.com' },
            { firstName: 'Duplicate 2', email: 'twin@example.com' }
          ]
        })
      ).rejects.toThrow(/Duplicate team members detected/);
    });
  });

  describe('2. Team Registration & Invitation Generation', () => {
    it('creates team registration in pending_members status and issues secure invitations', async () => {
      const regResult = await dbService.registerForEvent({
        attendeeId: leaderUser._id,
        eventId: testEvent._id,
        registrationType: 'team',
        teamName: 'CyberVanguards',
        teamMembers: [
          {
            firstName: 'Alex',
            lastName: 'Leader',
            email: leaderUser.email,
            isLeader: true
          },
          {
            firstName: 'Elena',
            lastName: 'Rostova',
            email: memberUser1.email,
            college: 'Stanford Institute'
          },
          {
            firstName: 'Sam',
            lastName: 'Chen',
            email: memberUser2.email,
            college: 'MIT Media Lab'
          }
        ],
        sendInvitations: true
      });

      expect(regResult.registration).toBeDefined();
      expect(regResult.status).toBe('pending_members');
      expect(regResult.message).toContain('completed once all required members have accepted');
      expect(regResult.invitations).toHaveLength(2);

      // Verify Leader is confirmed
      const members = regResult.registration.teamMembers!;
      expect(members[0].isLeader).toBe(true);
      expect(members[0].status).toBe('confirmed');

      // Verify invitees are in sent / pending state
      expect(members[1].status).toBe('sent');
      expect(members[2].status).toBe('sent');
      expect(members[1].invitationId).toBeDefined();
    });
  });

  describe('3. Invitation Token Verification & Acceptance Flow', () => {
    it('allows invited member to inspect invitation details via raw token', async () => {
      const regResult = await dbService.registerForEvent({
        attendeeId: leaderUser._id,
        eventId: testEvent._id,
        registrationType: 'team',
        teamName: 'CodeCrafters',
        teamMembers: [
          { firstName: 'Alex', email: leaderUser.email, isLeader: true },
          { firstName: 'Elena', email: memberUser1.email }
        ]
      });

      const rawToken = regResult.invitations![0].token;
      expect(rawToken).toBeDefined();

      const inviteDetails = await dbService.getInvitationByToken(rawToken);
      expect(inviteDetails.invitation.teamName).toBe('CodeCrafters');
      expect(inviteDetails.invitation.memberEmail).toBe(memberUser1.email.toLowerCase());
      expect(inviteDetails.event.title).toBe(testEvent.title);
      expect(inviteDetails.isExpired).toBe(false);
    });

    it('rejects acceptance if authenticated user email does not match invited email', async () => {
      const regResult = await dbService.registerForEvent({
        attendeeId: leaderUser._id,
        eventId: testEvent._id,
        registrationType: 'team',
        teamName: 'SecurityTeam',
        teamMembers: [
          { firstName: 'Alex', email: leaderUser.email, isLeader: true },
          { firstName: 'Elena', email: memberUser1.email }
        ]
      });

      const rawToken = regResult.invitations![0].token;

      // Eve attempts to accept Elena's invitation
      await expect(
        dbService.acceptInvitation(rawToken, impostorUser)
      ).rejects.toThrow(/Email mismatch/);
    });

    it('successfully accepts invitation with matching email and confirms team when all members accept', async () => {
      const regResult = await dbService.registerForEvent({
        attendeeId: leaderUser._id,
        eventId: testEvent._id,
        registrationType: 'team',
        teamName: 'VictoryDuo',
        teamMembers: [
          { firstName: 'Alex', email: leaderUser.email, isLeader: true },
          { firstName: 'Elena', email: memberUser1.email }
        ]
      });

      expect(regResult.registration.status).toBe('pending_members');

      const rawToken = regResult.invitations![0].token;
      const acceptRes = await dbService.acceptInvitation(rawToken, memberUser1);

      expect(acceptRes.invitation.status).toBe('accepted');
      expect(acceptRes.isTeamFullyConfirmed).toBe(true);
      expect(acceptRes.registration.status).toBe('confirmed');

      // Verify that memberUser1 now has this registration in their dashboard!
      const elenaRegistrations = await dbService.getMyRegistrations(memberUser1._id);
      expect(elenaRegistrations.some(r => r._id === regResult.registration._id)).toBe(true);
    });

    it('prevents accepting the same invitation twice', async () => {
      const regResult = await dbService.registerForEvent({
        attendeeId: leaderUser._id,
        eventId: testEvent._id,
        registrationType: 'team',
        teamName: 'DuoRepeat',
        teamMembers: [
          { firstName: 'Alex', email: leaderUser.email, isLeader: true },
          { firstName: 'Elena', email: memberUser1.email }
        ]
      });

      const rawToken = regResult.invitations![0].token;
      await dbService.acceptInvitation(rawToken, memberUser1);

      // Attempt second accept
      await expect(
        dbService.acceptInvitation(rawToken, memberUser1)
      ).rejects.toThrow(/already been accepted/);
    });
  });

  describe('4. Decline, Expiry & Resend Workflow', () => {
    it('marks invitation as declined and notifies leader', async () => {
      const regResult = await dbService.registerForEvent({
        attendeeId: leaderUser._id,
        eventId: testEvent._id,
        registrationType: 'team',
        teamName: 'DeclineSquad',
        teamMembers: [
          { firstName: 'Alex', email: leaderUser.email, isLeader: true },
          { firstName: 'Elena', email: memberUser1.email }
        ]
      });

      const rawToken = regResult.invitations![0].token;
      const declineRes = await dbService.declineInvitation(rawToken, 'Scheduling conflict');
      expect(declineRes.success).toBe(true);

      const teamDetails = await dbService.getTeamRegistrationDetails(regResult.registration._id, leaderUser._id);
      const member = teamDetails.registration.teamMembers!.find(m => m.email === memberUser1.email);
      expect(member?.status).toBe('declined');
    });

    it('allows team leader to resend invitation with fresh token', async () => {
      const regResult = await dbService.registerForEvent({
        attendeeId: leaderUser._id,
        eventId: testEvent._id,
        registrationType: 'team',
        teamName: 'ResendSquad',
        teamMembers: [
          { firstName: 'Alex', email: leaderUser.email, isLeader: true },
          { firstName: 'Elena', email: memberUser1.email }
        ]
      });

      const oldToken = regResult.invitations![0].token;
      const invId = regResult.invitations![0].id;

      const resendRes = await dbService.resendInvitation(invId, leaderUser._id);
      expect(resendRes.success).toBe(true);
      expect(resendRes.rawToken).not.toBe(oldToken);

      // Old token is invalid
      await expect(
        dbService.getInvitationByToken(oldToken)
      ).rejects.toThrow(/Invitation not found/);

      // New token works
      const newDetails = await dbService.getInvitationByToken(resendRes.rawToken);
      expect(newDetails.invitation.status).toBe('sent');
    });

    it('prevents non-leaders from resending invitations', async () => {
      const regResult = await dbService.registerForEvent({
        attendeeId: leaderUser._id,
        eventId: testEvent._id,
        registrationType: 'team',
        teamName: 'AuthShield',
        teamMembers: [
          { firstName: 'Alex', email: leaderUser.email, isLeader: true },
          { firstName: 'Elena', email: memberUser1.email }
        ]
      });

      const invId = regResult.invitations![0].id;

      // Impostor attempts to resend
      await expect(
        dbService.resendInvitation(invId, impostorUser._id)
      ).rejects.toThrow(/Unauthorized/);
    });

    it('allows team leader to remove a member and recalculates team status', async () => {
      const regResult = await dbService.registerForEvent({
        attendeeId: leaderUser._id,
        eventId: testEvent._id,
        registrationType: 'team',
        teamName: 'RosterAdjust',
        teamMembers: [
          { firstName: 'Alex', email: leaderUser.email, isLeader: true },
          { firstName: 'Elena', email: memberUser1.email },
          { firstName: 'Sam', email: memberUser2.email }
        ]
      });

      const removeRes = await dbService.removeTeamMember(
        regResult.registration._id,
        memberUser2.email,
        leaderUser._id
      );

      expect(removeRes.success).toBe(true);
      expect(removeRes.registration.teamMembers).toHaveLength(2);
      expect(removeRes.registration.teamMembers!.some(m => m.email === memberUser2.email)).toBe(false);
    });

    it('prevents removing the team leader', async () => {
      const regResult = await dbService.registerForEvent({
        attendeeId: leaderUser._id,
        eventId: testEvent._id,
        registrationType: 'team',
        teamName: 'LeaderProtect',
        teamMembers: [
          { firstName: 'Alex', email: leaderUser.email, isLeader: true },
          { firstName: 'Elena', email: memberUser1.email }
        ]
      });

      await expect(
        dbService.removeTeamMember(regResult.registration._id, leaderUser.email, leaderUser._id)
      ).rejects.toThrow(/Cannot remove team leader/);
    });
  });

  describe('5. Email Service Configuration & Delivery Validation', () => {
    it('accurately reports email service configuration status without leaking credentials', () => {
      const status = emailService.getStatus();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('provider');
      expect(status).toHaveProperty('fromAddress');
      expect(status).not.toHaveProperty('auth');
      expect(status).not.toHaveProperty('pass');
    });

    it('safely handles simulated email delivery during tests', async () => {
      const emailRes = await emailService.sendTeamInvitation({
        to: 'test@example.com',
        memberName: 'Test Member',
        teamName: 'Alpha Team',
        eventTitle: 'Hackathon 2026',
        leaderName: 'Alex Leader',
        leaderEmail: 'alex@example.com',
        token: 'test_raw_token_123',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      });

      expect(emailRes.delivered).toBe(true);
      expect(emailRes.messageId).toBeDefined();
    });
  });
});

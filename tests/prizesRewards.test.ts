import { describe, it, expect, beforeEach } from 'vitest';
import { dbService, sanitizePrizes } from '../server/services/dbStore';
import { IEvent, IPrize } from '../src/types';

describe('Prizes & Rewards Feature Test Suite', () => {
  beforeEach(async () => {
    process.env.ALLOW_LOCAL_FALLBACK = 'true';
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_SIMULATE = 'true';
    await dbService.initSeedData();
  });

  it('1. sanitizePrizes helper correctly sanitizes and formats prize structures', () => {
    const raw = [
      {
        position: ' 1st Prize ',
        title: ' Grand Prize ',
        value: ' ₹50,000 ',
        type: 'Cash',
        description: ' Cash prize + certificate ',
        numberOfWinners: 1
      },
      {
        position: '', // invalid empty position
        title: 'Invalid Prize',
        value: '₹10,000'
      },
      {
        position: 'Special Mention',
        title: '', // invalid empty title
        value: 'Swag'
      },
      {
        position: 'Runner-up',
        title: 'Second Place',
        value: '$500',
        type: 'Voucher',
        numberOfWinners: 2
      }
    ];

    const sanitized = sanitizePrizes(raw);
    expect(sanitized).toHaveLength(2);
    expect(sanitized[0].position).toBe('1st Prize');
    expect(sanitized[0].title).toBe('Grand Prize');
    expect(sanitized[0].value).toBe('₹50,000');
    expect(sanitized[0].type).toBe('Cash');
    expect(sanitized[0].description).toBe('Cash prize + certificate');
    expect(sanitized[0].numberOfWinners).toBe(1);

    expect(sanitized[1].position).toBe('Runner-up');
    expect(sanitized[1].title).toBe('Second Place');
    expect(sanitized[1].value).toBe('$500');
    expect(sanitized[1].type).toBe('Voucher');
    expect(sanitized[1].numberOfWinners).toBe(2);
  });

  it('2. Create event with 1 prize and verify database persistence', async () => {
    const singlePrize: IPrize[] = [
      {
        position: 'Winner',
        title: 'Champion Bounty',
        value: '₹30,000',
        type: 'Cash',
        description: 'Cash prize and certificate',
        numberOfWinners: 1
      }
    ];

    const created = await dbService.createEvent(
      {
        title: 'Campus Hack Sprint 2026',
        description: '24-hour sprint for student innovators.',
        category: 'Hackathon',
        eventType: 'offline',
        venueName: 'Tech Arena',
        address: '100 Innovation Way',
        city: 'Bengaluru',
        capacity: 100,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 3).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 4).toISOString(),
        prizes: singlePrize
      },
      'usr_org_001'
    );

    expect(created._id).toBeDefined();
    expect(created.prizes).toBeDefined();
    expect(created.prizes).toHaveLength(1);
    expect(created.prizes![0].position).toBe('Winner');
    expect(created.prizes![0].title).toBe('Champion Bounty');
    expect(created.prizes![0].value).toBe('₹30,000');

    // Fetch from database to confirm persistence
    const fetched = await dbService.getEventById(created._id);
    expect(fetched).not.toBeNull();
    expect(fetched!.prizes).toBeDefined();
    expect(fetched!.prizes).toHaveLength(1);
    expect(fetched!.prizes![0].title).toBe('Champion Bounty');
  });

  it('3. Create event with multiple prizes (podium + special tracks)', async () => {
    const multiplePrizes: IPrize[] = [
      {
        position: '1st Prize',
        title: 'Grand Winner',
        value: '₹1,00,000',
        type: 'Cash',
        description: '₹1,00,000 + Trophy + Certificate',
        numberOfWinners: 1
      },
      {
        position: '2nd Prize',
        title: 'First Runner-Up',
        value: '₹50,000',
        type: 'Cash',
        description: '₹50,000 + Certificate',
        numberOfWinners: 1
      },
      {
        position: '3rd Prize',
        title: 'Second Runner-Up',
        value: '₹25,000',
        type: 'Cash',
        description: '₹25,000 + Certificate',
        numberOfWinners: 1
      },
      {
        position: 'Best Innovation',
        title: 'AI Innovation Award',
        value: 'Internship + Swag Kit',
        type: 'Internship',
        description: 'Direct summer internship interview + hardware goodies',
        numberOfWinners: 1
      }
    ];

    const created = await dbService.createEvent(
      {
        title: 'National AI & Web3 Hackathon 2026',
        description: 'Over 2 Lakhs in total prize pools and internships.',
        category: 'Hackathon',
        eventType: 'hybrid',
        venueName: 'Convention Center',
        address: '22 Science Park',
        city: 'Hyderabad',
        capacity: 300,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 5).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 7).toISOString(),
        prizes: multiplePrizes
      },
      'usr_org_001'
    );

    const fetched = await dbService.getEventById(created._id);
    expect(fetched!.prizes).toHaveLength(4);
    expect(fetched!.prizes![0].position).toBe('1st Prize');
    expect(fetched!.prizes![3].type).toBe('Internship');
    expect(fetched!.prizes![3].value).toBe('Internship + Swag Kit');
  });

  it('4. Edit prize information on an existing event', async () => {
    const initialPrize: IPrize[] = [
      {
        position: '1st Prize',
        title: 'Initial Bounty',
        value: '₹20,000',
        type: 'Cash',
        numberOfWinners: 1
      }
    ];

    const created = await dbService.createEvent(
      {
        title: 'Design Challenge',
        description: 'UI/UX rapid prototyping battle.',
        category: 'Design',
        eventType: 'online',
        venueName: 'Online',
        city: 'Online',
        capacity: 80,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 2).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 3).toISOString(),
        prizes: initialPrize
      },
      'usr_org_001'
    );

    // Update with upgraded bounty and new perks
    const updated = await dbService.updateEvent(
      created._id,
      {
        prizes: [
          {
            position: '1st Prize',
            title: 'Upgraded Grand Champion Bounty',
            value: '₹50,000 + Figma Pro Subscriptions',
            type: 'Voucher',
            description: 'Cash reward + 1 Year Pro License + Winner Trophy',
            numberOfWinners: 2
          }
        ]
      },
      'usr_org_001'
    );

    expect(updated).not.toBeNull();
    expect(updated!.prizes).toHaveLength(1);
    expect(updated!.prizes![0].title).toBe('Upgraded Grand Champion Bounty');
    expect(updated!.prizes![0].value).toBe('₹50,000 + Figma Pro Subscriptions');
    expect(updated!.prizes![0].numberOfWinners).toBe(2);

    // Verify persistence on subsequent get
    const fetched = await dbService.getEventById(created._id);
    expect(fetched!.prizes![0].title).toBe('Upgraded Grand Champion Bounty');
  });

  it('5. Delete a prize from an event', async () => {
    const prizes: IPrize[] = [
      { position: '1st Prize', title: 'Grand Winner', value: '₹50,000', type: 'Cash' },
      { position: '2nd Prize', title: 'Runner Up', value: '₹25,000', type: 'Cash' },
      { position: '3rd Prize', title: 'Second Runner Up', value: '₹10,000', type: 'Cash' }
    ];

    const created = await dbService.createEvent(
      {
        title: 'Quiz Bowl 2026',
        description: 'Inter-college general knowledge quiz.',
        category: 'Cultural',
        eventType: 'offline',
        venueName: 'Hall 3',
        city: 'Mumbai',
        capacity: 50,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 4).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 4 + 7200000).toISOString(),
        prizes
      },
      'usr_org_001'
    );

    // Delete 3rd prize, keeping only 1st and 2nd
    const remainingPrizes = created.prizes!.slice(0, 2);
    const updated = await dbService.updateEvent(
      created._id,
      {
        prizes: remainingPrizes
      },
      'usr_org_001'
    );

    expect(updated!.prizes).toHaveLength(2);
    expect(updated!.prizes!.map(p => p.position)).toEqual(['1st Prize', '2nd Prize']);

    const fetched = await dbService.getEventById(created._id);
    expect(fetched!.prizes).toHaveLength(2);
  });

  it('6. Reorder prizes on an event', async () => {
    const prizes: IPrize[] = [
      { position: 'Runner Up', title: 'Silver Tier', value: '₹15,000', type: 'Cash' },
      { position: 'Grand Winner', title: 'Gold Tier', value: '₹30,000', type: 'Cash' }
    ];

    const created = await dbService.createEvent(
      {
        title: 'Robotics Showcase',
        description: 'Autonomous rover design showdown.',
        category: 'Technical',
        eventType: 'offline',
        venueName: 'Engineering Arena',
        city: 'Chennai',
        capacity: 100,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 6).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 7).toISOString(),
        prizes
      },
      'usr_org_001'
    );

    // Reorder so Grand Winner is first
    const reordered: IPrize[] = [created.prizes![1], created.prizes![0]];
    const updated = await dbService.updateEvent(
      created._id,
      {
        prizes: reordered
      },
      'usr_org_001'
    );

    expect(updated!.prizes![0].title).toBe('Gold Tier');
    expect(updated!.prizes![1].title).toBe('Silver Tier');

    const fetched = await dbService.getEventById(created._id);
    expect(fetched!.prizes![0].title).toBe('Gold Tier');
  });

  it('7. Events without prizes continue to work seamlessly with empty array default', async () => {
    const created = await dbService.createEvent(
      {
        title: 'Community Coffee Meetup',
        description: 'Informal networking for indie hackers.',
        category: 'General',
        eventType: 'offline',
        venueName: 'Cafe Roasters',
        city: 'Delhi',
        capacity: 30,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 1).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 1 + 3600000).toISOString()
        // no prizes field passed
      },
      'usr_org_001'
    );

    expect(created.prizes).toEqual([]);
    const fetched = await dbService.getEventById(created._id);
    expect(fetched!.prizes).toEqual([]);
  });

  it('8. Unauthorized users cannot modify prizes for someone else event', async () => {
    const created = await dbService.createEvent(
      {
        title: 'Secret Hackathon',
        description: 'Private event with prizes.',
        category: 'Hackathon',
        eventType: 'offline',
        venueName: 'Secret Lab',
        city: 'Pune',
        capacity: 50,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 2).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 3).toISOString(),
        prizes: [{ position: '1st Prize', title: 'Top Prize', value: '₹10,000' }]
      },
      'usr_org_001'
    );

    // Attempt to modify prizes using another user's ID
    await expect(
      dbService.updateEvent(
        created._id,
        {
          prizes: [{ position: '1st Prize', title: 'Hacked Prize', value: '₹1,000,000' }]
        },
        'usr_different_org',
        false // not admin
      )
    ).rejects.toThrow(/Unauthorized/i);

    // Verify original prize remained intact
    const fetched = await dbService.getEventById(created._id);
    expect(fetched!.prizes![0].title).toBe('Top Prize');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { dbService, sanitizeSubmissionFormUrl } from '../server/services/dbStore';
import { IEvent } from '../src/types';

describe('Online Submission Form Feature Test Suite', () => {
  beforeEach(async () => {
    process.env.ALLOW_LOCAL_FALLBACK = 'true';
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_SIMULATE = 'true';
    await dbService.initSeedData();
  });

  it('1. sanitizeSubmissionFormUrl helper validates valid HTTP/HTTPS URLs', () => {
    expect(sanitizeSubmissionFormUrl('https://forms.google.com/d/e/1FAIpQLSc/viewform')).toBe(
      'https://forms.google.com/d/e/1FAIpQLSc/viewform'
    );
    expect(sanitizeSubmissionFormUrl('  http://forms.office.com/r/xyz123  ')).toBe(
      'http://forms.office.com/r/xyz123'
    );
    expect(sanitizeSubmissionFormUrl('https://typeform.com/to/sampleForm')).toBe(
      'https://typeform.com/to/sampleForm'
    );
  });

  it('2. sanitizeSubmissionFormUrl helper allows null, undefined, empty, or whitespace strings', () => {
    expect(sanitizeSubmissionFormUrl(null)).toBeNull();
    expect(sanitizeSubmissionFormUrl(undefined)).toBeNull();
    expect(sanitizeSubmissionFormUrl('')).toBeNull();
    expect(sanitizeSubmissionFormUrl('   ')).toBeNull();
  });

  it('3. sanitizeSubmissionFormUrl helper rejects unsafe schemes and malformed strings', () => {
    expect(() => sanitizeSubmissionFormUrl('javascript:alert(1)')).toThrow(/http:\/\/ or https:\/\//i);
    expect(() => sanitizeSubmissionFormUrl('data:text/html,<script>alert(1)</script>')).toThrow(/http:\/\/ or https:\/\//i);
    expect(() => sanitizeSubmissionFormUrl('ftp://example.com/form')).toThrow(/http:\/\/ or https:\/\//i);
    expect(() => sanitizeSubmissionFormUrl('not-a-valid-url')).toThrow(/Invalid submission form URL/i);
  });

  it('4. Create an event with a valid submissionFormUrl and verify persistence', async () => {
    const formUrl = 'https://forms.google.com/d/e/1FAIpQLSd987654321/viewform';
    const created = await dbService.createEvent(
      {
        title: 'Online Hackathon Sprint 2026',
        description: 'Submit your GitHub repo and demo video through the Google Form.',
        category: 'Hackathon',
        eventType: 'online',
        venueName: 'Discord / LiveStream',
        city: 'Online',
        capacity: 200,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 3).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 5).toISOString(),
        submissionFormUrl: formUrl
      },
      'usr_org_001'
    );

    expect(created._id).toBeDefined();
    expect(created.submissionFormUrl).toBe(formUrl);

    // Retrieve from database to confirm persistence
    const fetched = await dbService.getEventById(created._id);
    expect(fetched).not.toBeNull();
    expect(fetched!.submissionFormUrl).toBe(formUrl);
  });

  it('5. Create an event without submissionFormUrl (defaults to null/empty without breaking)', async () => {
    const created = await dbService.createEvent(
      {
        title: 'Standard Networking Mixer',
        description: 'In-person meetup without any submission requirements.',
        category: 'General',
        eventType: 'offline',
        venueName: 'Downtown Lounge',
        city: 'San Francisco',
        capacity: 50,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 2).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString()
      },
      'usr_org_001'
    );

    expect(created.submissionFormUrl).toBeNull();

    const fetched = await dbService.getEventById(created._id);
    expect(fetched!.submissionFormUrl).toBeNull();
  });

  it('6. Update event to add or change submissionFormUrl', async () => {
    const created = await dbService.createEvent(
      {
        title: 'AI Project Showcase',
        description: 'Showcase event for machine learning projects.',
        category: 'Technical',
        eventType: 'hybrid',
        venueName: 'Campus Center',
        city: 'Bengaluru',
        capacity: 100,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 4).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 5).toISOString()
      },
      'usr_org_001'
    );

    expect(created.submissionFormUrl).toBeNull();

    const newUrl = 'https://forms.office.com/r/ai-showcase-submissions-2026';
    const updated = await dbService.updateEvent(
      created._id,
      {
        submissionFormUrl: newUrl
      },
      'usr_org_001'
    );

    expect(updated!.submissionFormUrl).toBe(newUrl);

    const fetched = await dbService.getEventById(created._id);
    expect(fetched!.submissionFormUrl).toBe(newUrl);
  });

  it('7. Update event to remove submissionFormUrl', async () => {
    const created = await dbService.createEvent(
      {
        title: 'Coding Contest 2026',
        description: 'Algorithm challenge with external submission.',
        category: 'Technical',
        eventType: 'online',
        venueName: 'Online',
        city: 'Online',
        capacity: 150,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 6).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 7).toISOString(),
        submissionFormUrl: 'https://typeform.com/to/contest2026'
      },
      'usr_org_001'
    );

    expect(created.submissionFormUrl).toBe('https://typeform.com/to/contest2026');

    // Remove the URL by passing empty string or null
    const updated = await dbService.updateEvent(
      created._id,
      {
        submissionFormUrl: ''
      },
      'usr_org_001'
    );

    expect(updated!.submissionFormUrl).toBeNull();

    const fetched = await dbService.getEventById(created._id);
    expect(fetched!.submissionFormUrl).toBeNull();
  });

  it('8. Unauthorized users cannot modify submissionFormUrl on an event', async () => {
    const created = await dbService.createEvent(
      {
        title: 'Organizer Private Hackathon',
        description: 'Organizer event.',
        category: 'Hackathon',
        eventType: 'online',
        venueName: 'Online',
        city: 'Online',
        capacity: 50,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000 * 2).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 * 3).toISOString(),
        submissionFormUrl: 'https://forms.google.com/legitimate-form'
      },
      'usr_org_001'
    );

    await expect(
      dbService.updateEvent(
        created._id,
        {
          submissionFormUrl: 'https://malicious-phishing-form.com'
        },
        'usr_unauthorized_user',
        false
      )
    ).rejects.toThrow(/Unauthorized/i);

    const fetched = await dbService.getEventById(created._id);
    expect(fetched!.submissionFormUrl).toBe('https://forms.google.com/legitimate-form');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from '../server/services/dbStore';
import { IEvent } from '../src/types';

describe('Map Location and Address Resolution Test Suite', () => {
  beforeEach(async () => {
    process.env.ALLOW_LOCAL_FALLBACK = 'true';
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_SIMULATE = 'true';
    await dbService.initSeedData(true);
  });

  it('1. Creating an event with address saves exact address and does NOT assign hardcoded default coordinates (37.7749, -122.4194)', async () => {
    const event = await dbService.createEvent(
      {
        title: 'Tech Meetup in Bangalore',
        description: 'Developer meetup discussing modern web stacks and systems.',
        category: 'Technical',
        eventType: 'offline',
        startDateTime: new Date(Date.now() + 86400000).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 + 7200000).toISOString(),
        venueName: 'Koramangala Club',
        address: 'CA-17, 6th Cross Rd, 6th Block',
        city: 'Bengaluru, Karnataka',
        capacity: 100,
        price: 0
      },
      'usr_org_001'
    );

    expect(event.venueName).toBe('Koramangala Club');
    expect(event.address).toBe('CA-17, 6th Cross Rd, 6th Block');
    expect(event.city).toBe('Bengaluru, Karnataka');
    // Coordinates should be undefined/null, not fake San Francisco 37.7749
    expect(event.coordinates).toBeUndefined();
  });

  it('2. Editing an event and changing its address clears old/stale coordinates so new address wins', async () => {
    // Create event with initial address
    const initialEvent = await dbService.createEvent(
      {
        title: 'Original London Event',
        description: 'Initial session description with detailed info.',
        venueName: 'Excel London',
        address: 'Royal Victoria Dock, 1 Western Gateway',
        city: 'London',
        capacity: 100,
        price: 0,
        startDateTime: new Date(Date.now() + 86400000).toISOString(),
        endDateTime: new Date(Date.now() + 86400000 + 7200000).toISOString(),
        coordinates: { lat: 51.5074, lng: 0.1278 }
      },
      'usr_org_001'
    );

    expect(initialEvent.coordinates?.lat).toBe(51.5074);

    // Update event with a new address in New York without providing new coordinates
    const updated = await dbService.updateEvent(
      initialEvent._id,
      {
        venueName: 'Javits Center',
        address: '429 11th Ave',
        city: 'New York, NY'
      },
      'usr_org_001'
    );

    expect(updated?.venueName).toBe('Javits Center');
    expect(updated?.address).toBe('429 11th Ave');
    expect(updated?.city).toBe('New York, NY');
    // Stale London coordinates must be cleared so the map resolves Javits Center
    expect(updated?.coordinates).toBeUndefined();
  });

  it('3. Location helper resolution verifies that Address takes absolute priority', () => {
    // Simulate resolution logic matching MapAndDirections.tsx
    function resolveLocation(event: Partial<IEvent>) {
      const isVirtualOrPlaceholder = (val?: string): boolean => {
        if (!val) return true;
        const lower = val.trim().toLowerCase();
        return (
          lower === '' ||
          lower === 'tbd' ||
          lower === 'virtual' ||
          lower === 'online' ||
          lower === 'virtual link / tbd' ||
          lower === 'n/a' ||
          lower === 'none'
        );
      };

      const addressParts: string[] = [];
      if (event.venueName && !isVirtualOrPlaceholder(event.venueName)) {
        addressParts.push(event.venueName.trim());
      }
      if (event.address && !isVirtualOrPlaceholder(event.address)) {
        addressParts.push(event.address.trim());
      }
      if (event.city && !isVirtualOrPlaceholder(event.city)) {
        addressParts.push(event.city.trim());
      }

      const destinationAddress = addressParts.join(', ');

      const hasCoordinates =
        typeof event.coordinates?.lat === 'number' &&
        typeof event.coordinates?.lng === 'number' &&
        !isNaN(event.coordinates.lat) &&
        !isNaN(event.coordinates.lng) &&
        (event.coordinates.lat !== 0 || event.coordinates.lng !== 0);

      const hasLocation = Boolean(destinationAddress || hasCoordinates);

      const destinationParam = destinationAddress
        ? encodeURIComponent(destinationAddress)
        : hasCoordinates
        ? `${event.coordinates!.lat},${event.coordinates!.lng}`
        : '';

      return { hasLocation, destinationAddress, destinationParam, hasCoordinates };
    }

    // Case A: Completely new street address
    const caseA = resolveLocation({
      venueName: 'Moscone West',
      address: '800 Howard St',
      city: 'San Francisco, CA'
    });
    expect(caseA.hasLocation).toBe(true);
    expect(caseA.destinationAddress).toBe('Moscone West, 800 Howard St, San Francisco, CA');
    expect(caseA.destinationParam).toBe(encodeURIComponent('Moscone West, 800 Howard St, San Francisco, CA'));

    // Case B: Address + City
    const caseB = resolveLocation({
      address: '10 Downing St',
      city: 'London'
    });
    expect(caseB.hasLocation).toBe(true);
    expect(caseB.destinationAddress).toBe('10 Downing St, London');

    // Case C: Event with old coordinates and new address -> new address wins!
    const caseC = resolveLocation({
      venueName: 'Empire State Building',
      address: '20 W 34th St',
      city: 'New York, NY',
      coordinates: { lat: 37.7749, lng: -122.4194 } // Old SF coords
    });
    expect(caseC.hasLocation).toBe(true);
    expect(caseC.destinationAddress).toBe('Empire State Building, 20 W 34th St, New York, NY');
    expect(decodeURIComponent(caseC.destinationParam)).toBe('Empire State Building, 20 W 34th St, New York, NY');

    // Case D: Event with genuine coordinates and no street address
    const caseD = resolveLocation({
      coordinates: { lat: 12.9716, lng: 77.5946 }
    });
    expect(caseD.hasLocation).toBe(true);
    expect(caseD.destinationParam).toBe('12.9716,77.5946');

    // Case E: No address and no coordinates -> "Location Pending"
    const caseE = resolveLocation({
      venueName: 'Virtual Link / TBD',
      address: '',
      city: 'Online',
      coordinates: undefined
    });
    expect(caseE.hasLocation).toBe(false);
    expect(caseE.destinationParam).toBe('');
  });
});

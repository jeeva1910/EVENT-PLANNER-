import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Bus,
  Car,
  Footprints,
  ExternalLink,
  LocateFixed,
  Compass,
  AlertCircle,
  Copy,
  Check,
  Bike,
  Loader2
} from 'lucide-react';
import { IEvent } from '../types';

interface MapAndDirectionsProps {
  event: IEvent;
}

export const MapAndDirections: React.FC<MapAndDirectionsProps> = ({ event }) => {
  const [travelMode, setTravelMode] = useState<'driving' | 'transit' | 'walking' | 'bicycling'>('driving');
  const [originAddress, setOriginAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<{
    type: 'success' | 'fallback' | 'error';
    message: string;
    coords?: { lat: number; lng: number };
  } | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // 1. Address is the primary source of truth for location resolution
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

  // Build the complete destination address from venueName, address, and city
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

  // Check if valid coordinates exist (non-zero numbers)
  const hasCoordinates =
    typeof event.coordinates?.lat === 'number' &&
    typeof event.coordinates?.lng === 'number' &&
    !isNaN(event.coordinates.lat) &&
    !isNaN(event.coordinates.lng) &&
    (event.coordinates.lat !== 0 || event.coordinates.lng !== 0);

  // An event has a resolvable location if it has an address or valid coordinates
  const hasLocation = Boolean(destinationAddress || hasCoordinates);

  // Address MUST take priority over stale/default coordinates:
  // Use the complete event address as Google Maps destination query.
  // Fall back to coordinates only when an explicit address is absent.
  const destinationParam = destinationAddress
    ? encodeURIComponent(destinationAddress)
    : hasCoordinates
    ? `${event.coordinates!.lat},${event.coordinates!.lng}`
    : '';

  // Standard Google Maps directions URL without origin defaults to user's device location
  const baseDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}&travelmode=${travelMode}`;

  // Interactive Map Embed URL (Google Maps embed output)
  const mapEmbedQuery = destinationAddress
    ? encodeURIComponent(destinationAddress)
    : hasCoordinates
    ? `${event.coordinates!.lat},${event.coordinates!.lng}`
    : '';

  const mapEmbedUrl = `https://maps.google.com/maps?q=${mapEmbedQuery}&hl=en&z=15&output=embed`;

  // Handle "View Route" with real browser Geolocation
  const handleViewRoute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // If user provided a manual address, build directions URL directly
    if (originAddress.trim()) {
      const customUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        originAddress.trim()
      )}&destination=${destinationParam}&travelmode=${travelMode}`;
      window.open(customUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Try detecting device GPS
    if ('geolocation' in navigator) {
      setLocating(true);
      setLocationStatus(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocating(false);
          const { latitude, longitude } = position.coords;
          setLocationStatus({
            type: 'success',
            message: `Current GPS location detected (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            coords: { lat: latitude, lng: longitude }
          });

          // Open real Google Maps route directions with exact user GPS coordinates
          const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${destinationParam}&travelmode=${travelMode}`;
          window.open(routeUrl, '_blank', 'noopener,noreferrer');
        },
        (error) => {
          setLocating(false);
          let errorMsg = 'Location permission was denied or unavailable.';
          if (error.code === error.TIMEOUT) {
            errorMsg = 'Location request timed out.';
          }
          setLocationStatus({
            type: 'fallback',
            message: `${errorMsg} Opening Google Maps directly with auto-location.`
          });

          // Graceful fallback: Open Google Maps directions where device GPS automatically activates
          window.open(baseDirectionsUrl, '_blank', 'noopener,noreferrer');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      // Browser does not support geolocation
      setLocationStatus({
        type: 'fallback',
        message: 'Browser geolocation is unavailable. Opening Google Maps navigation.'
      });
      window.open(baseDirectionsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyCoordinates = () => {
    if (hasCoordinates) {
      navigator.clipboard.writeText(`${event.coordinates!.lat}, ${event.coordinates!.lng}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  if (!hasLocation) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
        <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 font-display">Location Pending</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The event organizer has not yet provided venue coordinates or physical address details for this session.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs space-y-6">
      {/* Map Header */}
      <div className="p-6 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Venue Location & Directions
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            {event.venueName} {event.address ? `· ${event.address}` : ''} {event.city ? `· ${event.city}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasCoordinates && (
            <button
              onClick={handleCopyCoordinates}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              title="Copy GPS coordinates"
            >
              {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>
                {copiedCoords ? 'Copied GPS' : `${event.coordinates!.lat.toFixed(3)}, ${event.coordinates!.lng.toFixed(3)}`}
              </span>
            </button>
          )}

          <a
            href={baseDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs shrink-0"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Interactive Map Embed */}
      <div className="px-6">
        <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
          <iframe
            title={`Interactive Map for ${event.venueName}`}
            src={mapEmbedUrl}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>

      {/* Route & Directions Planner Form */}
      <div className="px-6 pb-6 space-y-4">
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-blue-600" />
              Route Directions & Transportation
            </span>

            {/* Travel Mode Selector */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTravelMode('driving')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  travelMode === 'driving'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Car className="w-3.5 h-3.5" /> Driving
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('transit')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  travelMode === 'transit'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bus className="w-3.5 h-3.5" /> Transit
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('walking')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  travelMode === 'walking'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" /> Walking
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('bicycling')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  travelMode === 'bicycling'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bike className="w-3.5 h-3.5" /> Bike
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleViewRoute} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Optional starting location (e.g. Hotel, Airport, or leave blank for GPS)..."
                value={originAddress}
                onChange={(e) => setOriginAddress(e.target.value)}
                className="w-full pl-3.5 pr-28 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleViewRoute()}
                disabled={locating}
                className="absolute right-1.5 top-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                {locating ? <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> : <LocateFixed className="w-3 h-3 text-blue-600" />}
                <span>Auto GPS</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={locating}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs shrink-0 flex items-center justify-center gap-2"
            >
              {locating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>View Route</span>
                </>
              )}
            </button>
          </form>

          {/* Real Status / Fallback Notice */}
          {locationStatus && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
                locationStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {locationStatus.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{locationStatus.message}</span>
              </div>
              <a
                href={baseDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold underline shrink-0 hover:text-slate-900"
              >
                Navigate in Maps →
              </a>
            </div>
          )}

          {/* Destination Details Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">
                Destination Venue
              </span>
              <p className="font-bold text-slate-900 mt-0.5">{event.venueName || 'Venue'}</p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                {[event.address, event.city].filter(Boolean).join(', ') || destinationAddress || 'Address specified'}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">
                Location Source
              </span>
              {destinationAddress ? (
                <>
                  <p className="text-slate-700 font-medium mt-0.5">Address-Based Navigation</p>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    Verified Venue Address Active
                  </span>
                </>
              ) : hasCoordinates ? (
                <>
                  <p className="font-mono font-bold text-blue-600 mt-0.5">
                    Lat: {event.coordinates!.lat.toFixed(6)}, Lng: {event.coordinates!.lng.toFixed(6)}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    GPS Coordinates Active
                  </span>
                </>
              ) : (
                <>
                  <p className="text-slate-700 font-medium mt-0.5">Location Pending</p>
                  <span className="text-[10px] text-slate-500">
                    Awaiting organizer venue details
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

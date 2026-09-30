import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  Accessibility,
  ArrowRight,
  Globe,
  Building,
  Sparkles
} from 'lucide-react';
import { IEvent } from '../types';

interface EventCardProps {
  event: IEvent;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const startDate = new Date(event.startDateTime);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const formattedTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  const isFull = (event.availableSeats ?? 0) <= 0;
  const isHybridOrOnline = event.eventType === 'online' || event.eventType === 'hybrid';

  const hasAccessibilityAccommodations =
    event.accessibility &&
    Object.entries(event.accessibility).some(
      ([key, val]) => key !== 'customNotes' && val === true
    );

  const teamSettings = event.teamSettings;
  const isTeam = teamSettings?.registrationType === 'team' || teamSettings?.registrationType === 'both';
  const paymentConfig = event.paymentConfig;
  const isPaid = paymentConfig ? paymentConfig.pricingType === 'paid' && paymentConfig.fee > 0 : event.price > 0;
  const feeAmount = paymentConfig && paymentConfig.fee > 0 ? paymentConfig.fee : event.price;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
      {/* Poster Media Slot */}
      <div className="relative aspect-16/9 overflow-hidden bg-slate-900">
        <img
          src={event.poster}
          alt={event.title}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Top Left Overlay Indicators */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className="bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xs">
            {event.category}
          </span>
          {event.eventType === 'online' && (
            <span className="bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1 shadow-xs">
              <Globe className="w-3 h-3" /> Online
            </span>
          )}
          {event.eventType === 'hybrid' && (
            <span className="bg-purple-600/90 backdrop-blur-md text-white text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1 shadow-xs">
              <Building className="w-3 h-3" /> Hybrid
            </span>
          )}
          {isTeam && (
            <span className="bg-indigo-600/95 backdrop-blur-md text-white text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-xs">
              <Users className="w-3 h-3" />
              {teamSettings?.registrationType === 'team'
                ? `Team (${teamSettings.minTeamSize}-${teamSettings.maxTeamSize})`
                : 'Team / Solo'}
            </span>
          )}
        </div>

        {/* Top Right Price Tag */}
        <div className="absolute top-3 right-3">
          <span className="bg-white/95 backdrop-blur-md text-slate-900 text-xs font-extrabold px-2.5 py-1 rounded-md shadow-xs">
            {!isPaid ? (
              <span className="text-emerald-600">Free</span>
            ) : (
              <span>
                ₹{feeAmount}
                {paymentConfig?.feeType === 'per_team' ? (
                  <span className="text-[10px] font-normal text-slate-500"> /team</span>
                ) : (
                  <span className="text-[10px] font-normal text-slate-500"> /person</span>
                )}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata Line */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-2.5">
            <span className="flex items-center gap-1 text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              {formattedDate}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{formattedTime}</span>
            {hasAccessibilityAccommodations && (
              <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="flex items-center gap-0.5 text-emerald-700 font-medium" title="Accessible venue facilities confirmed">
                  <Accessibility className="w-3.5 h-3.5" />
                  Accessible
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug font-display">
            <Link to={`/events/${event._id}`}>
              {event.title}
            </Link>
          </h3>

          {/* Description Preview */}
          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
            {event.description}
          </p>

          {/* Venue & Location */}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{event.venueName} · {event.city}</span>
          </div>
        </div>

        {/* Footer info & CTA */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {isFull ? (
              <span className="text-amber-600 font-semibold">Waitlist Open</span>
            ) : (
              <span className="text-slate-600">
                <strong className="text-slate-900 font-mono tabular-nums">{event.availableSeats ?? event.capacity}</strong> seats left
              </span>
            )}
          </div>

          <Link
            to={`/events/${event._id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 group-hover:translate-x-0.5 transition-all"
          >
            <span>Register / Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

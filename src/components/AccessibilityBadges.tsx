import React from 'react';
import {
  Accessibility,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Ear,
  Eye,
  Car,
  Footprints,
  Info
} from 'lucide-react';
import { IAccessibility } from '../types';

interface AccessibilityBadgesProps {
  accessibility?: IAccessibility;
  showAll?: boolean;
}

export const AccessibilityBadges: React.FC<AccessibilityBadgesProps> = ({
  accessibility,
  showAll = true
}) => {
  if (!accessibility) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-slate-400" />
        <span>Accessibility facilities have not been specified by the organizer for this venue.</span>
      </div>
    );
  }

  const facilities = [
    {
      key: 'wheelchairEntrance',
      label: 'Wheelchair Accessible Entrance',
      icon: <Accessibility className="w-4 h-4" />,
      value: accessibility.wheelchairEntrance,
      description: 'Power-assisted doors or level threshold at main entrance'
    },
    {
      key: 'ramps',
      label: 'Wheelchair Ramps',
      icon: <Accessibility className="w-4 h-4" />,
      value: accessibility.ramps,
      description: 'Gentle gradient ramps with handrails'
    },
    {
      key: 'elevators',
      label: 'Elevators / Lifts',
      icon: <Accessibility className="w-4 h-4" />,
      value: accessibility.elevators,
      description: 'Braille buttons and voice floor announcements'
    },
    {
      key: 'accessibleRestrooms',
      label: 'Accessible Restrooms',
      icon: <Accessibility className="w-4 h-4" />,
      value: accessibility.accessibleRestrooms,
      description: 'Step-free unisex accessible restroom facilities'
    },
    {
      key: 'reservedSeating',
      label: 'Reserved Accessible Seating',
      icon: <Accessibility className="w-4 h-4" />,
      value: accessibility.reservedSeating,
      description: 'Front-row or accessible platform seating with companion spots'
    },
    {
      key: 'accessibleParking',
      label: 'Accessible Parking',
      icon: <Car className="w-4 h-4" />,
      value: accessibility.accessibleParking,
      description: 'Designated wide bays near entrance'
    },
    {
      key: 'stepFreeRoutes',
      label: 'Step-Free Internal Routes',
      icon: <Footprints className="w-4 h-4" />,
      value: accessibility.stepFreeRoutes,
      description: 'Zero stairs between halls, auditoriums, and dining areas'
    },
    {
      key: 'hearingAssistance',
      label: 'Hearing Induction Loop',
      icon: <Ear className="w-4 h-4" />,
      value: accessibility.hearingAssistance,
      description: 'T-coil hearing loop or assistive FM headsets'
    },
    {
      key: 'signLanguageSupport',
      label: 'Sign Language (ASL/ISL)',
      icon: <Eye className="w-4 h-4" />,
      value: accessibility.signLanguageSupport,
      description: 'Live certified sign interpreters present on stage'
    }
  ];

  const confirmedCount = facilities.filter(f => f.value === true).length;

  return (
    <div className="space-y-4">
      {/* Summary Kicker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Accessibility className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 font-display">
            Venue Accessibility Features
          </h4>
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
          {confirmedCount} of {facilities.length} Confirmed
        </span>
      </div>

      {/* Grid of Facilities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {facilities.map(f => {
          const isAvailable = f.value === true;
          return (
            <div
              key={f.key}
              className={`p-3 rounded-xl border transition-all ${
                isAvailable
                  ? 'bg-emerald-50/40 border-emerald-200 text-slate-900'
                  : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {f.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${isAvailable ? 'text-slate-900' : 'text-slate-500'}`}>
                      {f.label}
                    </p>
                    {isAvailable ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-1" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {f.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom notes from organizer */}
      {accessibility.customNotes && (
        <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block">Organizer Accessibility Notes:</strong>
            <p className="mt-0.5 text-blue-900 leading-relaxed">{accessibility.customNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Clock, MapPin, User, Tag } from 'lucide-react';
import { ISession } from '../types';

interface ScheduleTimelineProps {
  schedule: ISession[];
}

export const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ schedule }) => {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">Detailed Agenda Coming Soon</p>
        <p className="text-xs text-slate-500 mt-1">
          The event organizer has not published the minute-by-minute session schedule yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {schedule.map((session, index) => (
          <div key={session.id || index} className="relative group">
            {/* Dot Indicator */}
            <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-600 group-hover:scale-125 group-hover:bg-blue-600 transition-all"></div>

            {/* Session Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {session.startTime} – {session.endTime}
                  </span>
                  {session.category && (
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {session.category}
                    </span>
                  )}
                </div>

                {session.location && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {session.location}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-900 leading-snug font-display">
                {session.title}
              </h4>

              {session.description && (
                <p className="text-xs text-slate-600 leading-relaxed">{session.description}</p>
              )}

              {session.speaker && (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Speaker: {session.speaker}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

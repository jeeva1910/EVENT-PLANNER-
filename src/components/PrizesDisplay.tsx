import React from 'react';
import {
  Trophy,
  Award,
  Gift,
  DollarSign,
  Briefcase,
  FileCheck,
  Medal,
  Sparkles,
  Users,
  CheckCircle
} from 'lucide-react';
import { IPrize } from '../types';

interface PrizesDisplayProps {
  prizes?: IPrize[];
  className?: string;
  compact?: boolean;
}

export const PrizesDisplay: React.FC<PrizesDisplayProps> = ({ prizes, className = '', compact = false }) => {
  if (!prizes || prizes.length === 0) {
    return null;
  }

  const getRankBadgeInfo = (pos: string, index: number) => {
    const lower = (pos || '').toLowerCase();
    if (lower.includes('1st') || lower.includes('winner') || lower.includes('gold') || lower.includes('champion') || index === 0) {
      return {
        cardBg: 'bg-gradient-to-b from-amber-500/10 via-amber-50/50 to-white border-amber-200/90 shadow-sm shadow-amber-500/5',
        badgeBg: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs',
        icon: '🥇',
        rankText: '1st Place',
        borderAccent: 'border-amber-300',
        textColor: 'text-amber-950',
        valueColor: 'text-amber-900',
        typeBadge: 'bg-amber-100/80 text-amber-800 border-amber-200'
      };
    }
    if (lower.includes('2nd') || lower.includes('runner') || lower.includes('silver') || index === 1) {
      return {
        cardBg: 'bg-gradient-to-b from-slate-400/10 via-slate-50/60 to-white border-slate-200 shadow-sm',
        badgeBg: 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-xs',
        icon: '🥈',
        rankText: '2nd Place',
        borderAccent: 'border-slate-300',
        textColor: 'text-slate-900',
        valueColor: 'text-slate-800',
        typeBadge: 'bg-slate-100 text-slate-700 border-slate-200'
      };
    }
    if (lower.includes('3rd') || lower.includes('bronze') || index === 2) {
      return {
        cardBg: 'bg-gradient-to-b from-orange-400/10 via-orange-50/40 to-white border-orange-200 shadow-sm',
        badgeBg: 'bg-gradient-to-r from-amber-700 to-orange-700 text-white shadow-xs',
        icon: '🥉',
        rankText: '3rd Place',
        borderAccent: 'border-orange-200',
        textColor: 'text-orange-950',
        valueColor: 'text-orange-900',
        typeBadge: 'bg-orange-100/80 text-orange-800 border-orange-200'
      };
    }
    return {
      cardBg: 'bg-gradient-to-b from-indigo-500/5 via-indigo-50/30 to-white border-indigo-100 shadow-sm',
      badgeBg: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs',
      icon: '🏆',
      rankText: 'Special Track',
      borderAccent: 'border-indigo-200',
      textColor: 'text-indigo-950',
      valueColor: 'text-indigo-900',
      typeBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
  };

  const getTypeIcon = (type?: string) => {
    switch ((type || '').toLowerCase()) {
      case 'cash':
        return <DollarSign className="w-3 h-3 text-emerald-600 shrink-0" />;
      case 'voucher':
        return <Gift className="w-3 h-3 text-pink-600 shrink-0" />;
      case 'internship':
        return <Briefcase className="w-3 h-3 text-blue-600 shrink-0" />;
      case 'certificate':
        return <FileCheck className="w-3 h-3 text-indigo-600 shrink-0" />;
      case 'trophy':
        return <Medal className="w-3 h-3 text-amber-600 shrink-0" />;
      case 'goodies':
        return <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />;
      default:
        return <Award className="w-3 h-3 text-slate-600 shrink-0" />;
    }
  };

  return (
    <div className={`space-y-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500 fill-amber-400" />
            <span>Prizes & Winner Rewards</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Official rewards, bounties, and perks awarded to top performers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>{prizes.length} {prizes.length === 1 ? 'Prize Category' : 'Prize Categories'}</span>
          </span>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : prizes.length >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : prizes.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} gap-4 pt-1`}>
        {prizes.map((prize, index) => {
          const rankInfo = getRankBadgeInfo(prize.position, index);
          const hasValue = prize.value && prize.value.trim().length > 0;
          const winnersCount = prize.numberOfWinners || 1;

          return (
            <div
              key={prize.id || index}
              className={`relative rounded-2xl border p-5 transition-all hover:scale-[1.01] hover:shadow-md flex flex-col justify-between ${rankInfo.cardBg}`}
            >
              {/* Top Row: Rank Badge & Winner Count */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label={prize.position}>
                      {rankInfo.icon}
                    </span>
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${rankInfo.badgeBg}`}>
                      {prize.position}
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span>{winnersCount} {winnersCount === 1 ? 'Winner' : 'Winners'}</span>
                  </span>
                </div>

                {/* Prize Title */}
                <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug mt-1 font-display">
                  {prize.title}
                </h4>

                {/* Prize Value / Bounty Banner */}
                {hasValue && (
                  <div className="mt-3 p-3 rounded-xl bg-white/95 border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Reward Value
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono flex items-baseline gap-1 mt-0.5">
                      <span>{prize.value}</span>
                    </div>
                  </div>
                )}

                {/* Description & Inclusions */}
                {prize.description && (
                  <div className="mt-3 text-xs text-slate-600 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-slate-100">
                    {prize.description}
                  </div>
                )}
              </div>

              {/* Bottom Tag: Prize Type */}
              <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${rankInfo.typeBadge}`}>
                  {getTypeIcon(prize.type)}
                  <span>{prize.type || 'Cash'} Reward</span>
                </span>

                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" /> Verified Prize
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

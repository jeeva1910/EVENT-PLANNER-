import React, { useState } from 'react';
import {
  Trophy,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Gift,
  Award,
  Sparkles,
  DollarSign,
  Briefcase,
  FileCheck,
  Medal,
  HelpCircle,
  Layers,
  ChevronDown,
  Zap,
  Info
} from 'lucide-react';
import { IPrize, PrizeType } from '../types';

interface PrizesSectionBuilderProps {
  prizes: IPrize[];
  onChange: (prizes: IPrize[]) => void;
}

const PRESET_POSITIONS = [
  '1st Prize',
  '2nd Prize',
  '3rd Prize',
  'Winner',
  'Runner-up',
  '2nd Runner-up',
  'Best Innovation',
  'Best Design',
  'Best Pitch',
  'Special Mention',
  'People\'s Choice',
  'Consolation Prize'
];

const PRIZE_TYPES: { type: PrizeType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { type: 'Cash', label: 'Cash / Monetary', icon: DollarSign },
  { type: 'Voucher', label: 'Gift Voucher / Coupon', icon: Gift },
  { type: 'Internship', label: 'Internship / Job Opportunity', icon: Briefcase },
  { type: 'Certificate', label: 'Certificate / Badge', icon: FileCheck },
  { type: 'Trophy', label: 'Trophy / Medal', icon: Medal },
  { type: 'Goodies', label: 'Goodies / Swag / Hardware Kit', icon: Sparkles },
  { type: 'Other', label: 'Other Special Reward', icon: Award }
];

export const PrizesSectionBuilder: React.FC<PrizesSectionBuilderProps> = ({ prizes, onChange }) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'templates'>('editor');

  const handleAddPrize = (preset?: Partial<IPrize>) => {
    const nextRank = prizes.length === 0 ? '1st Prize' : prizes.length === 1 ? '2nd Prize' : prizes.length === 2 ? '3rd Prize' : `Special Prize #${prizes.length + 1}`;
    const newPrize: IPrize = {
      id: `prz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      position: preset?.position || nextRank,
      title: preset?.title || (prizes.length === 0 ? 'Grand Prize' : prizes.length === 1 ? 'Runner-Up Award' : prizes.length === 2 ? 'Second Runner-Up' : 'Special Mention'),
      value: preset?.value || '',
      type: preset?.type || 'Cash',
      description: preset?.description || '',
      numberOfWinners: preset?.numberOfWinners || 1
    };
    onChange([...prizes, newPrize]);
  };

  const handleUpdatePrize = (index: number, updates: Partial<IPrize>) => {
    const updated = [...prizes];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleDeletePrize = (index: number) => {
    onChange(prizes.filter((_, i) => i !== index));
  };

  const handleMovePrize = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === prizes.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...prizes];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    onChange(reordered);
  };

  const handleApplyTemplate = (templateType: 'top3' | 'hackathon' | 'singleWinner' | 'clear') => {
    if (templateType === 'clear') {
      onChange([]);
      return;
    }

    if (templateType === 'top3') {
      onChange([
        {
          id: `prz_${Date.now()}_1`,
          position: '1st Prize',
          title: 'Grand Winner / Champion',
          value: '₹50,000',
          type: 'Cash',
          description: 'Cash reward + Champion Trophy + Certificate of Excellence',
          numberOfWinners: 1
        },
        {
          id: `prz_${Date.now()}_2`,
          position: '2nd Prize',
          title: 'Runner-Up',
          value: '₹25,000',
          type: 'Cash',
          description: 'Cash reward + Runner-up Trophy + Certificate of Merit',
          numberOfWinners: 1
        },
        {
          id: `prz_${Date.now()}_3`,
          position: '3rd Prize',
          title: 'Second Runner-Up',
          value: '₹10,000',
          type: 'Cash',
          description: 'Cash reward + Certificate of Merit',
          numberOfWinners: 1
        }
      ]);
    } else if (templateType === 'hackathon') {
      onChange([
        {
          id: `prz_${Date.now()}_1`,
          position: '1st Prize',
          title: 'Overall Hackathon Champion',
          value: '₹1,00,000',
          type: 'Cash',
          description: 'Cash prize + Direct Incubation Entry + Winner Trophy + Certificate',
          numberOfWinners: 1
        },
        {
          id: `prz_${Date.now()}_2`,
          position: '2nd Prize',
          title: 'First Runner-Up',
          value: '₹50,000',
          type: 'Cash',
          description: 'Cash prize + Fast-track interview access + Trophy + Certificate',
          numberOfWinners: 1
        },
        {
          id: `prz_${Date.now()}_3`,
          position: 'Best Innovation',
          title: 'Jury Choice Innovation Award',
          value: '₹20,000',
          type: 'Cash',
          description: 'Cash prize + Mentorship with Industry VCs + Certificate',
          numberOfWinners: 1
        },
        {
          id: `prz_${Date.now()}_4`,
          position: 'Best Design',
          title: 'Best UI/UX & Product Design',
          value: 'Goodies & Cloud Credits ($500)',
          type: 'Goodies',
          description: 'Premium Developer Swag Kit + Cloud Subscription credits + Certificate',
          numberOfWinners: 1
        }
      ]);
    } else if (templateType === 'singleWinner') {
      onChange([
        {
          id: `prz_${Date.now()}_1`,
          position: 'Winner',
          title: 'Grand Winner Award',
          value: '₹15,000',
          type: 'Cash',
          description: 'Winner Trophy + Cash Prize + Certificate of Excellence',
          numberOfWinners: 1
        }
      ]);
    }
  };

  const getRankBadgeStyle = (pos: string) => {
    const lower = (pos || '').toLowerCase();
    if (lower.includes('1st') || lower.includes('winner') || lower.includes('gold') || lower.includes('champion')) {
      return {
        bg: 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300 text-amber-900',
        badge: 'bg-amber-500 text-white',
        icon: '🥇'
      };
    }
    if (lower.includes('2nd') || lower.includes('runner') || lower.includes('silver')) {
      return {
        bg: 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300 text-slate-800',
        badge: 'bg-slate-400 text-white',
        icon: '🥈'
      };
    }
    if (lower.includes('3rd') || lower.includes('bronze')) {
      return {
        bg: 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 text-orange-900',
        badge: 'bg-amber-700 text-white',
        icon: '🥉'
      };
    }
    return {
      bg: 'bg-gradient-to-br from-indigo-50/50 to-blue-50/50 border-indigo-200 text-indigo-900',
      badge: 'bg-indigo-600 text-white',
      icon: '🏆'
    };
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Presets */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 p-5 rounded-2xl border border-amber-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Prizes, Bounties & Winner Rewards
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {prizes.length} {prizes.length === 1 ? 'Prize Tier' : 'Prize Tiers'} Configured
                </span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Reward hackathon, coding contest, quiz, or fest participants with cash bounties, certificates, internships, and trophies.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyTemplate('top3')}
              className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Top 3 Podium</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('hackathon')}
              className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-300 rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Hackathon Track</span>
            </button>
            {prizes.length > 0 && (
              <button
                type="button"
                onClick={() => handleApplyTemplate('clear')}
                className="px-2.5 py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition-colors"
                title="Clear all prizes"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prizes List */}
      {prizes.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-4 bg-slate-50/50">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-slate-900">No prizes configured yet</h4>
            <p className="text-xs text-slate-500">
              Events without prizes will remain standard gatherings. Add prizes for competitions, hackathons, quizzes, gaming tournaments, or fests to boost registrations!
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => handleAddPrize()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Prize</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('hackathon')}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Use Hackathon Template</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {prizes.map((prize, index) => {
            const style = getRankBadgeStyle(prize.position);
            return (
              <div
                key={prize.id || index}
                className={`p-5 rounded-2xl border transition-all shadow-xs ${style.bg}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/5 pb-3.5 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl" role="img" aria-label="Prize rank">
                      {style.icon}
                    </span>
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-black/5 text-slate-800">
                      Tier #{index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {prize.position || 'Prize Rank'} — {prize.title || 'Untitled'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 self-end md:self-auto">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMovePrize(index, 'up')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === prizes.length - 1}
                      onClick={() => handleMovePrize(index, 'down')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePrize(index)}
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100/80 rounded-lg transition-colors ml-1"
                      title="Delete Prize Tier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Position / Rank */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Position / Rank *</span>
                    </label>
                    <div className="space-y-1">
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1st Prize, Winner"
                        value={prize.position}
                        onChange={(e) => handleUpdatePrize(index, { position: e.target.value })}
                        list={`presets-${index}`}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900 shadow-2xs"
                      />
                      <datalist id={`presets-${index}`}>
                        {PRESET_POSITIONS.map((pos) => (
                          <option key={pos} value={pos} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Prize Title */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Prize Title / Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grand Prize, Best AI Hack"
                      value={prize.title}
                      onChange={(e) => handleUpdatePrize(index, { title: e.target.value })}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 shadow-2xs"
                    />
                  </div>

                  {/* Prize Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Prize Category / Type
                    </label>
                    <select
                      value={prize.type || 'Cash'}
                      onChange={(e) => handleUpdatePrize(index, { type: e.target.value as PrizeType })}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 shadow-2xs"
                    >
                      {PRIZE_TYPES.map((pt) => (
                        <option key={pt.type} value={pt.type}>
                          {pt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Prize Value */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Value / Bounty</span>
                      <span className="text-[10px] text-slate-500 font-normal">e.g. ₹50,000 / $500</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ₹50,000 or Internship"
                      value={prize.value || ''}
                      onChange={(e) => handleUpdatePrize(index, { value: e.target.value })}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold text-emerald-800 shadow-2xs"
                    />
                  </div>

                  {/* Number of Winners */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Number of Winners</span>
                      <span className="text-[10px] text-slate-500 font-normal">e.g. 1 team / person</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={prize.numberOfWinners || 1}
                      onChange={(e) => handleUpdatePrize(index, { numberOfWinners: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 shadow-2xs"
                    />
                  </div>

                  {/* Description / Perks */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Perks & Inclusions Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cash prize + certificate of excellence + fast-track interview opportunity + goodies kit"
                      value={prize.description || ''}
                      onChange={(e) => handleUpdatePrize(index, { description: e.target.value })}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-normal text-slate-800 shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleAddPrize()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Prize Tier</span>
            </button>

            <span className="text-xs text-slate-500 font-medium">
              💡 Drag or use Up/Down arrows to reorder podium positions.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

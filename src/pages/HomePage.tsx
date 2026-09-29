import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  Compass,
  Sparkles,
  MapPin,
  Accessibility,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Users,
  ChevronRight,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { api } from '../services/api';
import { IEvent, ICategory } from '../types';
import { EventCard } from '../components/EventCard';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredEvents, setFeaturedEvents] = useState<IEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<IEvent[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [eventsRes, catsRes] = await Promise.all([
          api.getEvents({ limit: 8, sortBy: 'upcoming' }),
          api.getCategories()
        ]);
        const all = eventsRes?.events || [];
        setFeaturedEvents(all.slice(0, 2));
        setUpcomingEvents(all);
        setCategories(catsRes?.categories || []);
      } catch (err) {
        console.error('Failed to load homepage data', err);
        setFeaturedEvents([]);
        setUpcomingEvents([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/explore');
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-blue-200 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Centralized Event Planning & Management</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-display max-w-4xl mx-auto text-balance leading-tight">
            Discover Events. Connect. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300">Experience More.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            From technical hackathons and academic summits to collegiate cultural festivals. Discover verified events, reserve instant QR passes, and travel with smart accessibility guidance.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={handleSearch}
              className="p-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1 flex items-center">
                <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Search hackathons, AI summits, workshops, cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-white placeholder-slate-400 text-sm pl-3 pr-4 py-2.5 focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 shrink-0 flex items-center justify-center gap-2"
              >
                <span>Find Events</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick popular tags */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span>Trending:</span>
              <button
                onClick={() => navigate('/explore?category=Hackathon')}
                className="hover:text-white transition-colors underline decoration-slate-600 underline-offset-4"
              >
                Hackathons
              </button>
              <span>·</span>
              <button
                onClick={() => navigate('/explore?category=Technical')}
                className="hover:text-white transition-colors underline decoration-slate-600 underline-offset-4"
              >
                AI & Cloud
              </button>
              <span>·</span>
              <button
                onClick={() => navigate('/explore?category=Workshop')}
                className="hover:text-white transition-colors underline decoration-slate-600 underline-offset-4"
              >
                TypeScript Labs
              </button>
              <span>·</span>
              <button
                onClick={() => navigate('/explore?category=Cultural')}
                className="hover:text-white transition-colors underline decoration-slate-600 underline-offset-4"
              >
                Cultural Fests
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display">
              Explore by Category
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Find curated gatherings tailored to your professional and collegiate interests
            </p>
          </div>
          <Link
            to="/categories"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.slice(0, 8).map((cat) => (
            <Link
              key={cat._id}
              to={`/explore?category=${encodeURIComponent(cat.name)}`}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                <span className="text-[11px] font-mono font-semibold text-slate-400 tabular-nums">
                  {cat.eventCount || 0} events
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-display">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured / Upcoming Events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <h2 className="text-2xl font-bold text-slate-900 font-display">
                Featured & Upcoming Events
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Top-rated conferences, workshops, and competitions with open registrations
            </p>
          </div>

          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <span>Browse All Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-100 animate-pulse rounded-2xl h-80"></div>
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No events currently scheduled</p>
            <p className="text-xs text-slate-500 mt-1">Check back soon or create your own event listing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((evt) => (
              <EventCard key={evt._id} event={evt} />
            ))}
          </div>
        )}
      </section>

      {/* Unique Capabilities Feature Grid */}
      <section className="bg-slate-100/70 border-y border-slate-200/80 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
              Engineered for the Complete Event Lifecycle
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              EventHub eliminates scattered information with native integrations for ticketing, venue transit, and accessibility compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: Digital Tickets & Auto Waitlist */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-4 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                QR Digital Tickets & Waitlist Engine
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unique encrypted ticket passes with instant mobile camera check-in for organizers. When events reach full capacity, automatic waitlist queues promote attendees when spots free up.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-blue-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Zero overbooking concurrency protection</span>
              </div>
            </div>

            {/* Feature 2: Smart Route & Transit Guidance */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-4 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Smart Route & Transit Guidance
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Attendees receive integrated multi-modal transit guidance (bus, subway, driving, walking) directly to the venue gates with direct 1-click Google Maps synchronization.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-indigo-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Turn-by-turn navigation & parking hubs</span>
              </div>
            </div>

            {/* Feature 3: Verified Venue Accessibility */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-4 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Accessibility className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Inclusive Venue Accessibility
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filter and verify facilities including wheelchair power entrances, step-free access, elevators, ASL sign language interpreters, and T-coil hearing loops.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Organizer-verified accessibility checklists</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 font-display">How EventHub Works</h2>
          <p className="text-xs text-slate-500">Three streamlined steps for participants and organizers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-3">
            <span className="text-2xl font-extrabold font-display text-blue-600">01.</span>
            <h3 className="text-base font-bold text-slate-900">Explore & Filter</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Filter by date, category, hybrid format, and required accessibility accommodations to find exact matches.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-3">
            <span className="text-2xl font-extrabold font-display text-indigo-600">02.</span>
            <h3 className="text-base font-bold text-slate-900">1-Click Pass & Calendar Sync</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Obtain instant digital QR tickets, sync to Google Calendar, or enter orderly waitlists with automatic seat promotion.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-3">
            <span className="text-2xl font-extrabold font-display text-emerald-600">03.</span>
            <h3 className="text-base font-bold text-slate-900">Scan In & Share Feedback</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Arrive with transit guidance, scan in at the door, and share verified attendee ratings to support event communities.
            </p>
          </div>
        </div>
      </section>

      {/* Organizer Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              For College Clubs, Tech Communities & Conferences
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-display leading-tight">
              Host Your Next Event on EventHub
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Manage multi-track agendas, speaker profiles, registrations, QR attendance verification, and comprehensive attendance analytics from one intuitive dashboard.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {user?.role === 'organizer' ? (
              <Link
                to="/events/create"
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <span>Create New Event</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/register"
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <span>Register as Organizer</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link
              to="/explore"
              className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors text-center"
            >
              Explore Existing Events
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

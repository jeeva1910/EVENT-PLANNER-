import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Accessibility,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Users,
  CreditCard,
  Sparkles,
  Tag,
  X,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { IEvent, ICategory } from '../types';
import { EventCard } from '../components/EventCard';

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState<IEvent[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter States
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [eventType, setEventType] = useState(searchParams.get('eventType') || 'all');
  const [registrationType, setRegistrationType] = useState(searchParams.get('registrationType') || 'all');
  const [paymentType, setPaymentType] = useState(searchParams.get('paymentType') || 'all');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [accessibility, setAccessibility] = useState(searchParams.get('accessibility') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'upcoming');

  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Fetch categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.getCategories();
        setCategories(res.categories);
      } catch (err) {
        console.error(err);
      }
    }
    loadCategories();
  }, []);

  // Sync state to URL & fetch
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const res = await api.getEvents({
          search: search || undefined,
          category: category !== 'All' ? category : undefined,
          eventType: eventType !== 'all' ? eventType : undefined,
          registrationType: registrationType !== 'all' ? registrationType : undefined,
          paymentType: paymentType !== 'all' ? paymentType : undefined,
          city: city || undefined,
          accessibility: accessibility || undefined,
          sortBy: sortBy as any,
          page,
          limit: 9
        });
        setEvents(res?.events || []);
        setTotal(res?.total || 0);
        setTotalPages(res?.totalPages || 1);
      } catch (err) {
        console.error('Failed to fetch filtered events', err);
        setEvents([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }

    // Update query params
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (category && category !== 'All') params.category = category;
    if (eventType && eventType !== 'all') params.eventType = eventType;
    if (registrationType && registrationType !== 'all') params.registrationType = registrationType;
    if (paymentType && paymentType !== 'all') params.paymentType = paymentType;
    if (city) params.city = city;
    if (accessibility) params.accessibility = accessibility;
    if (sortBy && sortBy !== 'upcoming') params.sortBy = sortBy;
    if (page > 1) params.page = String(page);
    setSearchParams(params, { replace: true });

    fetchEvents();
  }, [search, category, eventType, registrationType, paymentType, city, accessibility, sortBy, page]);

  const handleResetFilters = () => {
    setSearch('');
    setCategory('All');
    setEventType('all');
    setRegistrationType('all');
    setPaymentType('all');
    setCity('');
    setAccessibility('');
    setSortBy('upcoming');
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const hasActiveFilters =
    search ||
    category !== 'All' ||
    eventType !== 'all' ||
    registrationType !== 'all' ||
    paymentType !== 'all' ||
    city ||
    accessibility;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Search Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display">
            Explore Events & Competitions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Discover hackathons, team challenges, tech conferences, workshops, and student summits.
          </p>
        </div>

        {/* Global Search Bar & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search events by title, topics, company, college, city, or tags..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFiltersMobile((prev) => !prev)}
              className="sm:hidden px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              )}
            </button>

            <div className="flex items-center gap-1.5 bg-white px-3 py-2 border border-slate-200 rounded-xl shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium hidden md:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-hidden cursor-pointer"
              >
                <option value="upcoming">Upcoming Date</option>
                <option value="popular">Most Popular</option>
                <option value="recent">Recently Added</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Category Chips Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => {
              setCategory('All');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
              category === 'All'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Events ({total})
          </button>
          {categories.map((c) => {
            const isSelected = category === c.name;
            return (
              <button
                key={c._id}
                onClick={() => {
                  setCategory(c.name);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Active Filters Chips Indicator */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Active Filters:</span>
            {category !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg font-medium border border-blue-100">
                Category: {category}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setCategory('All')} />
              </span>
            )}
            {eventType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg font-medium border border-blue-100 capitalize">
                Format: {eventType}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setEventType('all')} />
              </span>
            )}
            {registrationType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-lg font-medium border border-indigo-100 capitalize">
                Type: {registrationType}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setRegistrationType('all')} />
              </span>
            )}
            {paymentType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-medium border border-emerald-100 capitalize">
                Fee: {paymentType === 'free' ? 'Free Events' : 'Paid Events'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setPaymentType('all')} />
              </span>
            )}
            {city && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-medium border border-slate-200">
                City: {city}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setCity('')} />
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold ml-1 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Sidebar Filters + Event Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Sidebar */}
        <div className={`space-y-6 ${showFiltersMobile ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Filter Options
              </span>
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Participation / Registration Type Filter */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Participation Mode
              </label>
              <div className="space-y-1.5 text-xs">
                {[
                  { value: 'all', label: 'All Modes' },
                  { value: 'individual', label: 'Individual Only' },
                  { value: 'team', label: 'Team Participation Only' },
                  { value: 'both', label: 'Both Individual & Team' }
                ].map((item) => (
                  <label
                    key={item.value}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="registrationTypeFilter"
                      checked={registrationType === item.value}
                      onChange={() => {
                        setRegistrationType(item.value);
                        setPage(1);
                      }}
                      className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Pricing / Ticketing Model Filter */}
            <div className="space-y-2.5 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                Pricing Model
              </label>
              <div className="space-y-1.5 text-xs">
                {[
                  { value: 'all', label: 'All Events' },
                  { value: 'free', label: 'Free Admission Only' },
                  { value: 'paid', label: 'Paid Events Only' }
                ].map((item) => (
                  <label
                    key={item.value}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="paymentTypeFilter"
                      checked={paymentType === item.value}
                      onChange={() => {
                        setPaymentType(item.value);
                        setPage(1);
                      }}
                      className="text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Event Format Filter */}
            <div className="space-y-2.5 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-800">Event Format</label>
              <div className="space-y-1.5 text-xs">
                {[
                  { value: 'all', label: 'All Formats' },
                  { value: 'offline', label: 'In-Person Venue' },
                  { value: 'online', label: 'Online / Virtual' },
                  { value: 'hybrid', label: 'Hybrid' }
                ].map((item) => (
                  <label
                    key={item.value}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="eventTypeFilter"
                      checked={eventType === item.value}
                      onChange={() => {
                        setEventType(item.value);
                        setPage(1);
                      }}
                      className="text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span className="text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* City / Location Filter */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Filter by City
              </label>
              <input
                type="text"
                placeholder="e.g. Bengaluru, Delhi, SF..."
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Accessibility Feature Requirement */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Accessibility className="w-3.5 h-3.5 text-emerald-600" />
                Accessibility Feature
              </label>
              <select
                value={accessibility}
                onChange={(e) => {
                  setAccessibility(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              >
                <option value="">Any Accessibility</option>
                <option value="wheelchairEntrance">Wheelchair Accessible</option>
                <option value="elevators">Elevator Access</option>
                <option value="accessibleParking">Accessible Parking</option>
                <option value="hearingAssistance">Hearing Loop Available</option>
                <option value="signLanguageSupport">Sign Language (ASL/ISL)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Event Cards Stream */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3 animate-pulse"
                >
                  <div className="aspect-16/9 bg-slate-100 rounded-2xl"></div>
                  <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                No events matched your search criteria
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try widening your keyword search, resetting participation mode filters, or exploring all event categories.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                <span>
                  Showing <strong>{events.length}</strong> of <strong>{total}</strong> verified events
                </span>
                <span>Page {page} of {totalPages}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const pNum = i + 1;
                      return (
                        <button
                          key={pNum}
                          onClick={() => setPage(pNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            page === pNum
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

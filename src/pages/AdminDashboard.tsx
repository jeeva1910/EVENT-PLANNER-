import React, { useEffect, useState } from 'react';
import {
  Shield,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Tag,
  BarChart3,
  Layers,
  UserX,
  UserCheck,
  Search,
  Plus,
  Trash2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { IUser, IEvent, ICategory, IReport } from '../types';

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<IUser[]>([]);
  const [events, setEvents] = useState<IEvent[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [reports, setReports] = useState<IReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [adminTab, setAdminTab] = useState<'overview' | 'users' | 'events' | 'categories' | 'reports'>('overview');

  // Search filters
  const [userSearch, setUserSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');

  // Category creation modal/form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');

  // MongoDB Atlas live connection
  const [mongoUriInput, setMongoUriInput] = useState('');
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [connectingMongo, setConnectingMongo] = useState(false);
  const [mongoMessage, setMongoMessage] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, usersRes, eventsRes, catsRes, reportsRes, statusRes] = await Promise.all([
        api.getAdminAnalytics(),
        api.getAllUsers(),
        api.getEvents({ status: '', limit: 50 }),
        api.getCategories(),
        api.getReports(),
        fetch('/api/system/db-status').then((r) => r.json()).catch(() => null)
      ]);
      setAnalytics(analyticsRes || null);
      setUsers(usersRes?.users || []);
      setEvents(eventsRes?.events || []);
      setCategories(catsRes?.categories || []);
      setReports(reportsRes?.reports || []);
      if (statusRes) setDbStatus(statusRes);
    } catch (err) {
      console.error('Failed to load admin console', err);
      setUsers([]);
      setEvents([]);
      setCategories([]);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMongo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mongoUriInput.trim()) return;
    setConnectingMongo(true);
    setMongoMessage(null);
    try {
      const res = await fetch('/api/system/connect-mongodb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mongoUri: mongoUriInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Connection failed');
      setMongoMessage(data.message || 'Connected to MongoDB Atlas!');
      await fetchAdminData();
    } catch (err: any) {
      setMongoMessage(`❌ Error: ${err.message}`);
    } finally {
      setConnectingMongo(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleUserStatus = async (user: IUser) => {
    const newStatus = user.accountStatus === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to change ${user.name}'s status to ${newStatus}?`)) {
      return;
    }
    try {
      await api.updateUserStatus(user._id, { status: newStatus });
      await fetchAdminData();
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  const handleChangeUserRole = async (user: IUser, newRole: string) => {
    try {
      await api.updateUserStatus(user._id, { role: newRole });
      await fetchAdminData();
    } catch (err) {
      alert('Failed to update user role');
    }
  };

  const handleUpdateReport = async (reportId: string, status: string) => {
    const notes = prompt('Add optional resolution notes:');
    try {
      await api.updateReport(reportId, status, notes || undefined);
      await fetchAdminData();
    } catch (err) {
      alert('Failed to update report');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.createCategory({
        name: newCatName,
        description: newCatDesc,
        color: newCatColor
      });
      setNewCatName('');
      setNewCatDesc('');
      await fetchAdminData();
    } catch (err) {
      alert('Failed to create category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete this event category?')) return;
    try {
      await api.deleteCategory(id);
      await fetchAdminData();
    } catch (err) {
      alert('Failed to delete category');
    }
  };

  const filteredUsers = (users || []).filter(
    u =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredEvents = (events || []).filter(
    e =>
      e.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
      e.category.toLowerCase().includes(eventSearch.toLowerCase())
  );

  const summary = analytics?.summary || {
    totalUsers: 0,
    attendees: 0,
    organizers: 0,
    totalEvents: 0,
    publishedEvents: 0,
    totalRegistrations: 0,
    totalCheckedIn: 0,
    overallAttendanceRate: 0,
    pendingReports: 0
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              EventHub Global Governance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            Administrator Platform Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Platform-wide analytics, user authorization, category governance, and content moderation.
          </p>
        </div>

        {summary.pendingReports > 0 && (
          <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="text-xs">
              <strong className="font-bold text-white block">
                {summary.pendingReports} Pending Moderation Reports
              </strong>
              <button
                onClick={() => setAdminTab('reports')}
                className="text-red-300 underline font-medium hover:text-white"
              >
                Review Complaints
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl max-w-fit border border-slate-200">
        <button
          onClick={() => setAdminTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            adminTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Analytics & Overview
        </button>
        <button
          onClick={() => setAdminTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            adminTab === 'users'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          User Accounts ({users.length})
        </button>
        <button
          onClick={() => setAdminTab('events')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            adminTab === 'events'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Event Moderation ({events.length})
        </button>
        <button
          onClick={() => setAdminTab('categories')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            adminTab === 'categories'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Categories ({categories.length})
        </button>
        <button
          onClick={() => setAdminTab('reports')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            adminTab === 'reports'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Reports & Safety ({reports.length})
        </button>
        <button
          onClick={() => setAdminTab('database' as any)}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            (adminTab as any) === 'database'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          🍃 MongoDB Atlas Sync
        </button>
      </div>

      {/* Tab 1: Overview & Analytics */}
      {adminTab === 'overview' && (
        <div className="space-y-8">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-xs text-slate-500 font-medium">Total Registered Users</span>
              <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {summary.totalUsers}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-xs text-slate-500 font-medium">Platform Events</span>
              <p className="text-2xl font-bold text-blue-600 font-mono tabular-nums">
                {summary.totalEvents}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-xs text-slate-500 font-medium">Total Registrations</span>
              <p className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">
                {summary.totalRegistrations}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-xs text-slate-500 font-medium">Overall Attendance Rate</span>
              <p className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
                {summary.overallAttendanceRate}%
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Events by Category
                </h3>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.categoryData || []} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="count" name="Published Events" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User Breakdown */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  User Roles Distribution
                </h3>
              </div>

              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.usersByRole || []}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => `${entry.name || ''}: ${entry.value || entry.count || ''}`}
                    >
                      {analytics?.usersByRole?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User Accounts Management */}
      {adminTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
          <div className="p-6 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">
                Registered Platform Users ({users.length})
              </h2>
              <p className="text-xs text-slate-500">Manage account permissions, role assignment, and suspensions</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-y border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Organization / Dept</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                          alt={u.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeUserRole(u, e.target.value)}
                        className="p-1 text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                      >
                        <option value="attendee">Attendee</option>
                        <option value="organizer">Organizer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {u.organization || u.department || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          u.accountStatus === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {u.accountStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                          u.accountStatus === 'active'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {u.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Event Moderation */}
      {adminTab === 'events' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
          <div className="p-6 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">
                All Platform Events ({events.length})
              </h2>
              <p className="text-xs text-slate-500">Review content and moderate public listings</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-y border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Event Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Organizer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((e) => (
                  <tr key={e._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-slate-900">
                      <p className="font-bold text-slate-900 truncate max-w-sm">{e.title}</p>
                      <span className="text-[10px] text-slate-400">{e.venueName}, {e.city}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{e.category}</td>
                    <td className="py-3.5 px-4 text-slate-600">{e.organizer?.name || 'Organizer'}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {e.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-2">
                      <button
                        onClick={async () => {
                          const newStatus = e.status === 'published' ? 'draft' : 'published';
                          await api.updateEventStatus(e._id, newStatus);
                          await fetchAdminData();
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                      >
                        {e.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Delete event as administrator?')) {
                            await api.deleteEvent(e._id);
                            await fetchAdminData();
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Category Governance */}
      {adminTab === 'categories' && (
        <div className="space-y-6">
          {/* Add Category Form */}
          <form onSubmit={handleCreateCategory} className="p-6 bg-white rounded-3xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              Add New Platform Event Category
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Category Name (e.g. AI & Robotics)"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
              <input
                type="text"
                placeholder="Short Description"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="h-10 w-12 rounded-xl p-1 bg-slate-50 border border-slate-200 cursor-pointer"
                />
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                >
                  Create Category
                </button>
              </div>
            </div>
          </form>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat._id}
                className="p-5 bg-white rounded-2xl border border-slate-200 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                    <h4 className="text-sm font-bold text-slate-900">{cat.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500">{cat.description}</p>
                  <span className="text-[11px] font-mono text-slate-400 font-semibold block pt-1">
                    {cat.eventCount || 0} active events
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteCategory(cat._id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Moderation Reports Queue */}
      {adminTab === 'reports' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              Content & Conduct Moderation Queue ({reports.length})
            </h2>
            <p className="text-xs text-slate-500">Investigate attendee complaints and inappropriate listings</p>
          </div>

          {reports.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No reports filed. Platform is clean and safe!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.map((rep) => (
                <div key={rep._id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        {rep.reason}
                      </span>
                      <span className="text-xs font-semibold text-slate-900">
                        {rep.eventTitle ? `Target: Event "${rep.eventTitle}"` : `Target User: ${rep.targetUserName}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          rep.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {rep.status}
                      </span>
                      {rep.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateReport(rep._id, 'resolved')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{rep.details}"
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Reported by {rep.reporterName || 'Anonymous Attendee'} on{' '}
                    {new Date(rep.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: MongoDB Atlas Sync */}
      {(adminTab as any) === 'database' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                🍃 MongoDB Atlas Live Database Connection
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Connect your cloud cluster URI to store all users, events, registrations, and analytics persistently
              </p>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-xl ${
                dbStatus?.connectedToMongo
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              Active Engine: {dbStatus?.mode || 'Local Persistent Store'}
            </span>
          </div>

          {mongoMessage && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold ${
                mongoMessage.includes('✅') || mongoMessage.includes('Successfully')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {mongoMessage}
            </div>
          )}

          <form onSubmit={handleConnectMongo} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                MongoDB Connection String (URI)
              </label>
              <input
                type="text"
                placeholder="mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/eventhub?retryWrites=true&w=majority"
                value={mongoUriInput}
                onChange={(e) => setMongoUriInput(e.target.value)}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400">
                You can also configure this in the backend environment as <code className="font-mono text-slate-600">MONGODB_URI</code>.
              </p>
            </div>

            <button
              type="submit"
              disabled={connectingMongo || !mongoUriInput.trim()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-md flex items-center gap-2"
            >
              {connectingMongo ? 'Connecting & Syncing...' : 'Connect to MongoDB Atlas'}
            </button>
          </form>

          {/* Database Models Overview */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Connected Mongoose Schemas & Collections
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { name: 'users', label: 'User Accounts & Roles' },
                { name: 'events', label: 'Events & Schedules' },
                { name: 'registrations', label: 'Tickets & Waitlists' },
                { name: 'categories', label: 'Event Categories' },
                { name: 'notifications', label: 'Alerts & Reminders' },
                { name: 'feedbacks', label: 'Attendee Reviews' },
                { name: 'reports', label: 'Moderation Reports' }
              ].map((m) => (
                <div key={m.name} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="font-mono font-bold text-slate-900">{m.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

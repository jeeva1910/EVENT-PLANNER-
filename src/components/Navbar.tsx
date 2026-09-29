import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Bell,
  User,
  LogOut,
  PlusCircle,
  LayoutDashboard,
  Shield,
  Menu,
  X,
  Compass,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { NotificationDrawer } from './NotificationDrawer';

export const Navbar: React.FC = () => {
  const { user, logout, loginDemo } = useAuth();
  const { unreadCount, toggleOpen } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Demo Account Switcher Bar for Reviewers */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            EventHub Live System
          </span>
          <span className="hidden md:inline text-slate-400">· Full-stack MERN with QR Ticketing & Analytics</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-slate-400">Quick Demo Switch:</span>
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-md">
            <button
              onClick={() => loginDemo('attendee')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                user?.role === 'attendee'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Attendee
            </button>
            <button
              onClick={() => loginDemo('organizer')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                user?.role === 'organizer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Organizer
            </button>
            <button
              onClick={() => loginDemo('admin')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                user?.role === 'admin'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-display">
              EventHub
            </span>
          </Link>

          {/* Zone 2: Primary Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link
              to="/explore"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/explore') ? 'text-blue-600 font-semibold' : 'hover:text-slate-900'
              }`}
            >
              <Compass className="w-4 h-4" />
              Explore Events
            </Link>
            <Link
              to="/categories"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/categories') ? 'text-blue-600 font-semibold' : 'hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              Categories
            </Link>
            {user?.role === 'organizer' && (
              <Link
                to="/events/create"
                className={`flex items-center gap-1.5 text-indigo-600 font-semibold transition-colors hover:text-indigo-700`}
              >
                <PlusCircle className="w-4 h-4" />
                Create Event
              </Link>
            )}
            {user?.role === 'attendee' && (
              <Link
                to="/dashboard/attendee"
                className={`transition-colors ${
                  isActive('/dashboard/attendee') ? 'text-blue-600 font-semibold' : 'hover:text-slate-900'
                }`}
              >
                My Tickets
              </Link>
            )}
            {user?.role === 'organizer' && (
              <Link
                to="/dashboard/organizer"
                className={`transition-colors ${
                  isActive('/dashboard/organizer') ? 'text-blue-600 font-semibold' : 'hover:text-slate-900'
                }`}
              >
                Organizer Dashboard
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link
                to="/dashboard/admin"
                className={`flex items-center gap-1.5 text-emerald-700 font-semibold transition-colors hover:text-emerald-800`}
              >
                <Shield className="w-4 h-4" />
                Admin Console
              </Link>
            )}
          </nav>
        </div>

        {/* Zone 3: Actions, Notifications & Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Notifications Bell */}
              <button
                onClick={toggleOpen}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(prev => !prev)}
                  className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <img
                    src={user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {user.role === 'admin' ? 'Administrator' : user.role === 'organizer' ? 'Organizer' : 'Attendee'}
                      </span>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      My Profile
                    </Link>

                    {user.role === 'attendee' && (
                      <Link
                        to="/dashboard/attendee"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-400" />
                        Attendee Dashboard
                      </Link>
                    )}

                    {user.role === 'organizer' && (
                      <>
                        <Link
                          to="/dashboard/organizer"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-slate-400" />
                          Organizer Dashboard
                        </Link>
                        <Link
                          to="/events/create"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <PlusCircle className="w-4 h-4 text-slate-400" />
                          Create New Event
                        </Link>
                      </>
                    )}

                    {user.role === 'admin' && (
                      <Link
                        to="/dashboard/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Shield className="w-4 h-4 text-slate-400" />
                        Admin Dashboard
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/explore"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
          >
            Explore Events
          </Link>
          <Link
            to="/categories"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
          >
            Categories
          </Link>
          {user?.role === 'organizer' && (
            <Link
              to="/events/create"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-indigo-600"
            >
              + Create Event
            </Link>
          )}
          {user ? (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <Link
                to={
                  user.role === 'admin'
                    ? '/dashboard/admin'
                    : user.role === 'organizer'
                    ? '/dashboard/organizer'
                    : '/dashboard/attendee'
                }
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-blue-600"
              >
                My Dashboard
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-slate-700"
              >
                Profile Settings
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="block w-full text-left py-2 text-base font-medium text-red-600"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-medium border border-slate-300 rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-medium text-white bg-blue-600 rounded-lg"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Notification Drawer Component */}
      <NotificationDrawer />
    </header>
  );
};

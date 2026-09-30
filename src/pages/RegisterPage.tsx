import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Lock, Mail, User, Building, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'attendee' | 'organizer'>('attendee');
  const [organization, setOrganization] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await register({
        name,
        email,
        password,
        role,
        organization,
        department
      });
      if (role === 'organizer') navigate('/dashboard/organizer');
      else navigate('/explore');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Calendar className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Create an Account</h1>
          <p className="text-xs text-slate-500">
            Join the centralized event network as an Attendee or Organizer
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selector */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Account Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('attendee')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-colors ${
                  role === 'attendee'
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                Attendee (Participant)
              </button>
              <button
                type="button"
                onClick={() => setRole('organizer')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-colors ${
                  role === 'organizer'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                Event Organizer
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Organization / College</label>
              <input
                type="text"
                placeholder="Metro State"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Department</label>
              <input
                type="text"
                placeholder="Comp Sci"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Password (min 6 chars)</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

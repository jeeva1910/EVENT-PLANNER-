import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Heart, Shield, Accessibility, Sparkles, MapPin, Mail, Phone } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white font-display">EventHub</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              The centralized event planning and management ecosystem connecting organizers, attendees, and admins with live QR ticketing, accessibility discovery, and smart route guidance.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-medium pt-1">
              <Accessibility className="w-3.5 h-3.5" />
              <span>WCAG AA Accessible & Inclusive Platform</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Explore</p>
            <ul className="space-y-2">
              <li>
                <Link to="/explore" className="hover:text-white transition-colors">
                  All Events
                </Link>
              </li>
              <li>
                <Link to="/explore?category=Hackathon" className="hover:text-white transition-colors">
                  Hackathons & Sprints
                </Link>
              </li>
              <li>
                <Link to="/explore?category=Technical" className="hover:text-white transition-colors">
                  Tech Conferences
                </Link>
              </li>
              <li>
                <Link to="/explore?category=Workshop" className="hover:text-white transition-colors">
                  Hands-on Workshops
                </Link>
              </li>
              <li>
                <Link to="/explore?category=Cultural" className="hover:text-white transition-colors">
                  Collegiate Cultural Fests
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Features */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Platform & Tools</p>
            <ul className="space-y-2">
              <li>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  Anti-Overbooking Waitlists
                </span>
              </li>
              <li>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  Google Calendar & .ICS Sync
                </span>
              </li>
              <li>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  Smart Route Guidance
                </span>
              </li>
              <li>
                <Link to="/events/create" className="hover:text-white transition-colors">
                  Organizer Registration
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-white transition-colors">
                  Category Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Contact & Support</p>
            <p className="text-slate-400 leading-relaxed">
              Have questions about organizing your collegiate or community conference?
            </p>
            <div className="space-y-1.5 text-slate-300">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>support@eventhub.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>+1 (800) 555-HUB1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} EventHub Platform. Built with React, Node.js, Express & MongoDB.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Accessibility Statement</span>
            <span>Security Governance</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

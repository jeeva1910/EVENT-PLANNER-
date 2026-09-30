import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCheck, Bell, Calendar, Award, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

export const NotificationDrawer: React.FC = () => {
  const { isOpen, close, notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  // Keyboard navigation: Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'registration_confirmed':
      case 'waitlist_promoted':
      case 'attendance_marked':
        return <Award className="w-4 h-4 text-emerald-600" />;
      case 'event_reminder':
      case 'schedule_update':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'event_cancelled':
      case 'registration_cancelled':
      case 'account_alert':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-indigo-600" />;
    }
  };

  const handleNotificationClick = async (id: string, actionUrl?: string) => {
    await markAsRead(id);
    if (actionUrl) {
      close();
      navigate(actionUrl);
    }
  };

  const drawerContent = (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Notification Center"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative z-10 w-full sm:w-[420px] max-w-full h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 ease-out">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 font-display">Notifications</h2>
            <span className="text-xs text-slate-500 font-medium">({notifications.length})</span>
          </div>

          <div className="flex items-center gap-2">
            {notifications.some(n => !n.readStatus) && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              aria-label="Close notifications panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && notifications.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No notifications yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Updates on your registrations, tickets, waitlist status, and event schedules will show up here.
              </p>
            </div>
          ) : (
            notifications.map(item => (
              <div
                key={item._id}
                onClick={() => handleNotificationClick(item._id, item.actionUrl)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  item.readStatus
                    ? 'bg-white border-slate-100 hover:border-slate-200 opacity-80'
                    : 'bg-blue-50/60 border-blue-100 hover:border-blue-200 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-xl bg-white shadow-xs shrink-0 border border-slate-100">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs ${item.readStatus ? 'font-medium text-slate-800' : 'font-bold text-slate-900'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                    {item.actionUrl && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};

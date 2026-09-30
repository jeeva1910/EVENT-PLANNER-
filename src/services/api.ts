import {
  IUser,
  IEvent,
  IRegistration,
  ICategory,
  INotification,
  IFeedback,
  IReport
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('eventhub_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  // --- Auth ---
  async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    department?: string;
    organization?: string;
  }): Promise<{ user: IUser; token: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: IUser }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getProfile(): Promise<{ user: IUser }> {
    const res = await fetch(`${API_BASE}/users/profile`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateProfile(data: Partial<IUser>): Promise<{ user: IUser; message: string }> {
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getAllUsers(): Promise<{ users: IUser[] }> {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateUserStatus(
    id: string,
    updates: { status?: string; role?: string }
  ): Promise<{ user: IUser; message: string }> {
    const res = await fetch(`${API_BASE}/users/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },

  // --- Events ---
  async getEvents(params: {
    search?: string;
    category?: string;
    eventType?: string;
    city?: string;
    organizerId?: string;
    status?: string;
    accessibility?: string;
    registrationType?: string;
    minTeamSize?: number;
    maxTeamSize?: number;
    paymentType?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ events: IEvent[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const res = await fetch(`${API_BASE}/events?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getEventById(id: string): Promise<{ event: IEvent; userRegistration: IRegistration | null }> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createEvent(eventData: Partial<IEvent>): Promise<{ event: IEvent; message: string }> {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData)
    });
    return handleResponse(res);
  },

  async updateEvent(id: string, eventData: Partial<IEvent>): Promise<{ event: IEvent; message: string }> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData)
    });
    return handleResponse(res);
  },

  async updateEventStatus(id: string, status: string): Promise<{ event: IEvent; message: string }> {
    const res = await fetch(`${API_BASE}/events/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  async cancelEvent(id: string, reason?: string): Promise<{ event: IEvent; message: string; notifiedCount?: number }> {
    const res = await fetch(`${API_BASE}/events/${id}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  async deleteEvent(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // --- Registrations & Teams ---
  async registerForEvent(
    eventId: string,
    payload: {
      registrationType?: 'individual' | 'team';
      teamName?: string;
      teamMembers?: any[];
      participantDetails?: any;
      customAnswers?: Record<string, any>;
      paymentDetails?: any;
      termsAccepted?: boolean;
      notes?: string;
      sendInvitations?: boolean;
    }
  ): Promise<{ registration: IRegistration; status: string; message: string; emailWarning?: string; invitations?: any[] }> {
    const res = await fetch(`${API_BASE}/events/${eventId}/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async getInvitation(token: string): Promise<{
    invitation: any;
    event: IEvent;
    registration: IRegistration;
    isExpired: boolean;
  }> {
    const res = await fetch(`${API_BASE}/invitations/${token}`);
    return handleResponse(res);
  },

  async acceptInvitation(token: string): Promise<{
    invitation: any;
    registration: IRegistration;
    isTeamFullyConfirmed: boolean;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/invitations/${token}/accept`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async declineInvitation(token: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/invitations/${token}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  async resendTeamInvitation(invitationId: string): Promise<{ success: boolean; message: string; rawToken?: string }> {
    const res = await fetch(`${API_BASE}/teams/invitations/${invitationId}/resend`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async removeTeamMember(registrationId: string, memberEmail: string): Promise<{ success: boolean; message: string; registration: IRegistration }> {
    const res = await fetch(`${API_BASE}/teams/registrations/${registrationId}/members/${encodeURIComponent(memberEmail)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getTeamRegistration(registrationId: string): Promise<{
    registration: IRegistration;
    invitations: any[];
    event: IEvent;
  }> {
    const res = await fetch(`${API_BASE}/teams/registrations/${registrationId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getEmailStatus(): Promise<{ configured: boolean; provider: string; fromAddress: string }> {
    const res = await fetch(`${API_BASE}/system/email-status`);
    return handleResponse(res);
  },

  async getMyRegistrations(): Promise<{ registrations: IRegistration[] }> {
    const res = await fetch(`${API_BASE}/registrations/my`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async cancelRegistration(id: string): Promise<{ message: string; refundMessage?: string; refundStatus?: string }> {
    const res = await fetch(`${API_BASE}/registrations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async cancelTicket(ticketId: string): Promise<{ message: string; refundMessage?: string; refundStatus?: string }> {
    const res = await fetch(`${API_BASE}/tickets/${encodeURIComponent(ticketId)}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getEventAttendees(eventId: string): Promise<{ attendees: IRegistration[] }> {
    const res = await fetch(`${API_BASE}/events/${eventId}/attendees`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getAttendeesExportUrl(eventId: string): string {
    return `${API_BASE}/events/${eventId}/attendees/export`;
  },

  async exportAttendeesCsv(eventId: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/events/${eventId}/attendees/export`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to export attendee roster');
    }
    return res.blob();
  },

  async verifyPayment(registrationId: string): Promise<{ registration: IRegistration; message: string }> {
    const res = await fetch(`${API_BASE}/registrations/${registrationId}/verify-payment`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async rejectPayment(registrationId: string, reason?: string): Promise<{ registration: IRegistration; message: string }> {
    const res = await fetch(`${API_BASE}/registrations/${registrationId}/reject-payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  async verifyTicket(ticketId: string): Promise<{ registration: IRegistration; event: IEvent; message: string }> {
    const res = await fetch(`${API_BASE}/registrations/verify-ticket`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ticketId })
    });
    return handleResponse(res);
  },

  async getTicketDetails(ticketId: string): Promise<{ registration: IRegistration; event: IEvent }> {
    const res = await fetch(`${API_BASE}/tickets/${encodeURIComponent(ticketId)}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // --- Notifications ---
  async getNotifications(): Promise<{ notifications: INotification[] }> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // --- Feedback ---
  async submitFeedback(
    eventId: string,
    rating: number,
    comment: string
  ): Promise<{ feedback: IFeedback; message: string }> {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ eventId, rating, comment })
    });
    return handleResponse(res);
  },

  async getEventFeedback(eventId: string): Promise<{ feedbacks: IFeedback[] }> {
    const res = await fetch(`${API_BASE}/events/${eventId}/feedback`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // --- Categories ---
  async getCategories(): Promise<{ categories: ICategory[] }> {
    const res = await fetch(`${API_BASE}/categories`);
    return handleResponse(res);
  },

  async createCategory(data: Partial<ICategory>): Promise<{ category: ICategory; message: string }> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // --- Reports ---
  async submitReport(data: Partial<IReport>): Promise<{ report: IReport; message: string }> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getReports(): Promise<{ reports: IReport[] }> {
    const res = await fetch(`${API_BASE}/reports`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateReport(id: string, status: string, adminNotes?: string): Promise<{ report: IReport; message: string }> {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, adminNotes })
    });
    return handleResponse(res);
  },

  // --- Analytics ---
  async getOrganizerAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/organizer`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/admin`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // --- Calendar ---
  async getGoogleCalendarUrl(eventId: string): Promise<{ url: string }> {
    const res = await fetch(`${API_BASE}/calendar/${eventId}/google-url`);
    return handleResponse(res);
  },

  // --- File / Image Upload ---
  async uploadImage(imageBase64: string, filename?: string): Promise<{ url: string; public_id?: string; message: string }> {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ imageBase64, filename })
    });
    return handleResponse(res);
  },

  async uploadProfilePicture(imageBase64: string, filename?: string): Promise<{ user: IUser; url: string; publicId: string; message: string }> {
    const res = await fetch(`${API_BASE}/users/profile/picture`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ imageBase64, filename })
    });
    return handleResponse(res);
  },

  async removeProfilePicture(): Promise<{ user: IUser; message: string }> {
    const res = await fetch(`${API_BASE}/users/profile/picture`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getIcsDownloadUrl(eventId: string): string {
    return `${API_BASE}/calendar/${eventId}/ics`;
  }
};

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { IRegistration, IEvent } from '../types';

export interface GenerateTicketPdfOptions {
  registration: IRegistration;
  event: IEvent;
  attendeeName?: string;
  attendeeEmail?: string;
}

/**
 * Generates and triggers the download of a high-resolution, professional PDF event ticket.
 * Incorporates verified QR code data, event details, venue information, and attendee details.
 */
export async function downloadTicketPdf({
  registration,
  event,
  attendeeName,
  attendeeEmail
}: GenerateTicketPdfOptions): Promise<void> {
  if (!registration || !event) {
    throw new Error('Registration and event details are required to generate ticket.');
  }

  // 1. Generate real QR code as high-res PNG data URI
  const qrPayload = JSON.stringify({
    ticketId: registration.ticketId,
    eventId: event._id,
    attendeeId: registration.attendeeId
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 320,
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  // 2. Initialize jsPDF (A5 portrait: 148mm x 210mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const pageWidth = 148;
  const pageHeight = 210;

  // Background card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer border
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 6, 6, 'S');

  // Top header banner (Slate-900 with Indigo accent)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(8, 8, pageWidth - 16, 32, 6, 6, 'F');
  // Fill the bottom corners of header so it meets the border squarely
  doc.rect(8, 30, pageWidth - 16, 10, 'F');

  // Accent stripe
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(8, 39, pageWidth - 16, 2, 'F');

  // Brand title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('EVENTHUB', 16, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('OFFICIAL VERIFIED PASS', 16, 29);

  // Ticket Code in Header
  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(registration.ticketId, pageWidth - 16, 24, { align: 'right' });

  // Status Badge
  const isCancelled = registration.status === 'cancelled';
  const isCheckedIn = registration.attendanceStatus === 'checked_in';
  const isWaitlisted = registration.status === 'waitlisted';

  let statusText = 'CONFIRMED PASS';
  let badgeR = 16, badgeG = 185, badgeB = 129; // emerald
  if (isCancelled) {
    statusText = 'CANCELLED';
    badgeR = 239; badgeG = 68; badgeB = 68; // red
  } else if (isCheckedIn) {
    statusText = 'CHECKED IN';
    badgeR = 59; badgeG = 130; badgeB = 246; // blue
  } else if (isWaitlisted) {
    statusText = `WAITLIST #${registration.waitlistPosition || 1}`;
    badgeR = 245; badgeG = 158; badgeB = 11; // amber
  }

  doc.setFillColor(badgeR, badgeG, badgeB);
  doc.roundedRect(pageWidth - 52, 28, 36, 6, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(statusText, pageWidth - 34, 32.5, { align: 'center' });

  // Event Category & Type
  let currentY = 50;
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const categoryLine = `${(event.category || 'EVENT').toUpperCase()} · ${(event.eventType || 'OFFLINE').toUpperCase()}`;
  doc.text(categoryLine, 16, currentY);

  // Event Title
  currentY += 6;
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const titleLines = doc.splitTextToSize(event.title, pageWidth - 32);
  doc.text(titleLines, 16, currentY);
  currentY += titleLines.length * 6 + 2;

  // Event Schedule & Venue Container Card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(16, currentY, pageWidth - 32, 34, 4, 4, 'FD');

  // Schedule Info (Left column)
  const startDate = new Date(event.startDateTime);
  const formattedDate = !isNaN(startDate.getTime())
    ? startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBD';
  const formattedTime = !isNaN(startDate.getTime())
    ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Time TBD';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('DATE & TIME', 22, currentY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formattedDate, 22, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(formattedTime, 22, currentY + 21);

  // Venue Info (Right column)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('VENUE / LOCATION', 80, currentY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const venueTitle = (event.venueName || 'Venue').substring(0, 24);
  doc.text(venueTitle, 80, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const cityLine = `${event.address ? event.address + ', ' : ''}${event.city || ''}`.substring(0, 30);
  doc.text(cityLine, 80, currentY + 21);

  currentY += 40;

  // Attendee Info Section
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16, currentY, pageWidth - 32, 22, 4, 4, 'FD');

  const nameToDisplay = attendeeName || (registration as any).attendee?.name || 'Registered Attendee';
  const emailToDisplay = attendeeEmail || (registration as any).attendee?.email || '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ATTENDEE DETAILS', 22, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(nameToDisplay, 22, currentY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const regTypeStr = registration.registrationType === 'team'
    ? `Team: ${registration.teamName || 'Team Pass'}`
    : 'Individual Pass';
  const attendeeMeta = emailToDisplay ? `${emailToDisplay} · ${regTypeStr}` : regTypeStr;
  doc.text(attendeeMeta, 22, currentY + 18);

  currentY += 28;

  // QR Code Area
  const qrBoxSize = 46;
  const qrX = (pageWidth - qrBoxSize) / 2;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.roundedRect(qrX - 4, currentY - 2, qrBoxSize + 8, qrBoxSize + 8, 4, 4, 'FD');

  doc.addImage(qrDataUrl, 'PNG', qrX, currentY, qrBoxSize, qrBoxSize);

  currentY += qrBoxSize + 10;

  // Monospace Ticket ID Below QR
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(registration.ticketId, pageWidth / 2, currentY, { align: 'center' });

  // Verification instructions
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Present this QR code or printed ticket pass at entrance check-in.', pageWidth / 2, currentY, {
    align: 'center'
  });

  // Footer Disclaimer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `EventHub Security Verified · Ticket issued ${new Date().toLocaleDateString()} · Non-transferable`,
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );

  // Trigger browser download
  const cleanFilename = `EventHub-Ticket-${registration.ticketId}.pdf`;
  doc.save(cleanFilename);
}

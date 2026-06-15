// NotificationService.js - Abstraction layer for outward Doctor Notifications
// Emulates messaging channels (WhatsApp, SMS, Email).
// Connects triggers to DbService for dashboard display.

import db from './DbService';

class NotificationService {
  /**
   * Simulates sending a dispatch notification to a doctor when an appointment changes.
   * @param {Object} appointment - The patient appointment record
   * @param {String} status - The resolved status ('Confirmed', 'Cancelled', 'Rescheduled')
   * @param {String} details - Details like new slot time or cancellation reason
   */
  async notifyDoctor(appointment, status, details = '') {
    const { patientName, doctorId, doctorName, phoneNumber } = appointment;
    
    // 1. Simulate network dispatch lag
    await new Promise(resolve => setTimeout(resolve, 800));

    // 2. Draft customized notification text
    let messageBody = '';
    if (status === 'Confirmed') {
      messageBody = `Patient ${patientName} has CONFIRMED their appointment for ${appointment.date} at ${appointment.time}.`;
    } else if (status === 'Cancelled') {
      messageBody = `Patient ${patientName} has CANCELLED their appointment. Reason: ${details || 'No reason provided'}.`;
    } else if (status === 'Rescheduled') {
      messageBody = `Patient ${patientName} has RESCHEDULED. New slot: ${appointment.date} at ${appointment.time}.`;
    }

    // 3. Log simulated communication to database logs
    db.addNotification(patientName, doctorId, doctorName, status, messageBody);
    db.addActivityLog(`Simulated dispatch to ${doctorName}: WhatsApp/SMS notification status: SENT.`);
    
    console.log(`[DISPATCH] Sent notification to ${doctorName} (${phoneNumber}): "${messageBody}"`);
    return { success: true, channel: 'WhatsApp/SMS' };
  }
}

export const notificationService = new NotificationService();
export default notificationService;

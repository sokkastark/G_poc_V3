// DbService.js - Data Access Layer abstraction
// Implements localStorage emulation seeded with db.json data.
// Can be swapped to a SQL DB / Stored Procedure API by changing the export instance.

import dbSeed from '../db.json';

const STORAGE_KEY = 'guardian_voice_db';

class MockDbService {
  constructor() {
    this._initDb();
  }

  // Seed the simulated database if not present in localStorage
  _initDb() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dbSeed));
    }
  }

  _getRawData() {
    this._initDb();
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  }

  _saveRawData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Trigger custom window event to notify active React hooks of updates
    window.dispatchEvent(new Event('db-update'));
  }

  // --- Read Methods ---

  getAppointments() {
    return this._getRawData().appointments || [];
  }

  getDoctors() {
    return this._getRawData().doctors || [];
  }

  getAvailableSlots() {
    return this._getRawData().availableSlots || [];
  }

  getNotifications() {
    return this._getRawData().notifications || [];
  }

  getActivityLogs() {
    return this._getRawData().activityLogs || [];
  }

  getTranscripts(appointmentId) {
    const transcripts = this._getRawData().transcripts || [];
    if (!appointmentId) return transcripts;
    return transcripts.filter(t => t.appointmentId === appointmentId);
  }

  // --- Write Methods ---

  updateAppointmentStatus(appointmentId, status) {
    const data = this._getRawData();
    const apt = data.appointments.find(a => a.id === appointmentId);
    if (apt) {
      const oldStatus = apt.status;
      apt.status = status;
      
      // Automatically add an activity log
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      data.activityLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: time,
        message: `Appointment for ${apt.patientName} changed from ${oldStatus} to ${status}.`
      });

      this._saveRawData(data);
      return apt;
    }
    return null;
  }

  rescheduleAppointment(appointmentId, slotId) {
    const data = this._getRawData();
    const apt = data.appointments.find(a => a.id === appointmentId);
    const slot = data.availableSlots.find(s => s.id === slotId);
    
    if (apt && slot) {
      const oldTime = `${apt.date} ${apt.time}`;
      apt.date = slot.date;
      apt.time = slot.time;
      apt.status = 'Rescheduled';

      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Update activity logs
      data.activityLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: time,
        message: `Rescheduled ${apt.patientName} from ${oldTime} to ${slot.date} ${slot.time}.`
      });

      this._saveRawData(data);
      return apt;
    }
    return null;
  }

  addActivityLog(message) {
    const data = this._getRawData();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    data.activityLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: time,
      message
    });
    this._saveRawData(data);
  }

  addNotification(patientName, doctorId, doctorName, status, details) {
    const data = this._getRawData();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      timestamp: time,
      patientName,
      doctorId,
      doctorName,
      status,
      details,
      channel: 'SMS/WhatsApp Simulation'
    });
    
    this._saveRawData(data);
  }

  addTranscript(appointmentId, role, message) {
    const data = this._getRawData();
    data.transcripts.push({
      id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      appointmentId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      role, // 'agent' or 'patient'
      message
    });
    this._saveRawData(data);
  }

  addCallRecording(appointmentId, recordingUrl) {
    const data = this._getRawData();
    const apt = data.appointments.find(a => a.id === appointmentId);
    if (apt) {
      apt.recordingUrl = recordingUrl;
      data.activityLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: `Call recording saved for patient ${apt.patientName}.`
      });
      this._saveRawData(data);
      return apt;
    }
    return null;
  }

  resetDatabase() {
    localStorage.removeItem(STORAGE_KEY);
    this._initDb();
    window.dispatchEvent(new Event('db-update'));
  }
}

// Future SQL Database Connection Wrapper stub
export class SqlDbService {
  constructor() {
    console.warn("SQL Server connection initiated. Swapping local mocks for Database SP Calls.");
  }

  addCallRecording(appointmentId, recordingUrl) {
    console.log(`[SQL SP API] Saving call recording for appointment ${appointmentId} to DB...`);
    return Promise.resolve({ id: appointmentId, recordingUrl });
  }
}

// RULE COMPLIANCE: To swap database from Local JSON Mock to Live DB/API, toggle comments below:
export const db = new MockDbService();
// export const db = new SqlDbService();
export default db;

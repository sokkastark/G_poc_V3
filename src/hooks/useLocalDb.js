// useLocalDb.js - Custom React Hook to sync component state with DbService
// Listens to global 'db-update' events to refresh data reactively.

import { useState, useEffect, useCallback } from 'react';
import db from '../services/DbService';

export function useLocalDb() {
  const [appointments, setAppointments] = useState(() => db.getAppointments());
  const [doctors, setDoctors] = useState(() => db.getDoctors());
  const [availableSlots, setAvailableSlots] = useState(() => db.getAvailableSlots());
  const [notifications, setNotifications] = useState(() => db.getNotifications());
  const [activityLogs, setActivityLogs] = useState(() => db.getActivityLogs());

  // Load all records from the DbService
  const loadData = useCallback(() => {
    setAppointments(db.getAppointments());
    setDoctors(db.getDoctors());
    setAvailableSlots(db.getAvailableSlots());
    setNotifications(db.getNotifications());
    setActivityLogs(db.getActivityLogs());
  }, []);

  useEffect(() => {
    // Listen for custom database update events from the service layer
    const handleDbUpdate = () => {
      loadData();
    };

    window.addEventListener('db-update', handleDbUpdate);
    return () => {
      window.removeEventListener('db-update', handleDbUpdate);
    };
  }, [loadData]);

  // Expose mutation wrappers that proxy back to DbService
  const updateAppointmentStatus = useCallback((appointmentId, status) => {
    return db.updateAppointmentStatus(appointmentId, status);
  }, []);

  const rescheduleAppointment = useCallback((appointmentId, slotId) => {
    return db.rescheduleAppointment(appointmentId, slotId);
  }, []);

  const addActivityLog = useCallback((message) => {
    db.addActivityLog(message);
  }, []);

  const resetDatabase = useCallback(() => {
    db.resetDatabase();
  }, []);

  return {
    appointments,
    doctors,
    availableSlots,
    notifications,
    activityLogs,
    updateAppointmentStatus,
    rescheduleAppointment,
    addActivityLog,
    resetDatabase
  };
}

export default useLocalDb;

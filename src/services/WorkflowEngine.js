// WorkflowEngine.js - Rules engine and state manager for TOC calling workflow
import { PracticeMatcherService } from './PracticeMatcherService';

export class WorkflowEngine {
  /**
   * Helper to retrieve values from a row using fuzzy matched headers.
   */
  static getFuzzyValue(row, possibleKeys) {
    if (!row) return '';
    const rowKeys = Object.keys(row);
    // 1. Try exact matches or spacing-stripped/case-stripped matches
    for (const key of rowKeys) {
      const normalizedKey = key.toString().toLowerCase().replace(/[\s_-]/g, '');
      for (const pKey of possibleKeys) {
        const normalizedPKey = pKey.toString().toLowerCase().replace(/[\s_-]/g, '');
        if (normalizedKey === normalizedPKey) {
          return row[key] !== undefined ? row[key].toString().trim() : '';
        }
      }
    }
    // 2. Try partial/includes matches
    for (const key of rowKeys) {
      const normalizedKey = key.toString().toLowerCase().replace(/[\s_-]/g, '');
      for (const pKey of possibleKeys) {
        const normalizedPKey = pKey.toString().toLowerCase().replace(/[\s_-]/g, '');
        if (normalizedKey.includes(normalizedPKey) || normalizedPKey.includes(normalizedKey)) {
          return row[key] !== undefined ? row[key].toString().trim() : '';
        }
      }
    }
    return '';
  }

  /**
   * Filters raw ENS records based on business rules.
   * Rule A: Keep only 'Discharge' or 'End Visit' event types (case-insensitive)
   * Rule B: Remove 'Outpatient' records (case-insensitive)
   * Rule C: Date threshold filter (optional)
   */
  static filterEnsRecords(records, applyDateFilter = false) {
    if (!records) return { accepted: [], rejected: [] };

    const accepted = [];
    const rejected = [];

    records.forEach(r => {
      const eventType = this.getFuzzyValue(r, ['eventtype', 'eventname', 'event', 'status', 'activity', 'type']).toLowerCase();
      const encounterClass = this.getFuzzyValue(r, ['encounterclass', 'class', 'patientclass', 'encountertype']).toLowerCase();
      const dischargeDateStr = this.getFuzzyValue(r, ['dischargedate', 'eventdate', 'discharge', 'date']);

      // Check discharge/end visit event
      const isDischarge = eventType.includes('discharge') || eventType.includes('end') || eventType.includes('complete');
      const isOutpatient = encounterClass.includes('outpatient') || encounterClass === 'op';

      if (!isDischarge) {
        rejected.push({ record: r, reason: `Invalid Event Type: "${eventType || 'None'}" (Requires Discharge/End Visit/Complete)` });
        return;
      }

      if (isOutpatient) {
        rejected.push({ record: r, reason: 'Rejected: Encounter Class is Outpatient' });
        return;
      }

      // Optional date filter: e.g., within last 3 days
      if (applyDateFilter && dischargeDateStr) {
        try {
          const dischargeDate = new Date(dischargeDateStr);
          const now = new Date();
          const diffDays = Math.ceil(Math.abs(now - dischargeDate) / (1000 * 60 * 60 * 24));
          if (diffDays > 3) {
            rejected.push({ record: r, reason: `Stale record: Discharged ${diffDays} days ago (limit: 3 days)` });
            return;
          }
        } catch (e) {
          rejected.push({ record: r, reason: `Invalid Discharge Date format: ${dischargeDateStr}` });
          return;
        }
      }

      accepted.push(r);
    });

    return { accepted, rejected };
  }

  /**
   * Transform patient demographics and contact details into canonical formats.
   */
  static transformRecord(record) {
    const transformed = { ...record };

    // 1. DOB format: YYYY-MM-DD (or other) -> MM/DD/YYYY
    const dobRaw = this.getFuzzyValue(record, ['dob', 'dateofbirth', 'birthdate']);
    if (dobRaw) {
      const dateParts = dobRaw.split(/[-/]/);
      if (dateParts.length === 3) {
        if (dateParts[0].length === 4) {
          transformed.dob = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
        } else if (dateParts[2].length === 4) {
          transformed.dob = `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`;
        } else {
          transformed.dob = dobRaw;
        }
      } else {
        transformed.dob = dobRaw;
      }
    } else {
      transformed.dob = 'Unknown';
    }

    // 2. Sex format: M -> Male, F -> Female, other
    const sexRaw = this.getFuzzyValue(record, ['sex', 'gender']).toUpperCase();
    if (sexRaw === 'M' || sexRaw === 'MALE') transformed.sex = 'Male';
    else if (sexRaw === 'F' || sexRaw === 'FEMALE') transformed.sex = 'Female';
    else transformed.sex = sexRaw || 'Other';

    // 3. Phone number normalization & selection
    const cell = this.getFuzzyValue(record, ['cellphone', 'cell', 'mobilephone', 'mobile']);
    const home = this.getFuzzyValue(record, ['homephone', 'home']);
    const work = this.getFuzzyValue(record, ['workphone', 'work']);
    const rawPhone = cell || home || work || this.getFuzzyValue(record, ['phone', 'telephone', 'contact']);

    // Normalize phone format to 999-999-9999
    const digits = rawPhone.toString().replace(/\D/g, '');
    if (digits.length >= 10) {
      const formatted = `${digits.slice(-10, -7)}-${digits.slice(-7, -4)}-${digits.slice(-4)}`;
      transformed.phone = formatted;
    } else {
      transformed.phone = rawPhone || 'No Valid Phone';
    }

    // Practice name matching
    transformed.practiceMatch = this.getFuzzyValue(record, ['practicename', 'facilityname', 'practice', 'facility', 'organization']);

    return transformed;
  }

  /**
   * Generate Call Queue items.
   */
  static generateCallQueue(matchedRecords) {
    return matchedRecords.map((record, index) => {
      const transformed = this.transformRecord(record);
      const patientId = this.getFuzzyValue(record, ['patientid', 'mrn', 'id', 'patientnumber']) || `PAT-${1000 + index}`;
      
      const first = this.getFuzzyValue(record, ['firstname', 'first']);
      const last = this.getFuzzyValue(record, ['lastname', 'last']);
      const patientName = this.getFuzzyValue(record, ['patientname', 'name', 'fullname']) || `${first} ${last}`.trim() || `Patient ${patientId}`;
      const pcp = this.getFuzzyValue(record, ['pcp', 'primarycareprovider', 'doctor', 'physician', 'provider']) || 'Dr. Elena Rostova';
      const date = this.getFuzzyValue(record, ['dischargedate', 'eventdate', 'discharge', 'date']) || new Date().toISOString().slice(0, 10);

      return {
        id: `queue-${patientId}-${Date.now()}-${index}`,
        patientId,
        patientName,
        practice: transformed.practiceMatch || 'Unknown Practice',
        pcp,
        phone: transformed.phone,
        dob: transformed.dob,
        sex: transformed.sex,
        date,
        status: 'Pending',
        attempts: 0,
        outcome: null,
        notes: '',
        history: []
      };
    });
  }

  /**
   * Handle retry and call outcome state transitions.
   */
  static processCallOutcome(queueItem, outcome, maxAttempts = 2, duration = null) {
    const updated = { ...queueItem };
    updated.attempts += 1;
    updated.outcome = outcome;
    if (duration !== null) {
      updated.lastCallDuration = duration;
    }
    
    const timestamp = new Date().toLocaleTimeString();
    updated.history = [
      ...updated.history,
      { timestamp, outcome, attempt: updated.attempts, duration }
    ];

    if (outcome === 'No Answer' || outcome === 'Left Message') {
      if (updated.attempts < maxAttempts) {
        updated.status = 'Retry Scheduled';
      } else {
        updated.status = 'Failed';
      }
    } else if (outcome === 'Wrong Number') {
      updated.status = 'Failed';
    } else {
      updated.status = 'Completed';
    }

    return updated;
  }
}

export default WorkflowEngine;



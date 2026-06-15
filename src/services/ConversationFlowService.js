// ConversationFlowService.js - Manages configurable and reusable voice conversation flows

export const CONVERSATION_FLOWS = {
  TOC_FOLLOW_UP: {
    id: 'TOC_FOLLOW_UP',
    name: 'TOC Follow-up Call',
    initialGreeting: (patientName) => `Hello, this is Guardian Care calling to check on ${patientName} following your recent discharge. Am I speaking with ${patientName} or a care representative?`,
    steps: {
      greeting: {
        question: 'Am I speaking with the patient or a care representative?',
        intents: [
          { value: 'CONFIRM', nextStep: 'dischargeCheck', outcome: null },
          { value: 'CANCEL', nextStep: 'leftMessage', outcome: 'Left Message' },
          { value: 'WRONG_NUMBER', nextStep: 'hangup', outcome: 'Wrong Number' }
        ]
      },
      dischargeCheck: {
        question: 'We want to make sure you have everything you need. Have you been able to fill your transition prescriptions and schedule your follow-up doctor appointment?',
        intents: [
          { value: 'CONFIRM', nextStep: 'confirmAppointment', outcome: 'Confirmed' },
          { value: 'RESCHEDULE', nextStep: 'rescheduleFlow', outcome: 'Rescheduled' },
          { value: 'CANCEL', nextStep: 'cancelFlow', outcome: 'Cancelled' }
        ]
      },
      confirmAppointment: {
        question: 'Excellent. Your follow-up appointment is confirmed. Do you need help with transportation or have any other care questions before we finish?',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Confirmed' },
          { value: 'CANCEL', nextStep: 'hangup', outcome: 'Confirmed' }
        ]
      },
      rescheduleFlow: {
        question: 'No problem. Let me look at open slots. Would you prefer a morning or an afternoon time for the rescheduled appointment?',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Rescheduled' },
          { value: 'CANCEL', nextStep: 'hangup', outcome: 'Cancelled' }
        ]
      },
      cancelFlow: {
        question: 'Understood. We will note that you need to cancel this follow-up slot. Is there a specific reason or medical change we should log for the doctor?',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Cancelled' },
          { value: 'CANCEL', nextStep: 'hangup', outcome: 'Cancelled' }
        ]
      },
      leftMessage: {
        question: 'Could you please let the patient know that Guardian Care called to follow up on their discharge, and to call us back? Thank you.',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Left Message' }
        ]
      },
      hangup: {
        question: 'Thank you for your time. Have a great day. Goodbye.',
        intents: []
      }
    }
  },
  APPOINTMENT_REMINDER: {
    id: 'APPOINTMENT_REMINDER',
    name: 'Appointment Reminder Call',
    initialGreeting: (patientName) => `Hello, this is Guardian calling on behalf of your doctor's office to remind ${patientName} of an upcoming appointment. Am I speaking with ${patientName}?`,
    steps: {
      greeting: {
        question: 'Am I speaking with the patient?',
        intents: [
          { value: 'CONFIRM', nextStep: 'confirmApt', outcome: null },
          { value: 'CANCEL', nextStep: 'leftMessage', outcome: 'Left Message' },
          { value: 'WRONG_NUMBER', nextStep: 'hangup', outcome: 'Wrong Number' }
        ]
      },
      confirmApt: {
        question: 'Great! You have an upcoming appointment scheduled. Will you be able to attend?',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Confirmed' },
          { value: 'RESCHEDULE', nextStep: 'rescheduleFlow', outcome: 'Rescheduled' },
          { value: 'CANCEL', nextStep: 'cancelFlow', outcome: 'Cancelled' }
        ]
      },
      rescheduleFlow: {
        question: 'Understood. Let us find another slot. Would you prefer next Monday morning or Thursday afternoon?',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Rescheduled' }
        ]
      },
      cancelFlow: {
        question: 'Okay, I will mark this appointment as cancelled. Would you like to leave a short note for the doctor regarding the cancellation?',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Cancelled' }
        ]
      },
      leftMessage: {
        question: 'Please remind them that they have an appointment scheduled. Thank you!',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Left Message' }
        ]
      },
      hangup: {
        question: 'Thank you, goodbye!',
        intents: []
      }
    }
  },
  MEDICATION_REMINDER: {
    id: 'MEDICATION_REMINDER',
    name: 'Medication Adherence Call',
    initialGreeting: (patientName) => `Hello, this is Guardian Care calling to check if ${patientName} has taken their daily prescribed cardiovascular medication. Are you the patient?`,
    steps: {
      greeting: {
        question: 'Are you the patient?',
        intents: [
          { value: 'CONFIRM', nextStep: 'medCheck', outcome: null },
          { value: 'CANCEL', nextStep: 'leftMessage', outcome: 'Left Message' }
        ]
      },
      medCheck: {
        question: 'Have you taken your daily dose of medication today?',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Confirmed' },
          { value: 'CANCEL', nextStep: 'whyNot', outcome: 'Other' }
        ]
      },
      whyNot: {
        question: 'Is there a specific issue, like side effects, refills needed, or did you just forget?',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Other' }
        ]
      },
      leftMessage: {
        question: 'Please remind them to take their prescription today. Thank you.',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Left Message' }
        ]
      },
      hangup: {
        question: 'Thank you, stay healthy. Goodbye!',
        intents: []
      }
    }
  },
  SURVEY: {
    id: 'SURVEY',
    name: 'Patient Satisfaction Survey',
    initialGreeting: (patientName) => `Hello, this is Guardian calling to ask ${patientName} a quick question about your recent clinic visit. Do you have one minute to help us improve?`,
    steps: {
      greeting: {
        question: 'Do you have one minute to help us improve?',
        intents: [
          { value: 'CONFIRM', nextStep: 'rating', outcome: null },
          { value: 'CANCEL', nextStep: 'hangup', outcome: 'Cancelled' }
        ]
      },
      rating: {
        question: 'On a scale from 1 to 5, how would you rate your overall care during your visit?',
        intents: [
          { value: 'CONFIRM', nextStep: 'hangup', outcome: 'Confirmed' }
        ]
      },
      hangup: {
        question: 'Thank you for your response. Goodbye.',
        intents: []
      }
    }
  }
};

export class ConversationFlowService {
  static getFlows() {
    return Object.values(CONVERSATION_FLOWS);
  }

  static getFlowById(id) {
    return CONVERSATION_FLOWS[id] || CONVERSATION_FLOWS.TOC_FOLLOW_UP;
  }
}

export default ConversationFlowService;

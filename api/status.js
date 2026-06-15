// api/status.js - Serverless function to expose backend config status
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  const isTwilioConfigured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_API_KEY &&
    process.env.TWILIO_API_SECRET &&
    process.env.TWILIO_TWIML_APP_SID &&
    process.env.TWILIO_CALLER_ID
  );

  res.status(200).json({
    configured: isTwilioConfigured,
    provider: 'twilio',
    callerId: process.env.TWILIO_CALLER_ID || 'Not Configured'
  });
}

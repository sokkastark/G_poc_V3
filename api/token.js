// api/token.js - Serverless function to generate Twilio capability tokens on Vercel
import twilio from 'twilio';

export default function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const isTwilioConfigured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_API_KEY &&
    process.env.TWILIO_API_SECRET &&
    process.env.TWILIO_TWIML_APP_SID &&
    process.env.TWILIO_CALLER_ID
  );

  if (!isTwilioConfigured) {
    return res.status(400).json({ 
      error: 'Twilio credentials not fully configured in environment.' 
    });
  }

  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { 
        identity: 'guardian_agent_console',
        ttl: 3600
      }
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true
    });
    token.addGrant(voiceGrant);

    res.status(200).json({ token: token.toJwt() });
  } catch (err) {
    console.error('Failed to generate Twilio Token:', err);
    res.status(500).json({ error: 'Token generation failed: ' + err.message });
  }
}

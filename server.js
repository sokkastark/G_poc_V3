// server.js - Token capability generator and TwiML webhook server for Twilio integration.
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const twilio = require('twilio');

// Load environment configuration
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

// Helper to check if credentials are present
function isTwilioConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_API_KEY &&
    process.env.TWILIO_API_SECRET &&
    process.env.TWILIO_TWIML_APP_SID &&
    process.env.TWILIO_CALLER_ID
  );
}

// Endpoint to check configuration status
app.get('/api/telephony/status', (req, res) => {
  res.json({
    configured: isTwilioConfigured(),
    provider: 'twilio',
    callerId: process.env.TWILIO_CALLER_ID || 'Not Configured'
  });
});

// Endpoint to fetch WebRTC capability token
app.get('/api/telephony/token', (req, res) => {
  if (!isTwilioConfigured()) {
    return res.status(400).json({ 
      error: 'Twilio credentials not fully configured in backend .env file.' 
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

    res.json({ token: token.toJwt() });
  } catch (err) {
    console.error('Failed to generate Twilio Token:', err);
    res.status(500).json({ error: 'Token generation failed: ' + err.message });
  }
});

// Outbound Call TwiML Webhook Endpoint
app.post('/voice', (req, res) => {
  const To = req.body.To || req.query.To;
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  console.log(`[Twilio Webhook] Outbound WebRTC request received dialing: ${To}`);

  if (!To) {
    response.say("Error: No recipient phone number provided.");
  } else {
    const dial = response.dial({
      callerId: process.env.TWILIO_CALLER_ID
    });
    dial.number(To);
  }

  res.type('text/xml');
  res.send(response.toString());
});

// Start listening
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Twilio Telephony Token Server running on port ${PORT}`);
  console.log(`Configuration status: ${isTwilioConfigured() ? 'CONFIGURED' : 'MISSING (Running Mock Only)'}`);
  if (!isTwilioConfigured()) {
    console.log(`Warning: Please configure your TWILIO credentials in .env to place real calls.`);
  }
  console.log(`=======================================================`);
});

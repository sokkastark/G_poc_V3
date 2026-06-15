// api/voice.js - Serverless function returning outbound Dial TwiML response
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

  // Parse request body if Vercel did not automatically parse it as an object
  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = Object.fromEntries(new URLSearchParams(body).entries());
    } catch (e) {}
  } else if (Buffer.isBuffer(body)) {
    try {
      body = Object.fromEntries(new URLSearchParams(body.toString()).entries());
    } catch (e) {}
  }

  const To = body.tocall || req.query.tocall || body.To || req.query.To;
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  console.log(`[Voice Webhook] target number To: ${To}`, { body, query: req.query });

  if (!To) {
    response.say("Error: No recipient phone number provided.");
  } else {
    const dial = response.dial({ callerId: process.env.TWILIO_CALLER_ID });
    dial.number(To);
  }

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(response.toString());
}


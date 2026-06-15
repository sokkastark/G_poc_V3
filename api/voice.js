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

  // Twilio callback requests can be POST or GET
  const To = req.body.To || req.query.To;
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  console.log(`[Vercel Serverless Webhook] Outbound WebRTC request for To: ${To}`);

  if (!To) {
    response.say("Error: No recipient phone number provided.");
  } else {
    const dial = response.dial({
      callerId: process.env.TWILIO_CALLER_ID
    });
    dial.number(To);
  }

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(response.toString());
}

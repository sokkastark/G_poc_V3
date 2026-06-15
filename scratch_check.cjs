const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkApp() {
  try {
    const appSid = process.env.TWILIO_TWIML_APP_SID;
    console.log("Checking Twilio TwiML App SID:", appSid);
    const app = await client.applications(appSid).fetch();
    console.log("\n--- TwiML App Configuration ---");
    console.log("Friendly Name:", app.friendlyName);
    console.log("Voice Request URL (VoiceUrl):", app.voiceUrl);
    console.log("Voice Method:", app.voiceMethod);
    console.log("Voice Fallback URL:", app.voiceFallbackUrl);
  } catch (error) {
    console.error("Error fetching TwiML App:", error.message);
  }
}

checkApp();

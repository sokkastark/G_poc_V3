// VoiceService.js - Abstraction layer re-exporting the Gemini Live voice service.
import { geminiVoiceService } from './GeminiVoiceService';

export const voiceService = geminiVoiceService;
export default voiceService;

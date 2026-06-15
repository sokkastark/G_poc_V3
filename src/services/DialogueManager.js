// DialogueManager.js - Handles natural language parsing and intent mapping stubs.
export function parseIntent(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  const rescheduleRegex = /\b(reschedule|change|another|time|different|slot|postpone|move)\b/i;
  if (rescheduleRegex.test(t)) return 'RESCHEDULE';

  const hasConfirmWord = /\b(yes|yeah|yep|yup|ok|okay|sure|confirm|correct)\b/i.test(t);
  const hasCancelReason = /\b(sorry|conflict|clash|event|busy|meeting|work|travel|trip|unable|cant|can't|cannot)\b/i.test(t);
  if (hasCancelReason && !hasConfirmWord) return 'CANCEL';

  const cancelRegex = /\b(no|not|cancel|cannot|can't|cant|won't|wont|nope|unable|negative|don't|dont|never|busy)\b/i;
  if (cancelRegex.test(t)) return 'CANCEL';

  const confirmRegex = /\b(yes|confirm|attend|attending|coming|yeah|sure|ok|okay|correct|yep|yup|going)\b/i;
  if (confirmRegex.test(t)) return 'CONFIRM';
  
  return null;
}

export function parseRescheduleSlot(text, slots) {
  if (!text || !slots || slots.length === 0) return null;
  const t = text.toLowerCase();
  if (t.includes('any other') || t.includes('other than') || t.includes('before') || t.includes('after') || t.includes('none of')) return null;

  const hasWord = (w) => new RegExp(`\\b${w}\\b`, 'i').test(t);
  const hasTen = hasWord('ten') || hasWord('10');
  const hasTwelve = hasWord('twelve') || hasWord('12') || t.includes('noon');
  const hasNine = hasWord('nine') || hasWord('9');
  const hasThree = hasWord('three') || hasWord('3');
  const has11th = hasWord('eleven') || hasWord('11th') || hasWord('11');
  const has12th = hasWord('twelfth') || hasWord('12th') || (hasWord('12') && !hasTwelve);

  if (has11th && hasTen) return slots.find(s => s.id === 'slot-1') || slots[0];
  if (has11th && hasTwelve) return slots.find(s => s.id === 'slot-2') || slots[1];
  if (has12th && hasNine) return slots.find(s => s.id === 'slot-3') || slots[2];
  if (has12th && hasThree) return slots.find(s => s.id === 'slot-4') || slots[3];

  if (hasTen && !hasTwelve && !hasNine && !hasThree) return slots.find(s => s.id === 'slot-1') || slots[0];
  if (hasTwelve && !hasTen && !hasNine && !hasThree) return slots.find(s => s.id === 'slot-2') || slots[1];
  if (hasNine && !hasTen && !hasTwelve && !hasThree) return slots.find(s => s.id === 'slot-3') || slots[2];
  if (hasThree && !hasTen && !hasTwelve && !hasNine) return slots.find(s => s.id === 'slot-4') || slots[3];

  if (has11th && !has12th) return slots.find(s => s.id === 'slot-1') || slots[0];
  if (has12th && !has11th) return slots.find(s => s.id === 'slot-3') || slots[2];

  return null;
}

export default {
  parseIntent,
  parseRescheduleSlot
};

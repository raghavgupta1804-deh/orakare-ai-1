/**
 * WhatsApp outreach templates.
 *
 * Kept formal, English-only. One tooth emoji per template for brand feel.
 * All variables use {curly_braces} — rendered by renderTemplate below.
 */

export const OUTREACH_KINDS = {
  REMINDER_24H: 'REMINDER_24H',
  REMINDER_2H: 'REMINDER_2H',
  COMFORT_CHECK: 'COMFORT_CHECK',
  REVIEW_REQUEST: 'REVIEW_REQUEST',
  RECALL: 'RECALL',
  BIRTHDAY: 'BIRTHDAY',
}

export const OUTREACH_KIND_LABELS = {
  REMINDER_24H:   { label: '24h Reminder',      short: '24h Rem',   tone: 'bg-blue-50 text-blue-800 border border-blue-200'   },
  REMINDER_2H:    { label: '2h Reminder',       short: '2h Rem',    tone: 'bg-indigo-50 text-indigo-800 border border-indigo-200' },
  COMFORT_CHECK:  { label: 'Comfort check',     short: 'Comfort',   tone: 'bg-teal-50 text-teal-800 border border-teal-200'   },
  REVIEW_REQUEST: { label: 'Review request',    short: 'Review',    tone: 'bg-purple-50 text-purple-800 border border-purple-200' },
  RECALL:         { label: '6-month recall',    short: 'Recall',    tone: 'bg-amber-50 text-amber-800 border border-amber-200'  },
  BIRTHDAY:       { label: 'Birthday',          short: 'Birthday',  tone: 'bg-pink-50 text-pink-800 border border-pink-200'   },
}

export const TEMPLATES = {
  REMINDER_24H: {
    kind: 'REMINDER_24H',
    body: 'Dear {name}, this is a reminder for your appointment tomorrow ({date}) at {time} at Orakare Dental Clinic. 🦷 We look forward to seeing you. — Dr. Shobhna Bansal',
  },
  REMINDER_2H: {
    kind: 'REMINDER_2H',
    body: 'Dear {name}, a gentle reminder that your appointment at Orakare Dental Clinic is scheduled in approximately 2 hours at {time}. 🦷 Please arrive a few minutes early. — Dr. Shobhna Bansal',
  },
  COMFORT_CHECK: {
    kind: 'COMFORT_CHECK',
    body: 'Dear {name}, we hope you are feeling well after yesterday\'s visit at Orakare Dental Clinic. 🦷 If you are experiencing any discomfort or have any questions, please do reply to this message. — Dr. Shobhna Bansal',
  },
  REVIEW_REQUEST: {
    kind: 'REVIEW_REQUEST',
    body: 'Dear {name}, thank you for completing your treatment at Orakare Dental Clinic. 🦷 If your experience was positive, we would be grateful if you could share a Google review at https://g.page/r/orakaredental/review. — Dr. Shobhna Bansal',
  },
  RECALL: {
    kind: 'RECALL',
    body: 'Dear {name}, it has been 6 months since your last visit at Orakare Dental Clinic. 🦷 We recommend a routine check-up and cleaning. Please book a convenient slot at orakaredentalclinic.com or reply to this message. — Dr. Shobhna Bansal',
  },
  BIRTHDAY: {
    kind: 'BIRTHDAY',
    body: 'Dear {name}, wishing you a very happy birthday from all of us at Orakare Dental Clinic. 🦷 We wish you a healthy and bright smile for the year ahead. — Dr. Shobhna Bansal',
  },
}

/**
 * Render a template body by replacing {var} placeholders.
 */
export function renderTemplate(kind, vars) {
  const tpl = TEMPLATES[kind]
  if (!tpl) return ''
  let out = tpl.body
  const v = vars || {}
  Object.keys(v).forEach(function(key) {
    const re = new RegExp('\\{' + key + '\\}', 'g')
    out = out.replace(re, v[key] == null ? '' : String(v[key]))
  })
  return out
}

/**
 * Build a wa.me link for a given phone + message body.
 * Handles phone normalization: strip non-digits, if 10 digits assume India (+91).
 */
export function buildWALink(phone, messageBody) {
  if (!phone) return null
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length < 10) return null
  let final = digits
  if (final.length === 10) final = '91' + final
  else final = final.slice(-12)  // keep last 12 in case of extra chars
  const encoded = encodeURIComponent(messageBody || '')
  return 'https://wa.me/' + final + '?text=' + encoded
}

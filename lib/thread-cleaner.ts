/**
 * Thread Cleaner - Cleans raw HTML email threads for AI consumption
 * 
 * Takes the raw conversation thread from Email Bison's API and produces
 * clean, de-duplicated plain text suitable for LLM context.
 */

interface ThreadMessage {
  html_body?: string
  text_body?: string
  date_received?: string
  from_email_address?: string
  from_name?: string
}

interface ConversationThread {
  older_messages: ThreadMessage[]
  current_reply: ThreadMessage
  newer_messages: ThreadMessage[]
}

export function cleanThread(rawThread: ConversationThread): string {
  // 1. Merge into chronological array
  const allMessages: ThreadMessage[] = [
    ...(rawThread.older_messages || []),
    rawThread.current_reply,
    ...(rawThread.newer_messages || []),
  ].filter(Boolean)

  const cleanedMessages: string[] = []
  const seenPrefixes = new Set<string>()

  for (const msg of allMessages) {
    let text = msg.text_body || msg.html_body || ''

    // If we're using HTML body, clean it
    if (!msg.text_body && msg.html_body) {
      text = cleanHtml(msg.html_body)
    } else {
      // Even text_body may have some HTML entities
      text = decodeHtmlEntities(text)
    }

    // Strip "On [date], [person] wrote:" attribution lines
    text = text.replace(/On\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\S]*?wrote:\s*/gi, '')

    // Strip signature blocks (lines after "Thanks,", "Best,", "Regards,", etc.)
    text = stripSignature(text)

    // Collapse excessive blank lines
    text = text.replace(/\n{3,}/g, '\n\n')

    // Trim
    text = text.trim()

    if (!text) continue

    // De-duplicate: check first 240 chars
    const prefix = text.substring(0, 240)
    if (seenPrefixes.has(prefix)) continue
    seenPrefixes.add(prefix)

    // Add sender info header
    const sender = msg.from_name || msg.from_email_address || 'Unknown'
    const date = msg.date_received ? new Date(msg.date_received).toLocaleString() : ''
    cleanedMessages.push(`[${sender}${date ? ' - ' + date : ''}]\n${text}`)
  }

  // Join with separator
  let result = cleanedMessages.join('\n---\n')

  // Cap at 8000 characters
  if (result.length > 8000) {
    result = result.substring(0, 8000) + '\n\n[Thread truncated...]'
  }

  return result
}

function cleanHtml(html: string): string {
  let text = html

  // Remove blockquote elements (quoted replies)
  text = text.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')

  // Remove gmail_quote divs
  text = text.replace(/<div\s+class="gmail_quote"[\s\S]*?<\/div>/gi, '')
  text = text.replace(/<div\s+class="gmail_attr"[\s\S]*?<\/div>/gi, '')

  // Remove Outlook-style quoted text
  text = text.replace(/<div\s+id="appendonsend"[\s\S]*$/gi, '')
  text = text.replace(/<div\s+style="border:none;border-top:solid #E1E1E1[\s\S]*$/gi, '')

  // Convert <br> to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n')

  // Convert <p> to double newlines
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<p[^>]*>/gi, '')

  // Convert <div> to newlines
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<div[^>]*>/gi, '')

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = decodeHtmlEntities(text)

  return text
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function stripSignature(text: string): string {
  // Common signature indicators
  const sigPatterns = [
    /^--\s*$/m,                              // standard "-- " separator
    /^(Thanks|Thank you|Best|Regards|Cheers|Sincerely|Best regards|Kind regards|Warm regards),?\s*$/im,
    /^Sent from my (iPhone|iPad|Android|Galaxy|Samsung)/im,
    /^Get Outlook for/im,
  ]

  for (const pattern of sigPatterns) {
    const match = text.match(pattern)
    if (match && match.index !== undefined) {
      // Only strip if the signature is in the last 40% of the message
      if (match.index > text.length * 0.6) {
        text = text.substring(0, match.index).trim()
      }
    }
  }

  return text
}

/**
 * Cal.com Booking Integration
 */

interface BookingResult {
  success: boolean
  eventId?: string
  bookingUrl?: string
  error?: string
}

interface Lead {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  bison_campaign_name: string | null
}

export async function bookCalMeeting({
  lead,
  proposedDateTime,
  calApiKey,
  calEventTypeId,
}: {
  lead: Lead
  proposedDateTime: string
  calApiKey: string
  calEventTypeId: string
}): Promise<BookingResult> {
  try {
    const response = await fetch(
      `https://api.cal.com/v1/bookings?apiKey=${calApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventTypeId: parseInt(calEventTypeId),
          start: proposedDateTime,
          responses: {
            name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email,
            email: lead.email,
          },
          timeZone: 'UTC',
          language: 'en',
          metadata: {
            leadId: lead.id,
            campaign: lead.bison_campaign_name || '',
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `Cal.com API error (${response.status}): ${errorText}` }
    }

    const data = await response.json()
    return {
      success: true,
      eventId: data.id?.toString() || data.uid,
      bookingUrl: data.url || data.booking_url,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Test Cal.com API connection
 */
export async function testCalConnection(calApiKey: string): Promise<{
  success: boolean
  error?: string
  data?: any
}> {
  try {
    const response = await fetch(
      `https://api.cal.com/v1/event-types?apiKey=${calApiKey}`,
      { headers: { 'Accept': 'application/json' } }
    )

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

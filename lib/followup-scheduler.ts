/**
 * Follow-up Scheduler
 * Calculates next_send_at with weekend skip and send window logic
 */

interface SequenceStep {
  step_number: number
  delay_days: number
  delay_hours: number
  send_on_weekends: boolean
  custom_message: string
}

/**
 * Calculate the next send time based on step config and user preferences
 */
export function calculateNextSendAt(
  step: SequenceStep,
  timezone: string,
  sendWindowStart: number,
  sendWindowEnd: number,
  fromDate?: Date
): Date {
  const now = fromDate || new Date()

  // Add delay
  const nextSend = new Date(now.getTime())
  nextSend.setDate(nextSend.getDate() + (step.delay_days || 0))
  nextSend.setHours(nextSend.getHours() + (step.delay_hours || 0))

  // Apply send window and weekend logic
  return adjustForSendWindow(nextSend, timezone, sendWindowStart, sendWindowEnd, step.send_on_weekends)
}

/**
 * Adjust a datetime to fall within the send window
 * Also handles weekend skipping
 */
export function adjustForSendWindow(
  date: Date,
  timezone: string,
  sendWindowStart: number,
  sendWindowEnd: number,
  sendOnWeekends: boolean
): Date {
  const adjusted = new Date(date.getTime())

  // Get the hour in the user's timezone
  const localHour = getHourInTimezone(adjusted, timezone)
  const dayOfWeek = getDayOfWeekInTimezone(adjusted, timezone)

  // Weekend skip
  if (!sendOnWeekends) {
    if (dayOfWeek === 6) {
      // Saturday → move to Monday
      adjusted.setDate(adjusted.getDate() + 2)
      setHourInTimezone(adjusted, timezone, sendWindowStart)
      return adjusted
    }
    if (dayOfWeek === 0) {
      // Sunday → move to Monday
      adjusted.setDate(adjusted.getDate() + 1)
      setHourInTimezone(adjusted, timezone, sendWindowStart)
      return adjusted
    }
  }

  // Send window check
  if (localHour < sendWindowStart) {
    // Before window → set to window start today
    setHourInTimezone(adjusted, timezone, sendWindowStart)
  } else if (localHour >= sendWindowEnd) {
    // After window → set to window start next day
    adjusted.setDate(adjusted.getDate() + 1)
    setHourInTimezone(adjusted, timezone, sendWindowStart)

    // Re-check weekend after adding a day
    if (!sendOnWeekends) {
      const newDay = getDayOfWeekInTimezone(adjusted, timezone)
      if (newDay === 6) adjusted.setDate(adjusted.getDate() + 2)
      else if (newDay === 0) adjusted.setDate(adjusted.getDate() + 1)
    }
  }

  return adjusted
}

/**
 * Check if current time is within the send window
 */
export function isWithinSendWindow(
  timezone: string,
  sendWindowStart: number,
  sendWindowEnd: number
): boolean {
  const now = new Date()
  const hour = getHourInTimezone(now, timezone)
  return hour >= sendWindowStart && hour < sendWindowEnd
}

/**
 * Check if today is a weekend in the given timezone
 */
export function isWeekend(timezone: string): boolean {
  const now = new Date()
  const day = getDayOfWeekInTimezone(now, timezone)
  return day === 0 || day === 6
}

// Timezone helpers
function getHourInTimezone(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    return parseInt(formatter.format(date))
  } catch {
    return date.getUTCHours()
  }
}

function getDayOfWeekInTimezone(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    })
    const dayStr = formatter.format(date)
    const days: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    return days[dayStr] ?? date.getDay()
  } catch {
    return date.getDay()
  }
}

function setHourInTimezone(date: Date, timezone: string, hour: number): void {
  const currentHour = getHourInTimezone(date, timezone)
  const diff = hour - currentHour
  date.setHours(date.getHours() + diff, 0, 0, 0) // Also zero out minutes/seconds
}

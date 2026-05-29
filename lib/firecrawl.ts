/**
 * Firecrawl Company Research (Optional)
 * Fetches company summary from a website URL
 */

export async function researchCompany(
  website: string,
  firecrawlApiKey: string
): Promise<string | null> {
  try {
    // Normalize URL
    let url = website.trim()
    if (!url.startsWith('http')) {
      url = 'https://' + url
    }

    // Start extraction job
    const response = await fetch('https://api.firecrawl.dev/v1/extract', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: [url],
        prompt: 'Summarize what this company does in 3 sentences. Include their main products/services and target market.',
        schema: {
          type: 'object',
          properties: {
            company_description: { type: 'string' },
          },
          required: ['company_description'],
        },
      }),
    })

    if (!response.ok) {
      console.error(`Firecrawl extract failed: ${response.status}`)
      return null
    }

    const data = await response.json()

    // If it returns a job ID, poll for completion
    if (data.id || data.jobId) {
      const jobId = data.id || data.jobId
      let attempts = 0
      const maxAttempts = 12 // 60 seconds max

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        attempts++

        const pollResponse = await fetch(
          `https://api.firecrawl.dev/v1/extract/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Accept': 'application/json',
            },
          }
        )

        if (!pollResponse.ok) continue

        const pollData = await pollResponse.json()
        if (pollData.status === 'completed' && pollData.data) {
          return pollData.data.company_description || JSON.stringify(pollData.data)
        }
        if (pollData.status === 'failed') {
          console.error('Firecrawl job failed')
          return null
        }
      }

      return null
    }

    // Direct response
    if (data.data?.company_description) {
      return data.data.company_description
    }

    return null
  } catch (error) {
    console.error('Firecrawl error:', error)
    return null
  }
}

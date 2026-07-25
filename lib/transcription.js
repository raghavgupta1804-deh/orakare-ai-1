class TranscriptionProvider {
  constructor(name) {
    this.name = name
  }

  isConfigured() {
    return false
  }

  async transcribe() {
    throw new Error(this.name + ' transcription provider has not implemented transcribe().')
  }
}

class HttpTranscriptionProvider extends TranscriptionProvider {
  constructor() {
    super('orakare-http-transcription')
    this.endpoint = process.env.ORAKARE_TRANSCRIPTION_ENDPOINT || ''
    this.apiKey = process.env.ORAKARE_TRANSCRIPTION_API_KEY || ''
  }

  isConfigured() {
    return Boolean(this.endpoint)
  }

  async transcribe({ buffer, mimeType, metadata }) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: 'Bearer ' + this.apiKey } : {}),
      },
      body: JSON.stringify({
        mimeType,
        metadata,
        audioBase64: buffer.toString('base64'),
      }),
    })

    const data = await response.json().catch(function() { return {} })
    if (!response.ok) {
      return {
        status: 'failed',
        transcript: '',
        provider: this.name,
        error: data.error || 'Transcription provider failed.',
      }
    }

    return {
      status: 'transcribed',
      transcript: String(data.transcript || '').trim(),
      provider: data.provider || this.name,
      error: '',
    }
  }
}

function configuredProvider() {
  const providers = [
    new HttpTranscriptionProvider(),
  ]
  return providers.find(function(provider) {
    return provider.isConfigured()
  }) || null
}

export async function transcribeClinicalAudio({ buffer, mimeType, metadata }) {
  if (!buffer || buffer.length === 0) {
    return {
      status: 'empty',
      transcript: '',
      provider: 'none',
      error: 'No audio bytes were received.',
    }
  }

  const provider = configuredProvider()
  if (!provider) {
    return {
      status: 'pending_provider',
      transcript: '',
      provider: 'none',
      error: 'Audio saved successfully. Transcription is pending until a speech-to-text provider is configured.',
    }
  }

  return provider.transcribe({ buffer, mimeType, metadata })
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const STAGES = [
  { id: 'listen', title: 'Listen', subtitle: 'Chief Complaint' },
  { id: 'personal-history', title: 'Personal History', subtitle: 'Medical, Allergy, Habits' },
  { id: 'dental-history', title: 'Dental History', subtitle: 'Past Dental, Procedures' },
  { id: 'examination', title: 'Examination', subtitle: 'Clinical Findings' },
  { id: 'investigations', title: 'Investigations', subtitle: 'X-Rays, Tests' },
  { id: 'diagnosis', title: 'Diagnosis', subtitle: 'AI Assist + Doctor' },
  { id: 'treatment-plan', title: 'Treatment Plan', subtitle: 'Options & Advice' },
  { id: 'next-step', title: 'Next Step', subtitle: 'Assistant / Recall' },
]

const TEETH = [
  ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'],
  ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'],
]

const FINDINGS = ['Caries', 'Fracture', 'Sensitivity', 'Mobility', 'Filling', 'Missing', 'Discoloration', 'Others']
const TESTS = ['Bitewing', 'Periapical', 'OPG', 'CBCT', 'Others']
const CONDITIONS = ['Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Heart Disease', 'Others']
const DENTAL_PROBLEMS = ['Cavity', 'Sensitivity', 'Gum Problem', 'RCT', 'Extraction', 'Braces', 'Others']
const HABITS = ['Smoking', 'Alcohol', 'Tobacco', 'None']

function cx() {
  return Array.from(arguments).filter(Boolean).join(' ')
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds || 0))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0')
}

function defaultDraft(patient) {
  const allergies = Array.isArray(patient?.allergies) ? patient.allergies : []
  const conditions = Array.isArray(patient?.medicalHistory?.conditions) ? patient.medicalHistory.conditions : []
  const medications = Array.isArray(patient?.medicalHistory?.medications) ? patient.medicalHistory.medications : []
  const complaint = patient?.visitReason || patient?.medicalHistory?.chiefComplaint || ''
  return {
    stageId: 'listen',
    completedStages: [],
    listen: {
      manualText: complaint,
      summary: complaint ? ['Patient reports: ' + complaint] : ['No complaint captured yet.'],
      audio: [],
    },
    personalHistory: {
      conditions,
      medications: medications.length ? medications : [''],
      allergies,
      habits: [],
    },
    dentalHistory: {
      problems: [],
      lastVisit: patient?.lastVisit && patient.lastVisit !== 'Not recorded' ? patient.lastVisit : '',
      ongoingTreatment: patient?.activeCase ? 'Yes' : 'No',
      notes: '',
    },
    examination: {
      tab: 'Chart',
      selectedTeeth: [],
      findings: [],
      activeFinding: '',
      surface: '',
      severity: '',
      note: '',
    },
    investigations: {
      images: [],
      tests: [],
      note: '',
    },
    diagnosis: {
      aiDraft: [
        'AI draft will update from complaint, findings, and investigations.',
        'Doctor confirmation is required before it becomes clinical fact.',
      ],
      doctorDiagnosis: '',
      notes: '',
      generating: false,
      error: '',
    },
    treatmentPlan: {
      options: [
        { id: 'rct', name: 'Root Canal Treatment', region: 'Tooth / region', visits: '2-3 visits', price: 'Rs 12,000 - Rs 18,000', selected: true, kind: 'Recommended' },
        { id: 'crown', name: 'Post & Crown', region: '', visits: '2 visits', price: 'Rs 8,000 - Rs 12,000', selected: true, kind: 'Recommended' },
        { id: 'implant', name: 'Extraction + Implant', region: '', visits: '3-4 visits', price: 'Rs 30,000 - Rs 45,000', selected: false, kind: 'Alternative' },
        { id: 'extraction', name: 'Extraction Only', region: '', visits: '1 visit', price: 'Rs 1,500 - Rs 3,000', selected: false, kind: 'Alternative' },
      ],
      advice: 'Avoid cold and hard food\nPain relief as needed',
    },
    nextStep: {
      selected: 'assistant',
    },
  }
}

function featureStrip() {
  return ['Smooth auto-save', 'AI listening', 'Smart suggestions', 'Fast capture', 'Multi-select', 'Easy navigation']
}

function nextStageId(currentId) {
  const index = STAGES.findIndex((stage) => stage.id === currentId)
  return STAGES[Math.min(STAGES.length - 1, index + 1)]?.id || currentId
}

function previousStageId(currentId) {
  const index = STAGES.findIndex((stage) => stage.id === currentId)
  return STAGES[Math.max(0, index - 1)]?.id || currentId
}

function ChipButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'min-h-10 rounded-lg border px-3 text-xs font-medium transition',
        active ? 'border-[#6D3DF5] bg-[#F4F0FF] text-[#5126D8]' : 'border-[#E5E6EC] bg-white text-[#161827] hover:border-[#BBA7FF]'
      )}
    >
      {active ? '[x] ' : ''}{children}
    </button>
  )
}

function PatientIdentityBar({ patient, draft, cameraControl }) {
  const allergies = draft.personalHistory?.allergies || patient.allergies || []
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E5E6EC] bg-white p-3 shadow-[0_8px_24px_rgba(21,24,39,0.04)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F0FF] text-sm font-semibold text-[#6D3DF5]">
          {String(patient.name || 'P').slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-[15px] font-semibold text-[#161827]">{patient.name || 'Unnamed patient'}</div>
            <span className="rounded-md bg-[#F2FFE9] px-2 py-1 text-[10px] font-medium text-[#298B37]">New Patient</span>
            {allergies.length > 0 && <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">Allergy: {allergies.join(', ')}</span>}
          </div>
          <div className="mt-0.5 text-xs text-[#646779]">
            {patient.age || 'NA'} Y - {patient.gender || 'NA'} - ID: {patient.originalID || patient.id}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        {cameraControl}
        <span className="rounded-lg border border-[#E5E6EC] px-2.5 py-2 text-xs text-[#646779]">...</span>
      </div>
    </div>
  )
}

function Stepper({ draft, setStage }) {
  const activeIndex = STAGES.findIndex((stage) => stage.id === draft.stageId)
  const completed = draft.completedStages || []
  return (
    <>
      <div className="hidden overflow-x-auto border-b border-[#E5E6EC] pb-5 lg:block">
        <div className="flex min-w-[1040px] items-center gap-2">
          {STAGES.map((stage, index) => {
            const active = stage.id === draft.stageId
            const done = completed.includes(stage.id)
            return (
              <div key={stage.id} className="flex min-w-0 flex-1 items-center gap-2">
                <button type="button" onClick={() => setStage(stage.id)} className="flex min-w-0 items-center gap-2 text-left">
                  <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold', active ? 'border-[#6D3DF5] bg-[#F4F0FF] text-[#6D3DF5]' : done ? 'border-[#BBA7FF] text-[#6D3DF5]' : 'border-[#BBA7FF] text-[#6D3DF5]')}>{index + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-[#161827]">{stage.title}</span>
                    <span className="block truncate text-[11px] text-[#646779]">{stage.subtitle}</span>
                  </span>
                </button>
                {index < STAGES.length - 1 && <span className="text-[#B8BBC8]">-&gt;</span>}
              </div>
            )
          })}
        </div>
      </div>
      <div className="lg:hidden">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-[#6D3DF5]">Step {activeIndex + 1} of {STAGES.length}</div>
            <div className="text-lg font-semibold text-[#161827]">{STAGES[activeIndex]?.title}</div>
            <div className="text-xs text-[#646779]">{STAGES[activeIndex]?.subtitle}</div>
          </div>
          <button type="button" className="rounded-lg border border-[#E5E6EC] px-3 py-2 text-xs text-[#646779]">All stages</button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EEEFF4]">
          <div className="h-full rounded-full bg-[#6D3DF5]" style={{ width: ((activeIndex + 1) / STAGES.length) * 100 + '%' }} />
        </div>
      </div>
    </>
  )
}

function Waveform({ active }) {
  const bars = [10, 14, 18, 26, 34, 42, 31, 22, 18, 27, 36, 23, 19, 16, 21, 30, 40, 28, 18, 24, 34, 39, 25, 20, 17, 14]
  return (
    <div className="flex h-24 items-center justify-center gap-1 rounded-xl border border-[#E5E6EC] bg-white">
      {bars.map((height, index) => (
        <span
          key={index}
          className={cx('w-0.5 rounded-full bg-[#6D3DF5]', active && 'animate-pulse')}
          style={{ height: height + 'px', opacity: active ? 1 : 0.65 }}
        />
      ))}
    </div>
  )
}

function MicrophoneRecorder({ clinicId, patientId, visitId, stageId, getVisitIdentity, onTranscript, onAudioSaved }) {
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const [state, setState] = useState('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)

  function stopTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      stopTracks()
    }
  }, [])

  async function start() {
    setError('')
    setMessage('')
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      setError('Microphone recording is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new window.MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.start()
      setElapsed(0)
      setState('recording')
      timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    } catch (err) {
      setError(err?.name === 'NotAllowedError' ? 'Microphone permission was denied.' : 'Could not start microphone recording.')
      stopTracks()
    }
  }

  function pause() {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.pause()
      setState('paused')
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }

  function resume() {
    if (recorderRef.current?.state === 'paused') {
      recorderRef.current.resume()
      setState('recording')
      timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    }
  }

  async function finish(cancelled) {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    await new Promise((resolve) => {
      recorder.onstop = resolve
      recorder.stop()
    })
    if (timerRef.current) window.clearInterval(timerRef.current)
    stopTracks()
    setState('idle')
    if (cancelled) {
      chunksRef.current = []
      setElapsed(0)
      return
    }
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
    console.info('Orakare Flow microphone trace', {
      step: 'Blob creation',
      clinicId,
      patientId,
      visitId,
      mimeType: blob.type,
      blobSize: blob.size,
      elapsedSeconds: elapsed,
    })
    if (blob.size === 0) {
      setError('Recording was empty. Please try again.')
      return
    }
    setUploading(true)
    try {
      const identity = await getVisitIdentity?.()
      const resolvedVisitId = identity?.visitId || visitId
      console.info('Orakare Flow microphone trace', {
        step: 'Upload',
        clinicId,
        patientId,
        visitId: resolvedVisitId,
        resolvedUser: identity?.resolvedUser || null,
      })
      const form = new FormData()
      form.append('clinicId', clinicId)
      form.append('patientId', patientId)
      form.append('visitId', resolvedVisitId)
      form.append('stageId', stageId)
      form.append('elapsedSeconds', String(elapsed))
      form.append('audio', blob, 'consultation-audio.webm')
      const response = await fetch('/api/orakare-flow/media/audio', { method: 'POST', body: form })
      const data = await response.json().catch(() => ({}))
      console.info('Orakare Flow microphone trace', {
        step: 'Returned JSON',
        ok: response.ok,
        status: response.status,
        trace: data.trace || null,
        transcription: data.transcription || null,
      })
      if (!response.ok) throw new Error(data.error || 'Audio upload failed.')
      onAudioSaved?.(data.audio, data)
      if (data.transcription?.transcript) {
        onTranscript(data.transcription.transcript, data)
        setMessage('Audio saved successfully.')
      } else {
        onTranscript('[Voice note recorded]', data)
        setMessage('Audio saved successfully.')
      }
      if (data.transcription?.error && data.transcription.status !== 'pending_provider') setError(data.transcription.error)
    } catch (err) {
      setError(err.message || 'Audio upload failed. Retry after checking connection.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Waveform active={state === 'recording'} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xl font-semibold text-[#161827]">{formatTime(elapsed)}</div>
          <div className="text-xs font-medium text-[#6D3DF5]">{uploading ? 'Uploading...' : state === 'recording' ? 'Listening...' : state === 'paused' ? 'Paused' : 'Ready to listen'}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {state === 'idle' && <button type="button" onClick={start} className="h-10 rounded-lg bg-[#6D3DF5] px-4 text-xs font-semibold text-white">Start</button>}
          {state === 'recording' && <button type="button" onClick={pause} className="h-10 rounded-lg border border-[#6D3DF5] px-4 text-xs font-semibold text-[#6D3DF5]">Pause</button>}
          {state === 'paused' && <button type="button" onClick={resume} className="h-10 rounded-lg border border-[#6D3DF5] px-4 text-xs font-semibold text-[#6D3DF5]">Resume</button>}
          {(state === 'recording' || state === 'paused') && <button type="button" onClick={() => finish(false)} className="h-10 rounded-lg bg-[#6D3DF5] px-4 text-xs font-semibold text-white">Stop</button>}
          {(state === 'recording' || state === 'paused') && <button type="button" onClick={() => finish(true)} className="h-10 rounded-lg border border-[#E5E6EC] px-4 text-xs font-semibold text-[#646779]">Cancel</button>}
        </div>
      </div>
      {message && <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-800">{message}</div>}
      {error && <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{error}</div>}
    </div>
  )
}

function CameraCapture({ clinicId, patientId, visitId, buttonLabel = '+ Add', getVisitIdentity, onUploaded }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [meta, setMeta] = useState({ investigationType: 'IOPA / Periapical radiograph', toothRegion: '', note: '' })

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  useEffect(() => stopCamera, [])

  async function startCamera() {
    setError('')
    setPreview('')
    setOpen(true)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported in this browser. Use file upload.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      console.info('Orakare Flow camera trace', { step: 'getUserMedia', permission: 'requested', opened: true })
    } catch (err) {
      console.info('Orakare Flow camera trace', { step: 'getUserMedia', opened: false, error: err?.name || err?.message || String(err) })
      setError(err?.name === 'NotAllowedError' ? 'Camera permission was denied. Use file upload.' : 'Could not open camera. Use file upload.')
      stopCamera()
    }
  }

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    setPreview(canvas.toDataURL('image/jpeg', 0.9))
    console.info('Orakare Flow camera trace', { step: 'Capture', width: canvas.width, height: canvas.height, previewShown: true })
    stopCamera()
  }

  async function uploadBlob(blob) {
    if (!blob || blob.size === 0) {
      setError('Image is empty. Please retake or upload a file.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const identity = await getVisitIdentity?.()
      const resolvedVisitId = identity?.visitId || visitId
      console.info('Orakare Flow camera trace', {
        step: 'Upload',
        clinicId,
        patientId,
        visitId: resolvedVisitId,
        blobSize: blob.size,
        resolvedUser: identity?.resolvedUser || null,
      })
      const form = new FormData()
      form.append('clinicId', clinicId)
      form.append('patientId', patientId)
      form.append('visitId', resolvedVisitId)
      form.append('stageId', 'investigations')
      form.append('investigationType', meta.investigationType)
      form.append('toothRegion', meta.toothRegion)
      form.append('note', meta.note)
      form.append('image', blob, 'clinical-image.jpg')
      const response = await fetch('/api/orakare-flow/media/image', { method: 'POST', body: form })
      const data = await response.json().catch(() => ({}))
      console.info('Orakare Flow camera trace', { step: 'Returned JSON', ok: response.ok, status: response.status, trace: data.trace || null })
      if (!response.ok) throw new Error(data.error || 'Image upload failed.')
      onUploaded(data.image)
      setOpen(false)
      setPreview('')
      stopCamera()
    } catch (err) {
      setError(err.message || 'Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function confirmCapture() {
    fetch(preview).then((response) => response.blob()).then(uploadBlob)
  }

  function fileSelected(event) {
    const file = event.target.files?.[0]
    if (file) uploadBlob(file)
  }

  return (
    <>
      <button type="button" onClick={startCamera} className="h-10 rounded-lg border border-[#6D3DF5] px-4 text-xs font-semibold text-[#6D3DF5]">{buttonLabel}</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-0 sm:items-center sm:justify-center sm:p-6">
          <div className="max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-[#161827]">Add investigation image</div>
              <button type="button" onClick={() => { setOpen(false); stopCamera() }} className="rounded-lg border border-[#E5E6EC] px-3 py-2 text-xs">Cancel</button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input value={meta.investigationType} onChange={(event) => setMeta({ ...meta, investigationType: event.target.value })} className="h-10 rounded-lg border border-[#E5E6EC] px-3 text-sm" />
              <input value={meta.toothRegion} onChange={(event) => setMeta({ ...meta, toothRegion: event.target.value })} placeholder="Tooth / region" className="h-10 rounded-lg border border-[#E5E6EC] px-3 text-sm" />
              <input value={meta.note} onChange={(event) => setMeta({ ...meta, note: event.target.value })} placeholder="Note" className="h-10 rounded-lg border border-[#E5E6EC] px-3 text-sm sm:col-span-2" />
            </div>
            <div className="mt-3 overflow-hidden rounded-xl bg-black">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Captured preview" className="max-h-[50vh] w-full object-contain" />
              ) : <video ref={videoRef} autoPlay playsInline muted className="max-h-[50vh] w-full bg-black object-contain" />}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            {error && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{error}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              {!preview && <button type="button" onClick={capture} className="h-10 rounded-lg bg-[#6D3DF5] px-4 text-xs font-semibold text-white">Capture</button>}
              {preview && <button type="button" onClick={confirmCapture} disabled={uploading} className="h-10 rounded-lg bg-[#6D3DF5] px-4 text-xs font-semibold text-white">{uploading ? 'Uploading...' : 'Confirm'}</button>}
              {preview && <button type="button" onClick={() => { setPreview(''); startCamera() }} className="h-10 rounded-lg border border-[#E5E6EC] px-4 text-xs font-semibold">Retake</button>}
              <label className="flex h-10 cursor-pointer items-center rounded-lg border border-[#E5E6EC] px-4 text-xs font-semibold">
                Upload file
                <input type="file" accept="image/*" onChange={fileSelected} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StageCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-[#E5E6EC] bg-white p-4 shadow-[0_12px_32px_rgba(21,24,39,0.06)] sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-[#161827]">{title}</h2>
      {children}
    </div>
  )
}

export default function DoctorConsultationFlow({ clinicId, patient, activeConsultation, initialDraft, media, saveStatus, onDraftChange, onVisitResolved, onBack, onComplete }) {
  const [draft, setDraft] = useState(() => initialDraft || defaultDraft(patient))
  const [resolvedVisitId, setResolvedVisitId] = useState(activeConsultation.visitId)
  const didMountRef = useRef(false)
  const onDraftChangeRef = useRef(onDraftChange)
  const stageIndex = Math.max(0, STAGES.findIndex((stage) => stage.id === draft.stageId))

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange
  }, [onDraftChange])

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    onDraftChangeRef.current(draft)
  }, [draft])

  function update(updater) {
    setDraft((current) => {
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      return next
    })
  }

  function updateSection(section, value) {
    update((current) => ({ ...current, [section]: { ...current[section], ...(typeof value === 'function' ? value(current[section]) : value) } }))
  }

  function toggleArray(section, field, item) {
    updateSection(section, (current) => {
      const values = current[field] || []
      return { [field]: values.includes(item) ? values.filter((value) => value !== item) : values.concat(item) }
    })
  }

  function goNext() {
    if (draft.stageId === 'next-step') {
      onComplete?.(draft.nextStep.selected)
      return
    }
    update((current) => ({
      ...current,
      stageId: nextStageId(current.stageId),
      completedStages: Array.from(new Set((current.completedStages || []).concat(current.stageId))),
    }))
  }

  function goBackStage() {
    update({ stageId: previousStageId(draft.stageId) })
  }

  async function ensureVisitIdentity() {
    const currentVisitId = resolvedVisitId || activeConsultation.visitId
    if (currentVisitId && !String(currentVisitId).startsWith('visit-')) {
      return { visitId: currentVisitId, resolvedUser: { clinicId } }
    }

    const response = await fetch('/api/consultation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: patient.id }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.visitId) {
      throw new Error(data.error || 'Could not resolve a clinic visit before media upload.')
    }
    setResolvedVisitId(data.visitId)
    onVisitResolved?.({ patientId: patient.id, visitId: data.visitId, batonId: activeConsultation.batonId })
    console.info('Orakare Flow visit trace', {
      step: 'React state -> resolved visit',
      clinicId,
      patientId: patient.id,
      previousVisitId: currentVisitId,
      visitId: data.visitId,
      response: data,
    })
    return { visitId: data.visitId, resolvedUser: { clinicId } }
  }

  const stageTitle = (stageIndex + 1) + '. ' + STAGES[stageIndex].title + (draft.stageId === 'listen' ? ' (Chief Complaint)' : draft.stageId === 'diagnosis' ? ' (AI Assist)' : '')

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 bg-white px-2 pb-24 text-[#161827] sm:px-4 lg:px-6">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight text-[#101229]">Orakare Flow</h1>
        <p className="mt-1 text-sm text-[#161827]">Doctor Consultation Flow - New Patient</p>
      </div>
      <Stepper draft={draft} setStage={(stageId) => update({ stageId })} />
      <div className="flex overflow-x-auto whitespace-nowrap py-1 text-center text-xs text-[#161827] lg:justify-center">
        {featureStrip().map((item, index) => <span key={item} className="px-2">{index > 0 && <span className="mr-3">-</span>}{item}</span>)}
      </div>
      <PatientIdentityBar
        patient={patient}
        draft={draft}
        cameraControl={
          <CameraCapture
            clinicId={clinicId}
            patientId={patient.id}
            visitId={resolvedVisitId}
            buttonLabel="Cam"
            getVisitIdentity={ensureVisitIdentity}
            onUploaded={(image) => {
              update({ stageId: 'investigations' })
              updateSection('investigations', (current) => ({ images: (current.images || []).concat(image) }))
            }}
          />
        }
      />
      <StageCard title={stageTitle}>
        {draft.stageId === 'listen' && (
          <div className="space-y-4">
            <MicrophoneRecorder
              clinicId={clinicId}
              patientId={patient.id}
              visitId={resolvedVisitId}
              stageId="listen"
              getVisitIdentity={ensureVisitIdentity}
              onTranscript={(text, data) => updateSection('listen', (current) => {
                const pendingVoiceNote = text === '[Voice note recorded]'
                const existing = current.manualText || ''
                const nextManual = pendingVoiceNote && existing.includes('[Voice note recorded]')
                  ? existing
                  : [existing, text].filter(Boolean).join('\n')
                return {
                  manualText: nextManual,
                  summary: pendingVoiceNote
                    ? ['Audio saved successfully.']
                    : text.split('\n').filter(Boolean).slice(0, 5),
                  transcriptionStatus: data?.transcription?.status || '',
                }
              })}
              onAudioSaved={(audio) => updateSection('listen', (current) => ({ audio: (current.audio || []).concat(audio) }))}
            />
            <textarea value={draft.listen.manualText || ''} onChange={(event) => updateSection('listen', { manualText: event.target.value, summary: event.target.value ? event.target.value.split('\n').filter(Boolean).slice(0, 5) : ['No complaint captured yet.'] })} rows={3} placeholder="Manual text fallback remains available..." className="w-full resize-none rounded-xl border border-[#E5E6EC] px-3 py-2 text-sm outline-none focus:border-[#6D3DF5]" />
            <div className="rounded-xl border border-[#E5E6EC] p-3">
              <div className="mb-2 text-xs font-semibold">AI Summary (Live)</div>
              <ul className="space-y-1 text-xs leading-6 text-[#161827]">
                {(draft.listen.summary || []).map((line) => <li key={line}>- {line}</li>)}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Pain Scale', 'Location', 'Duration', 'Triggers'].map((item) => <ChipButton key={item}>{item}</ChipButton>)}
            </div>
          </div>
        )}
        {draft.stageId === 'personal-history' && (
          <div className="space-y-5">
            <div><div className="mb-2 text-xs font-semibold">Medical Conditions</div><div className="flex flex-wrap gap-2">{CONDITIONS.map((item) => <ChipButton key={item} active={(draft.personalHistory.conditions || []).includes(item)} onClick={() => toggleArray('personalHistory', 'conditions', item)}>{item}</ChipButton>)}</div></div>
            <div><div className="mb-2 text-xs font-semibold">Current Medications</div><div className="rounded-xl border border-[#E5E6EC] p-3 text-xs">{(draft.personalHistory.medications || ['']).filter(Boolean).join(', ') || 'None recorded'} <button type="button" className="float-right text-[#6D3DF5]">+ Add</button></div></div>
            <div><div className="mb-2 text-xs font-semibold">Allergies</div><div className="flex flex-wrap gap-2">{(draft.personalHistory.allergies || []).map((item) => <ChipButton key={item} active onClick={() => toggleArray('personalHistory', 'allergies', item)}>{item} x</ChipButton>)}<ChipButton>+ Add allergy</ChipButton></div></div>
            <div><div className="mb-2 text-xs font-semibold">Habits</div><div className="flex flex-wrap gap-2">{HABITS.map((item) => <ChipButton key={item} active={(draft.personalHistory.habits || []).includes(item)} onClick={() => toggleArray('personalHistory', 'habits', item)}>{item}</ChipButton>)}</div></div>
          </div>
        )}
        {draft.stageId === 'dental-history' && (
          <div className="space-y-5">
            <div><div className="mb-2 text-xs font-semibold">Previous Dental Problems</div><div className="flex flex-wrap gap-2">{DENTAL_PROBLEMS.map((item) => <ChipButton key={item} active={(draft.dentalHistory.problems || []).includes(item)} onClick={() => toggleArray('dentalHistory', 'problems', item)}>{item}</ChipButton>)}</div></div>
            <div><div className="mb-2 text-xs font-semibold">Last Dental Visit</div><select value={draft.dentalHistory.lastVisit || ''} onChange={(event) => updateSection('dentalHistory', { lastVisit: event.target.value })} className="h-11 w-full rounded-lg border border-[#E5E6EC] px-3 text-sm"><option value="">Select</option><option>Within 6 months</option><option>6-12 months</option><option>1-2 years ago</option><option>More than 2 years</option><option>Never / unsure</option></select></div>
            <div><div className="mb-2 text-xs font-semibold">Any Ongoing Dental Treatment?</div><div className="flex gap-2">{['Yes', 'No'].map((item) => <ChipButton key={item} active={draft.dentalHistory.ongoingTreatment === item} onClick={() => updateSection('dentalHistory', { ongoingTreatment: item })}>{item}</ChipButton>)}</div></div>
            <textarea value={draft.dentalHistory.notes || ''} onChange={(event) => updateSection('dentalHistory', { notes: event.target.value })} rows={3} placeholder="Add notes" className="w-full resize-none rounded-xl border border-[#E5E6EC] px-3 py-2 text-sm" />
          </div>
        )}
        {draft.stageId === 'examination' && (
          <div className="space-y-4">
            <div className="flex border-b border-[#E5E6EC] text-xs font-medium">{['Chart', 'Periodontal', 'Notes'].map((tab) => <button key={tab} type="button" onClick={() => updateSection('examination', { tab })} className={cx('px-8 py-3', draft.examination.tab === tab ? 'border-b-2 border-[#6D3DF5] text-[#6D3DF5]' : 'text-[#646779]')}>{tab}</button>)}</div>
            <div className="overflow-x-auto rounded-xl p-2">
              <div className="mx-auto min-w-[620px] max-w-[720px] space-y-4">
                {TEETH.map((row, rowIndex) => <div key={rowIndex} className="flex justify-center gap-2">{row.map((tooth) => {
                  const selected = (draft.examination.selectedTeeth || []).includes(tooth)
                  const marked = (draft.examination.findings || []).some((finding) => finding.tooth === tooth)
                  return <button key={tooth} type="button" onClick={() => toggleArray('examination', 'selectedTeeth', tooth)} className={cx('flex h-11 w-11 items-center justify-center rounded-full border text-xs', selected ? 'border-[#6D3DF5] bg-[#F4F0FF] text-[#6D3DF5]' : marked ? 'border-red-300 bg-red-50 text-red-600' : 'border-[#B8BBC8] bg-white text-[#646779]')}>{tooth}</button>
                })}</div>)}
              </div>
            </div>
            <div><div className="mb-2 text-xs font-semibold">Quick Findings</div><div className="flex flex-wrap gap-2">{FINDINGS.map((item) => <ChipButton key={item} active={draft.examination.activeFinding === item} onClick={() => updateSection('examination', { activeFinding: item })}>{item}</ChipButton>)}</div></div>
            <div className="grid gap-2 sm:grid-cols-3"><input value={draft.examination.surface || ''} onChange={(event) => updateSection('examination', { surface: event.target.value })} placeholder="Surface" className="h-10 rounded-lg border border-[#E5E6EC] px-3 text-sm" /><input value={draft.examination.severity || ''} onChange={(event) => updateSection('examination', { severity: event.target.value })} placeholder="Severity / grade" className="h-10 rounded-lg border border-[#E5E6EC] px-3 text-sm" /><button type="button" onClick={() => updateSection('examination', (exam) => ({ findings: (exam.findings || []).concat((exam.selectedTeeth || []).map((tooth) => ({ id: tooth + Date.now(), tooth, finding: exam.activeFinding, surface: exam.surface, severity: exam.severity }))), activeFinding: '', surface: '', severity: '' }))} disabled={!draft.examination.activeFinding || !draft.examination.selectedTeeth?.length} className="h-10 rounded-lg bg-[#6D3DF5] text-xs font-semibold text-white disabled:bg-[#B8BBC8]">Apply</button></div>
            <div className="space-y-2">{(draft.examination.findings || []).map((finding) => <div key={finding.id} className="flex justify-between rounded-lg border border-[#E5E6EC] p-2 text-xs"><span>{finding.tooth}: {finding.finding} {finding.surface}</span><button type="button" onClick={() => updateSection('examination', (exam) => ({ findings: exam.findings.filter((item) => item.id !== finding.id) }))} className="text-red-600">Remove</button></div>)}</div>
          </div>
        )}
        {draft.stageId === 'investigations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><div className="text-xs font-semibold">X-Rays & Images</div><CameraCapture clinicId={clinicId} patientId={patient.id} visitId={resolvedVisitId} getVisitIdentity={ensureVisitIdentity} onUploaded={(image) => updateSection('investigations', (current) => ({ images: (current.images || []).concat(image) }))} /></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[...(media?.images || []).filter((item) => item.source === 'orakare-flow-camera'), ...(draft.investigations.images || [])].map((image, index) => <div key={(image.path || '') + index}><div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[#161827] text-xs text-white">Stored image</div><div className="mt-1 text-xs font-medium">{image.investigationType || 'Image'}</div><div className="text-[11px] text-[#646779]">{image.toothRegion || 'Region not set'}</div></div>)}</div>
            <div><div className="mb-2 text-xs font-semibold">Other Tests</div><div className="divide-y divide-[#E5E6EC] rounded-xl border border-[#E5E6EC]">{TESTS.map((item) => <button key={item} type="button" onClick={() => toggleArray('investigations', 'tests', item)} className="flex w-full items-center justify-between px-3 py-3 text-xs"><span>{item}</span><span className={cx('h-4 w-4 rounded border', draft.investigations.tests?.includes(item) ? 'border-[#6D3DF5] bg-[#6D3DF5]' : 'border-[#B8BBC8]')} /></button>)}</div></div>
          </div>
        )}
        {draft.stageId === 'diagnosis' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#FFF8E8] p-4 text-sm"><div className="mb-2 text-xs font-semibold">AI Draft</div><ul className="space-y-1 text-xs leading-6">{(draft.diagnosis.aiDraft || []).map((item) => <li key={item}>- {item}</li>)}</ul></div>
            <div><div className="mb-2 text-xs font-semibold">Doctor&apos;s Diagnosis</div><input value={draft.diagnosis.doctorDiagnosis || ''} onChange={(event) => updateSection('diagnosis', { doctorDiagnosis: event.target.value })} placeholder="Irreversible Pulpitis - 26" className="h-11 w-full rounded-lg border border-[#E5E6EC] px-3 text-sm" /></div>
            <textarea value={draft.diagnosis.notes || ''} onChange={(event) => updateSection('diagnosis', { notes: event.target.value })} rows={4} placeholder="Add notes (optional)" className="w-full resize-none rounded-xl border border-[#E5E6EC] px-3 py-2 text-sm" />
          </div>
        )}
        {draft.stageId === 'treatment-plan' && (
          <div className="space-y-4">
            <div className="text-xs font-semibold">Select Recommended Options (Multiple)</div>
            <div className="space-y-3">{draft.treatmentPlan.options.map((option) => <button key={option.id} type="button" onClick={() => updateSection('treatmentPlan', (plan) => ({ options: plan.options.map((item) => item.id === option.id ? { ...item, selected: !item.selected } : item) }))} className={cx('w-full rounded-xl border p-3 text-left', option.selected ? 'border-[#6D3DF5] bg-[#F4F0FF]' : 'border-[#E5E6EC] bg-white')}><div className="flex justify-between gap-3"><div><div className="text-sm font-semibold">{option.selected ? '[x] ' : '[ ] '}{option.name}{option.region ? ' - ' + option.region : ''}</div><div className="mt-1 text-xs text-[#646779]">{option.visits}</div><div className="text-xs text-[#646779]">{option.price}</div></div><span className="text-xs text-[#6D3DF5]">Details</span></div><div className="mt-2 text-[11px] text-[#646779]">{option.kind}</div></button>)}</div>
            <textarea value={draft.treatmentPlan.advice || ''} onChange={(event) => updateSection('treatmentPlan', { advice: event.target.value })} rows={3} className="w-full resize-none rounded-xl border border-[#E5E6EC] px-3 py-2 text-sm" />
          </div>
        )}
        {draft.stageId === 'next-step' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold">What&apos;s Next?</div>
            {[['assistant', 'Send to Assistant', 'For scheduling / treatment prep', 'Pt'], ['prescription', 'Prescription / Advice', 'Medicine / Instructions', 'Rx'], ['schedule', 'Schedule Next Visit', 'Book appointment', 'Cal'], ['finish', 'Finish Consultation', 'No treatment for now', 'Done']].map((item) => <button key={item[0]} type="button" onClick={() => updateSection('nextStep', { selected: item[0] })} className={cx('flex w-full items-center gap-3 rounded-xl border p-4 text-left', draft.nextStep.selected === item[0] ? 'border-[#6D3DF5] bg-[#F4F0FF]' : 'border-[#E5E6EC] bg-white')}><span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E6EC] text-xs font-semibold text-[#6D3DF5]">{item[3]}</span><span><span className="block text-sm font-semibold">{item[1]}</span><span className="text-xs text-[#646779]">{item[2]}</span></span></button>)}
          </div>
        )}
      </StageCard>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E6EC] bg-white/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3">
          <button type="button" onClick={stageIndex === 0 ? onBack : goBackStage} className="h-11 rounded-xl border border-[#E5E6EC] px-5 text-sm font-semibold text-[#646779]">Back</button>
          <div className="hidden text-xs text-[#646779] sm:block">{saveStatus}</div>
          <button type="button" onClick={goNext} className="h-11 rounded-xl bg-[#6D3DF5] px-8 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(109,61,245,0.25)]">{draft.stageId === 'next-step' ? 'Complete' : 'Next ->'}</button>
        </div>
      </div>
    </div>
  )
}

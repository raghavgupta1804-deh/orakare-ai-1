import { redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import OutreachView from '@/components/outreach/OutreachView'

export const dynamic = 'force-dynamic'

export default async function OutreachPage() {
  const ctx = await getDoctorContext()
  if (!ctx.clinicId) redirect('/sign-in')

  return (
    <div>
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <h1 className="text-xl font-medium text-slate-900">Outreach 🦷</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          WhatsApp messages ready to send. Click any card to open WhatsApp Web with the draft pre-filled.
        </p>
      </div>
      <div className="p-8 max-w-5xl">
        <OutreachView />
      </div>
    </div>
  )
}

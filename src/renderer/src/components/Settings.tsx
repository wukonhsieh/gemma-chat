import { useEffect, useState } from 'react'

type SettingsTab = 'general' | 'permissions'

interface Props {
  onBack: () => void
}

export default function Settings({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  return (
    <div className="flex h-full w-full bg-[#0e0e0e] text-white">
      {/* Left sidebar */}
      <div className="flex w-52 shrink-0 flex-col border-r border-white/[0.06] bg-black/20">
        <div className="h-11 shrink-0" />
        <div className="px-3 pb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] text-ink-400 transition hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back
          </button>
        </div>
        <div className="px-2 pb-2 text-[10px] font-medium uppercase tracking-wider text-ink-400 px-3">
          Settings
        </div>
        <nav className="no-drag flex-1 px-2">
          <SidebarItem
            label="General"
            active={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
          />
          <SidebarItem
            label="Permissions"
            active={activeTab === 'permissions'}
            onClick={() => setActiveTab('permissions')}
          />
        </nav>
      </div>

      {/* Right content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="h-11 shrink-0" />
        <div className="px-8 py-4">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'permissions' && (
            <div className="text-sm text-ink-400">Permissions — coming in next step</div>
          )}
        </div>
      </div>
    </div>
  )
}

function SidebarItem({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-150 ${
        active ? 'bg-white/[0.07] text-white' : 'text-ink-200 hover:bg-white/[0.04]'
      }`}
    >
      {label}
    </button>
  )
}

function GeneralTab() {
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    window.api.settingsGetWorkspaceRoot()
      .then((path) => setWorkspaceRoot(path))
      .catch(() => setError(true))
  }, [])

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-[15px] font-semibold text-white">General</h2>
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
          Workspace Root Folder
        </label>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          {error ? (
            <span className="text-[12.5px] text-red-400/80">Unable to load path</span>
          ) : workspaceRoot === null ? (
            <span className="text-[12.5px] text-ink-400">…</span>
          ) : (
            <span className="break-all font-mono text-[12px] text-ink-100">{workspaceRoot}</span>
          )}
        </div>
        <p className="text-[11px] text-ink-400">
          Read-only. Generated projects are stored here.
        </p>
      </div>
    </div>
  )
}

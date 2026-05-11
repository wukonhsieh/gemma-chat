import type { ProjectRecord } from '@shared/types'

interface Conversation {
  id: string
  title: string
  createdAt: number
}

interface Props {
  projects: ProjectRecord[]
  activeProjectId: string | null
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onAddProject: () => void
  onSelectProject: (id: string | null) => void
  onDeleteProject: (id: string) => void
}

export default function Sidebar({
  projects,
  activeProjectId,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onAddProject,
  onSelectProject,
  onDeleteProject
}: Props) {
  return (
    <div className="drag flex h-full w-60 shrink-0 flex-col border-r border-white/[0.06] bg-black/20">
      <div className="h-11 shrink-0" />
      <div className="no-drag space-y-3 px-3 pb-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
              Projects
            </span>
            <button
              title="Add project"
              onClick={onAddProject}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink-400 transition hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto pr-0.5">
            {projects.length === 0 ? (
              <button
                title="Using the app default workspace"
                onClick={() => onSelectProject(null)}
                className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-left text-[12.5px] text-white"
              >
                <div className="truncate font-medium">Default workspace</div>
                <div className="mt-0.5 truncate text-[11px] text-ink-400">
                  Add a project folder
                </div>
              </button>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="group/project relative">
                  <button
                    title={project.path}
                    onClick={() => onSelectProject(project.id)}
                    className={`w-full rounded-lg px-3 py-2 pr-8 text-left transition-all duration-200 ease-out ${
                      activeProjectId === project.id
                        ? 'bg-white/[0.08] text-white'
                        : 'text-ink-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="truncate text-[12.5px] font-medium">{project.name}</div>
                    <div className="mt-0.5 truncate text-[10.5px] text-ink-400">
                      {project.path}
                    </div>
                  </button>
                  <button
                    title="Delete project record"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this project record and its chats? Files in the folder will stay untouched.')) {
                        onDeleteProject(project.id)
                      }
                    }}
                    className="absolute right-1.5 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-ink-400 hover:bg-white/10 hover:text-white group-hover/project:flex"
                  >
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
                      <path d="M4 4l8 8M12 4L4 12" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] font-medium text-white transition hover:border-white/20 hover:bg-white/[0.07]"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          New chat
        </button>
      </div>
      <div className="no-drag px-3 pb-2 text-[10px] font-medium uppercase tracking-wider text-ink-400">
        Chats
      </div>
      <div className="no-drag min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {conversations.map((c) => (
          <div key={c.id} className="group relative">
            <button
              onClick={() => onSelect(c.id)}
              className={`w-full truncate rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-200 ease-out ${
                activeId === c.id
                  ? 'bg-white/[0.07] text-white'
                  : 'text-ink-200 hover:bg-white/[0.03]'
              }`}
            >
              {c.title}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Delete this chat?')) onDelete(c.id)
              }}
              className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-md text-ink-400 hover:bg-white/10 hover:text-white group-hover:flex"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
                <path d="M4 4l8 8M12 4L4 12" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="no-drag border-t border-white/[0.06] p-3 text-[11px] text-ink-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Running locally
          </div>
          <a
            href="https://x.com/ammaar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-400/50 transition hover:text-ink-200"
          >
            @ammaar
          </a>
        </div>
      </div>
    </div>
  )
}

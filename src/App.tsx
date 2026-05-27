import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  CalendarClock,
  Camera,
  Check,
  ChevronRight,
  Clapperboard,
  CreditCard,
  Download,
  FileText,
  Image,
  Loader2,
  Mic2,
  Play,
  RefreshCcw,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Wand2,
} from 'lucide-react'
import './App.css'

type StageStatus = 'done' | 'active' | 'queued'

type Stage = {
  slug: string
  title: string
  detail: string
  progress: number
  status: StageStatus
}

type Brief = {
  name: string
  age: string
  occasion: string
  world: string
  tone: string
  duration: string
}

type Scene = {
  id?: string
  title: string
  prompt: string
  gradient: string
}

type Project = {
  id: string
  status: string
  script: string
  brief: Brief
  stages: Stage[]
  scenes: Scene[]
}

const apiBase = import.meta.env.VITE_API_URL ?? ''

const seedBrief: Brief = {
  name: 'Лева',
  age: '6',
  occasion: 'день рождения',
  world: 'космическое приключение',
  tone: 'добрый, смешной, вдохновляющий',
  duration: '60 секунд',
}

const fallbackStages: Stage[] = [
  { slug: 'script', title: 'Сценарий', detail: '12 сцен, арка героя', progress: 100, status: 'done' },
  { slug: 'character', title: 'Образ героя', detail: 'единый character sheet', progress: 76, status: 'active' },
  { slug: 'frames', title: 'Кадры', detail: '3D ключевые сцены', progress: 42, status: 'active' },
  { slug: 'animation', title: 'Анимация', detail: 'image-to-video клипы', progress: 18, status: 'queued' },
  { slug: 'voice', title: 'Озвучка', detail: 'диктор, эмоции, паузы', progress: 0, status: 'queued' },
  { slug: 'edit', title: 'Монтаж', detail: 'музыка, титры, MP4', progress: 0, status: 'queued' },
]

const fallbackScenes: Scene[] = [
  {
    title: 'Знакомство с героем',
    prompt: 'Лева находит светящийся билет в домашней комнате',
    gradient: 'scene-cyan',
  },
  {
    title: 'Портал в мир',
    prompt: 'Игрушечная ракета открывает портал над столом',
    gradient: 'scene-coral',
  },
  {
    title: 'Первое испытание',
    prompt: 'Герой помогает роботу собрать карту звезд',
    gradient: 'scene-lime',
  },
  {
    title: 'Финальная сцена',
    prompt: 'Семья смотрит премьеру мультфильма дома',
    gradient: 'scene-ink',
  },
]

const nav = [
  { label: 'Проекты', icon: Clapperboard, active: false },
  { label: 'Новый мультфильм', icon: Wand2, active: true },
  { label: 'Персонажи', icon: UserRound, active: false },
  { label: 'Тарифы', icon: CreditCard, active: false },
  { label: 'Настройки', icon: Settings, active: false },
]

const plans = [
  { name: 'Старт', price: '5 000 ₽', note: '2 ролика до 45 сек', margin: 'маржа 45-60%' },
  { name: 'Студия', price: '9 900 ₽', note: '5 роликов или 2 длинных', margin: 'приоритетная очередь' },
  { name: 'Премиум', price: '19 900 ₽', note: 'ручная режиссура и 3 правки', margin: 'для подарков и B2B' },
]

function App() {
  const [brief, setBrief] = useState(seedBrief)
  const [project, setProject] = useState<Project | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [revisionCount, setRevisionCount] = useState(1)
  const [apiState, setApiState] = useState<'connecting' | 'online' | 'offline'>('connecting')

  const stages = project?.stages ?? fallbackStages
  const scenes = project?.scenes ?? fallbackScenes
  const isGenerating = project?.status === 'queued' || project?.status === 'generating'
  const scriptPreview = project?.script ?? createLocalScript(brief)

  const overallProgress = useMemo(() => {
    const total = stages.reduce((sum, stage) => sum + stage.progress, 0)
    return Math.round(total / stages.length)
  }, [stages])

  function updateBrief(field: keyof Brief, value: string) {
    setBrief((current) => ({ ...current, [field]: value }))
  }

  const loadProject = useCallback(async (projectId: string, ignore = false) => {
    const response = await fetch(`${apiBase}/api/projects/${projectId}`)
    if (!response.ok) throw new Error('Load project failed')
    const data = (await response.json()) as { project: Project }
    if (!ignore) {
      setProject(data.project)
      setBrief(data.project.brief)
    }
  }, [])

  const createProject = useCallback(async (nextBrief: Brief, ignore = false) => {
    setIsSaving(true)
    try {
      const response = await fetch(`${apiBase}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextBrief),
      })
      if (!response.ok) throw new Error('Create project failed')
      const data = (await response.json()) as { project: Project }
      if (!ignore) {
        setProject(data.project)
        setBrief(data.project.brief)
        setApiState('online')
      }
      return data.project
    } catch {
      if (!ignore) setApiState('offline')
      return null
    } finally {
      if (!ignore) setIsSaving(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function bootstrap() {
      try {
        const response = await fetch(`${apiBase}/api/projects`)
        if (!response.ok) throw new Error('API unavailable')
        const data = (await response.json()) as { projects: Array<{ id: string }> }
        const projectId = data.projects[0]?.id

        if (projectId) {
          await loadProject(projectId, ignore)
        } else {
          await createProject(seedBrief, ignore)
        }

        if (!ignore) setApiState('online')
      } catch {
        if (!ignore) setApiState('offline')
      }
    }

    bootstrap()

    return () => {
      ignore = true
    }
  }, [createProject, loadProject])

  useEffect(() => {
    if (!project?.id || !isGenerating) return

    const timer = window.setInterval(() => {
      loadProject(project.id)
    }, 1200)

    return () => window.clearInterval(timer)
  }, [isGenerating, loadProject, project?.id])

  async function startGeneration() {
    setIsSaving(true)
    try {
      const activeProject = project ?? (await createProject(brief))
      if (!activeProject) return

      const response = await fetch(`${apiBase}/api/projects/${activeProject.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!response.ok) throw new Error('Generate failed')
      await loadProject(activeProject.id)
      setApiState('online')
    } catch {
      setApiState('offline')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Навигация">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <strong>МультСтудия AI</strong>
            <span>production console</span>
          </div>
        </div>

        <nav className="nav-list">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <button className={item.active ? 'nav-item active' : 'nav-item'} key={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <ShieldCheck size={18} />
          <p>Фото детей удаляются из черновиков через 14 дней. Публичная публикация только по согласию родителя.</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <div className="breadcrumbs">
              Проекты <ChevronRight size={14} /> Новый заказ
            </div>
            <h1>Новый мультфильм</h1>
            <p>Полный пайплайн: сценарий, персонаж, сцены, озвучка и финальный MP4.</p>
          </div>
          <div className="topbar-actions">
            <span className={`api-status ${apiState}`}>{apiState === 'online' ? 'API online' : apiState === 'offline' ? 'offline demo' : 'connect'}</span>
            <button className="icon-button" aria-label="Скачать бриф">
              <Download size={18} />
            </button>
            <button className="secondary-button" onClick={() => setRevisionCount((count) => count + 1)}>
              <RefreshCcw size={17} />
              Правка {revisionCount}
            </button>
            <button className="primary-button" onClick={startGeneration} disabled={isSaving || isGenerating}>
              {isSaving || isGenerating ? <Loader2 className="spin" size={18} /> : <Rocket size={18} />}
              {isGenerating ? `Генерация ${overallProgress}%` : 'Сгенерировать'}
            </button>
          </div>
        </header>

        <section className="summary-strip" aria-label="Сводка проекта">
          <Metric icon={CalendarClock} label="Срок" value="18-35 мин" />
          <Metric icon={BadgeCheck} label="Качество" value="1080p MP4" />
          <Metric icon={Mic2} label="Озвучка" value="RU диктор" />
          <Metric icon={CreditCard} label="Себестоимость" value="~700-1800 ₽" />
        </section>

        <section className="build-grid">
          <Panel title="Фото клиента" icon={Upload}>
            <div className="upload-zone">
              <Camera size={24} />
              <strong>3-8 фото ребенка</strong>
              <span>анфас, улыбка, полный рост, разный свет</span>
              <button>Загрузить фото</button>
            </div>
            <div className="photo-grid" aria-label="Загруженные фото">
              <div className="photo-thumb thumb-one" />
              <div className="photo-thumb thumb-two" />
              <div className="photo-thumb thumb-three" />
              <div className="photo-thumb empty-thumb">
                <Image size={18} />
              </div>
            </div>
            <label className="consent">
              <input type="checkbox" defaultChecked />
              <span>Есть согласие родителя на обработку фото и генерацию персонажа.</span>
            </label>
          </Panel>

          <Panel title="Сценарный бриф" icon={FileText}>
            <div className="form-grid">
              <Field label="Имя ребенка" value={brief.name} onChange={(value) => updateBrief('name', value)} />
              <Field label="Возраст" value={brief.age} onChange={(value) => updateBrief('age', value)} />
              <Field label="Повод" value={brief.occasion} onChange={(value) => updateBrief('occasion', value)} />
              <Field label="Мир истории" value={brief.world} onChange={(value) => updateBrief('world', value)} />
              <Field label="Тон" value={brief.tone} onChange={(value) => updateBrief('tone', value)} wide />
              <Field label="Длительность" value={brief.duration} onChange={(value) => updateBrief('duration', value)} wide />
            </div>
            <div className="script-card">
              <span>Сценарий продюсера</span>
              <p>{scriptPreview}</p>
            </div>
          </Panel>

          <Panel title="Производство" icon={Clapperboard}>
            <div className="stage-list">
              {stages.map((stage) => (
                <div className="stage-row" key={stage.slug}>
                  <div className={`stage-dot ${stage.status}`}>
                    {stage.status === 'done' ? <Check size={13} /> : null}
                  </div>
                  <div className="stage-copy">
                    <strong>{stage.title}</strong>
                    <span>{stage.detail}</span>
                    <div className="progress-track">
                      <div style={{ width: `${stage.progress}%` }} />
                    </div>
                  </div>
                  <small>{stage.progress}%</small>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="storyboard-section">
          <div className="section-heading">
            <div>
              <h2>Раскадровка</h2>
              <p>Короткие 16:9 сцены сначала утверждаются как кадры, затем уходят в image-to-video.</p>
            </div>
            <button className="secondary-button" onClick={() => createProject(brief)}>
              <Wand2 size={17} />
              Новый сценарий
            </button>
          </div>

          <div className="storyboard-grid">
            {scenes.map((scene, index) => (
              <article className="scene-card" key={`${scene.title}-${index}`}>
                <div className={`scene-preview ${scene.gradient}`}>
                  <div className="scene-character">
                    <Sparkles size={24} />
                  </div>
                  <button aria-label="Предпросмотр сцены">
                    <Play size={18} fill="currentColor" />
                  </button>
                </div>
                <div className="scene-meta">
                  <span>Сцена {index + 1}</span>
                  <strong>{scene.title}</strong>
                  <p>{scene.prompt}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="pricing-section">
          <div className="section-heading">
            <div>
              <h2>Монетизация</h2>
              <p>Подписка продается как лимит роликов, а не безлимитная генерация.</p>
            </div>
          </div>
          <div className="plan-grid">
            {plans.map((plan) => (
              <article className="plan-card" key={plan.name}>
                <span>{plan.name}</span>
                <strong>{plan.price}</strong>
                <p>{plan.note}</p>
                <small>{plan.margin}</small>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function createLocalScript(brief: Brief) {
  return `${brief.name} получает волшебный пропуск в ${brief.world} на событие: ${brief.occasion}. Чтобы вернуться домой с подарком для семьи, герой проходит три испытания, учится смелости и в финале устраивает собственную премьеру мультфильма. Тон истории: ${brief.tone}.`
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Upload
  children: React.ReactNode
}) {
  return (
    <article className="panel">
      <div className="panel-title">
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {children}
    </article>
  )
}

function Field({
  label,
  value,
  onChange,
  wide = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  wide?: boolean
}) {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock
  label: string
  value: string
}) {
  return (
    <div className="metric">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App

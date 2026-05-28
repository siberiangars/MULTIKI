import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
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
  Film,
  Image,
  Loader2,
  Play,
  RefreshCcw,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Wand2,
  X,
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
  image_url?: string | null
  image_status?: string
  video_url?: string | null
  video_status?: string
  video_prompt?: string | null
  video_job_id?: string | null
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
  { slug: 'script', title: 'Сценарий', detail: 'арка героя и продюсерский текст', progress: 100, status: 'done' },
  { slug: 'character', title: 'Образ героя', detail: 'единый визуальный стиль', progress: 76, status: 'active' },
  { slug: 'frames', title: 'Ключевые кадры', detail: 'OpenAI Images, 16:9', progress: 42, status: 'active' },
  { slug: 'animation', title: 'Анимация', detail: 'следующий модуль: Kling', progress: 0, status: 'queued' },
  { slug: 'voice', title: 'Озвучка', detail: 'следующий модуль: ElevenLabs', progress: 0, status: 'queued' },
  { slug: 'edit', title: 'Монтаж', detail: 'следующий модуль: сборка MP4', progress: 0, status: 'queued' },
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
  { label: 'Заказы', icon: Clapperboard, target: 'summary' },
  { label: 'Новый мультфильм', icon: Wand2, target: 'brief' },
  { label: 'Фото', icon: UserRound, target: 'photos' },
  { label: 'Производство', icon: Film, target: 'production' },
  { label: 'Тарифы', icon: CreditCard, target: 'pricing' },
  { label: 'Настройки', icon: Settings, target: 'summary' },
]

const plans = [
  { name: 'Старт', price: '5 000 ₽', note: '2 ролика до 45 сек', margin: 'продавать как быстрый подарок' },
  { name: 'Студия', price: '9 900 ₽', note: '5 роликов или 2 длинных', margin: 'лучший тариф для подписки' },
  { name: 'Премиум', price: '19 900 ₽', note: 'ручная режиссура и 3 правки', margin: 'для B2B и праздников' },
]

const usageSteps = [
  'Заполни бриф: имя, возраст, повод, мир истории и тон.',
  'Загрузи 3-8 фото клиента. Сейчас фото видны в кабинете, следующий шаг - привязка к генерации персонажа.',
  'Нажми “Сгенерировать кадры”. Сервис создаст сценарий, раскадровку и ключевые изображения.',
  'Проверь кадры, открой аниматик и скачай production pack для клиента или монтажа.',
]

function App() {
  const [brief, setBrief] = useState(seedBrief)
  const [project, setProject] = useState<Project | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [revisionCount, setRevisionCount] = useState(1)
  const [apiState, setApiState] = useState<'connecting' | 'online' | 'offline'>('connecting')
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [previewScene, setPreviewScene] = useState<Scene | null>(null)
  const [filmPreviewOpen, setFilmPreviewOpen] = useState(false)
  const [notice, setNotice] = useState('Готово к работе')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const stages = project?.stages ?? fallbackStages
  const scenes = project?.scenes ?? fallbackScenes
  const isGenerating = project?.status === 'queued' || project?.status === 'generating'
  const scriptPreview = project?.script ?? createLocalScript(brief)
  const readyImages = scenes.filter((scene) => scene.image_url && scene.image_status === 'ready').length
  const readyVideos = scenes.filter((scene) => scene.video_url && scene.video_status === 'ready').length
  const preparedVideos = scenes.filter((scene) => scene.video_status === 'prepared' || scene.video_prompt).length
  const hasGeneratedFrames = readyImages > 0
  const hasVideoPrep = readyVideos > 0 || preparedVideos > 0

  const overallProgress = useMemo(() => {
    const total = stages.reduce((sum, stage) => sum + stage.progress, 0)
    return Math.round(total / stages.length)
  }, [stages])

  const productionStatus = useMemo(() => {
    if (isGenerating) return `Генерация: ${overallProgress}%`
    if (readyVideos > 0) return `Видео ${readyVideos}/${scenes.length} сцен`
    if (preparedVideos > 0) return `Abacus prompts ${preparedVideos}/${scenes.length}`
    if (hasGeneratedFrames) return `Готово ${readyImages}/${scenes.length} кадров`
    return 'Ожидает генерации'
  }, [hasGeneratedFrames, isGenerating, overallProgress, preparedVideos, readyImages, readyVideos, scenes.length])

  function updateBrief(field: keyof Brief, value: string) {
    setBrief((current) => ({ ...current, [field]: value }))
  }

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice('Готово к работе'), 2600)
  }

  function scrollToSection(target: string, label: string) {
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    showNotice(`${label}: раздел открыт`)
  }

  function handlePhotoUpload(files: FileList | null) {
    if (!files?.length) return
    const nextPhotos = Array.from(files)
      .slice(0, 8 - uploadedPhotos.length)
      .map((file) => URL.createObjectURL(file))
    setUploadedPhotos((current) => [...current, ...nextPhotos].slice(0, 8))
    showNotice(`Загружено фото: ${Math.min(uploadedPhotos.length + nextPhotos.length, 8)}`)
  }

  function downloadProductionPack() {
    const payload = {
      projectId: project?.id ?? 'draft',
      status: project?.status ?? 'draft',
      brief,
      producerScript: scriptPreview,
      voiceover: createVoiceover(scriptPreview, brief),
      storyboard: scenes.map((scene, index) => ({
        scene: index + 1,
        title: scene.title,
        prompt: scene.prompt,
        imageStatus: scene.image_status ?? 'pending',
        imageUrl: scene.image_url ?? null,
        videoProvider: 'abacus',
        videoStatus: scene.video_status ?? 'pending',
        videoUrl: scene.video_url ?? null,
        abacusImageToVideoPrompt: scene.video_prompt ?? createAbacusVideoPrompt(scene.prompt, brief),
        montageNote: `План ${index + 1}: 4-6 секунд, мягкий camera push, переход по музыке.`,
      })),
      deliveryChecklist: [
        'Проверить похожесть персонажа и отсутствие лишнего текста на кадрах.',
        'Утвердить сценарий с клиентом до запуска анимации.',
        'Abacus AI: отправить imageUrl + abacusImageToVideoPrompt в image-to-video генерацию.',
        'После подключения ElevenLabs генерировать голос и собирать финальный MP4.',
      ],
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `multstudio-production-pack-${project?.id ?? 'draft'}.json`
    link.click()
    URL.revokeObjectURL(url)
    showNotice('Production pack скачан')
  }

  async function createRevision() {
    setRevisionCount((count) => count + 1)
    const revisedBrief = {
      ...brief,
      tone: brief.tone.includes('кинематографичный') ? brief.tone : `${brief.tone}, кинематографичный`,
    }
    setBrief(revisedBrief)
    await createProject(revisedBrief)
    showNotice('Создана новая версия сценария')
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
      showNotice('Производство запущено')
    } catch {
      setApiState('offline')
      showNotice('API недоступен')
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
          {nav.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                className={index === 1 ? 'nav-item active' : 'nav-item'}
                key={item.label}
                onClick={() => scrollToSection(item.target, item.label)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <ShieldCheck size={18} />
          <p>Фото детей хранятся только для заказа. Публичная публикация результата - только с согласием родителя.</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <div className="breadcrumbs">
              Заказы <ChevronRight size={14} /> Новый мультфильм
            </div>
            <h1>Новый мультфильм</h1>
            <p>Рабочий путь: бриф, фото, ключевые кадры, аниматик, затем озвучка и монтаж после подключения провайдеров.</p>
          </div>
          <div className="topbar-actions">
            <span className={`api-status ${apiState}`}>
              {apiState === 'online' ? 'API online' : apiState === 'offline' ? 'offline demo' : 'connect'}
            </span>
            <span className="notice">{notice}</span>
            <button className="icon-button" aria-label="Скачать production pack" onClick={downloadProductionPack}>
              <Download size={18} />
            </button>
            <button className="secondary-button" onClick={createRevision} disabled={isSaving}>
              <RefreshCcw size={17} />
              Правка {revisionCount}
            </button>
            <button className="primary-button" onClick={startGeneration} disabled={isSaving || isGenerating}>
              {isSaving || isGenerating ? <Loader2 className="spin" size={18} /> : <Rocket size={18} />}
              {isGenerating ? `Генерация ${overallProgress}%` : hasGeneratedFrames ? 'Перегенерировать кадры' : 'Сгенерировать кадры'}
            </button>
          </div>
        </header>

        <section className="summary-strip" id="summary" aria-label="Сводка проекта">
          <Metric icon={CalendarClock} label="Сейчас готово" value={productionStatus} />
          <Metric icon={BadgeCheck} label="Формат кадров" value="16:9, 1536px" />
          <Metric icon={Film} label="Видео" value={hasVideoPrep ? 'Abacus готов' : 'Abacus далее'} />
          <Metric icon={CreditCard} label="Цена подписки" value="9 900 ₽ лучше" />
        </section>

        <section className="usage-panel" aria-label="Как пользоваться">
          <div>
            <h2>Как этим пользоваться</h2>
            <p>Сейчас сервис закрывает первый производственный этап: сценарий и ключевые кадры. Это уже можно показывать клиенту как предпросмотр и брать оплату за запуск полного ролика.</p>
          </div>
          <ol>
            {usageSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="build-grid" id="brief">
          <Panel title="Фото клиента" icon={Upload}>
            <div className="upload-zone" id="photos">
              <Camera size={24} />
              <strong>3-8 фото ребенка</strong>
              <span>анфас, улыбка, полный рост, разный свет</span>
              <button onClick={() => fileInputRef.current?.click()}>Загрузить фото</button>
              <input
                ref={fileInputRef}
                className="hidden-file"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handlePhotoUpload(event.currentTarget.files)}
              />
            </div>
            <div className="photo-grid" aria-label="Загруженные фото">
              {[0, 1, 2, 3].map((index) =>
                uploadedPhotos[index] ? (
                  <div className="photo-thumb" key={index}>
                    <img src={uploadedPhotos[index]} alt={`Фото клиента ${index + 1}`} />
                  </div>
                ) : (
                  <div
                    className={
                      index === 0
                        ? 'photo-thumb thumb-one'
                        : index === 1
                          ? 'photo-thumb thumb-two'
                          : index === 2
                            ? 'photo-thumb thumb-three'
                            : 'photo-thumb empty-thumb'
                    }
                    key={index}
                  >
                    {index === 3 ? <Image size={18} /> : null}
                  </div>
                ),
              )}
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

          <Panel title="Что делать дальше" icon={Clapperboard}>
            <div className="action-stack" id="production">
              <ActionButton
                icon={Rocket}
                title={hasGeneratedFrames ? 'Перегенерировать кадры' : 'Сгенерировать кадры'}
                detail="Создает сценарий, раскадровку и OpenAI keyframes."
                onClick={startGeneration}
                disabled={isSaving || isGenerating}
              />
              <ActionButton
                icon={Play}
                title="Открыть аниматик"
                detail="Черновой просмотр ролика по готовым кадрам."
                onClick={() => setFilmPreviewOpen(true)}
                disabled={!hasGeneratedFrames}
              />
              <ActionButton
                icon={Film}
                title="Abacus image-to-video"
                detail={hasVideoPrep ? 'Промпты или видео-задачи подготовлены.' : 'Запускается на стадии анимации после кадров.'}
                onClick={downloadProductionPack}
                disabled={!hasGeneratedFrames}
              />
              <ActionButton
                icon={Download}
                title="Скачать production pack"
                detail="JSON для клиента, монтажера или следующего AI-шага."
                onClick={downloadProductionPack}
              />
            </div>
          </Panel>
        </section>

        <section className="storyboard-section" id="storyboard">
          <div className="section-heading">
            <div>
              <h2>Раскадровка</h2>
              <p>Это не финальное видео, а набор утверждаемых ключевых кадров. Следующий технический модуль - image-to-video и сборка MP4.</p>
            </div>
            <button className="secondary-button" onClick={() => createProject(brief).then(() => showNotice('Создан новый сценарий'))}>
              <Wand2 size={17} />
              Новый сценарий
            </button>
          </div>

          <div className="storyboard-grid">
            {scenes.map((scene, index) => (
              <article className="scene-card" key={`${scene.title}-${index}`}>
                <div className={`scene-preview ${scene.gradient}`}>
                  {scene.image_url ? (
                    <img src={scene.image_url} alt={scene.title} />
                  ) : (
                    <div className="scene-character">
                      <Sparkles size={24} />
                    </div>
                  )}
                  {scene.image_status ? <span className="scene-status">{scene.image_status}</span> : null}
                  {scene.video_status && scene.video_status !== 'pending' ? <span className="video-status">{scene.video_status}</span> : null}
                  <button aria-label="Предпросмотр сцены" onClick={() => setPreviewScene(scene)}>
                    <Play size={18} fill="currentColor" />
                  </button>
                </div>
                <div className="scene-meta">
                  <span>Сцена {index + 1}</span>
                  <strong>{scene.title}</strong>
                  <p>{scene.prompt}</p>
                  {scene.video_prompt ? <small>Abacus prompt prepared</small> : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="pipeline-section">
          <div className="section-heading">
            <div>
              <h2>Производственный пайплайн</h2>
              <p>Стадии показывают, где сервис уже автоматизирован, а где нужен следующий API-модуль.</p>
            </div>
          </div>
          <div className="stage-list pipeline-list">
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
        </section>

        <section className="pricing-section" id="pricing">
          <div className="section-heading">
            <div>
              <h2>Монетизация</h2>
              <p>5 000 ₽ можно оставить как входной тариф, но подписку лучше начинать с 9 900 ₽: генерации видео быстро съедают себестоимость.</p>
            </div>
          </div>
          <div className="plan-grid">
            {plans.map((plan) => (
              <article className="plan-card" key={plan.name} onClick={() => showNotice(`Выбран тариф: ${plan.name}`)}>
                <span>{plan.name}</span>
                <strong>{plan.price}</strong>
                <p>{plan.note}</p>
                <small>{plan.margin}</small>
              </article>
            ))}
          </div>
        </section>
      </main>

      {previewScene ? <SceneModal scene={previewScene} onClose={() => setPreviewScene(null)} /> : null}
      {filmPreviewOpen ? <FilmModal scenes={scenes} brief={brief} script={scriptPreview} onClose={() => setFilmPreviewOpen(false)} /> : null}
    </div>
  )
}

function createLocalScript(brief: Brief) {
  return `${brief.name} получает волшебный пропуск в ${brief.world} на событие: ${brief.occasion}. Чтобы вернуться домой с подарком для семьи, герой проходит три испытания, учится смелости и в финале устраивает собственную премьеру мультфильма. Тон истории: ${brief.tone}.`
}

function createVoiceover(script: string, brief: Brief) {
  return `Диктор, теплый семейный тон. ${script} Финальная фраза: "${brief.name}, твое главное приключение только начинается".`
}

function createAbacusVideoPrompt(scenePrompt: string, brief: Brief) {
  return [
    'Animate this keyframe as a polished short family cartoon scene.',
    `Keep ${brief.name}, ${brief.age} years old, visually consistent with the source image.`,
    `Scene action: ${scenePrompt}.`,
    `Story world: ${brief.world}.`,
    'Slow cinematic push-in, gentle parallax, expressive natural motion, no text, no logos, no watermark.',
    'Duration 5 seconds, 16:9.',
  ].join(' ')
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
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

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="metric">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  title,
  detail,
  onClick,
  disabled = false,
}: {
  icon: LucideIcon
  title: string
  detail: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button className="action-button" onClick={onClick} disabled={disabled}>
      <Icon size={18} />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </button>
  )
}

function SceneModal({ scene, onClose }: { scene: Scene; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Предпросмотр сцены">
      <div className="preview-modal">
        <button className="modal-close" aria-label="Закрыть предпросмотр" onClick={onClose}>
          <X size={18} />
        </button>
        <div className={`scene-preview modal-preview ${scene.gradient}`}>
          {scene.image_url ? (
            <img src={scene.image_url} alt={scene.title} />
          ) : (
            <div className="scene-character">
              <Sparkles size={24} />
            </div>
          )}
        </div>
        <h2>{scene.title}</h2>
        <p>{scene.prompt}</p>
      </div>
    </div>
  )
}

function FilmModal({ scenes, brief, script, onClose }: { scenes: Scene[]; brief: Brief; script: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Черновой аниматик">
      <div className="film-modal">
        <button className="modal-close" aria-label="Закрыть аниматик" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="film-screen">
          {scenes.map((scene, index) => (
            <div className={`film-frame ${scene.gradient}`} style={{ animationDelay: `${index * 3}s` }} key={`${scene.title}-${index}`}>
              {scene.image_url ? <img src={scene.image_url} alt={scene.title} /> : <Sparkles size={38} />}
              <span>{scene.title}</span>
              {scene.video_status && scene.video_status !== 'pending' ? <small>Abacus: {scene.video_status}</small> : null}
            </div>
          ))}
        </div>
        <div className="film-copy">
          <h2>Черновой аниматик: {brief.name}</h2>
          <p>{script}</p>
          <small>Это превью показывает порядок сцен. Финальный MP4 появится после подключения image-to-video, озвучки и монтажного модуля.</small>
        </div>
      </div>
    </div>
  )
}

export default App

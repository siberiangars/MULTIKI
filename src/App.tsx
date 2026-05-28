import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Clapperboard,
  Copy,
  CreditCard,
  Download,
  FileJson,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Lock,
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
  X,
} from 'lucide-react'
import { clsx } from 'clsx'

type StageStatus = 'done' | 'active' | 'queued' | 'failed'
type StepState = 'completed' | 'active' | 'waiting' | 'error' | 'locked'

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
  image_provider?: string | null
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
  created_at?: string
  brief: Brief
  stages: Stage[]
  scenes: Scene[]
}

type NoticeTone = 'info' | 'success' | 'warning' | 'error'

const apiBase = import.meta.env.VITE_API_URL ?? ''
type PageKey = 'dashboard' | 'orders' | 'new' | 'photos' | 'scripts' | 'frames' | 'animatic' | 'voice' | 'pack' | 'pricing' | 'settings'

const seedBrief: Brief = {
  name: 'Лёва',
  age: '6',
  occasion: 'день рождения',
  world: 'космическое приключение',
  tone: 'добрый, волшебный, смешной, кинематографичный',
  duration: '30 секунд',
}

const fallbackStages: Stage[] = [
  { slug: 'script', title: 'Сценарий', detail: 'Арка героя и текст продюсера', progress: 100, status: 'done' },
  { slug: 'character', title: 'Фото героя', detail: 'Фото принято и готово к образу', progress: 0, status: 'queued' },
  { slug: 'frames', title: 'Кадры', detail: '4 ключевые сцены', progress: 0, status: 'queued' },
  { slug: 'animation', title: 'Аниматик', detail: 'Черновой просмотр ролика', progress: 0, status: 'queued' },
  { slug: 'voice', title: 'Озвучка', detail: 'ElevenLabs будет подключён позже', progress: 0, status: 'queued' },
  { slug: 'edit', title: 'Экспорт', detail: 'Пакет материалов и финальное видео', progress: 0, status: 'queued' },
]

const fallbackScenes: Scene[] = [
  {
    title: 'Знакомство с героем',
    prompt: 'Лёва находит светящийся билет в домашней комнате',
    gradient: 'from-cyan-200 via-sky-100 to-orange-100',
  },
  {
    title: 'Портал в мир',
    prompt: 'Игрушечная ракета открывает портал над столом',
    gradient: 'from-orange-200 via-rose-100 to-white',
  },
  {
    title: 'Первое испытание',
    prompt: 'Герой помогает роботу собрать карту звёзд',
    gradient: 'from-lime-200 via-cyan-100 to-white',
  },
  {
    title: 'Финальная сцена',
    prompt: 'Семья смотрит премьеру мультфильма дома',
    gradient: 'from-slate-900 via-slate-700 to-coral-400',
  },
]

const navigation = [
  { label: 'Дашборд', icon: Clapperboard, page: 'dashboard' as const },
  { label: 'Заказы', icon: FileText, page: 'orders' as const },
  { label: 'Новый мультфильм', icon: Wand2, page: 'new' as const },
  { label: 'Фото', icon: UserRound, page: 'photos' as const },
  { label: 'Сценарии', icon: FileJson, page: 'scripts' as const },
  { label: 'Кадры', icon: ImageIcon, page: 'frames' as const },
  { label: 'Аниматик', icon: Film, page: 'animatic' as const },
  { label: 'Озвучка', icon: Mic2, page: 'voice' as const },
  { label: 'Production Pack', icon: Download, page: 'pack' as const },
  { label: 'Тарифы', icon: CreditCard, page: 'pricing' as const },
  { label: 'Настройки', icon: Settings, page: 'settings' as const },
]

const plans = [
  { name: 'Старт', price: '5 000 ₽', note: '2 коротких ролика', meta: 'для быстрых подарков' },
  { name: 'Студия', price: '9 900 ₽', note: '5 роликов или 2 длинных', meta: 'лучший баланс маржи' },
  { name: 'Премиум', price: '19 900 ₽', note: 'ручная режиссура и 3 правки', meta: 'для B2B и праздников' },
]

function App() {
  const [brief, setBrief] = useState(seedBrief)
  const [project, setProject] = useState<Project | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [apiState, setApiState] = useState<'connecting' | 'online' | 'offline'>('connecting')
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [previewScene, setPreviewScene] = useState<Scene | null>(null)
  const [filmPreviewOpen, setFilmPreviewOpen] = useState(false)
  const [activePage, setActivePage] = useState<PageKey>('new')
  const [notice, setNotice] = useState<{ message: string; tone: NoticeTone }>({
    message: 'Готово к работе',
    tone: 'info',
  })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const displayProject = useMemo(() => normalizeProject(project), [project])
  const stages = displayProject?.stages ?? fallbackStages
  const scenes = displayProject?.scenes?.length ? displayProject.scenes : fallbackScenes
  const isGenerating = project?.status === 'queued' || project?.status === 'generating'
  const isFailed = project?.status === 'failed'
  const displayBrief = displayProject?.brief ?? normalizeBrief(brief)
  const scriptPreview = displayProject?.script ?? createLocalScript(displayBrief)
  const readyImages = scenes.filter((scene) => scene.image_url && scene.image_status === 'ready').length
  const readyVideos = scenes.filter((scene) => scene.video_url && scene.video_status === 'ready').length
  const preparedVideos = scenes.filter((scene) => scene.video_status === 'prepared' || scene.video_prompt).length
  const hasGeneratedFrames = readyImages > 0
  const hasUploadedPhotos = uploadedPhotos.length > 0
  const canGenerate = hasUploadedPhotos || hasGeneratedFrames || Boolean(project?.id && project.status !== 'draft')

  const orderStatus = useMemo(() => {
    if (isFailed) return { label: 'Ошибка генерации', tone: 'error' as const }
    if (isGenerating) return { label: 'Генерируем кадры', tone: 'warning' as const }
    if (readyVideos > 0) return { label: 'Готов к монтажу', tone: 'success' as const }
    if (hasGeneratedFrames) return { label: 'Кадры готовы', tone: 'success' as const }
    if (hasUploadedPhotos) return { label: 'Готов к генерации', tone: 'info' as const }
    return { label: 'Нужно загрузить фото', tone: 'warning' as const }
  }, [hasGeneratedFrames, hasUploadedPhotos, isFailed, isGenerating, readyVideos])

  const primaryAction = isGenerating
    ? { label: 'Собираем сцены...', icon: Loader2, action: () => undefined, disabled: true }
    : hasGeneratedFrames
      ? { label: 'Открыть аниматик', icon: Play, action: () => setFilmPreviewOpen(true), disabled: false }
      : {
          label: 'Сгенерировать кадры',
          icon: Rocket,
          action: startGeneration,
          disabled: !canGenerate || isSaving,
        }

  function updateBrief(field: keyof Brief, value: string) {
    setBrief((current) => ({ ...current, [field]: value }))
  }

  function showNotice(message: string, tone: NoticeTone = 'info') {
    setNotice({ message, tone })
    window.setTimeout(() => setNotice({ message: 'Готово к работе', tone: 'info' }), 2600)
  }

  function openPage(page: PageKey, label: string) {
    setActivePage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    showNotice(`${label}: раздел открыт`)
  }

  function handlePhotoUpload(files: FileList | null) {
    if (!files?.length) return
    const nextPhotos = Array.from(files)
      .slice(0, 8 - uploadedPhotos.length)
      .map((file) => URL.createObjectURL(file))
    setUploadedPhotos((current) => [...current, ...nextPhotos].slice(0, 8))
    showNotice(`Фото принято: ${Math.min(uploadedPhotos.length + nextPhotos.length, 8)} из 8`, 'success')
  }

  function downloadProductionPack() {
    const payload = {
      projectId: project?.id ?? 'draft',
      status: project?.status ?? 'draft',
      brief: displayBrief,
      producerScript: scriptPreview,
      voiceover: createVoiceover(scriptPreview, displayBrief),
      storyboard: scenes.map((scene, index) => ({
        scene: index + 1,
        title: scene.title,
        prompt: scene.prompt,
        imageStatus: scene.image_status ?? 'pending',
        imageProvider: scene.image_provider ?? null,
        imageUrl: scene.image_url ?? null,
        videoProvider: 'abacus',
        videoStatus: scene.video_status ?? 'pending',
        videoUrl: scene.video_url ?? null,
        abacusImageToVideoPrompt: scene.video_prompt ?? createAbacusVideoPrompt(scene.prompt, displayBrief),
        montageNote: `План ${index + 1}: 4-6 секунд, мягкий camera push, переход по музыке.`,
      })),
      deliveryChecklist: [
        'Проверить сходство персонажа и отсутствие лишнего текста на кадрах.',
        'Утвердить сценарий с клиентом до запуска анимации сцен.',
        'Abacus AI: отправить imageUrl + abacusImageToVideoPrompt в генерацию видео из изображения.',
        'После подключения ElevenLabs сгенерировать голос и собрать финальный MP4.',
      ],
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `multstudio-production-pack-${project?.id ?? 'draft'}.json`
    link.click()
    URL.revokeObjectURL(url)
    showNotice('Пакет материалов для монтажа скачан', 'success')
  }

  function downloadScene(scene: Scene, index: number) {
    if (!scene.image_url) {
      showNotice('У этой сцены пока нет изображения', 'warning')
      return
    }
    const link = document.createElement('a')
    link.href = scene.image_url
    link.download = `scene-${index + 1}-${scene.title}.png`
    link.click()
    showNotice(`Сцена ${index + 1} скачана`, 'success')
  }

  async function copyClientLink() {
    const url = `${window.location.origin}${window.location.pathname}?project=${project?.id ?? 'draft'}`
    await navigator.clipboard?.writeText(url)
    showNotice('Ссылка для клиента скопирована', 'success')
  }

  async function createRevision() {
    const revisedBrief = {
      ...brief,
      tone: brief.tone.includes('кинематографичный') ? brief.tone : `${brief.tone}, кинематографичный`,
    }
    setBrief(revisedBrief)
    await createProject(revisedBrief)
    showNotice('Создана новая версия сценария', 'success')
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
    const timer = window.setInterval(() => loadProject(project.id), 1400)
    return () => window.clearInterval(timer)
  }, [isGenerating, loadProject, project?.id])

  async function startGeneration() {
    if (!canGenerate && !project) {
      showNotice('Сначала загрузите фото героя', 'warning')
      return
    }

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
      showNotice('Генерация кадров запущена', 'success')
    } catch {
      setApiState('offline')
      showNotice('Не удалось запустить генерацию', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900">
      <AppShell
        activePage={activePage}
        onNavigate={openPage}
        notice={<PrivacyNotice />}
      />

      <main className="min-h-screen lg:pl-[280px]">
        <OrderHeader
          apiState={apiState}
          brief={displayBrief}
          notice={notice}
          orderId={project?.id}
          orderStatus={orderStatus}
          primaryAction={primaryAction}
          projectCreatedAt={project?.created_at}
          readyImages={readyImages}
        />

        <PlatformContent
          activePage={activePage}
          brief={displayBrief}
          canGenerate={canGenerate}
          fileInputRef={fileInputRef}
          hasGeneratedFrames={hasGeneratedFrames}
          hasUploadedPhotos={hasUploadedPhotos}
          isFailed={isFailed}
          isGenerating={isGenerating}
          isSaving={isSaving}
          onCopyClientLink={copyClientLink}
          onDownloadPack={downloadProductionPack}
          onGenerate={startGeneration}
          onNewScenario={createRevision}
          onOpenAnimatic={() => setFilmPreviewOpen(true)}
          onOpenScene={setPreviewScene}
          onRegenerate={startGeneration}
          onSceneDownload={downloadScene}
          onUpload={handlePhotoUpload}
          orderStatus={orderStatus.label}
          photos={uploadedPhotos}
          preparedVideos={preparedVideos}
          readyImages={readyImages}
          readyVideos={readyVideos}
          scenes={scenes}
          scriptPreview={scriptPreview}
          stages={stages}
          updateBrief={updateBrief}
        />
      </main>

      {previewScene ? <SceneModal scene={previewScene} onClose={() => setPreviewScene(null)} /> : null}
      {filmPreviewOpen ? <FilmModal scenes={scenes} brief={displayBrief} script={scriptPreview} onClose={() => setFilmPreviewOpen(false)} /> : null}
    </div>
  )
}

function PlatformContent({
  activePage,
  brief,
  canGenerate,
  fileInputRef,
  hasGeneratedFrames,
  hasUploadedPhotos,
  isFailed,
  isGenerating,
  isSaving,
  onCopyClientLink,
  onDownloadPack,
  onGenerate,
  onNewScenario,
  onOpenAnimatic,
  onOpenScene,
  onRegenerate,
  onSceneDownload,
  onUpload,
  orderStatus,
  photos,
  preparedVideos,
  readyImages,
  readyVideos,
  scenes,
  scriptPreview,
  stages,
  updateBrief,
}: {
  activePage: PageKey
  brief: Brief
  canGenerate: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  hasGeneratedFrames: boolean
  hasUploadedPhotos: boolean
  isFailed: boolean
  isGenerating: boolean
  isSaving: boolean
  onCopyClientLink: () => void
  onDownloadPack: () => void
  onGenerate: () => void
  onNewScenario: () => void
  onOpenAnimatic: () => void
  onOpenScene: (scene: Scene) => void
  onRegenerate: () => void
  onSceneDownload: (scene: Scene, index: number) => void
  onUpload: (files: FileList | null) => void
  orderStatus: string
  photos: string[]
  preparedVideos: number
  readyImages: number
  readyVideos: number
  scenes: Scene[]
  scriptPreview: string
  stages: Stage[]
  updateBrief: (field: keyof Brief, value: string) => void
}) {
  const shell = (children: ReactNode, aside = true) => (
    <div className="mx-auto max-w-[1520px] px-4 py-5 sm:px-6 lg:px-8">
      <div className={clsx('grid grid-cols-1 gap-6', aside && 'xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_392px]')}>
        <div className="min-w-0 space-y-6">{children}</div>
        {aside ? (
          <NextActionPanel
            brief={brief}
            canGenerate={canGenerate}
            hasGeneratedFrames={hasGeneratedFrames}
            isGenerating={isGenerating}
            onCopyClientLink={onCopyClientLink}
            onDownloadPack={onDownloadPack}
            onGenerate={onGenerate}
            onNewScenario={onNewScenario}
            onOpenAnimatic={onOpenAnimatic}
            orderStatus={orderStatus}
            readyImages={readyImages}
            scenes={scenes}
          />
        ) : null}
      </div>
    </div>
  )

  if (activePage === 'dashboard') {
    return shell(
      <>
        <PlatformHero title="Дашборд" description="Обзор заказов, готовности материалов и следующих действий по производству." icon={Clapperboard} />
        <ProductionStepper
          hasGeneratedFrames={hasGeneratedFrames}
          hasUploadedPhotos={hasUploadedPhotos}
          isFailed={isFailed}
          isGenerating={isGenerating}
          preparedVideos={preparedVideos}
          readyImages={readyImages}
          readyVideos={readyVideos}
        />
        <PipelineStatus stages={stages} hasGeneratedFrames={hasGeneratedFrames} preparedVideos={preparedVideos} readyImages={readyImages} readyVideos={readyVideos} />
      </>,
    )
  }

  if (activePage === 'orders') {
    return shell(
      <>
        <PlatformHero title="Заказы" description="Рабочий список заказов. Сейчас активен последний проект, который открыт в шапке." icon={FileText} />
        <OrdersView brief={brief} orderStatus={orderStatus} readyImages={readyImages} onOpenAnimatic={onOpenAnimatic} />
      </>,
    )
  }

  if (activePage === 'photos') {
    return shell(<PhotoUploadCard fileInputRef={fileInputRef} onUpload={onUpload} photos={photos} />)
  }

  if (activePage === 'scripts') {
    return shell(
      <BriefForm
        brief={brief}
        canGenerate={canGenerate}
        isSaving={isSaving}
        onGenerate={onGenerate}
        onRevision={onNewScenario}
        scriptPreview={scriptPreview}
        updateBrief={updateBrief}
      />,
    )
  }

  if (activePage === 'frames') {
    return shell(
      <StoryboardGrid
        isFailed={isFailed}
        isGenerating={isGenerating}
        onDownload={onSceneDownload}
        onOpen={onOpenScene}
        onRegenerate={onRegenerate}
        scenes={scenes}
      />,
    )
  }

  if (activePage === 'animatic') {
    return shell(<AnimaticView brief={brief} scenes={scenes} script={scriptPreview} onOpenAnimatic={onOpenAnimatic} />, false)
  }

  if (activePage === 'voice') {
    return shell(<VoiceView />, false)
  }

  if (activePage === 'pack') {
    return shell(<PackView scenes={scenes} onDownloadPack={onDownloadPack} />, false)
  }

  if (activePage === 'pricing') {
    return shell(<PricingSection />, false)
  }

  if (activePage === 'settings') {
    return shell(<SettingsView />, false)
  }

  return shell(
    <>
      <ProductionStepper
        hasGeneratedFrames={hasGeneratedFrames}
        hasUploadedPhotos={hasUploadedPhotos}
        isFailed={isFailed}
        isGenerating={isGenerating}
        preparedVideos={preparedVideos}
        readyImages={readyImages}
        readyVideos={readyVideos}
      />
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PhotoUploadCard fileInputRef={fileInputRef} onUpload={onUpload} photos={photos} />
        <BriefForm
          brief={brief}
          canGenerate={canGenerate}
          isSaving={isSaving}
          onGenerate={onGenerate}
          onRevision={onNewScenario}
          scriptPreview={scriptPreview}
          updateBrief={updateBrief}
        />
      </section>
      <StoryboardGrid
        isFailed={isFailed}
        isGenerating={isGenerating}
        onDownload={onSceneDownload}
        onOpen={onOpenScene}
        onRegenerate={onRegenerate}
        scenes={scenes}
      />
      <PipelineStatus stages={stages} hasGeneratedFrames={hasGeneratedFrames} preparedVideos={preparedVideos} readyImages={readyImages} readyVideos={readyVideos} />
    </>,
  )
}

function AppShell({
  activePage,
  notice,
  onNavigate,
}: {
  activePage: PageKey
  notice: ReactNode
  onNavigate: (page: PageKey, label: string) => void
}) {
  return (
    <aside className="hidden fixed inset-y-0 left-0 z-40 w-[280px] border-r border-white/70 bg-white/82 px-5 py-6 shadow-[18px_0_60px_rgba(15,23,42,0.05)] backdrop-blur-xl lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-cyan-300 shadow-lg shadow-cyan-200/40">
          <Sparkles size={20} />
        </div>
        <div>
          <strong className="block text-[15px] font-black text-slate-950">МультСтудия AI</strong>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">production studio</span>
        </div>
      </div>

      <nav className="mt-8 grid gap-1.5">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = item.page === activePage
          return (
            <button
              className={clsx(
                'group flex h-11 items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold transition',
                active
                  ? 'bg-gradient-to-r from-cyan-50 to-violet-50 text-slate-950 shadow-sm ring-1 ring-cyan-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              )}
              key={item.label}
              onClick={() => onNavigate(item.page, item.label)}
            >
              <Icon className={clsx('h-4.5 w-4.5', active ? 'text-cyan-600' : 'text-slate-400 group-hover:text-cyan-600')} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto">{notice}</div>
    </aside>
  )
}

function OrderHeader({
  apiState,
  brief,
  notice,
  orderId,
  orderStatus,
  primaryAction,
  projectCreatedAt,
  readyImages,
}: {
  apiState: 'connecting' | 'online' | 'offline'
  brief: Brief
  notice: { message: string; tone: NoticeTone }
  orderId?: string
  orderStatus: { label: string; tone: NoticeTone }
  primaryAction: { label: string; icon: LucideIcon; action: () => void; disabled: boolean }
  projectCreatedAt?: string
  readyImages: number
}) {
  const PrimaryIcon = primaryAction.icon
  const formattedDate = projectCreatedAt ? new Date(projectCreatedAt).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU')

  return (
    <header className="sticky top-0 z-30 border-b border-white/80 bg-[#F8FAFF]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1520px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <span>Заказ</span>
            <ChevronRight size={14} />
            <span>{shortId(orderId)}</span>
            <span className="text-slate-300">/</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Новый мультфильм</h1>
            <StatusBadge label={orderStatus.label} tone={orderStatus.tone} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <MetricPill icon={ImageIcon} label="16:9 · 1536px" />
            <MetricPill icon={Film} label={brief.duration || '30 секунд'} />
            <MetricPill icon={Mic2} label="ElevenLabs позже" />
            <MetricPill icon={CreditCard} label="9 900 ₽" />
            <MetricPill icon={BadgeCheck} label={`${readyImages} из 4 кадров`} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <StatusBadge label={apiState === 'online' ? 'API подключен' : apiState === 'offline' ? 'API недоступен' : 'Подключение'} tone={apiState === 'online' ? 'success' : apiState === 'offline' ? 'error' : 'info'} />
          <StatusBadge label={notice.message} tone={notice.tone} />
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-xl shadow-slate-900/12 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            disabled={primaryAction.disabled}
            onClick={primaryAction.action}
          >
            <PrimaryIcon className={clsx('h-4 w-4', primaryAction.label.includes('Собираем') && 'animate-spin')} />
            {primaryAction.label}
          </button>
        </div>
      </div>
    </header>
  )
}

function ProductionStepper({
  hasGeneratedFrames,
  hasUploadedPhotos,
  isFailed,
  isGenerating,
  preparedVideos,
  readyImages,
  readyVideos,
}: {
  hasGeneratedFrames: boolean
  hasUploadedPhotos: boolean
  isFailed: boolean
  isGenerating: boolean
  preparedVideos: number
  readyImages: number
  readyVideos: number
}) {
  const steps: Array<{ title: string; description: string; state: StepState; icon: LucideIcon }> = [
    { title: 'Бриф', description: 'Имя, возраст, повод и тон истории', state: 'completed', icon: FileText },
    { title: 'Фото героя', description: hasUploadedPhotos ? 'Фото принято для образа' : 'Загрузите 3–8 фото ребёнка', state: hasUploadedPhotos || hasGeneratedFrames ? 'completed' : 'active', icon: Camera },
    { title: 'Сценарий', description: 'Продюсерская арка готова', state: 'completed', icon: Wand2 },
    { title: 'Кадры', description: hasGeneratedFrames ? `${readyImages} из 4 ключевых кадров готовы` : 'AI соберёт 4 сцены', state: isFailed ? 'error' : isGenerating ? 'active' : hasGeneratedFrames ? 'completed' : 'waiting', icon: ImageIcon },
    { title: 'Аниматик', description: preparedVideos ? 'Подсказки для видео подготовлены' : 'Черновой просмотр из кадров', state: hasGeneratedFrames ? 'active' : 'locked', icon: Film },
    { title: 'Озвучка', description: 'ElevenLabs будет подключён позже', state: readyVideos ? 'waiting' : 'locked', icon: Mic2 },
    { title: 'Экспорт', description: 'Пакет материалов для монтажа', state: hasGeneratedFrames ? 'waiting' : 'locked', icon: Download },
  ]

  return (
    <section className="rounded-[28px] border border-white/80 bg-white/86 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.07)] backdrop-blur" id="summary">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {steps.map((step, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              'relative min-h-[124px] rounded-[22px] border p-4 transition',
              step.state === 'completed' && 'border-emerald-100 bg-emerald-50/60',
              step.state === 'active' && 'border-cyan-200 bg-gradient-to-br from-cyan-50 to-violet-50 shadow-lg shadow-cyan-100/40',
              step.state === 'waiting' && 'border-slate-100 bg-white',
              step.state === 'locked' && 'border-slate-100 bg-slate-50/70 opacity-75',
              step.state === 'error' && 'border-rose-100 bg-rose-50',
            )}
            initial={{ opacity: 0, y: 8 }}
            key={step.title}
            transition={{ delay: index * 0.035 }}
          >
            <div className="flex items-center justify-between gap-2">
              <StepperIcon icon={step.icon} state={step.state} />
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">0{index + 1}</span>
            </div>
            <h3 className="mt-3 text-sm font-black text-slate-950">{step.title}</h3>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function StepperIcon({ icon: Icon, state }: { icon: LucideIcon; state: StepState }) {
  if (state === 'completed') {
    return (
      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-500 text-white">
        <Check size={17} />
      </div>
    )
  }

  if (state === 'locked') {
    return (
      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-200 text-slate-400">
        <Lock size={16} />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-500 text-white">
        <CircleAlert size={17} />
      </div>
    )
  }

  return (
    <div className={clsx('grid h-9 w-9 place-items-center rounded-2xl', state === 'active' ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500')}>
      <Icon size={17} />
    </div>
  )
}

function PhotoUploadCard({
  fileInputRef,
  onUpload,
  photos,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onUpload: (files: FileList | null) => void
  photos: string[]
}) {
  const hasPhotos = photos.length > 0

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.07)]" id="photos">
      <div className="bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel icon={Camera} label="Герой мультфильма" />
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Фото ребёнка</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Загрузите 3–8 фото: анфас, улыбка, полный рост, разный свет. Это поможет AI сохранить сходство героя.
            </p>
          </div>
          <StatusBadge label={hasPhotos ? 'Фото принято' : 'Нужно фото'} tone={hasPhotos ? 'success' : 'warning'} />
        </div>

        <button
          className={clsx(
            'mt-6 grid min-h-[220px] w-full place-items-center rounded-[26px] border border-dashed p-5 text-center transition',
            hasPhotos
              ? 'border-cyan-200 bg-white/70 hover:bg-white'
              : 'border-cyan-300 bg-white/60 hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-cyan-100/50',
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <div>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-950 text-cyan-300">
              <Upload size={22} />
            </div>
            <strong className="mt-4 block text-base font-black text-slate-950">{hasPhotos ? 'Добавить ещё фото' : 'Загрузить фото'}</strong>
            <span className="mt-2 block text-sm font-medium text-slate-500">JPG или PNG, желательно крупное лицо и хороший свет</span>
          </div>
        </button>
        <input ref={fileInputRef} className="hidden" type="file" accept="image/*" multiple onChange={(event) => onUpload(event.currentTarget.files)} />
      </div>

      <div className="p-6">
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div className="aspect-square overflow-hidden rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 ring-1 ring-slate-100" key={index}>
              {photos[index] ? (
                <img className="h-full w-full object-cover" src={photos[index]} alt={`Фото героя ${index + 1}`} />
              ) : (
                <div className="grid h-full place-items-center text-slate-300">
                  <ImageIcon size={22} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-2 text-sm font-medium text-slate-600">
          <ChecklistItem text="Лицо хорошо видно, без сильной тени" />
          <ChecklistItem text="Есть улыбка и нейтральный ракурс" />
          <ChecklistItem text="Есть согласие родителя на обработку фото" />
        </div>

        <PrivacyNotice compact />
      </div>
    </section>
  )
}

function BriefForm({
  brief,
  canGenerate,
  isSaving,
  onGenerate,
  onRevision,
  scriptPreview,
  updateBrief,
}: {
  brief: Brief
  canGenerate: boolean
  isSaving: boolean
  onGenerate: () => void
  onRevision: () => void
  scriptPreview: string
  updateBrief: (field: keyof Brief, value: string) => void
}) {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <SectionLabel icon={FileText} label="Production brief" />
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Сценарный бриф</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Данные превращаются в арку героя, кадры и подсказки для анимации сцен.</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BriefField label="Имя ребёнка" placeholder="Лёва" value={brief.name} onChange={(value) => updateBrief('name', value)} />
        <BriefField label="Возраст" placeholder="6" value={brief.age} onChange={(value) => updateBrief('age', value)} />
        <BriefField label="Повод" placeholder="день рождения, выпускной, подарок" value={brief.occasion} onChange={(value) => updateBrief('occasion', value)} />
        <BriefField label="Длительность" placeholder="30 секунд" value={brief.duration} onChange={(value) => updateBrief('duration', value)} />
        <BriefField label="Мир истории" placeholder="космос, динозавры, подводный мир" value={brief.world} onChange={(value) => updateBrief('world', value)} wide />
        <BriefField label="Тон" placeholder="добрый, волшебный, смешной" value={brief.tone} onChange={(value) => updateBrief('tone', value)} wide />
      </div>

      <ProducerScenarioPreview script={scriptPreview} />

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50" onClick={onRevision}>
          <RefreshCcw size={16} />
          Обновить сценарий
        </button>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 text-sm font-black text-white shadow-lg shadow-cyan-200/60 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
          disabled={!canGenerate || isSaving}
          onClick={onGenerate}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket size={16} />}
          Сгенерировать кадры
        </button>
      </div>

      {!canGenerate ? (
        <p className="mt-3 text-sm font-semibold text-amber-600">Сначала загрузите фото героя, чтобы запустить генерацию.</p>
      ) : null}
    </section>
  )
}

function ProducerScenarioPreview({ script }: { script: string }) {
  return (
    <div className="mt-5 rounded-[24px] bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/12">
      <div className="flex items-center gap-2 text-sm font-black text-cyan-200">
        <Sparkles size={16} />
        Сценарий продюсера
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-100">{script}</p>
    </div>
  )
}

function NextActionPanel({
  brief,
  canGenerate,
  hasGeneratedFrames,
  isGenerating,
  onCopyClientLink,
  onDownloadPack,
  onGenerate,
  onNewScenario,
  onOpenAnimatic,
  orderStatus,
  readyImages,
}: {
  brief: Brief
  canGenerate: boolean
  hasGeneratedFrames: boolean
  isGenerating: boolean
  onCopyClientLink: () => void
  onDownloadPack: () => void
  onGenerate: () => void
  onNewScenario: () => void
  onOpenAnimatic: () => void
  orderStatus: string
  readyImages: number
  scenes: Scene[]
}) {
  const nextLabel = hasGeneratedFrames ? 'Открыть аниматик' : 'Сгенерировать кадры'
  const nextText = hasGeneratedFrames
    ? 'Проверьте 4 кадра и откройте аниматик для предпросмотра будущего ролика.'
    : 'Загрузите фото героя и запустите генерацию ключевых сцен.'

  return (
    <aside className="space-y-5 xl:sticky xl:top-[148px] xl:self-start">
      <section className="rounded-[28px] border border-white/80 bg-slate-950 p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div className="flex items-center gap-2 text-sm font-black text-cyan-200">
          <Sparkles size={16} />
          Следующий шаг
        </div>
        <h2 className="mt-3 text-2xl font-black leading-tight">{nextLabel}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{nextText}</p>
        <button
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isGenerating || (!hasGeneratedFrames && !canGenerate)}
          onClick={hasGeneratedFrames ? onOpenAnimatic : onGenerate}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : hasGeneratedFrames ? <Play size={16} /> : <Rocket size={16} />}
          {isGenerating ? 'Собираем сцены...' : nextLabel}
        </button>
      </section>

      <section className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
        <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-400">Быстрые действия</h3>
        <div className="mt-4 grid gap-2">
          <SideAction icon={RefreshCcw} label="Перегенерировать кадры" onClick={onGenerate} disabled={isGenerating || !canGenerate} />
          <SideAction icon={Download} label="Скачать пакет материалов" onClick={onDownloadPack} />
          <SideAction icon={Copy} label="Скопировать ссылку клиенту" onClick={onCopyClientLink} />
          <SideAction icon={Wand2} label="Создать новый сценарий" onClick={onNewScenario} />
          <SideAction icon={Mic2} label="Подключить озвучку" onClick={() => undefined} disabled />
        </div>
      </section>

      <section className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.07)]" id="files">
        <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-400">Заказ</h3>
        <div className="mt-4 grid gap-3">
          <OrderMeta label="Цена" value="9 900 ₽" />
          <OrderMeta label="Формат" value="16:9" />
          <OrderMeta label="Длительность" value={brief.duration || '30 секунд'} />
          <OrderMeta label="Статус" value={orderStatus} />
          <OrderMeta label="Кадры" value={`${readyImages} из 4 готовы`} />
          <OrderMeta label="Оплата" value="Ожидает" />
        </div>
      </section>
    </aside>
  )
}

function StoryboardGrid({
  isFailed,
  isGenerating,
  onDownload,
  onOpen,
  onRegenerate,
  scenes,
}: {
  isFailed: boolean
  isGenerating: boolean
  onDownload: (scene: Scene, index: number) => void
  onOpen: (scene: Scene) => void
  onRegenerate: () => void
  scenes: Scene[]
}) {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]" id="storyboard">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionLabel icon={Film} label="Storyboard" />
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Ключевые сцены</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            AI собрал 4 утверждаемых кадра. Их можно использовать для аниматика, анимации сцен из изображений и финального монтажа.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-55"
          disabled={isGenerating}
          onClick={onRegenerate}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw size={16} />}
          Перегенерировать все кадры
        </button>
      </div>

      {isFailed ? <ErrorState onRetry={onRegenerate} /> : null}
      {isGenerating ? <StoryboardSkeleton /> : null}

      {!isGenerating && !isFailed ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {scenes.map((scene, index) => (
            <StoryboardCard
              index={index}
              key={`${scene.title}-${index}`}
              onDownload={() => onDownload(scene, index)}
              onOpen={() => onOpen(scene)}
              onReplace={onRegenerate}
              scene={scene}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function StoryboardCard({
  index,
  onDownload,
  onOpen,
  onReplace,
  scene,
}: {
  index: number
  onDownload: () => void
  onOpen: () => void
  onReplace: () => void
  scene: Scene
}) {
  const ready = Boolean(scene.image_url)

  return (
    <motion.article
      className="group overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.11)]"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
    >
      <div className={clsx('relative aspect-video overflow-hidden bg-gradient-to-br', scene.gradient || 'from-cyan-100 to-violet-100')}>
        {scene.image_url ? (
          <img className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={scene.image_url} alt={scene.title} />
        ) : (
          <div className="grid h-full place-items-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/70 text-cyan-600 shadow-xl">
              <Sparkles size={26} />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-slate-950/0 transition group-hover:bg-slate-950/28" />
        <div className="absolute left-3 top-3">
          <StatusBadge label={ready ? 'Кадр готов' : 'Ожидает'} tone={ready ? 'success' : 'warning'} />
        </div>
        {scene.video_status && scene.video_status !== 'pending' ? (
          <div className="absolute bottom-3 left-3">
            <StatusBadge label={`Видео: ${humanVideoStatus(scene.video_status)}`} tone="info" />
          </div>
        ) : null}
        <button
          className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/92 text-slate-950 opacity-0 shadow-xl transition group-hover:opacity-100"
          onClick={onOpen}
        >
          <Play size={18} fill="currentColor" />
        </button>
      </div>

      <div className="p-4">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-600">Сцена {index + 1}</span>
        <h3 className="mt-2 text-base font-black text-slate-950">{scene.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{scene.prompt}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <MiniButton icon={Play} label="Открыть" onClick={onOpen} />
          <MiniButton icon={RefreshCcw} label="Заменить" onClick={onReplace} />
          <MiniButton icon={Download} label="Скачать" onClick={onDownload} disabled={!ready} />
        </div>
      </div>
    </motion.article>
  )
}

function PipelineStatus({
  hasGeneratedFrames,
  preparedVideos,
  readyImages,
  readyVideos,
  stages,
}: {
  hasGeneratedFrames: boolean
  preparedVideos: number
  readyImages: number
  readyVideos: number
  stages: Stage[]
}) {
  const rows = [
    { label: 'Бриф и сценарий', value: 'Готово', tone: 'success' as const, detail: 'Структура истории создана из формы заказа.' },
    { label: 'Ключевые кадры', value: hasGeneratedFrames ? `${readyImages} из 4 готовы` : 'Ожидают запуска', tone: hasGeneratedFrames ? ('success' as const) : ('warning' as const), detail: 'Генерация изображений через Abacus Nano Banana.' },
    { label: 'Анимация сцен', value: preparedVideos ? `${preparedVideos} подсказки готовы` : 'Следующий этап', tone: preparedVideos ? ('info' as const) : ('warning' as const), detail: 'Подсказки для image-to-video сохранены в пакете материалов.' },
    { label: 'Озвучка и экспорт', value: readyVideos ? 'Можно собирать MP4' : 'Будет подключено позже', tone: 'info' as const, detail: 'ElevenLabs, музыка, монтаж и финальная сборка.' },
  ]

  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]" id="pipeline">
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionLabel icon={Clapperboard} label="Production timeline" />
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Что сервис уже сделал</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Статусы показывают реальные этапы, а не абстрактные проценты.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <div className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4" key={row.label}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-slate-950">{row.label}</h3>
              <StatusBadge label={row.value} tone={row.tone} />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{row.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-2">
        {stages.map((stage) => (
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100" key={stage.slug}>
            <div>
              <strong className="block text-sm font-black text-slate-900">{stage.title}</strong>
              <span className="text-xs font-medium text-slate-500">{stage.detail}</span>
            </div>
            <StatusBadge label={humanStageStatus(stage.status)} tone={stage.status === 'done' ? 'success' : stage.status === 'failed' ? 'error' : stage.status === 'active' ? 'info' : 'warning'} />
          </div>
        ))}
      </div>
    </section>
  )
}

function PricingSection() {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]" id="pricing">
      <SectionLabel icon={CreditCard} label="Тарифы" />
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Стоимость заказа</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        5 000 ₽ можно оставить входным тарифом, но подписку лучше начинать с 9 900 ₽: видео-генерация быстро съедает себестоимость.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {plans.map((plan, index) => (
          <article className={clsx('rounded-[24px] border p-5', index === 1 ? 'border-cyan-200 bg-cyan-50/50' : 'border-slate-100 bg-slate-50/70')} key={plan.name}>
            <span className="text-sm font-black text-cyan-700">{plan.name}</span>
            <strong className="mt-2 block text-3xl font-black text-slate-950">{plan.price}</strong>
            <p className="mt-2 text-sm font-semibold text-slate-600">{plan.note}</p>
            <small className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{plan.meta}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

function PlatformHero({ description, icon: Icon, title }: { description: string; icon: LucideIcon; title: string }) {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <SectionLabel icon={Icon} label="Раздел платформы" />
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </section>
  )
}

function OrdersView({
  brief,
  onOpenAnimatic,
  orderStatus,
  readyImages,
}: {
  brief: Brief
  onOpenAnimatic: () => void
  orderStatus: string
  readyImages: number
}) {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <div className="grid gap-4">
        <article className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-slate-50/70 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-600">Активный заказ</span>
            <h3 className="mt-2 text-xl font-black text-slate-950">Мультфильм для {brief.name}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{brief.occasion} · {brief.world}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={orderStatus} tone="success" />
            <StatusBadge label={`${readyImages} из 4 кадров`} tone={readyImages ? 'success' : 'warning'} />
            <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white" onClick={onOpenAnimatic}>Открыть</button>
          </div>
        </article>
      </div>
    </section>
  )
}

function AnimaticView({
  brief,
  onOpenAnimatic,
  scenes,
  script,
}: {
  brief: Brief
  onOpenAnimatic: () => void
  scenes: Scene[]
  script: string
}) {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative aspect-video overflow-hidden rounded-[26px] bg-slate-950">
          {scenes.map((scene, index) => (
            <div className={clsx('absolute inset-0 grid place-items-center bg-gradient-to-br opacity-0', scene.gradient || 'from-cyan-100 to-violet-100', 'animate-[filmFrames_12s_infinite]')} style={{ animationDelay: `${index * 3}s` }} key={`${scene.title}-${index}`}>
              {scene.image_url ? <img className="absolute inset-0 h-full w-full object-cover animate-[kenBurns_3s_ease-in-out_infinite_alternate]" src={scene.image_url} alt={scene.title} /> : <Sparkles className="relative z-10 text-white" size={38} />}
              <span className="absolute bottom-4 left-4 rounded-2xl bg-slate-950/72 px-3 py-2 text-sm font-black text-white">{scene.title}</span>
            </div>
          ))}
        </div>
        <div className="self-center">
          <SectionLabel icon={Film} label="Аниматик" />
          <h2 className="mt-3 text-3xl font-black text-slate-950">Черновой просмотр: {brief.name}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{script}</p>
          <button className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white" onClick={onOpenAnimatic}>
            <Play size={16} />
            Открыть в модальном окне
          </button>
        </div>
      </div>
    </section>
  )
}

function VoiceView() {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <SectionLabel icon={Mic2} label="Озвучка" />
      <h2 className="mt-3 text-3xl font-black text-slate-950">ElevenLabs будет следующим модулем</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Здесь появятся выбор голоса, предпрослушивание, паузы, эмоции и генерация дорожки для финального монтажа.
      </p>
      <div className="mt-6 rounded-[24px] bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-800">
        Сейчас сервис готовит сценарий диктора внутри пакета материалов для монтажа.
      </div>
    </section>
  )
}

function PackView({ onDownloadPack, scenes }: { onDownloadPack: () => void; scenes: Scene[] }) {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <SectionLabel icon={Download} label="Production Pack" />
      <h2 className="mt-3 text-3xl font-black text-slate-950">Пакет материалов для монтажа</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        JSON, изображения, подсказки для генерации видео из изображений и структура сцен.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <OrderMeta label="Ключевые кадры" value={`${scenes.filter((scene) => scene.image_url).length} из ${scenes.length}`} />
        <OrderMeta label="Подсказки для видео" value={`${scenes.filter((scene) => scene.video_prompt).length} подготовлено`} />
      </div>
      <button className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white" onClick={onDownloadPack}>
        <Download size={16} />
        Скачать пакет материалов
      </button>
    </section>
  )
}

function SettingsView() {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <SectionLabel icon={Settings} label="Настройки" />
      <h2 className="mt-3 text-3xl font-black text-slate-950">Провайдеры генерации</h2>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <OrderMeta label="Изображения" value="Abacus · nano_banana" />
        <OrderMeta label="Сценарии" value="Claude / локальный шаблон" />
        <OrderMeta label="Озвучка" value="ElevenLabs · скоро" />
        <OrderMeta label="Видео" value="Abacus prompts · manual" />
      </div>
    </section>
  )
}

function StoryboardSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div className="overflow-hidden rounded-[26px] border border-slate-100 bg-white" key={item}>
          <div className="aspect-video animate-pulse bg-gradient-to-br from-cyan-100 via-slate-100 to-violet-100" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-20 animate-pulse rounded-full bg-slate-100" />
            <div className="h-5 w-44 animate-pulse rounded-full bg-slate-100" />
            <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-5 rounded-[24px] border border-rose-100 bg-rose-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-black text-rose-950">Генерация не удалась</h3>
          <p className="mt-1 text-sm font-medium text-rose-700">Можно повторить запуск или открыть детали в логах сервера.</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-black text-white" onClick={onRetry}>Повторить</button>
          <button className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-black text-rose-700">Открыть детали</button>
        </div>
      </div>
    </div>
  )
}

function SceneModal({ scene, onClose }: { scene: Scene; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Предпросмотр сцены">
      <motion.div className="relative w-full max-w-4xl rounded-[28px] bg-white p-4 shadow-2xl" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <button className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-900 shadow-lg" aria-label="Закрыть предпросмотр" onClick={onClose}>
          <X size={18} />
        </button>
        <div className={clsx('relative aspect-video overflow-hidden rounded-[24px] bg-gradient-to-br', scene.gradient || 'from-cyan-100 to-violet-100')}>
          {scene.image_url ? <img className="h-full w-full object-cover" src={scene.image_url} alt={scene.title} /> : <EmptyScene />}
        </div>
        <div className="p-3">
          <h2 className="text-2xl font-black text-slate-950">{scene.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{scene.prompt}</p>
        </div>
      </motion.div>
    </div>
  )
}

function FilmModal({ scenes, brief, script, onClose }: { scenes: Scene[]; brief: Brief; script: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Черновой аниматик">
      <motion.div className="relative grid w-full max-w-6xl gap-5 rounded-[28px] bg-white p-4 shadow-2xl lg:grid-cols-[1.4fr_0.7fr]" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <button className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-900 shadow-lg" aria-label="Закрыть аниматик" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="relative aspect-video overflow-hidden rounded-[24px] bg-slate-950">
          {scenes.map((scene, index) => (
            <div className={clsx('absolute inset-0 grid place-items-center bg-gradient-to-br opacity-0', scene.gradient || 'from-cyan-100 to-violet-100', 'animate-[filmFrames_12s_infinite]')} style={{ animationDelay: `${index * 3}s` }} key={`${scene.title}-${index}`}>
              {scene.image_url ? <img className="absolute inset-0 h-full w-full object-cover animate-[kenBurns_3s_ease-in-out_infinite_alternate]" src={scene.image_url} alt={scene.title} /> : <Sparkles className="relative z-10 text-white" size={38} />}
              <span className="absolute bottom-4 left-4 rounded-2xl bg-slate-950/72 px-3 py-2 text-sm font-black text-white">{scene.title}</span>
            </div>
          ))}
        </div>
        <div className="self-center p-3">
          <SectionLabel icon={Play} label="Аниматик" />
          <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950">Черновой аниматик: {brief.name}</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">{script}</p>
          <p className="mt-4 rounded-2xl bg-cyan-50 p-4 text-sm font-semibold leading-6 text-cyan-900">
            Это предпросмотр порядка сцен. Финальный MP4 появится после генерации видео из кадров, озвучки и монтажного модуля.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

function BriefField({
  label,
  onChange,
  placeholder,
  value,
  wide = false,
}: {
  label: string
  onChange: (value: string) => void
  placeholder: string
  value: string
  wide?: boolean
}) {
  return (
    <label className={clsx('grid gap-2', wide && 'sm:col-span-2')}>
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <input
        className="h-12 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-900 transition placeholder:text-slate-400 hover:bg-white focus:border-cyan-300 focus:bg-white"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

function StatusBadge({ label, tone }: { label: string; tone: NoticeTone }) {
  return (
    <span
      className={clsx(
        'inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-black',
        tone === 'success' && 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
        tone === 'warning' && 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
        tone === 'error' && 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
        tone === 'info' && 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100',
      )}
    >
      {label}
    </span>
  )
}

function MetricPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 text-xs font-black text-slate-600 shadow-sm">
      <Icon className="h-3.5 w-3.5 text-cyan-600" />
      {label}
    </span>
  )
}

function SectionLabel({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
      <Icon size={14} />
      {label}
    </div>
  )
}

function SideAction({ disabled, icon: Icon, label, onClick }: { disabled?: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45" disabled={disabled} onClick={onClick}>
      <Icon className="h-4 w-4 text-cyan-600" />
      {label}
    </button>
  )
}

function MiniButton({ disabled, icon: Icon, label, onClick }: { disabled?: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45" disabled={disabled} onClick={onClick}>
      <Icon size={13} />
      {label}
    </button>
  )
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
      <span>{text}</span>
    </div>
  )
}

function OrderMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <strong className="text-sm font-black text-slate-950">{value}</strong>
    </div>
  )
}

function PrivacyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={clsx('rounded-[22px] border border-cyan-100 bg-cyan-50/70 text-cyan-950', compact ? 'mt-5 p-4' : 'p-4')}>
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-600" />
        <div>
          <strong className="block text-sm font-black">Безопасность фото</strong>
          <p className="mt-1 text-xs font-semibold leading-5 text-cyan-900/80">
            Детские фото используются только внутри заказа и не публикуются без согласия.
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyScene() {
  return (
    <div className="grid h-full place-items-center">
      <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/70 text-cyan-600 shadow-xl">
        <Sparkles size={26} />
      </div>
    </div>
  )
}

function normalizeProject(project: Project | null): Project | null {
  if (!project) return null
  const normalizedBrief = normalizeBrief(project.brief)

  return {
    ...project,
    brief: normalizedBrief,
    script: cleanText(project.script, createLocalScript(normalizedBrief)),
    stages: project.stages.map(normalizeStage),
    scenes: project.scenes.map((scene, index) => normalizeScene(scene, normalizedBrief, index)),
  }
}

function normalizeBrief(brief: Brief): Brief {
  return {
    name: cleanText(brief.name, seedBrief.name),
    age: cleanText(brief.age, seedBrief.age),
    occasion: cleanText(brief.occasion, seedBrief.occasion),
    world: cleanText(brief.world, seedBrief.world),
    tone: cleanText(brief.tone, seedBrief.tone),
    duration: cleanText(brief.duration, seedBrief.duration),
  }
}

function normalizeStage(stage: Stage): Stage {
  const fallback = fallbackStages.find((item) => item.slug === stage.slug)

  return {
    ...stage,
    title: cleanText(stage.title, fallback?.title ?? stage.title),
    detail: cleanText(stage.detail, fallback?.detail ?? stage.detail),
  }
}

function normalizeScene(scene: Scene, brief: Brief, index: number): Scene {
  const fallback = fallbackScenes[index] ?? fallbackScenes[0]

  return {
    ...scene,
    title: cleanText(scene.title, fallback.title),
    prompt: cleanText(scene.prompt, fallback.prompt.replaceAll(seedBrief.name, brief.name || seedBrief.name)),
    gradient: normalizeGradient(scene.gradient, fallback.gradient),
    video_prompt: scene.video_prompt ? cleanText(scene.video_prompt, createAbacusVideoPrompt(fallback.prompt, brief)) : scene.video_prompt,
  }
}

function normalizeGradient(value: string | undefined, fallback: string) {
  const gradients: Record<string, string> = {
    'scene-cyan': 'from-cyan-200 via-sky-100 to-orange-100',
    'scene-coral': 'from-orange-200 via-rose-100 to-white',
    'scene-lime': 'from-lime-200 via-cyan-100 to-white',
    'scene-ink': 'from-slate-900 via-slate-700 to-orange-300',
  }

  if (!value) return fallback
  if (value.startsWith('from-')) return value
  return gradients[value] ?? fallback
}

function cleanText(value: string | null | undefined, fallback: string) {
  const text = (value ?? '').trim()
  return text && !isBrokenText(text) ? text : fallback
}

function isBrokenText(text: string) {
  const questionRuns = (text.match(/\?{2,}/g) ?? []).length
  const replacementCount = (text.match(/\uFFFD/g) ?? []).length
  const mojibakeMarkers = ['Ð', 'Ñ', 'Р°', 'Рµ', 'Рё', 'Рѕ', 'СЊ', 'СЃ', 'вЂ', 'в‚']
  const markerHits = mojibakeMarkers.filter((marker) => text.includes(marker)).length

  return questionRuns > 0 || replacementCount > 0 || markerHits >= 2
}

function createLocalScript(brief: Brief) {
  return `${brief.name} получает волшебный пропуск в ${brief.world} на событие: ${brief.occasion}. Чтобы вернуться домой с подарком для семьи, герой проходит три испытания, учится смелости и в финале устраивает собственную премьеру мультфильма. Тон истории: ${brief.tone}.`
}

function createVoiceover(script: string, brief: Brief) {
  return `Диктор, тёплый семейный тон. ${script} Финальная фраза: "${brief.name}, твоё главное приключение только начинается".`
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

function shortId(id?: string) {
  return id ? `#${id.slice(0, 8)}` : '#draft'
}

function humanStageStatus(status: StageStatus) {
  if (status === 'done') return 'Готово'
  if (status === 'active') return 'В работе'
  if (status === 'failed') return 'Ошибка'
  return 'Ожидает'
}

function humanVideoStatus(status: string) {
  if (status === 'prepared') return 'подготовлено'
  if (status === 'ready') return 'готово'
  if (status === 'generating') return 'в работе'
  if (status === 'failed') return 'ошибка'
  return status
}

export default App

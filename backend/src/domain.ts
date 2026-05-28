export type Brief = {
  name: string
  age: string
  occasion: string
  world: string
  tone: string
  duration: string
}

export const defaultBrief: Brief = {
  name: 'Лева',
  age: '6',
  occasion: 'день рождения',
  world: 'космическое приключение',
  tone: 'добрый, смешной, вдохновляющий',
  duration: '60 секунд',
}

export const stageTemplates = [
  { slug: 'script', title: 'Сценарий', detail: '12 сцен, арка героя' },
  { slug: 'character', title: 'Образ героя', detail: 'единый character sheet' },
  { slug: 'frames', title: 'Кадры', detail: '3D ключевые сцены' },
  { slug: 'animation', title: 'Анимация', detail: 'image-to-video клипы' },
  { slug: 'voice', title: 'Озвучка', detail: 'диктор, эмоции, паузы' },
  { slug: 'edit', title: 'Монтаж', detail: 'музыка, титры, MP4' },
] as const

export function createProducerScript(brief: Brief) {
  return `${brief.name} получает волшебный пропуск в ${brief.world} на событие: ${brief.occasion}. Чтобы вернуться домой с подарком для семьи, герой проходит три испытания, учится смелости и в финале устраивает собственную премьеру мультфильма. Тон истории: ${brief.tone}. Плановая длительность: ${brief.duration}.`
}

export function createScenePlan(brief: Brief) {
  return [
    {
      title: 'Знакомство с героем',
      prompt: `${brief.name} находит светящийся билет в домашней комнате`,
      gradient: 'scene-cyan',
    },
    {
      title: 'Портал в мир',
      prompt: `Игрушечная ракета открывает портал в ${brief.world}`,
      gradient: 'scene-coral',
    },
    {
      title: 'Первое испытание',
      prompt: `${brief.name} помогает роботу собрать карту звезд`,
      gradient: 'scene-lime',
    },
    {
      title: 'Финальная сцена',
      prompt: 'Семья смотрит премьеру персонального мультфильма дома',
      gradient: 'scene-ink',
    },
  ]
}

export function createImagePrompt(scenePrompt: string, brief: Brief) {
  return [
    'Premium 3D animated family film keyframe, original non-branded style, warm cinematic lighting.',
    `Main character: a ${brief.age}-year-old child named ${brief.name}, friendly expressive face, consistent outfit, wholesome family-safe design.`,
    `Scene: ${scenePrompt}.`,
    `Story world: ${brief.world}.`,
    `Tone: ${brief.tone}.`,
    'Composition: 16:9 wide cinematic frame, clear subject, rich background detail, no text, no logos, no watermark.',
  ].join(' ')
}

export function createVideoPrompt(scenePrompt: string, brief: Brief) {
  return [
    'Animate this keyframe as a polished short family cartoon scene.',
    `Main character: ${brief.name}, ${brief.age} years old, keep the same face, outfit, colors, and proportions from the source image.`,
    `Scene action: ${scenePrompt}.`,
    `Story world: ${brief.world}.`,
    'Camera: slow cinematic push-in, gentle parallax, expressive but natural character motion, no scene cuts.',
    'Style: premium 3D animated family film, warm lighting, wholesome, no text, no logos, no watermark.',
    'Duration: 5 seconds, 16:9.',
  ].join(' ')
}

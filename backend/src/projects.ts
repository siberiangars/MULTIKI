import { z } from 'zod'
import { db } from './db.js'
import { createProducerScript, createScenePlan, stageTemplates } from './domain.js'

export const briefSchema = z.object({
  name: z.string().trim().min(1).max(80),
  age: z.string().trim().min(1).max(20),
  occasion: z.string().trim().min(1).max(120),
  world: z.string().trim().min(1).max(160),
  tone: z.string().trim().min(1).max(180),
  duration: z.string().trim().min(1).max(80),
})

export type ProjectDto = Awaited<ReturnType<typeof getProject>>

export async function createProject(input: unknown) {
  const brief = briefSchema.parse(input)
  const script = createProducerScript(brief)
  const scenes = createScenePlan(brief)

  const client = await db.connect()

  try {
    await client.query('begin')
    const projectResult = await client.query<{ id: string }>(
      `
        insert into projects (name, age, occasion, world, tone, duration, script)
        values ($1, $2, $3, $4, $5, $6, $7)
        returning id
      `,
      [brief.name, brief.age, brief.occasion, brief.world, brief.tone, brief.duration, script],
    )
    const projectId = projectResult.rows[0]?.id

    for (const [index, stage] of stageTemplates.entries()) {
      await client.query(
        `
          insert into project_stages (project_id, slug, title, detail, sort_order)
          values ($1, $2, $3, $4, $5)
        `,
        [projectId, stage.slug, stage.title, stage.detail, index],
      )
    }

    for (const [index, scene] of scenes.entries()) {
      await client.query(
        `
          insert into scenes (project_id, title, prompt, gradient, sort_order)
          values ($1, $2, $3, $4, $5)
        `,
        [projectId, scene.title, scene.prompt, scene.gradient, index],
      )
    }

    await client.query('commit')
    return getProject(projectId)
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function listProjects() {
  const result = await db.query(`
    select id, name, age, occasion, world, tone, duration, script, status, created_at, updated_at
    from projects
    order by created_at desc
    limit 30
  `)

  return result.rows
}

export async function getProject(projectId: string) {
  const projectResult = await db.query(
    `
      select id, name, age, occasion, world, tone, duration, script, status, created_at, updated_at
      from projects
      where id = $1
    `,
    [projectId],
  )
  const project = projectResult.rows[0]

  if (!project) return null

  const [stagesResult, scenesResult] = await Promise.all([
    db.query(
      `
        select slug, title, detail, progress, status
        from project_stages
        where project_id = $1
        order by sort_order asc
      `,
      [projectId],
    ),
    db.query(
      `
        select id, title, prompt, gradient, image_url, image_provider, image_status, sort_order
        from scenes
        where project_id = $1
        order by sort_order asc
      `,
      [projectId],
    ),
  ])

  return {
    ...project,
    brief: {
      name: project.name,
      age: project.age,
      occasion: project.occasion,
      world: project.world,
      tone: project.tone,
      duration: project.duration,
    },
    stages: stagesResult.rows,
    scenes: scenesResult.rows,
  }
}

export async function listScenesForProject(projectId: string) {
  const result = await db.query<{
    id: string
    title: string
    prompt: string
    gradient: string
    image_url: string | null
  }>(
    `
      select id, title, prompt, gradient, image_url
      from scenes
      where project_id = $1
      order by sort_order asc
    `,
    [projectId],
  )

  return result.rows
}

export async function updateSceneImage(
  sceneId: string,
  imageUrl: string | null,
  imageProvider: string | null,
  imageStatus: string,
) {
  await db.query(
    `
      update scenes
      set image_url = $2, image_provider = $3, image_status = $4
      where id = $1
    `,
    [sceneId, imageUrl, imageProvider, imageStatus],
  )
}

export async function updateProjectStatus(projectId: string, status: string) {
  await db.query(
    `
      update projects
      set status = $2, updated_at = now()
      where id = $1
    `,
    [projectId, status],
  )
}

export async function updateStage(projectId: string, slug: string, progress: number, status: string) {
  await db.query(
    `
      update project_stages
      set progress = $3, status = $4, updated_at = now()
      where project_id = $1 and slug = $2
    `,
    [projectId, slug, progress, status],
  )
}

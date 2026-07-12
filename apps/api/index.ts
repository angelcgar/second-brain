import { Database } from 'bun:sqlite';

type TaskStatus = 'inbox' | 'esperando' | 'sin_fecha' | 'en_proceso';
type ProjectStatus = 'not_started' | 'in_progress' | 'completed';
type AreaType = 'Empresa' | 'Personal' | 'Academico';
type GoalStatus = 'No empezado' | 'En progreso' | 'Completo';

interface TaskRecord {
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
  edited: string;
  fecha: string | null;
  objetivo: string | null;
  proyecto: string | null;
  contexto: string | null;
  prioridad: string | null;
  descripcion: string | null;
  url: string | null;
  area: string | null;
}

interface ProjectRecord {
  id: string;
  title: string;
  status: ProjectStatus;
  created_at: string;
  edited: string;
  area: string | null;
  parent_project: string | null;
  timeline: string | null;
  prioridad: string | null;
  archivo: number | null;
  start_date: string | null;
  goal_area: string | null;
}

interface AreaRecord {
  id: string;
  title: string;
  type: AreaType | null;
  archivado: number | null;
}

interface GoalRecord {
  id: string;
  title: string;
  area: string;
  created_at: string;
  edited: string;
  deadline: string | null;
  countdown: string | null;
  quarter: string | null;
  status: GoalStatus | null;
  archivado: number | null;
}

interface TaskPayload {
  id?: string;
  title?: string;
  status?: TaskStatus;
  fecha?: string;
  objetivo?: string;
  proyecto?: string;
  contexto?: string;
  prioridad?: string;
  descripcion?: string;
  url?: string;
  area?: string;
}

interface ProjectPayload {
  id?: string;
  title?: string;
  status?: ProjectStatus;
  area?: string;
  parentProject?: string;
  timeline?: string;
  prioridad?: string;
  archivo?: boolean;
  startDate?: string;
  goalArea?: string;
}

interface AreaPayload {
  id?: string;
  title?: string;
  type?: AreaType;
  archivado?: boolean;
}

interface GoalPayload {
  id?: string;
  title?: string;
  area?: string;
  deadline?: string;
  countdown?: string;
  quarter?: string;
  status?: GoalStatus;
  archivado?: boolean;
}

const HOME = process.env.HOME ?? '';
const dbPath = `${HOME}/.config/second-brain/tasks.db`;
const db = new Database(dbPath, { create: true });

db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    edited TEXT NOT NULL,
    fecha TEXT,
    objetivo TEXT,
    proyecto TEXT,
    contexto TEXT,
    prioridad TEXT,
    descripcion TEXT,
    url TEXT,
    area TEXT
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    edited TEXT NOT NULL,
    area TEXT,
    parent_project TEXT,
    timeline TEXT,
    prioridad TEXT,
    archivo INTEGER,
    start_date TEXT,
    goal_area TEXT
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT,
    archivado INTEGER
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    area TEXT NOT NULL,
    created_at TEXT NOT NULL,
    edited TEXT NOT NULL,
    deadline TEXT,
    countdown TEXT,
    quarter TEXT,
    status TEXT,
    archivado INTEGER
  );
`);

const allowedTaskStatuses: TaskStatus[] = ['inbox', 'esperando', 'sin_fecha', 'en_proceso'];
const allowedProjectStatuses: ProjectStatus[] = ['not_started', 'in_progress', 'completed'];
const allowedAreaTypes: AreaType[] = ['Empresa', 'Personal', 'Academico'];
const allowedGoalStatuses: GoalStatus[] = ['No empezado', 'En progreso', 'Completo'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const taskSelectAllStmt = db.query('SELECT * FROM tasks ORDER BY created_at ASC');
const taskSelectByIdStmt = db.query('SELECT * FROM tasks WHERE id = ?');
const taskInsertStmt = db.query(`
  INSERT INTO tasks (
    id, title, status, created_at, edited,
    fecha, objetivo, proyecto, contexto, prioridad, descripcion, url, area
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const taskUpdateStmt = db.query(`
  UPDATE tasks
  SET
    title = ?,
    status = ?,
    edited = ?,
    fecha = ?,
    objetivo = ?,
    proyecto = ?,
    contexto = ?,
    prioridad = ?,
    descripcion = ?,
    url = ?,
    area = ?
  WHERE id = ?
`);
const taskDeleteStmt = db.query('DELETE FROM tasks WHERE id = ?');

const projectSelectAllStmt = db.query('SELECT * FROM projects ORDER BY created_at ASC');
const projectSelectByIdStmt = db.query('SELECT * FROM projects WHERE id = ?');
const projectInsertStmt = db.query(`
  INSERT INTO projects (
    id, title, status, created_at, edited,
    area, parent_project, timeline, prioridad, archivo, start_date, goal_area
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const projectUpdateStmt = db.query(`
  UPDATE projects
  SET
    title = ?,
    status = ?,
    edited = ?,
    area = ?,
    parent_project = ?,
    timeline = ?,
    prioridad = ?,
    archivo = ?,
    start_date = ?,
    goal_area = ?
  WHERE id = ?
`);
const projectDeleteStmt = db.query('DELETE FROM projects WHERE id = ?');

const areaSelectAllStmt = db.query('SELECT * FROM areas ORDER BY title COLLATE NOCASE ASC');
const areaSelectByIdStmt = db.query('SELECT * FROM areas WHERE id = ?');
const areaInsertStmt = db.query(`
  INSERT INTO areas (id, title, type, archivado)
  VALUES (?, ?, ?, ?)
`);
const areaUpdateStmt = db.query(`
  UPDATE areas
  SET
    title = ?,
    type = ?,
    archivado = ?
  WHERE id = ?
`);
const areaDeleteStmt = db.query('DELETE FROM areas WHERE id = ?');

const goalSelectAllStmt = db.query('SELECT * FROM goals ORDER BY created_at ASC');
const goalSelectByIdStmt = db.query('SELECT * FROM goals WHERE id = ?');
const goalInsertStmt = db.query(`
  INSERT INTO goals (
    id, title, area, created_at, edited, deadline, countdown, quarter, status, archivado
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const goalUpdateStmt = db.query(`
  UPDATE goals
  SET
    title = ?,
    area = ?,
    edited = ?,
    deadline = ?,
    countdown = ?,
    quarter = ?,
    status = ?,
    archivado = ?
  WHERE id = ?
`);
const goalDeleteStmt = db.query('DELETE FROM goals WHERE id = ?');

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value.trim() === '') return null;
  return value;
}

function boolToInt(value: boolean | undefined | null): number {
  return value ? 1 : 0;
}

function intToBool(value: number | null): boolean {
  return value === 1;
}

function parsePayload<T>(payload: unknown): T | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  return payload as T;
}

function validateTaskStatus(status: unknown): status is TaskStatus {
  return typeof status === 'string' && allowedTaskStatuses.includes(status as TaskStatus);
}

function validateProjectStatus(status: unknown): status is ProjectStatus {
  return typeof status === 'string' && allowedProjectStatuses.includes(status as ProjectStatus);
}

function validateAreaType(value: unknown): value is AreaType {
  return typeof value === 'string' && allowedAreaTypes.includes(value as AreaType);
}

function validateGoalStatus(value: unknown): value is GoalStatus {
  return typeof value === 'string' && allowedGoalStatuses.includes(value as GoalStatus);
}

function mapTask(task: TaskRecord) {
  return {
    ...task,
    fecha: task.fecha ?? undefined,
    objetivo: task.objetivo ?? undefined,
    proyecto: task.proyecto ?? undefined,
    contexto: task.contexto ?? undefined,
    prioridad: task.prioridad ?? undefined,
    descripcion: task.descripcion ?? undefined,
    url: task.url ?? undefined,
    area: task.area ?? undefined,
  };
}

function mapProject(project: ProjectRecord) {
  return {
    id: project.id,
    title: project.title,
    status: project.status,
    created_at: project.created_at,
    edited: project.edited,
    area: project.area ?? undefined,
    parentProject: project.parent_project ?? undefined,
    timeline: project.timeline ?? undefined,
    prioridad: project.prioridad ?? undefined,
    archivo: intToBool(project.archivo),
    startDate: project.start_date ?? undefined,
    goalArea: project.goal_area ?? undefined,
  };
}

function mapArea(area: AreaRecord) {
  return {
    id: area.id,
    title: area.title,
    type: area.type ?? 'Personal',
    archivado: intToBool(area.archivado),
  };
}

function mapGoal(goal: GoalRecord) {
  return {
    id: goal.id,
    title: goal.title,
    area: goal.area,
    created_at: goal.created_at,
    edited: goal.edited,
    deadline: goal.deadline ?? '',
    countdown: goal.countdown ?? '',
    quarter: goal.quarter ?? '',
    status: goal.status ?? 'No empezado',
    archivado: intToBool(goal.archivado),
  };
}

function getTaskById(id: string): TaskRecord | null {
  return (taskSelectByIdStmt.get(id) as TaskRecord | null) ?? null;
}

function getProjectById(id: string): ProjectRecord | null {
  return (projectSelectByIdStmt.get(id) as ProjectRecord | null) ?? null;
}

function getAreaById(id: string): AreaRecord | null {
  return (areaSelectByIdStmt.get(id) as AreaRecord | null) ?? null;
}

function getGoalById(id: string): GoalRecord | null {
  return (goalSelectByIdStmt.get(id) as GoalRecord | null) ?? null;
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const pathname = new URL(req.url).pathname;

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method === 'GET' && pathname === '/tasks') {
      const rows = taskSelectAllStmt.all() as TaskRecord[];
      return json(rows.map(mapTask));
    }

    if (req.method === 'POST' && pathname === '/tasks') {
      const payload = parsePayload<TaskPayload>(await req.json().catch(() => null));
      if (!payload || typeof payload.title !== 'string' || !validateTaskStatus(payload.status)) {
        return json({ error: 'Payload inválido para crear task' }, 400);
      }

      const now = new Date().toISOString();
      const id = payload.id?.trim() || crypto.randomUUID();

      taskInsertStmt.run(
        id,
        payload.title,
        payload.status,
        now,
        now,
        emptyToNull(payload.fecha),
        emptyToNull(payload.objetivo),
        emptyToNull(payload.proyecto),
        emptyToNull(payload.contexto),
        emptyToNull(payload.prioridad),
        emptyToNull(payload.descripcion),
        emptyToNull(payload.url),
        emptyToNull(payload.area),
      );

      const createdTask = getTaskById(id);
      if (!createdTask) return json({ error: 'No se pudo crear la tarea' }, 500);
      return json(mapTask(createdTask), 201);
    }

    if (req.method === 'PUT' && pathname.startsWith('/tasks/')) {
      const id = pathname.replace('/tasks/', '').trim();
      if (!id) return json({ error: 'ID inválido' }, 400);

      const existingTask = getTaskById(id);
      if (!existingTask) return json({ error: 'Task no encontrada' }, 404);

      const payload = parsePayload<TaskPayload>(await req.json().catch(() => null));
      if (!payload) return json({ error: 'Payload inválido para update' }, 400);

      const nextStatus = payload.status ?? existingTask.status;
      if (!validateTaskStatus(nextStatus)) {
        return json({ error: 'Status inválido' }, 400);
      }

      taskUpdateStmt.run(
        payload.title ?? existingTask.title,
        nextStatus,
        new Date().toISOString(),
        emptyToNull(payload.fecha ?? existingTask.fecha),
        emptyToNull(payload.objetivo ?? existingTask.objetivo),
        emptyToNull(payload.proyecto ?? existingTask.proyecto),
        emptyToNull(payload.contexto ?? existingTask.contexto),
        emptyToNull(payload.prioridad ?? existingTask.prioridad),
        emptyToNull(payload.descripcion ?? existingTask.descripcion),
        emptyToNull(payload.url ?? existingTask.url),
        emptyToNull(payload.area ?? existingTask.area),
        id,
      );

      const updatedTask = getTaskById(id);
      if (!updatedTask) return json({ error: 'No se pudo actualizar la tarea' }, 500);
      return json(mapTask(updatedTask));
    }

    if (req.method === 'DELETE' && pathname.startsWith('/tasks/')) {
      const id = pathname.replace('/tasks/', '').trim();
      if (!id) return json({ error: 'ID inválido' }, 400);
      taskDeleteStmt.run(id);
      return json({ ok: true });
    }

    if (req.method === 'GET' && pathname === '/projects') {
      const rows = projectSelectAllStmt.all() as ProjectRecord[];
      return json(rows.map(mapProject));
    }

    if (req.method === 'POST' && pathname === '/projects') {
      const payload = parsePayload<ProjectPayload>(await req.json().catch(() => null));
      if (!payload || typeof payload.title !== 'string' || !validateProjectStatus(payload.status)) {
        return json({ error: 'Payload inválido para crear project' }, 400);
      }

      const now = new Date().toISOString();
      const id = payload.id?.trim() || crypto.randomUUID();

      projectInsertStmt.run(
        id,
        payload.title,
        payload.status,
        now,
        now,
        emptyToNull(payload.area),
        emptyToNull(payload.parentProject),
        emptyToNull(payload.timeline),
        emptyToNull(payload.prioridad),
        boolToInt(payload.archivo),
        emptyToNull(payload.startDate),
        emptyToNull(payload.goalArea),
      );

      const createdProject = getProjectById(id);
      if (!createdProject) return json({ error: 'No se pudo crear el proyecto' }, 500);
      return json(mapProject(createdProject), 201);
    }

    if (req.method === 'PUT' && pathname.startsWith('/projects/')) {
      const id = pathname.replace('/projects/', '').trim();
      if (!id) return json({ error: 'ID inválido' }, 400);

      const existingProject = getProjectById(id);
      if (!existingProject) return json({ error: 'Proyecto no encontrado' }, 404);

      const payload = parsePayload<ProjectPayload>(await req.json().catch(() => null));
      if (!payload) return json({ error: 'Payload inválido para update' }, 400);

      const nextStatus = payload.status ?? existingProject.status;
      if (!validateProjectStatus(nextStatus)) {
        return json({ error: 'Status inválido' }, 400);
      }

      projectUpdateStmt.run(
        payload.title ?? existingProject.title,
        nextStatus,
        new Date().toISOString(),
        emptyToNull(payload.area ?? existingProject.area),
        emptyToNull(payload.parentProject ?? existingProject.parent_project),
        emptyToNull(payload.timeline ?? existingProject.timeline),
        emptyToNull(payload.prioridad ?? existingProject.prioridad),
        payload.archivo !== undefined ? boolToInt(payload.archivo) : (existingProject.archivo ?? 0),
        emptyToNull(payload.startDate ?? existingProject.start_date),
        emptyToNull(payload.goalArea ?? existingProject.goal_area),
        id,
      );

      const updatedProject = getProjectById(id);
      if (!updatedProject) return json({ error: 'No se pudo actualizar el proyecto' }, 500);
      return json(mapProject(updatedProject));
    }

    if (req.method === 'DELETE' && pathname.startsWith('/projects/')) {
      const id = pathname.replace('/projects/', '').trim();
      if (!id) return json({ error: 'ID inválido' }, 400);
      projectDeleteStmt.run(id);
      return json({ ok: true });
    }

    if (req.method === 'GET' && pathname === '/areas') {
      const rows = areaSelectAllStmt.all() as AreaRecord[];
      return json(rows.map(mapArea));
    }

    if (req.method === 'POST' && pathname === '/areas') {
      const payload = parsePayload<AreaPayload>(await req.json().catch(() => null));
      if (!payload || typeof payload.title !== 'string') {
        return json({ error: 'Payload inválido para crear area' }, 400);
      }

      if (payload.type !== undefined && !validateAreaType(payload.type)) {
        return json({ error: 'Tipo de área inválido' }, 400);
      }

      const id = payload.id?.trim() || crypto.randomUUID();
      areaInsertStmt.run(
        id,
        payload.title,
        payload.type ?? 'Personal',
        boolToInt(payload.archivado),
      );

      const createdArea = getAreaById(id);
      if (!createdArea) return json({ error: 'No se pudo crear el área' }, 500);
      return json(mapArea(createdArea), 201);
    }

    if (req.method === 'PUT' && pathname.startsWith('/areas/')) {
      const id = pathname.replace('/areas/', '').trim();
      if (!id) return json({ error: 'ID inválido' }, 400);

      const existingArea = getAreaById(id);
      if (!existingArea) return json({ error: 'Área no encontrada' }, 404);

      const payload = parsePayload<AreaPayload>(await req.json().catch(() => null));
      if (!payload) return json({ error: 'Payload inválido para update' }, 400);

      const nextType = payload.type ?? existingArea.type ?? 'Personal';
      if (!validateAreaType(nextType)) {
        return json({ error: 'Tipo de área inválido' }, 400);
      }

      areaUpdateStmt.run(
        payload.title ?? existingArea.title,
        nextType,
        payload.archivado !== undefined ? boolToInt(payload.archivado) : (existingArea.archivado ?? 0),
        id,
      );

      const updatedArea = getAreaById(id);
      if (!updatedArea) return json({ error: 'No se pudo actualizar el área' }, 500);
      return json(mapArea(updatedArea));
    }

    if (req.method === 'DELETE' && pathname.startsWith('/areas/')) {
      const id = pathname.replace('/areas/', '').trim();
      if (!id) return json({ error: 'ID inválido' }, 400);
      areaDeleteStmt.run(id);
      return json({ ok: true });
    }

    if (req.method === 'GET' && pathname === '/goals') {
      const rows = goalSelectAllStmt.all() as GoalRecord[];
      return json(rows.map(mapGoal));
    }

    if (req.method === 'POST' && pathname === '/goals') {
      const payload = parsePayload<GoalPayload>(await req.json().catch(() => null));
      if (!payload || typeof payload.title !== 'string' || typeof payload.area !== 'string') {
        return json({ error: 'Payload inválido para crear goal' }, 400);
      }

      if (payload.status !== undefined && !validateGoalStatus(payload.status)) {
        return json({ error: 'Status de goal inválido' }, 400);
      }

      const now = new Date().toISOString();
      const id = payload.id?.trim() || crypto.randomUUID();

      goalInsertStmt.run(
        id,
        payload.title,
        payload.area,
        now,
        now,
        emptyToNull(payload.deadline),
        emptyToNull(payload.countdown),
        emptyToNull(payload.quarter),
        payload.status ?? 'No empezado',
        boolToInt(payload.archivado),
      );

      const createdGoal = getGoalById(id);
      if (!createdGoal) return json({ error: 'No se pudo crear el goal' }, 500);
      return json(mapGoal(createdGoal), 201);
    }

    if (req.method === 'PUT' && pathname.startsWith('/goals/')) {
      const id = pathname.replace('/goals/', '').trim();
      if (!id) return json({ error: 'ID inválido' }, 400);

      const existingGoal = getGoalById(id);
      if (!existingGoal) return json({ error: 'Goal no encontrado' }, 404);

      const payload = parsePayload<GoalPayload>(await req.json().catch(() => null));
      if (!payload) return json({ error: 'Payload inválido para update' }, 400);

      const nextStatus = payload.status ?? existingGoal.status ?? 'No empezado';
      if (!validateGoalStatus(nextStatus)) {
        return json({ error: 'Status de goal inválido' }, 400);
      }

      goalUpdateStmt.run(
        payload.title ?? existingGoal.title,
        payload.area ?? existingGoal.area,
        new Date().toISOString(),
        emptyToNull(payload.deadline ?? existingGoal.deadline),
        emptyToNull(payload.countdown ?? existingGoal.countdown),
        emptyToNull(payload.quarter ?? existingGoal.quarter),
        nextStatus,
        payload.archivado !== undefined ? boolToInt(payload.archivado) : (existingGoal.archivado ?? 0),
        id,
      );

      const updatedGoal = getGoalById(id);
      if (!updatedGoal) return json({ error: 'No se pudo actualizar el goal' }, 500);
      return json(mapGoal(updatedGoal));
    }

    if (req.method === 'DELETE' && pathname.startsWith('/goals/')) {
      const id = pathname.replace('/goals/', '').trim();
      if (!id) return json({ error: 'ID inválido' }, 400);
      goalDeleteStmt.run(id);
      return json({ ok: true });
    }

    return json({ message: 'API running' });
  },
});

console.log(`API running on ${server.url}`);

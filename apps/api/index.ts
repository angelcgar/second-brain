import { Database } from 'bun:sqlite';

type TaskStatus = 'inbox' | 'esperando' | 'sin_fecha' | 'en_proceso';

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

const selectAllStmt = db.query('SELECT * FROM tasks ORDER BY created_at ASC');
const selectByIdStmt = db.query('SELECT * FROM tasks WHERE id = ?');
const insertStmt = db.query(`
  INSERT INTO tasks (
    id, title, status, created_at, edited,
    fecha, objetivo, proyecto, contexto, prioridad, descripcion, url, area
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const updateStmt = db.query(`
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
const deleteStmt = db.query('DELETE FROM tasks WHERE id = ?');

const allowedStatuses: TaskStatus[] = ['inbox', 'esperando', 'sin_fecha', 'en_proceso'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function emptyToNull(value: string | undefined): string | null {
  if (value === undefined || value.trim() === '') return null;
  return value;
}

function validateStatus(status: unknown): status is TaskStatus {
  return typeof status === 'string' && allowedStatuses.includes(status as TaskStatus);
}

function parsePayload(payload: unknown): TaskPayload | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  return payload as TaskPayload;
}

function getTaskById(id: string): TaskRecord | null {
  return (selectByIdStmt.get(id) as TaskRecord | null) ?? null;
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

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method === 'GET' && pathname === '/tasks') {
      const rows = selectAllStmt.all() as TaskRecord[];
      return json(rows.map(mapTask));
    }

    if (req.method === 'POST' && pathname === '/tasks') {
      const rawPayload = await req.json().catch(() => null);
      const payload = parsePayload(rawPayload);
      if (!payload || typeof payload.title !== 'string' || !validateStatus(payload.status)) {
        return json({ error: 'Payload inválido para crear task' }, 400);
      }

      const now = new Date().toISOString();
      const id = payload.id?.trim() || crypto.randomUUID();

      insertStmt.run(
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
      if (!createdTask) {
        return json({ error: 'No se pudo crear la tarea' }, 500);
      }
      return json(mapTask(createdTask), 201);
    }

    if (req.method === 'PUT' && pathname.startsWith('/tasks/')) {
      const id = pathname.replace('/tasks/', '').trim();
      if (!id) {
        return json({ error: 'ID inválido' }, 400);
      }

      const existingTask = getTaskById(id);
      if (!existingTask) {
        return json({ error: 'Task no encontrada' }, 404);
      }

      const rawPayload = await req.json().catch(() => null);
      const payload = parsePayload(rawPayload);
      if (!payload) {
        return json({ error: 'Payload inválido para update' }, 400);
      }

      const nextStatus = payload.status ?? existingTask.status;
      if (!validateStatus(nextStatus)) {
        return json({ error: 'Status inválido' }, 400);
      }

      const now = new Date().toISOString();

      updateStmt.run(
        payload.title ?? existingTask.title,
        nextStatus,
        now,
        emptyToNull(payload.fecha ?? existingTask.fecha ?? undefined),
        emptyToNull(payload.objetivo ?? existingTask.objetivo ?? undefined),
        emptyToNull(payload.proyecto ?? existingTask.proyecto ?? undefined),
        emptyToNull(payload.contexto ?? existingTask.contexto ?? undefined),
        emptyToNull(payload.prioridad ?? existingTask.prioridad ?? undefined),
        emptyToNull(payload.descripcion ?? existingTask.descripcion ?? undefined),
        emptyToNull(payload.url ?? existingTask.url ?? undefined),
        emptyToNull(payload.area ?? existingTask.area ?? undefined),
        id,
      );

      const updatedTask = getTaskById(id);
      if (!updatedTask) {
        return json({ error: 'No se pudo actualizar la tarea' }, 500);
      }
      return json(mapTask(updatedTask));
    }

    if (req.method === 'DELETE' && pathname.startsWith('/tasks/')) {
      const id = pathname.replace('/tasks/', '').trim();
      if (!id) {
        return json({ error: 'ID inválido' }, 400);
      }

      deleteStmt.run(id);
      return json({ ok: true });
    }

    return json({ message: 'API running' });
  },
});

console.log(`API running on ${server.url}`);

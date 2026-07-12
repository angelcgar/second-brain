export type TaskStatus = 'inbox' | 'esperando' | 'sin_fecha' | 'en_proceso';

export type Priority = 'Baja' | 'Media' | 'Alta' | 'Urgente';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
  edited: string;

  fecha?: string;
  objetivo?: string;
  proyecto?: string;
  contexto?: string;
  prioridad?: Priority;
  descripcion?: string;
  url?: string;
  area?: string;
}

export interface Column {
  id: TaskStatus;
  title: string;
  tasks: Task[];
}
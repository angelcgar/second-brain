import type { AreaItem } from './area.model';

export type GoalStatus = 'No empezar' | 'En progreso' | 'Completo';

export interface GoalItem {
  id: string;
  title: string;
  area: string;
  created_at: string;
  edited: string;
  deadline: string;
  countdown: string;
  quarter: string;
  status: GoalStatus;
  archivado: boolean;
}

export interface GoalColumn {
  id: string;
  title: string;
  goals: GoalItem[];
}

export { type AreaItem };
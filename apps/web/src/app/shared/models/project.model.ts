export type ProjectStatus = 'not_started' | 'in_progress' | 'completed';
export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ProjectItem {
  id: string;
  title: string;
  status: ProjectStatus;
  created_at: string;
  edited: string;
  area?: string;
  parentProject?: string;
  timeline?: string;
  prioridad?: ProjectPriority;
  archivo?: boolean;
  startDate?: string;
  goalArea?: string;
}

export interface ProjectColumn {
  id: ProjectStatus;
  title: string;
  projects: ProjectItem[];
}
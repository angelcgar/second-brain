import { Injectable } from '@angular/core';
import type { ProjectItem } from './kanban-board-projects.component';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly baseUrl = 'http://localhost:3000';

  async getAll(): Promise<ProjectItem[]> {
    return this.request<ProjectItem[]>('/projects');
  }

  async create(project: ProjectItem): Promise<ProjectItem> {
    return this.request<ProjectItem>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  async update(project: ProjectItem): Promise<ProjectItem> {
    return this.request<ProjectItem>(`/projects/${project.id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  }

  async delete(id: string): Promise<void> {
    await this.request<{ ok: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Project API error (${response.status}): ${message}`);
    }

    return (await response.json()) as T;
  }
}

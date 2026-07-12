import { Injectable } from '@angular/core';
import type { AreaItem } from './kanban-board-areas.component';

@Injectable({ providedIn: 'root' })
export class AreaService {
  private readonly baseUrl = 'http://localhost:3000';

  async getAll(): Promise<AreaItem[]> {
    return this.request<AreaItem[]>('/areas');
  }

  async create(area: AreaItem): Promise<AreaItem> {
    return this.request<AreaItem>('/areas', {
      method: 'POST',
      body: JSON.stringify(area),
    });
  }

  async update(area: AreaItem): Promise<AreaItem> {
    return this.request<AreaItem>(`/areas/${area.id}`, {
      method: 'PUT',
      body: JSON.stringify(area),
    });
  }

  async delete(id: string): Promise<void> {
    await this.request<{ ok: boolean }>(`/areas/${id}`, {
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
      throw new Error(`Area API error (${response.status}): ${message}`);
    }

    return (await response.json()) as T;
  }
}

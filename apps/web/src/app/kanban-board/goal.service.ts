import { Injectable } from '@angular/core';
import type { GoalItem } from './kanban-board-goals.component';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly baseUrl = 'http://localhost:3000';

  async getAll(): Promise<GoalItem[]> {
    return this.request<GoalItem[]>('/goals');
  }

  async create(goal: GoalItem): Promise<GoalItem> {
    return this.request<GoalItem>('/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  }

  async update(goal: GoalItem): Promise<GoalItem> {
    return this.request<GoalItem>(`/goals/${goal.id}`, {
      method: 'PUT',
      body: JSON.stringify(goal),
    });
  }

  async delete(id: string): Promise<void> {
    await this.request<{ ok: boolean }>(`/goals/${id}`, {
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
      throw new Error(`Goal API error (${response.status}): ${message}`);
    }

    return (await response.json()) as T;
  }
}

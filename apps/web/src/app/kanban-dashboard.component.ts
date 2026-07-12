import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoardTaskComponent } from './features/kanban/task/kanban-board-task.component';
import { KanbanBoardProjectsComponent } from './features/kanban/projects/kanban-board-projects.component';
import { KanbanBoardGoalsComponent } from './features/kanban/goals/kanban-board-goals.component';
import { KanbanBoardAreasComponent } from './features/kanban/areas/kanban-board-areas.component';

@Component({
  selector: 'app-kanban-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    KanbanBoardTaskComponent,
    KanbanBoardProjectsComponent,
    KanbanBoardGoalsComponent,
    KanbanBoardAreasComponent,
  ],
  template: `
    <div class="min-h-screen w-screen bg-[#191919] flex flex-col overflow-y-auto overflow-x-hidden gap-8 pb-12">
      <app-kanban-board-task></app-kanban-board-task>
      <app-kanban-board-projects></app-kanban-board-projects>
      <app-kanban-board-goals></app-kanban-board-goals>
      <app-kanban-board-areas></app-kanban-board-areas>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        width: 100vw;
      }
    `,
  ],
})
export class KanbanDashboardComponent {}

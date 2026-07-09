import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoardTaskComponent } from './kanban-board/kanban-board-task.component';
import { KanbanBoardProjectsComponent } from './kanban-board/kanban-board-projects.component';

@Component({
  selector: 'app-kanban-dashboard',
  standalone: true,
  imports: [CommonModule, KanbanBoardTaskComponent, KanbanBoardProjectsComponent],
  template: `
    <div class="min-h-screen w-screen bg-[#191919] flex flex-col overflow-y-auto overflow-x-hidden">
      <app-kanban-board-task></app-kanban-board-task>
      <!-- Separator -->
      <!-- Bug: este separador puede estar creando un scroll horizontal extraño en la app -->
      <div class="w-full h-2 bg-neutral-800/50"></div>
      <app-kanban-board-projects></app-kanban-board-projects>
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

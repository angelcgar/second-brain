import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

export type TaskStatus = 'inbox' | 'esperando' | 'sin_fecha' | 'en_proceso';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface Column {
  id: TaskStatus;
  title: string;
  tasks: Task[];
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="h-screen w-screen bg-[#191919] text-white overflow-x-auto">
      <div class="flex flex-row gap-4 p-6 h-full min-w-max">
        <div
          *ngFor="let column of columns"
          cdkDropListGroup
          class="flex flex-col w-72 flex-shrink-0 bg-[#232323] rounded-xl p-3"
        >
          <div class="flex justify-between items-center mb-4 px-1">
            <h2 class="text-base font-semibold text-gray-200">{{ column.title }}</h2>
            <span class="text-sm text-gray-500">{{ column.tasks.length }}</span>
          </div>

          <div
            cdkDropList
            [cdkDropListData]="column.tasks"
            [id]="column.id"
            class="flex flex-col gap-3 flex-1 min-h-[200px]"
            (cdkDropListDropped)="onDrop($event, column.id)"
          >
            @for (task of column.tasks; track task.id) {
              <div
                cdkDrag
                [cdkDragData]="task"
                class="bg-[#2d2d2d] rounded-lg p-4 cursor-grab active:cursor-grabbing
                       hover:bg-[#353535] hover:shadow-lg hover:shadow-black/20
                       transition-all duration-150 border border-transparent hover:border-[#404040]"
              >
                <p class="text-sm text-gray-300 leading-relaxed">{{ task.title }}</p>
                <div cdkDragPlaceholder class="bg-[#3a3a3a] rounded-lg h-16"></div>
              </div>
            }
          </div>

          <button
            (click)="addTask(column.id)"
            class="mt-4 w-full py-2 px-3 rounded-lg text-sm text-gray-400
                   hover:bg-[#2d2d2d] hover:text-gray-200
                   border border-dashed border-[#3a3a3a] hover:border-[#505050]
                   transition-all duration-150"
          >
            + Nueva tarea
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }

    .cdk-drag-preview {
      background: #3d3d3d;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      padding: 16px;
    }

    .cdk-drag-animating {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }

    .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class KanbanBoardComponent implements OnInit {
  columns: Column[] = [
    { id: 'inbox', title: 'Inbox', tasks: [] },
    { id: 'esperando', title: 'Esperando', tasks: [] },
    { id: 'sin_fecha', title: 'Sin fecha', tasks: [] },
    { id: 'en_proceso', title: 'En proceso', tasks: [] }
  ];

  private taskCounter = 0;

  ngOnInit(): void {
    this.columns[0].tasks = [
      { id: this.generateId(), title: 'Revisar correos nuevos', status: 'inbox' },
      { id: this.generateId(), title: 'Actualizar documentación del proyecto', status: 'inbox' },
      { id: this.generateId(), title: 'Preparar presentación del sprint', status: 'inbox' }
    ];

    this.columns[1].tasks = [
      { id: this.generateId(), title: 'Esperando feedback del cliente', status: 'esperando' },
      { id: this.generateId(), title: 'Aprobación de diseño', status: 'esperando' }
    ];

    this.columns[2].tasks = [
      { id: this.generateId(), title: 'Investigar nuevas tecnologías', status: 'sin_fecha' },
      { id: this.generateId(), title: 'Leer artículos de arquitectura', status: 'sin_fecha' },
      { id: this.generateId(), title: 'Explorar features de Angular 22', status: 'sin_fecha' }
    ];

    this.columns[3].tasks = [
      { id: this.generateId(), title: 'Implementar autenticación', status: 'en_proceso' },
      { id: this.generateId(), title: 'Review de pull requests', status: 'en_proceso' }
    ];
  }

  onDrop(event: CdkDragDrop<Task[]>, targetColumnId: TaskStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const task = event.previousContainer.data[event.previousIndex];
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      task.status = targetColumnId;
    }
  }

  addTask(columnId: TaskStatus): void {
    this.taskCounter++;
    const newTask: Task = {
      id: this.generateId(),
      title: `Nueva tarea ${this.taskCounter}`,
      status: columnId
    };

    const column = this.columns.find(c => c.id === columnId);
    if (column) {
      column.tasks.push(newTask);
    }
  }

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
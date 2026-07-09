import {
  Component,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

export type TaskStatus = 'inbox' | 'esperando' | 'sin_fecha' | 'en_proceso';

export type Priority = 'Baja' | 'Media' | 'Alta' | 'Urgente';

export interface Task {
  // Mandatory fields
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
  edited: string;

  // Optional fields
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

interface FilterPill {
  label: string;
  key: string;
}

@Component({
  selector: 'app-kanban-board-task',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Root layout -->
    <div class="flex flex-col h-screen bg-[#191919] text-white overflow-hidden">

      <!-- ─── HEADER ─────────────────────────────────────────────── -->
      <header class="flex-shrink-0 px-6 pt-6 pb-4">
        <h1 class="text-2xl font-bold text-white mb-4 tracking-tight">Tareas</h1>

        <!-- Filter pills -->
        <div class="flex flex-wrap gap-2">
          @for (pill of filterPills; track pill.key) {
            <button
              [class]="'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ' +
                (activePill() === pill.key
                  ? 'bg-white/20 text-white shadow-inner'
                  : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700 hover:text-gray-200')"
              (click)="activePill.set(pill.key)"
            >
              {{ pill.label }}
            </button>
          }
        </div>
      </header>

      <!-- ─── KANBAN BOARD ───────────────────────────────────────── -->
      <main class="flex-1 overflow-x-auto overflow-y-hidden">
        <div
          cdkDropListGroup
          class="flex gap-4 px-6 pb-6 h-full items-start"
          style="width: max-content; min-width: 100%;"
        >
          @for (column of columns; track column.id) {
            <div class="flex flex-col w-72 flex-shrink-0 bg-neutral-900 rounded-xl p-3 max-h-full">

              <!-- Column header -->
              <div class="flex justify-between items-center mb-3 px-1">
                <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  {{ column.title }}
                </h2>
                <span class="text-xs text-gray-600 bg-neutral-800 rounded-full px-2 py-0.5">
                  {{ column.tasks.length }}
                </span>
              </div>

              <!-- Drop list -->
              <div
                cdkDropList
                [cdkDropListData]="column.tasks"
                [id]="column.id"
                (cdkDropListDropped)="onDrop($event, column.id)"
                class="flex flex-col gap-2 flex-1 overflow-y-auto min-h-[80px] pr-0.5"
              >
                @for (task of column.tasks; track task.id) {
                  <div
                    cdkDrag
                    [cdkDragData]="task"
                    (cdkDragStarted)="onDragStarted()"
                    (cdkDragEnded)="onDragEnded()"
                    (click)="onTaskClick(task)"
                    class="task-card bg-neutral-800 rounded-lg p-3 cursor-pointer select-none
                           border border-transparent
                           hover:bg-neutral-750 hover:border-neutral-600
                           transition-all duration-150 group"
                  >
                    <!-- Drag handle indicator -->
                    <div class="flex items-start gap-2">
                      <div class="flex flex-col gap-[3px] mt-1 opacity-0 group-hover:opacity-40 transition-opacity duration-150 flex-shrink-0">
                        <span class="block w-[14px] h-[2px] rounded bg-gray-400"></span>
                        <span class="block w-[14px] h-[2px] rounded bg-gray-400"></span>
                        <span class="block w-[14px] h-[2px] rounded bg-gray-400"></span>
                      </div>
                      <p class="text-sm text-gray-300 leading-relaxed flex-1">{{ task.title }}</p>
                    </div>

                    <!-- Status badge -->
                    <div class="mt-2 flex">
                      <span [class]="getStatusBadgeClass(task.status)">
                        {{ getStatusLabel(task.status) }}
                      </span>
                    </div>

                    <!-- CDK Drag Preview -->
                    <div *cdkDragPreview class="drag-preview bg-neutral-700 rounded-lg p-3 w-72 shadow-2xl shadow-black/60 border border-neutral-600">
                      <p class="text-sm text-gray-200">{{ task.title }}</p>
                    </div>

                    <!-- CDK Drag Placeholder -->
                    <div *cdkDragPlaceholder class="drag-placeholder bg-neutral-800/40 rounded-lg border-2 border-dashed border-neutral-600 h-16"></div>
                  </div>
                }
              </div>

              <!-- Add task button -->
              <button
                (click)="addTask(column.id)"
                class="mt-3 w-full py-2 px-3 rounded-lg text-sm text-gray-500
                       hover:bg-neutral-800 hover:text-gray-300
                       border border-dashed border-neutral-700 hover:border-neutral-500
                       transition-all duration-150 flex items-center justify-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Nueva tarea
              </button>
            </div>
          }
        </div>
      </main>
    </div>

    <!-- ─── DIALOG ─────────────────────────────────────────────────── -->
    @if (selectedTask()) {
      <!-- Overlay -->
      <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        (click)="closeDialog()"
        role="dialog"
        aria-modal="true"
      >
        <!-- Card (stop propagation so clicks inside don't close) -->
        <div
          class="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-xl shadow-2xl shadow-black/80
                 max-h-[90vh] overflow-y-auto flex flex-col gap-4 animate-dialog-in"
          (click)="$event.stopPropagation()"
        >
          <!-- Top metadata row (ID, status badge, dates) -->
          <div class="flex items-center justify-between text-xs text-neutral-500 border-b border-neutral-800 pb-3">
            <div class="flex items-center gap-2">
              <span class="font-mono text-neutral-600">ID: {{ selectedTask()!.id }}</span>
              <span class="w-1.5 h-1.5 rounded-full" [class]="getStatusDotClass(selectedTask()!.status)"></span>
              <span class="font-medium text-neutral-400">{{ getStatusLabel(selectedTask()!.status) }}</span>
            </div>
            <button
              (click)="closeDialog()"
              class="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-250 hover:bg-neutral-800 transition-all duration-150"
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Title Input (Principal Grande) -->
          <div class="mt-1">
            <input
              type="text"
              [ngModel]="selectedTask()?.title"
              (ngModelChange)="updateField('title', $event)"
              placeholder="Sin título"
              class="w-full bg-transparent text-2xl font-bold text-white placeholder-neutral-700 border-none outline-none focus:ring-0 focus:outline-none p-0"
            />
          </div>

          <!-- Properties Grid -->
          <div class="flex flex-col gap-3 py-3 border-y border-neutral-800/65">
            <!-- Prioridad -->
            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Prioridad</span>
              <select
                [ngModel]="selectedTask()?.prioridad"
                (ngModelChange)="updateField('prioridad', $event)"
                class="bg-transparent text-sm text-neutral-200 border border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full cursor-pointer"
              >
                <option value="" class="bg-neutral-900 text-neutral-500">Sin prioridad</option>
                <option value="Baja" class="bg-neutral-900 text-neutral-300">Baja</option>
                <option value="Media" class="bg-neutral-900 text-neutral-300">Media</option>
                <option value="Alta" class="bg-neutral-900 text-neutral-300">Alta</option>
                <option value="Urgente" class="bg-neutral-900 text-neutral-300">Urgente</option>
              </select>
            </div>

            <!-- Fecha -->
            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Fecha</span>
              <input
                type="date"
                [ngModel]="selectedTask()?.fecha"
                (ngModelChange)="updateField('fecha', $event)"
                class="bg-transparent text-sm text-neutral-200 border border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <!-- Proyecto -->
            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Proyecto</span>
              <input
                type="text"
                [ngModel]="selectedTask()?.proyecto"
                (ngModelChange)="updateField('proyecto', $event)"
                placeholder="Vacío"
                class="bg-transparent text-sm text-neutral-200 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <!-- Área -->
            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Área</span>
              <input
                type="text"
                [ngModel]="selectedTask()?.area"
                (ngModelChange)="updateField('area', $event)"
                placeholder="Vacío"
                class="bg-transparent text-sm text-neutral-200 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <!-- Objetivo -->
            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Objetivo</span>
              <input
                type="text"
                [ngModel]="selectedTask()?.objetivo"
                (ngModelChange)="updateField('objetivo', $event)"
                placeholder="Vacío"
                class="bg-transparent text-sm text-neutral-200 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <!-- Contexto -->
            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Contexto</span>
              <input
                type="text"
                [ngModel]="selectedTask()?.contexto"
                (ngModelChange)="updateField('contexto', $event)"
                placeholder="Vacío"
                class="bg-transparent text-sm text-neutral-200 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <!-- URL -->
            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">URL</span>
              <input
                type="text"
                [ngModel]="selectedTask()?.url"
                (ngModelChange)="updateField('url', $event)"
                placeholder="Vacío"
                class="bg-transparent text-sm text-neutral-200 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full font-mono"
              />
            </div>
          </div>

          <!-- Descripción -->
          <div class="flex flex-col gap-1.5">
            <span class="text-xs text-neutral-500 font-medium">Descripción</span>
            <textarea
              [ngModel]="selectedTask()?.descripcion"
              (ngModelChange)="updateField('descripcion', $event)"
              placeholder="Escribe para añadir detalles sobre esta tarea..."
              rows="6"
              class="w-full bg-transparent text-sm text-neutral-205 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded-lg p-2 outline-none resize-y transition-colors leading-relaxed"
            ></textarea>
          </div>

          <!-- Bottom dates and actions -->
          <div class="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-600">
            <div class="flex flex-col gap-0.5">
              <span>Creado: {{ formatDate(selectedTask()!.created_at) }}</span>
              <span>Editado: {{ formatDate(selectedTask()!.edited) }}</span>
            </div>
            <button
              (click)="closeDialog()"
              class="px-4 py-2 rounded-lg text-xs font-semibold bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all duration-150"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }

    /* ── CDK Drag ─────────────────────────── */

    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 8px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      opacity: 0.95;
    }

    .cdk-drag-animating {
      transition: transform 150ms cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
      transition: transform 150ms cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .cdk-drag-placeholder {
      opacity: 1;
    }

    /* Prevent placeholder from collapsing */
    .cdk-drop-list-dragging .drag-placeholder {
      display: block;
    }

    /* ── Card hover tweak ─────────────────── */

    .task-card:hover {
      background-color: #2a2a2a;
    }

    /* ── Dialog animation ─────────────────── */

    @keyframes dialogIn {
      from {
        opacity: 0;
        transform: scale(0.96) translateY(8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .animate-dialog-in {
      animation: dialogIn 150ms cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
    }

    /* ── Scrollbar styling ────────────────── */

    ::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: #3a3a3a;
      border-radius: 99px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #505050;
    }
  `],
})
export class KanbanBoardTaskComponent implements OnInit {
  // ── State ──────────────────────────────────────────────────────────
  columns: Column[] = [
    { id: 'inbox', title: 'Inbox', tasks: [] },
    { id: 'esperando', title: 'Esperando', tasks: [] },
    { id: 'sin_fecha', title: 'Sin fecha', tasks: [] },
    { id: 'en_proceso', title: 'En proceso', tasks: [] },
  ];

  selectedTask = signal<Task | null>(null);
  activePill = signal<string>('todas');

  filterPills: FilterPill[] = [
    { label: 'Hoy', key: 'hoy' },
    { label: 'Proceso', key: 'proceso' },
    { label: 'Siguiente Paso', key: 'siguiente_paso' },
    { label: 'Esperando', key: 'esperando' },
    { label: 'Todas', key: 'todas' },
    { label: 'Logbook', key: 'logbook' },
    { label: 'Pronto', key: 'pronto' },
  ];

  /** Flag to differentiate drag from click */
  private isDragging = false;
  private taskCounter = 0;

  // ── Lifecycle ──────────────────────────────────────────────────────
  ngOnInit(): void {
    const now = new Date().toISOString();
    this.columns[0].tasks = [
      { id: this.generateId(), title: 'Revisar correos nuevos', status: 'inbox', created_at: now, edited: now },
      { id: this.generateId(), title: 'Actualizar documentación del proyecto', status: 'inbox', created_at: now, edited: now },
      { id: this.generateId(), title: 'Preparar presentación del sprint', status: 'inbox', created_at: now, edited: now },
    ];

    this.columns[1].tasks = [
      { id: this.generateId(), title: 'Esperando feedback del cliente', status: 'esperando', created_at: now, edited: now },
      { id: this.generateId(), title: 'Aprobación de diseño UI', status: 'esperando', created_at: now, edited: now },
    ];

    this.columns[2].tasks = [
      { id: this.generateId(), title: 'Investigar nuevas tecnologías', status: 'sin_fecha', created_at: now, edited: now },
      { id: this.generateId(), title: 'Leer artículos de arquitectura', status: 'sin_fecha', created_at: now, edited: now },
      { id: this.generateId(), title: 'Explorar features de Angular 22', status: 'sin_fecha', created_at: now, edited: now },
    ];

    this.columns[3].tasks = [
      { id: this.generateId(), title: 'Implementar autenticación', status: 'en_proceso', created_at: now, edited: now },
      { id: this.generateId(), title: 'Review de pull requests', status: 'en_proceso', created_at: now, edited: now },
    ];
  }

  // ── Drag & Drop ────────────────────────────────────────────────────
  onDragStarted(): void {
    this.isDragging = true;
  }

  onDragEnded(): void {
    // Use setTimeout to let the click event fire first (if any), then reset
    setTimeout(() => {
      this.isDragging = false;
    }, 50);
  }

  onDrop(event: CdkDragDrop<Task[]>, targetColumnId: TaskStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      // Update status and edited date of moved task
      const task = event.container.data[event.currentIndex];
      task.status = targetColumnId;
      task.edited = new Date().toISOString();
    }
  }

  // ── Click vs Drag ──────────────────────────────────────────────────
  onTaskClick(task: Task): void {
    if (this.isDragging) return;
    this.selectedTask.set(task);
  }

  // ── Dialog ─────────────────────────────────────────────────────────
  closeDialog(): void {
    this.selectedTask.set(null);
  }

  // ── Add Task ───────────────────────────────────────────────────────
  addTask(columnId: TaskStatus): void {
    this.taskCounter++;
    const column = this.columns.find((c) => c.id === columnId);
    if (column) {
      const now = new Date().toISOString();
      column.tasks.push({
        id: this.generateId(),
        title: `Nueva tarea ${this.taskCounter}`,
        status: columnId,
        created_at: now,
        edited: now,
      });
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────
  updateField(field: keyof Task, value: any): void {
    const task = this.selectedTask();
    if (task) {
      (task as any)[field] = value === '' ? undefined : value;
      task.edited = new Date().toISOString();
      this.selectedTask.set({ ...task });

      // Update the task in memory list to keep board in sync
      for (const col of this.columns) {
        const index = col.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          col.tasks[index] = { ...task };
          break;
        }
      }
    }
  }

  formatDate(isoString?: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  }

  getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      inbox: 'Inbox',
      esperando: 'Esperando',
      sin_fecha: 'Sin fecha',
      en_proceso: 'En proceso',
    };
    return labels[status];
  }

  getStatusBadgeClass(status: TaskStatus): string {
    const base = 'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider';
    const variants: Record<TaskStatus, string> = {
      inbox: `${base} bg-blue-950/60 text-blue-400`,
      esperando: `${base} bg-yellow-950/60 text-yellow-400`,
      sin_fecha: `${base} bg-neutral-700/80 text-gray-400`,
      en_proceso: `${base} bg-green-950/60 text-green-400`,
    };
    return variants[status];
  }

  getStatusDotClass(status: TaskStatus): string {
    const dots: Record<TaskStatus, string> = {
      inbox: 'bg-blue-400',
      esperando: 'bg-yellow-400',
      sin_fecha: 'bg-gray-500',
      en_proceso: 'bg-green-400',
    };
    return dots[status];
  }

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { TaskService } from './task.service';

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

type EditableTaskField =
  | 'title'
  | 'fecha'
  | 'objetivo'
  | 'proyecto'
  | 'contexto'
  | 'prioridad'
  | 'descripcion'
  | 'url'
  | 'area';

@Component({
  selector: 'app-kanban-board-task',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Root layout -->
    <div class="flex flex-col bg-[#191919] text-white">

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
      <main class="flex-1 overflow-x-auto">
        <div
          cdkDropListGroup
          class="flex gap-4 px-6 pb-6 items-start"
          style="width: max-content; min-width: 100%;"
        >
          @for (column of columns; track column.id) {
            <div class="flex flex-col w-72 flex-shrink-0 bg-neutral-900 rounded-xl p-3">

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
    @if (editingTask) {
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
              <span class="font-mono text-neutral-600">ID: {{ editingTask!.id }}</span>
              <span class="w-1.5 h-1.5 rounded-full" [class]="getStatusDotClass(editingTask!.status)"></span>
              <span class="font-medium text-neutral-400">{{ getStatusLabel(editingTask!.status) }}</span>
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
              [ngModel]="editingTask?.title"
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
                [ngModel]="editingTask?.prioridad"
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
                [ngModel]="editingTask?.fecha"
                (ngModelChange)="updateField('fecha', $event)"
                class="bg-transparent text-sm text-neutral-200 border border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <!-- Proyecto -->
            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Proyecto</span>
              <input
                type="text"
                [ngModel]="editingTask?.proyecto"
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
                [ngModel]="editingTask?.area"
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
                [ngModel]="editingTask?.objetivo"
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
                [ngModel]="editingTask?.contexto"
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
                [ngModel]="editingTask?.url"
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
              [ngModel]="editingTask?.descripcion"
              (ngModelChange)="updateField('descripcion', $event)"
              placeholder="Escribe para añadir detalles sobre esta tarea..."
              rows="6"
              class="w-full bg-transparent text-sm text-neutral-205 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded-lg p-2 outline-none resize-y transition-colors leading-relaxed"
            ></textarea>
          </div>

          <!-- Bottom dates and actions -->
          <div class="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-600">
            <div class="flex flex-col gap-0.5">
              <span>Creado: {{ formatDate(editingTask?.created_at) }}</span>
              <span>Editado: {{ formatDate(editingTask?.edited) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                (click)="deleteSelectedTask()"
                class="px-4 py-2 rounded-lg text-xs font-semibold bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-red-100 transition-all duration-150"
              >
                Eliminar
              </button>
              <button
                (click)="closeDialog()"
                class="px-4 py-2 rounded-lg text-xs font-semibold bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all duration-150"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
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
  private readonly taskService = inject(TaskService);
  private readonly cdr = inject(ChangeDetectorRef);

  // ── State ──────────────────────────────────────────────────────────
  columns: Column[] = [
    { id: 'inbox', title: 'Inbox', tasks: [] },
    { id: 'esperando', title: 'Esperando', tasks: [] },
    { id: 'sin_fecha', title: 'Sin fecha', tasks: [] },
    { id: 'en_proceso', title: 'En proceso', tasks: [] },
  ];

  selectedTask = signal<Task | null>(null);
  editingTask: Task | null = null;
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
    void this.loadTasks();
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
      const task = event.container.data[event.currentIndex];
      task.edited = new Date().toISOString();
      void this.persistTask(task);
      return;
    }

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
    void this.persistTask(task);
  }

  // ── Click vs Drag ──────────────────────────────────────────────────
  onTaskClick(task: Task): void {
    if (this.isDragging) return;
    this.selectedTask.set(task);
    this.editingTask = { ...task };
  }

  // ── Dialog ─────────────────────────────────────────────────────────
  closeDialog(): void {
    if (this.editingTask) {
      void this.persistTask(this.editingTask);
    }
    this.selectedTask.set(null);
    this.editingTask = null;
  }

  // ── Add Task ───────────────────────────────────────────────────────
  addTask(columnId: TaskStatus): void {
    this.taskCounter++;
    const column = this.columns.find((c) => c.id === columnId);
    if (column) {
      const now = new Date().toISOString();
      const newTask: Task = {
        id: this.generateId(),
        title: `Nueva tarea ${this.taskCounter}`,
        status: columnId,
        created_at: now,
        edited: now,
      };
      column.tasks.push(newTask);
      void this.createTask(newTask);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────
  updateField(field: EditableTaskField, value: string): void {
    if (!this.editingTask) return;

    if (field === 'title') {
      this.editingTask.title = value;
    } else if (field === 'prioridad') {
      this.editingTask.prioridad = this.parsePriority(value);
    } else {
      (this.editingTask as unknown as Record<string, unknown>)[field] = value === '' ? undefined : value;
    }
    this.editingTask.edited = new Date().toISOString();
  }

  async deleteSelectedTask(): Promise<void> {
    const task = this.selectedTask();
    if (!task) return;

    for (const col of this.columns) {
      const index = col.tasks.findIndex((currentTask) => currentTask.id === task.id);
      if (index !== -1) {
        col.tasks.splice(index, 1);
        break;
      }
    }

    this.selectedTask.set(null);
    try {
      await this.taskService.deleteTask(task.id);
    } catch (error) {
      console.error('No se pudo eliminar la tarea', error);
      await this.loadTasks();
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

  private parsePriority(value: string): Priority | undefined {
    if (value === 'Baja' || value === 'Media' || value === 'Alta' || value === 'Urgente') {
      return value;
    }
    return undefined;
  }

  private async loadTasks(): Promise<void> {
    try {
      const tasks = await this.taskService.getTasks();
      this.populateColumns(tasks);
      this.cdr.detectChanges();
      this.taskCounter = tasks.length;
    } catch (error) {
      console.error('No se pudieron cargar las tareas', error);
      this.populateColumns([]);
      this.cdr.detectChanges();
    }
  }

  private populateColumns(tasks: Task[]): void {
    const nextColumns: Column[] = [
      { id: 'inbox', title: 'Inbox', tasks: [] },
      { id: 'esperando', title: 'Esperando', tasks: [] },
      { id: 'sin_fecha', title: 'Sin fecha', tasks: [] },
      { id: 'en_proceso', title: 'En proceso', tasks: [] },
    ];

    for (const task of tasks) {
      const column = nextColumns.find((currentColumn) => currentColumn.id === task.status);
      if (column) {
        column.tasks.push(task);
      }
    }

    this.columns = nextColumns;
  }

  private async createTask(task: Task): Promise<void> {
    try {
      const createdTask = await this.taskService.createTask(task);
      this.replaceTask(createdTask);
      const selectedTask = this.selectedTask();
      if (selectedTask?.id === createdTask.id) {
        this.selectedTask.set({ ...createdTask });
      }
    } catch (error) {
      console.error('No se pudo crear la tarea', error);
      await this.loadTasks();
    }
  }

  private async persistTask(task: Task): Promise<void> {
    try {
      const updatedTask = await this.taskService.updateTask(task);
      this.replaceTask(updatedTask);
    } catch (error) {
      console.error('No se pudo actualizar la tarea', error);
    }
  }

  private replaceTask(nextTask: Task): void {
    for (const col of this.columns) {
      const index = col.tasks.findIndex((currentTask) => currentTask.id === nextTask.id);
      if (index !== -1) {
        col.tasks[index] = { ...nextTask };
        return;
      }
    }
  }
}

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
import { TaskService } from '../../../core/services/task.service';
import type { Column, Priority, Task, TaskStatus } from '../../../shared/models';

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

interface FilterPill {
  label: string;
  key: string;
}

@Component({
  selector: 'app-kanban-board-task',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kanban-board-task.component.html',
  styleUrls: ['./kanban-board-task.component.css'],
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
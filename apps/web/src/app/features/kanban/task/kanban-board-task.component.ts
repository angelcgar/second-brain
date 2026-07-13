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
import { forkJoin } from 'rxjs';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { TaskService } from '../../../core/services/task.service';
import { AreaService } from '../../../core/services/area.service';
import { ProjectService } from '../../../core/services/project.service';
import { GoalService } from '../../../core/services/goal.service';
import type {
  AreaItem,
  Column,
  GoalItem,
  Priority,
  ProjectItem,
  Task,
  TaskStatus,
} from '../../../shared/models';

type EditableTaskField =
  | 'title'
  | 'status'
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
  private readonly areaService = inject(AreaService);
  private readonly projectService = inject(ProjectService);
  private readonly goalService = inject(GoalService);
  private readonly cdr = inject(ChangeDetectorRef);

  // ── State ──────────────────────────────────────────────────────────
  columns: Column[] = [
    { id: 'inbox', title: 'Inbox', tasks: [] },
    { id: 'esperando', title: 'Esperando', tasks: [] },
    { id: 'sin_fecha', title: 'Sin fecha', tasks: [] },
    { id: 'en_proceso', title: 'En proceso', tasks: [] },
  ];

  areas: AreaItem[] = [];
  projects: ProjectItem[] = [];
  goals: GoalItem[] = [];

  selectedTask = signal<Task | null>(null);
  editingTask: Task | null = null;
  activePill = signal<string>('todas');

  inlineEditingId = signal<string | null>(null);
  inlineDraft = signal<string>('');

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
  private items: Task[] = [];

  // ── Lifecycle ──────────────────────────────────────────────────────
  ngOnInit(): void {
    void this.loadTasks();
    forkJoin({
      areas: this.areaService.getAll(),
      projects: this.projectService.getAll(),
      goals: this.goalService.getAll(),
    }).subscribe(({ areas, projects, goals }) => {
      this.areas = areas.filter((a) => !a.archivado);
      this.projects = projects.filter((p) => !p.archivo);
      this.goals = goals.filter((g) => !g.archivado);
      this.cdr.detectChanges();
    });
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
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
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

  // ── Inline title edit ──────────────────────────────────────────────
  startInlineEdit(task: Task, event: MouseEvent): void {
    if (this.isDragging) return;
    event.stopPropagation();
    this.inlineEditingId.set(task.id);
    this.inlineDraft.set(task.title);
  }

  onInlineFocus(event: FocusEvent): void {
    const el = event.target as HTMLInputElement;
    el.select();
  }

  saveInlineEdit(task: Task): void {
    const draft = this.inlineDraft().trim();
    this.inlineEditingId.set(null);
    this.inlineDraft.set('');
    if (!draft || draft === task.title) return;
    const updated: Task = { ...task, title: draft, edited: new Date().toISOString() };
    void this.persistTask(updated);
  }

  cancelInlineEdit(): void {
    this.inlineEditingId.set(null);
    this.inlineDraft.set('');
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
    const now = new Date().toISOString();
    const newTask: Task = {
      id: this.generateId(),
      title: `Nueva tarea ${this.taskCounter}`,
      status: columnId,
      created_at: now,
      edited: now,
    };
    void this.createTask(newTask);
  }

  // ── Helpers ────────────────────────────────────────────────────────
  updateField(field: EditableTaskField, value: string): void {
    if (!this.editingTask) return;

    const next: Task = { ...this.editingTask };

    if (field === 'title') {
      next.title = value;
    } else if (field === 'status') {
      next.status = value as TaskStatus;
    } else if (field === 'prioridad') {
      next.prioridad = this.parsePriority(value);
    } else {
      (next as unknown as Record<string, unknown>)[field] =
        value === '' ? undefined : value;
    }
    next.edited = new Date().toISOString();

    this.editingTask = next;
  }

  async deleteSelectedTask(): Promise<void> {
    const task = this.selectedTask();
    if (!task) return;

    this.items = this.items.filter((t) => t.id !== task.id);
    this.buildColumnsFromItems(this.items);
    this.cdr.detectChanges();

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
        minute: '2-digit',
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
      completado: 'Completado',
      delegada: 'Delegada',
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
      completado: `${base} bg-emerald-950/60 text-emerald-400`,
      delegada: `${base} bg-purple-950/60 text-purple-400`,
    };
    return variants[status];
  }

  getStatusDotClass(status: TaskStatus): string {
    const dots: Record<TaskStatus, string> = {
      inbox: 'bg-blue-400',
      esperando: 'bg-yellow-400',
      sin_fecha: 'bg-gray-500',
      en_proceso: 'bg-green-400',
      completado: 'bg-emerald-400',
      delegada: 'bg-purple-400',
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
      this.items = tasks;
      this.buildColumnsFromItems(this.items);
      this.cdr.detectChanges();
      this.taskCounter = tasks.length;
    } catch (error) {
      console.error('No se pudieron cargar las tareas', error);
      this.items = [];
      this.buildColumnsFromItems([]);
      this.cdr.detectChanges();
    }
  }

  private buildColumnsFromItems(tasks: Task[]): void {
    const nextColumns: Column[] = [
      { id: 'inbox', title: 'Inbox', tasks: [] },
      { id: 'esperando', title: 'Esperando', tasks: [] },
      { id: 'sin_fecha', title: 'Sin fecha', tasks: [] },
      { id: 'en_proceso', title: 'En proceso', tasks: [] },
    ];

    for (const task of tasks) {
      if (task.status === 'completado') continue;
      const column = nextColumns.find((col) => col.id === task.status);
      if (column) {
        column.tasks.push(task);
      }
    }

    this.columns = nextColumns;
  }

  private async createTask(task: Task): Promise<void> {
    try {
      const createdTask = await this.taskService.createTask(task);
      this.items = [...this.items, createdTask];
      this.buildColumnsFromItems(this.items);
      this.cdr.detectChanges();
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
      this.items = this.items.map((item) => (item.id === updatedTask.id ? updatedTask : item));
      this.buildColumnsFromItems(this.items);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('No se pudo actualizar la tarea', error);
    }
  }
}

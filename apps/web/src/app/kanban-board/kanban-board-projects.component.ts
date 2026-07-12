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
import { ProjectService } from './project.service';

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed';
export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ProjectItem {
  id: string;
  title: string;
  status: ProjectStatus;
  created_at: string;
  edited: string;
  area?: string;
  parentProject?: string;
  timeline?: string;
  prioridad?: ProjectPriority;
  archivo?: boolean;
  startDate?: string;
  goalArea?: string;
}

export interface ProjectColumn {
  id: ProjectStatus;
  title: string;
  projects: ProjectItem[];
}

interface FilterPill {
  label: string;
  key: string;
}

type EditableProjectField =
  | 'title'
  | 'area'
  | 'parentProject'
  | 'timeline'
  | 'prioridad'
  | 'archivo'
  | 'startDate'
  | 'goalArea';

@Component({
  selector: 'app-kanban-board-projects',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col bg-[#191919] text-white">
      <header class="flex-shrink-0 px-6 pt-6 pb-4">
        <h1 class="text-2xl font-bold text-white tracking-tight">Proyectos</h1>
        <p class="text-sm text-gray-400 mb-4 mt-1">Gestión de proyectos</p>

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

      <main class="flex-1 overflow-x-auto">
        <div
          cdkDropListGroup
          class="flex gap-4 px-6 pb-6 items-start"
          style="width: max-content; min-width: 100%;"
        >
          @for (column of columns; track column.id) {
            <div class="flex flex-col w-72 flex-shrink-0 bg-neutral-900 rounded-xl p-3">
              <div class="flex justify-between items-center mb-3 px-1">
                <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  {{ column.title }}
                </h2>
                <span class="text-xs text-gray-600 bg-neutral-800 rounded-full px-2 py-0.5">
                  {{ column.projects.length }}
                </span>
              </div>

              <div
                cdkDropList
                [cdkDropListData]="column.projects"
                [id]="column.id"
                (cdkDropListDropped)="onDrop($event, column.id)"
                class="flex flex-col gap-2 flex-1 overflow-y-auto min-h-[80px] pr-0.5"
              >
                @for (project of column.projects; track project.id) {
                  <div
                    cdkDrag
                    [cdkDragData]="project"
                    (cdkDragStarted)="onDragStarted()"
                    (cdkDragEnded)="onDragEnded()"
                    (click)="onProjectClick(project)"
                    class="task-card bg-neutral-800 rounded-lg p-3 cursor-pointer select-none
                           border border-transparent
                           hover:bg-neutral-750 hover:border-neutral-600
                           transition-all duration-150 group"
                  >
                    <div class="flex items-start gap-2">
                      <div class="flex flex-col gap-[3px] mt-1 opacity-0 group-hover:opacity-40 transition-opacity duration-150 flex-shrink-0">
                        <span class="block w-[14px] h-[2px] rounded bg-gray-400"></span>
                        <span class="block w-[14px] h-[2px] rounded bg-gray-400"></span>
                        <span class="block w-[14px] h-[2px] rounded bg-gray-400"></span>
                      </div>
                      <p class="text-sm text-gray-300 leading-relaxed flex-1">{{ project.title }}</p>
                    </div>

                    <div class="mt-2 flex">
                      <span [class]="getStatusBadgeClass(project.status)">
                        {{ getStatusLabel(project.status) }}
                      </span>
                    </div>

                    <div *cdkDragPreview class="drag-preview bg-neutral-700 rounded-lg p-3 w-72 shadow-2xl shadow-black/60 border border-neutral-600">
                      <p class="text-sm text-gray-200">{{ project.title }}</p>
                    </div>

                    <div *cdkDragPlaceholder class="drag-placeholder bg-neutral-800/40 rounded-lg border-2 border-dashed border-neutral-600 h-16"></div>
                  </div>
                }
              </div>

              <button
                (click)="addProject(column.id)"
                class="mt-3 w-full py-2 px-3 rounded-lg text-sm text-gray-500
                       hover:bg-neutral-800 hover:text-gray-300
                       border border-dashed border-neutral-700 hover:border-neutral-500
                       transition-all duration-150 flex items-center justify-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Nuevo proyecto
              </button>
            </div>
          }
        </div>
      </main>
    </div>

    @if (editingProject) {
      <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        (click)="closeDialog()"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-xl shadow-2xl shadow-black/80
                 max-h-[90vh] overflow-y-auto flex flex-col gap-4 animate-dialog-in"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between text-xs text-neutral-500 border-b border-neutral-800 pb-3">
            <div class="flex items-center gap-2">
              <span class="font-mono text-neutral-600">ID: {{ editingProject!.id }}</span>
              <span class="w-1.5 h-1.5 rounded-full" [class]="getStatusDotClass(editingProject!.status)"></span>
              <span class="font-medium text-neutral-400">{{ getStatusLabel(editingProject!.status) }}</span>
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

          <div class="mt-1">
            <input
              type="text"
              [ngModel]="editingProject?.title"
              (ngModelChange)="updateField('title', $event)"
              placeholder="Sin título"
              class="w-full bg-transparent text-2xl font-bold text-white placeholder-neutral-700 border-none outline-none focus:ring-0 focus:outline-none p-0"
            />
          </div>

          <div class="flex flex-col gap-3 py-3 border-y border-neutral-800/65">
            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Status</span>
              <span class="text-sm text-neutral-200 px-2 py-1">{{ getStatusLabel(editingProject!.status) }}</span>
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Prioridad</span>
              <select
                [ngModel]="editingProject?.prioridad"
                (ngModelChange)="updateField('prioridad', $event)"
                class="bg-transparent text-sm text-neutral-200 border border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full cursor-pointer"
              >
                <option value="" class="bg-neutral-900 text-neutral-500">Sin prioridad</option>
                <option value="Low" class="bg-neutral-900 text-neutral-300">Low</option>
                <option value="Medium" class="bg-neutral-900 text-neutral-300">Medium</option>
                <option value="High" class="bg-neutral-900 text-neutral-300">High</option>
                <option value="Urgent" class="bg-neutral-900 text-neutral-300">Urgent</option>
              </select>
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Area</span>
              <input
                type="text"
                [ngModel]="editingProject?.area"
                (ngModelChange)="updateField('area', $event)"
                placeholder="Vacío"
                class="bg-transparent text-sm text-neutral-200 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Parent Project</span>
              <input
                type="text"
                [ngModel]="editingProject?.parentProject"
                (ngModelChange)="updateField('parentProject', $event)"
                placeholder="Vacío"
                class="bg-transparent text-sm text-neutral-200 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Timeline</span>
              <input
                type="text"
                [ngModel]="editingProject?.timeline"
                (ngModelChange)="updateField('timeline', $event)"
                placeholder="Vacío"
                class="bg-transparent text-sm text-neutral-200 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Start Date</span>
              <input
                type="date"
                [ngModel]="editingProject?.startDate"
                (ngModelChange)="updateField('startDate', $event)"
                class="bg-transparent text-sm text-neutral-200 border border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Goal Area</span>
              <input
                type="text"
                [ngModel]="editingProject?.goalArea"
                (ngModelChange)="updateField('goalArea', $event)"
                placeholder="Vacío"
                class="bg-transparent text-sm text-neutral-200 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Archivo</span>
              <label class="flex items-center cursor-pointer px-2 py-1">
                <input
                  type="checkbox"
                  [ngModel]="editingProject?.archivo"
                  (ngModelChange)="updateField('archivo', $event)"
                  class="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-blue-500 focus:ring-offset-neutral-900 focus:ring-neutral-700 cursor-pointer accent-blue-500"
                />
              </label>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-600">
            <div class="flex flex-col gap-0.5">
              <span>Creado: {{ formatDate(editingProject?.created_at) }}</span>
              <span>Editado: {{ formatDate(editingProject?.edited) }}</span>
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
      width: 100%;
    }

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

    .cdk-drop-list-dragging .drag-placeholder {
      display: block;
    }

    .task-card:hover {
      background-color: #2a2a2a;
    }

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
export class KanbanBoardProjectsComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly cdr = inject(ChangeDetectorRef);

  columns: ProjectColumn[] = [
    { id: 'not_started', title: 'Not Started', projects: [] },
    { id: 'in_progress', title: 'In Progress', projects: [] },
    { id: 'completed', title: 'Completed', projects: [] },
  ];

  selectedProject = signal<ProjectItem | null>(null);
  editingProject: ProjectItem | null = null;
  activePill = signal<string>('status');

  filterPills: FilterPill[] = [
    { label: 'Entrega', key: 'entrega' },
    { label: 'Lista', key: 'lista' },
    { label: 'Status', key: 'status' },
    { label: 'Prioridad', key: 'prioridad' },
    { label: 'Timeline', key: 'timeline' },
    { label: 'Urgente', key: 'urgente' },
    { label: 'Proyectos', key: 'proyectos' },
  ];

  private isDragging = false;
  private projectCounter = 0;

  ngOnInit(): void {
    void this.loadProjects();
  }

  onDragStarted(): void {
    this.isDragging = true;
  }

  onDragEnded(): void {
    setTimeout(() => {
      this.isDragging = false;
    }, 50);
  }

  onDrop(event: CdkDragDrop<ProjectItem[]>, targetColumnId: ProjectStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      const project = event.container.data[event.currentIndex];
      project.edited = new Date().toISOString();
      void this.persistProject(project);
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );

    const project = event.container.data[event.currentIndex];
    project.status = targetColumnId;
    project.edited = new Date().toISOString();
    void this.persistProject(project);
  }

  onProjectClick(project: ProjectItem): void {
    if (this.isDragging) return;
    this.selectedProject.set(project);
    this.editingProject = { ...project };
  }

  closeDialog(): void {
    if (this.editingProject) {
      void this.persistProject(this.editingProject);
    }
    this.selectedProject.set(null);
    this.editingProject = null;
  }

  addProject(columnId: ProjectStatus): void {
    this.projectCounter++;
    const column = this.columns.find((item) => item.id === columnId);
    if (!column) return;

    const now = new Date().toISOString();
    const newProject: ProjectItem = {
      id: this.generateId(),
      title: `Nuevo proyecto ${this.projectCounter}`,
      status: columnId,
      created_at: now,
      edited: now,
      archivo: false,
    };

    column.projects.push(newProject);
    void this.createProject(newProject);
  }

  updateField(field: EditableProjectField, value: string | boolean): void {
    if (!this.editingProject) return;

    switch (field) {
      case 'title':
        this.editingProject.title = String(value);
        break;
      case 'archivo':
        this.editingProject.archivo = Boolean(value);
        break;
      case 'prioridad':
        this.editingProject.prioridad = this.parsePriority(String(value));
        break;
      default:
        (this.editingProject as unknown as Record<string, unknown>)[field] = String(value).trim() === '' ? undefined : String(value);
        break;
    }

    this.editingProject.edited = new Date().toISOString();
  }

  formatDate(isoString?: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusLabel(status: ProjectStatus): string {
    const labels: Record<ProjectStatus, string> = {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return labels[status];
  }

  getStatusBadgeClass(status: ProjectStatus): string {
    const base = 'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider';
    const variants: Record<ProjectStatus, string> = {
      not_started: `${base} bg-gray-900/80 text-gray-400`,
      in_progress: `${base} bg-blue-950/60 text-blue-400`,
      completed: `${base} bg-green-950/60 text-green-400`,
    };
    return variants[status];
  }

  getStatusDotClass(status: ProjectStatus): string {
    const dots: Record<ProjectStatus, string> = {
      not_started: 'bg-gray-500',
      in_progress: 'bg-blue-400',
      completed: 'bg-green-400',
    };
    return dots[status];
  }

  private async loadProjects(): Promise<void> {
    try {
      const projects = await this.projectService.getAll();
      this.populateColumns(projects);
      this.cdr.detectChanges();
      this.projectCounter = projects.length;
    } catch (error) {
      console.error('No se pudieron cargar los proyectos', error);
      this.populateColumns([]);
      this.cdr.detectChanges();
    }
  }

  private populateColumns(projects: ProjectItem[]): void {
    const nextColumns: ProjectColumn[] = [
      { id: 'not_started', title: 'Not Started', projects: [] },
      { id: 'in_progress', title: 'In Progress', projects: [] },
      { id: 'completed', title: 'Completed', projects: [] },
    ];

    for (const project of projects) {
      const column = nextColumns.find((item) => item.id === project.status);
      if (column) {
        column.projects.push(project);
      }
    }

    this.columns = nextColumns;
  }

  private async createProject(project: ProjectItem): Promise<void> {
    try {
      const createdProject = await this.projectService.create(project);
      this.replaceProject(createdProject);
    } catch (error) {
      console.error('No se pudo crear el proyecto', error);
      await this.loadProjects();
    }
  }

  private async persistProject(project: ProjectItem): Promise<void> {
    try {
      const updatedProject = await this.projectService.update(project);
      this.replaceProject(updatedProject);
    } catch (error) {
      console.error('No se pudo actualizar el proyecto', error);
    }
  }

  private replaceProject(nextProject: ProjectItem): void {
    for (const column of this.columns) {
      const index = column.projects.findIndex((project) => project.id === nextProject.id);
      if (index !== -1) {
        column.projects[index] = { ...nextProject };
        return;
      }
    }
  }

  private parsePriority(value: string): ProjectPriority | undefined {
    if (value === 'Low' || value === 'Medium' || value === 'High' || value === 'Urgent') {
      return value;
    }
    return undefined;
  }

  private generateId(): string {
    return `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

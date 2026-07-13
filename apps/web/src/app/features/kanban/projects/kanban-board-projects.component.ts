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
import { ProjectService } from '../../../core/services/project.service';
import type { ProjectColumn, ProjectItem, ProjectPriority, ProjectStatus } from '../../../shared/models';

type EditableProjectField =
  | 'title'
  | 'area'
  | 'parentProject'
  | 'timeline'
  | 'prioridad'
  | 'archivo'
  | 'startDate'
  | 'goalArea';

interface FilterPill {
  label: string;
  key: string;
}

@Component({
  selector: 'app-kanban-board-projects',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kanban-board-projects.component.html',
  styleUrls: ['./kanban-board-projects.component.css'],
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

  inlineEditingId = signal<string | null>(null);
  inlineDraft = signal<string>('');

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

  // ── Inline title edit ──────────────────────────────────────────────
  startInlineEdit(project: ProjectItem, event: MouseEvent): void {
    if (this.isDragging) return;
    event.stopPropagation();
    this.inlineEditingId.set(project.id);
    this.inlineDraft.set(project.title);
  }

  onInlineFocus(event: FocusEvent): void {
    const el = event.target as HTMLInputElement;
    el.select();
  }

  saveInlineEdit(project: ProjectItem): void {
    const draft = this.inlineDraft().trim();
    this.inlineEditingId.set(null);
    this.inlineDraft.set('');
    if (!draft || draft === project.title) return;
    const updated: ProjectItem = { ...project, title: draft, edited: new Date().toISOString() };
    void this.persistProject(updated);
  }

  cancelInlineEdit(): void {
    this.inlineEditingId.set(null);
    this.inlineDraft.set('');
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
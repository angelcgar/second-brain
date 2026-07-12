import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
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
import type { AreaItem } from './kanban-board-areas.component';
import { AreaService } from './area.service';
import { GoalService } from './goal.service';

export type GoalStatus = 'No empezado' | 'En progreso' | 'Completo';

export interface GoalItem {
  id: string;
  title: string;
  area: string;
  created_at: string;
  edited: string;
  deadline: string;
  countdown: string;
  quarter: string;
  status: GoalStatus;
  archivado: boolean;
}

interface GoalColumn {
  id: string;
  title: string;
  goals: GoalItem[];
}

interface FilterPill {
  label: string;
  key: string;
}

type EditableGoalField =
  | 'title'
  | 'status'
  | 'deadline'
  | 'countdown'
  | 'quarter'
  | 'archivado';

@Component({
  selector: 'app-kanban-board-goals',
  imports: [CommonModule, DragDropModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col bg-[#191919] text-white">
      <header class="flex-shrink-0 px-6 pt-6 pb-4">
        <h1 class="text-2xl font-bold text-white tracking-tight">Goals</h1>
        <p class="text-sm text-gray-400 mb-4 mt-1">Objetivos por área</p>

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

      @if (columns().length === 0) {
        <main class="px-6 pb-6">
          <div class="rounded-md border border-dashed border-neutral-700 bg-neutral-900/60 p-6 text-sm text-neutral-400">
            No hay áreas disponibles para crear columnas de goals.
          </div>
        </main>
      } @else {
        <main class="flex-1 overflow-x-auto">
          <div
            cdkDropListGroup
            class="flex gap-4 px-6 pb-6 items-start"
            style="width: max-content; min-width: 100%;"
          >
            @for (column of columns(); track column.id) {
              <div class="flex flex-col w-72 flex-shrink-0 bg-neutral-900 rounded-xl p-3">
                <div class="flex justify-between items-center mb-3 px-1">
                  <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    {{ column.title }}
                  </h2>
                  <span class="text-xs text-gray-600 bg-neutral-800 rounded-full px-2 py-0.5">
                    {{ column.goals.length }}
                  </span>
                </div>

                <div
                  cdkDropList
                  [cdkDropListData]="column.goals"
                  [id]="'goals-' + column.id"
                  (cdkDropListDropped)="onDrop($event, column.id, column.title)"
                  class="flex flex-col gap-2 flex-1 overflow-y-auto min-h-[80px] pr-0.5"
                >
                  @for (goal of column.goals; track goal.id) {
                    <div
                      cdkDrag
                      [cdkDragData]="goal"
                      (cdkDragStarted)="onDragStarted()"
                      (cdkDragEnded)="onDragEnded()"
                      (click)="onGoalClick(goal, column.id)"
                      class="goal-card bg-neutral-800 rounded-md p-3 cursor-pointer select-none
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
                        <div class="flex-1 min-w-0">
                          <p class="text-sm text-gray-300 leading-relaxed truncate">{{ goal.title }}</p>
                          @if (goal.deadline) {
                            <p class="text-xs text-neutral-500 mt-1">Deadline: {{ goal.deadline }}</p>
                          }
                        </div>
                      </div>

                      <div *cdkDragPreview class="drag-preview bg-neutral-700 rounded-md p-3 w-72 shadow-2xl shadow-black/60 border border-neutral-600">
                        <p class="text-sm text-gray-200">{{ goal.title }}</p>
                      </div>
                      <div *cdkDragPlaceholder class="drag-placeholder bg-neutral-800/40 rounded-md border-2 border-dashed border-neutral-600 h-16"></div>
                    </div>
                  }
                </div>

                <button
                  (click)="addGoal(column.id)"
                  class="mt-3 w-full py-2 px-3 rounded-md text-sm text-gray-500
                         hover:bg-neutral-800 hover:text-gray-300
                         border border-dashed border-neutral-700 hover:border-neutral-500
                         transition-all duration-150 flex items-center justify-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  Nuevo goal
                </button>
              </div>
            }
          </div>
        </main>
      }
    </div>

@if (editingGoal) {
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
            <span class="font-mono text-neutral-600">ID: {{ editingGoal!.id }}</span>
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
              [ngModel]="editingGoal?.title"
              (ngModelChange)="updateField('title', $event)"
              placeholder="Sin título"
              class="w-full bg-transparent text-2xl font-bold text-white placeholder-neutral-700 border-none outline-none focus:ring-0 focus:outline-none p-0"
            />
          </div>

          <div class="flex flex-col gap-3 py-3 border-y border-neutral-800/65">
            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Status</span>
              <select
                [ngModel]="editingGoal?.status"
                (ngModelChange)="updateField('status', $event)"
                class="bg-transparent text-sm text-neutral-200 border border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full cursor-pointer"
              >
                <option value="No empezado" class="bg-neutral-900 text-neutral-300">No empezar</option>
                <option value="En progreso" class="bg-neutral-900 text-neutral-300">En progreso</option>
                <option value="Completo" class="bg-neutral-900 text-neutral-300">Completo</option>
              </select>
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Deadline</span>
              <input
                type="date"
                [ngModel]="editingGoal?.deadline"
                (ngModelChange)="updateField('deadline', $event)"
                class="bg-transparent text-sm text-neutral-200 border border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Countdown</span>
              <input
                type="text"
                [ngModel]="editingGoal?.countdown"
                (ngModelChange)="updateField('countdown', $event)"
                placeholder="Vacío"
                class="bg-transparent text-sm text-neutral-200 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Quarter</span>
              <input
                type="text"
                [ngModel]="editingGoal?.quarter"
                (ngModelChange)="updateField('quarter', $event)"
                placeholder="Vacío"
                class="bg-transparent text-sm text-neutral-200 border border-transparent hover:border-neutral-800 focus:border-neutral-600 rounded px-2 py-1 outline-none transition-colors w-full"
              />
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Archivado</span>
              <label class="flex items-center cursor-pointer px-2 py-1">
                <input
                  type="checkbox"
                  [ngModel]="editingGoal?.archivado"
                  (ngModelChange)="updateField('archivado', $event)"
                  class="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-blue-500 focus:ring-offset-neutral-900 focus:ring-neutral-700 cursor-pointer accent-blue-500"
                />
              </label>
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Area</span>
              <span class="text-sm text-neutral-300 px-2 py-1">{{ editingGoal!.area }}</span>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-600">
            <div class="flex flex-col gap-0.5">
              <span>Creado: {{ formatDate(editingGoal!.created_at) }}</span>
              <span>Editado: {{ formatDate(editingGoal!.edited) }}</span>
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

    .goal-card:hover {
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
export class KanbanBoardGoalsComponent implements OnInit {
  private readonly areaService = inject(AreaService);
  private readonly goalService = inject(GoalService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly areas = signal<AreaItem[]>([]);
  readonly goalsByArea = signal<Record<string, GoalItem[]>>({});
  readonly selectedGoalContext = signal<{ goal: GoalItem; areaId: string } | null>(null);
  editingGoal: GoalItem | null = null;
  readonly activePill = signal<string>('areas');

  readonly filterPills: FilterPill[] = [
    { label: 'Areas', key: 'areas' },
    { label: 'Cuatrimestre', key: 'cuatrimestre' },
    { label: 'Anual', key: 'anual' },
  ];

  readonly columns = computed<GoalColumn[]>(() =>
    this.areas().map((area) => ({
      id: area.id,
      title: area.title,
      goals: this.goalsByArea()[area.id] ?? [],
    })),
  );

  private allGoals: GoalItem[] = [];
  private isDragging = false;
  private goalCounter = 0;

  ngOnInit(): void {
    void this.loadData();
  }

  onDragStarted(): void {
    this.isDragging = true;
  }

  onDragEnded(): void {
    setTimeout(() => {
      this.isDragging = false;
    }, 50);
  }

  onDrop(event: CdkDragDrop<GoalItem[]>, targetAreaId: string, targetAreaTitle: string): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );

    const movedGoal = event.container.data[event.currentIndex];
    movedGoal.area = targetAreaTitle;
    movedGoal.edited = new Date().toISOString();
    this.replaceGoal(movedGoal);

    const selectedContext = this.selectedGoalContext();
    if (selectedContext?.goal.id === movedGoal.id) {
      this.selectedGoalContext.set({
        goal: { ...movedGoal },
        areaId: targetAreaId,
      });
    }
    void this.persistGoal(movedGoal);
  }

  onGoalClick(goal: GoalItem, areaId: string): void {
    if (this.isDragging) return;
    this.selectedGoalContext.set({ goal: { ...goal }, areaId });
    this.editingGoal = { ...goal };
  }

  closeDialog(): void {
    if (this.editingGoal) {
      void this.persistGoal(this.editingGoal);
    }
    this.selectedGoalContext.set(null);
    this.editingGoal = null;
  }

  addGoal(areaId: string): void {
    const area = this.areas().find((item) => item.id === areaId);
    if (!area) return;

    this.goalCounter++;
    const now = new Date().toISOString();
    const newGoal: GoalItem = {
      id: this.generateId(),
      title: `Nuevo goal ${this.goalCounter}`,
      area: area.title,
      created_at: now,
      edited: now,
      deadline: '',
      countdown: '',
      quarter: '',
      status: 'No empezado',
      archivado: false,
    };

    this.allGoals = [...this.allGoals, newGoal];
    this.rebuildGoalsByArea();
    void this.createGoal(newGoal);
  }

  updateField<K extends EditableGoalField>(field: K, value: GoalItem[K]): void {
    if (!this.editingGoal) return;

    this.editingGoal[field] = value;
    this.editingGoal.edited = new Date().toISOString();
  }

  formatDate(isoString: string): string {
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

  private async loadData(): Promise<void> {
    try {
      const [areas, goals] = await Promise.all([
        this.areaService.getAll(),
        this.goalService.getAll(),
      ]);
      this.areas.set(areas);
      this.allGoals = goals;
      this.goalCounter = goals.length;
      this.rebuildGoalsByArea();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('No se pudieron cargar goals/areas', error);
      this.areas.set([]);
      this.allGoals = [];
      this.goalsByArea.set({});
      this.cdr.detectChanges();
    }
  }

  private rebuildGoalsByArea(): void {
    const map = this.areas().reduce<Record<string, GoalItem[]>>((acc, area) => {
      acc[area.id] = this.allGoals.filter((goal) => goal.area === area.title);
      return acc;
    }, {});
    this.goalsByArea.set(map);
  }

  private replaceGoal(nextGoal: GoalItem): void {
    this.allGoals = this.allGoals.map((goal) =>
      goal.id === nextGoal.id ? { ...nextGoal } : goal,
    );
    this.rebuildGoalsByArea();
  }

  private async createGoal(goal: GoalItem): Promise<void> {
    try {
      const createdGoal = await this.goalService.create(goal);
      this.replaceGoal(createdGoal);
    } catch (error) {
      console.error('No se pudo crear el goal', error);
      await this.loadData();
    }
  }

  private async persistGoal(goal: GoalItem): Promise<void> {
    try {
      const updatedGoal = await this.goalService.update(goal);
      this.replaceGoal(updatedGoal);
      const selectedContext = this.selectedGoalContext();
      if (selectedContext?.goal.id === updatedGoal.id) {
        const areaId =
          this.areas().find((area) => area.title === updatedGoal.area)?.id ??
          selectedContext.areaId;
        this.selectedGoalContext.set({
          goal: { ...updatedGoal },
          areaId,
        });
      }
    } catch (error) {
      console.error('No se pudo actualizar el goal', error);
      await this.loadData();
    }
  }

  private generateId(): string {
    return `goal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

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
import { AreaService } from '../../../core/services/area.service';
import { GoalService } from '../../../core/services/goal.service';
import type { AreaItem } from '../../../shared/models/area.model';
import type { GoalColumn, GoalItem } from '../../../shared/models';

type EditableGoalField =
  | 'title'
  | 'status'
  | 'deadline'
  | 'countdown'
  | 'quarter'
  | 'archivado';

interface FilterPill {
  label: string;
  key: string;
}

@Component({
  selector: 'app-kanban-board-goals',
  imports: [CommonModule, DragDropModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kanban-board-goals.component.html',
  styleUrls: ['./kanban-board-goals.component.css'],
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

  inlineEditingId = signal<string | null>(null);
  inlineDraft = signal<string>('');

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

  // ── Inline title edit ──────────────────────────────────────────────
  startInlineEdit(goal: GoalItem, event: MouseEvent): void {
    if (this.isDragging) return;
    event.stopPropagation();
    this.inlineEditingId.set(goal.id);
    this.inlineDraft.set(goal.title);
  }

  onInlineFocus(event: FocusEvent): void {
    const el = event.target as HTMLInputElement;
    el.select();
  }

  saveInlineEdit(goal: GoalItem): void {
    const draft = this.inlineDraft().trim();
    this.inlineEditingId.set(null);
    this.inlineDraft.set('');
    if (!draft || draft === goal.title) return;
    const updated: GoalItem = { ...goal, title: draft, edited: new Date().toISOString() };
    void this.persistGoal(updated);
  }

  cancelInlineEdit(): void {
    this.inlineEditingId.set(null);
    this.inlineDraft.set('');
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
      status: 'No empezar',
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
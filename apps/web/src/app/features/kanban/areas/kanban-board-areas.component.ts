import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AreaService } from '../../../core/services/area.service';
import type { AreaItem } from '../../../shared/models';

type EditableAreaField = 'title' | 'type' | 'archivado';

interface FilterPill {
  label: string;
  key: string;
}

@Component({
  selector: 'app-kanban-board-areas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kanban-board-areas.component.html',
  styleUrls: ['./kanban-board-areas.component.css'],
})
export class KanbanBoardAreasComponent implements OnInit {
  private readonly areaService = inject(AreaService);

  readonly areas = signal<AreaItem[]>([]);
  readonly selectedArea = signal<AreaItem | null>(null);
  editingArea: AreaItem | null = null;
  readonly activePill = signal<string>('Todas');

  readonly filterPills: FilterPill[] = [
    { label: 'Todas', key: 'Todas' },
    { label: 'Personal', key: 'Personal' },
    { label: 'Empresa', key: 'Empresa' },
    { label: 'Academico', key: 'Academico' },
  ];

  private areaCounter = 0;

  readonly filteredAreas = computed(() => {
    const active = this.activePill();
    const list = this.areas();
    if (active === 'Todas') return list;
    return list.filter((area) => area.type === active);
  });

  ngOnInit(): void {
    void this.loadAreas();
  }

  onAreaClick(area: AreaItem): void {
    this.selectedArea.set(area);
    this.editingArea = { ...area };
  }

  closeDialog(): void {
    if (this.editingArea) {
      void this.persistArea(this.editingArea);
    }
    this.selectedArea.set(null);
    this.editingArea = null;
  }

  addArea(): void {
    this.areaCounter++;
    const types: AreaItem['type'][] = ['Personal', 'Empresa', 'Academico'];
    const chosenType = types[this.areaCounter % types.length] ?? 'Personal';
    const newArea: AreaItem = {
      id: this.generateId(),
      title: `Nueva área ${this.areaCounter}`,
      type: chosenType,
      archivado: false,
      icon: this.getIconForType(chosenType),
    };

    this.areas.set([...this.areas(), newArea]);
    void this.createArea(newArea);
  }

  updateField(field: EditableAreaField, value: string | boolean): void {
    if (!this.editingArea) return;

    switch (field) {
      case 'title':
        this.editingArea.title = String(value);
        break;
      case 'type':
        this.editingArea.type = this.parseAreaType(String(value));
        this.editingArea.icon = this.getIconForType(this.editingArea.type);
        break;
      case 'archivado':
        this.editingArea.archivado = Boolean(value);
        break;
    }
  }

  async deleteSelectedArea(): Promise<void> {
    const area = this.selectedArea();
    if (!area) return;

    this.areas.update((currentAreas) =>
      currentAreas.filter((currentArea) => currentArea.id !== area.id),
    );
    this.selectedArea.set(null);

    try {
      await this.areaService.delete(area.id);
    } catch (error) {
      console.error('No se pudo eliminar el área', error);
      await this.loadAreas();
    }
  }

  private async loadAreas(): Promise<void> {
    try {
      const areas = await this.areaService.getAll();
      this.areas.set(
        areas.map((area) => ({
          ...area,
          icon: this.getIconForType(area.type),
        })),
      );
      this.areaCounter = areas.length;
    } catch (error) {
      console.error('No se pudieron cargar las áreas', error);
      this.areas.set([]);
    }
  }

  private async createArea(area: AreaItem): Promise<void> {
    try {
      const createdArea = await this.areaService.create(area);
      this.areas.update((currentAreas) =>
        currentAreas.map((currentArea) =>
          currentArea.id === createdArea.id
            ? { ...createdArea, icon: this.getIconForType(createdArea.type) }
            : currentArea,
        ),
      );
    } catch (error) {
      console.error('No se pudo crear el área', error);
      await this.loadAreas();
    }
  }

  private async persistArea(area: AreaItem): Promise<void> {
    try {
      const updatedArea = await this.areaService.update(area);
      const normalizedArea = {
        ...updatedArea,
        icon: this.getIconForType(updatedArea.type),
      };
      this.areas.update((currentAreas) =>
        currentAreas.map((currentArea) =>
          currentArea.id === normalizedArea.id ? normalizedArea : currentArea,
        ),
      );

      const selected = this.selectedArea();
      if (selected?.id === normalizedArea.id) {
        this.selectedArea.set(normalizedArea);
      }
    } catch (error) {
      console.error('No se pudo actualizar el área', error);
      await this.loadAreas();
    }
  }

  private parseAreaType(value: string): AreaItem['type'] {
    if (value === 'Empresa' || value === 'Personal' || value === 'Academico') {
      return value;
    }
    return 'Personal';
  }

  private getIconForType(type: AreaItem['type']): string {
    const icons: Record<AreaItem['type'], string> = {
      Empresa: '💼',
      Personal: '👤',
      Academico: '🎓',
    };
    return icons[type];
  }

  private generateId(): string {
    return `area-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
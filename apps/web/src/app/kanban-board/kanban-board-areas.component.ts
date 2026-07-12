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
import { AreaService } from './area.service';

export interface AreaItem {
  id: string;
  title: string;
  type: 'Empresa' | 'Personal' | 'Academico';
  archivado: boolean;
  icon?: string;
}

interface FilterPill {
  label: string;
  key: string;
}

type EditableAreaField = 'title' | 'type' | 'archivado';

@Component({
  selector: 'app-kanban-board-areas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col bg-[#191919] text-white">
      <header class="flex-shrink-0 px-6 pt-6 pb-4">
        <h1 class="text-2xl font-bold text-white tracking-tight">Áreas</h1>
        <p class="text-sm text-gray-400 mb-4 mt-1">Organización y categorización de áreas</p>

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

      <main class="flex-1 px-6 pb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (area of filteredAreas(); track area.id) {
            <div
              (click)="onAreaClick(area)"
              class="area-card flex items-center gap-4 bg-neutral-800/50 hover:bg-neutral-750 hover:border-neutral-600 border border-transparent rounded-md p-4 cursor-pointer select-none transition-all duration-150 group"
            >
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center text-xl text-neutral-300 group-hover:text-white transition-colors duration-150">
                <span>{{ area.icon || '📁' }}</span>
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors duration-150">
                  {{ area.title }}
                </p>
                <p class="text-xs text-neutral-500 mt-0.5">{{ area.type }}</p>
              </div>

              <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0 text-neutral-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          }

          <button
            (click)="addArea()"
            class="flex items-center gap-4 py-4 px-4 rounded-md text-sm text-neutral-500
                   hover:bg-neutral-800 hover:text-gray-300
                   border border-dashed border-neutral-700 hover:border-neutral-500
                   transition-all duration-150 text-left w-full h-full"
          >
            <div class="w-10 h-10 rounded-lg border border-dashed border-neutral-700 flex items-center justify-center text-neutral-500 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium">Nueva área</p>
              <p class="text-xs text-neutral-600 mt-0.5">Crear una nueva categoría</p>
            </div>
          </button>
        </div>
      </main>
    </div>

    @if (selectedArea()) {
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
              <span class="font-mono text-neutral-600">ID: {{ selectedArea()!.id }}</span>
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
              [ngModel]="editingArea?.title"
              (ngModelChange)="updateField('title', $event)"
              placeholder="Sin título"
              class="w-full bg-transparent text-2xl font-bold text-white placeholder-neutral-700 border-none outline-none focus:ring-0 focus:outline-none p-0"
            />
          </div>

          <div class="flex flex-col gap-3 py-3 border-y border-neutral-800/65">
            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Tipo</span>
              <select
                [ngModel]="editingArea?.type"
                (ngModelChange)="updateField('type', $event)"
                class="bg-neutral-900 text-sm text-neutral-200 border border-neutral-800 focus:border-neutral-600 rounded px-2 py-1.5 outline-none transition-colors w-full cursor-pointer"
              >
                <option value="Empresa">Empresa</option>
                <option value="Personal">Personal</option>
                <option value="Academico">Academico</option>
              </select>
            </div>

            <div class="grid grid-cols-[120px_1fr] items-center gap-4">
              <span class="text-xs text-neutral-500 font-medium">Archivado</span>
              <label class="flex items-center cursor-pointer px-2 py-1">
                <input
                  type="checkbox"
                  [ngModel]="editingArea?.archivado"
                  (ngModelChange)="updateField('archivado', $event)"
                  class="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-blue-500 focus:ring-offset-neutral-900 focus:ring-neutral-700 cursor-pointer accent-blue-500"
                />
              </label>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-end gap-2">
            <button
              (click)="deleteSelectedArea()"
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
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .area-card:hover {
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
  `],
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

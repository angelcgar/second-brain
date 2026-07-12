export interface AreaItem {
  id: string;
  title: string;
  type: 'Empresa' | 'Personal' | 'Academico';
  archivado: boolean;
  icon?: string;
}
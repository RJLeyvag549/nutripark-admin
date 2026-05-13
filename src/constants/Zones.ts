import imgPlaya from '../assets/images/Estacionamientos_playa.png';
import imgFisherman from '../assets/images/Fisherman.png';
import imgOriente from '../assets/images/Zona_oriente.png';
import imgSurOriente from '../assets/images/Sector_sur-oriente.png';
import imgMantencion from '../assets/images/Zona_mantencion.png';
import imgZonaPoniente from '../assets/images/Zona_poniente.png';
import imgPonientePorteria from '../assets/images/Costado_poniente_porteria.png';

export interface Slot {
  id: number;
  label: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  status: 'available' | 'occupied' | 'reserved' | 'forbidden' | 'label' | 'danger';
}

export interface ZoneRow {
  id: string;
  x: number;
  y: number;
  rotation: number;
  rowScale: number;
  slotWidth?: number;
  slotHeight?: number;
  gap?: number;
  textRotation?: string;
  slots: Slot[];
}

export interface Zone {
  id: string;
  name: string;
  image: string;
  dbId: number;
  rows: ZoneRow[];
  individualSlots?: Slot[];
  scaleMode?: 'fitWidth' | 'fitHeight' | 'contain';
  customScale?: number;
  offsetX?: number;
  offsetY?: number;
  globalScale?: number;
}

// --- DEFINICIONES DE FILAS POR ZONA (Para facilitar la edición) ---

const ROWS_PONIENTE: ZoneRow[] = [
  {
    id: 'columna-marquesina',
    x: 13.3,
    y: 10,
    rotation: 84,
    rowScale: 1.63,
    slots: [
      { id: 12, label: 'Discap.', offsetX: 0, offsetY: 0, width: 38, height: 75, status: 'forbidden' },
      { id: 13, label: 'Discap.', offsetX: 55, offsetY: 0, width: 42, height: 75, status: 'forbidden' },
      { id: 1, label: '1', offsetX: 98, offsetY: 0, width: 38, height: 72, status: 'available' },
      { id: 2, label: '2', offsetX: 140, offsetY: 0, width: 36, height: 72, status: 'available' },
      { id: 3, label: '3', offsetX: 180, offsetY: 0, width: 36, height: 72, status: 'available' },
      { id: 4, label: '4', offsetX: 221, offsetY: 0, width: 36, height: 72, status: 'available' },
      { id: 5, label: '5', offsetX: 262, offsetY: 0, width: 37, height: 72, status: 'available' },
      { id: 6, label: '6', offsetX: 302, offsetY: 0, width: 36, height: 72, status: 'available' },
      { id: 7, label: '7', offsetX: 342, offsetY: 0, width: 36, height: 72, status: 'available' },
      { id: 8, label: '8', offsetX: 383, offsetY: 0, width: 36, height: 72, status: 'available' },
      { id: 9, label: '9', offsetX: 423, offsetY: 0, width: 36, height: 72, status: 'available' },
      { id: 10, label: '10', offsetX: 463, offsetY: 0, width: 36, height: 72, status: 'available' },
      { id: 11, label: '11', offsetX: 503, offsetY: 0, width: 36, height: 72, status: 'available' },
    ],
  },
  {
    id: 'pon-top',
    x: 40,
    y: 24,
    rotation: 0,
    rowScale: 1.52,
    textRotation: '90deg',
    slots: [
      { id: 14, label: 'Visita', offsetX: 0, offsetY: 0, width: 40, height: 74, status: 'forbidden' },
      { id: 15, label: '2', offsetX: 44, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 16, label: '3', offsetX: 87, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 17, label: '4', offsetX: 130, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 18, label: '5', offsetX: 174, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 19, label: '6', offsetX: 218, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 20, label: '7', offsetX: 261, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 21, label: '8', offsetX: 305, offsetY: 0, width: 40, height: 74, status: 'available' },
    ],
  },
  {
    id: 'pon-bottom',
    x: 40,
    y: 45,
    rotation: 0,
    rowScale: 1.52,
    textRotation: '90deg',
    slots: [
      { id: 22, label: '9', offsetX: 0, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 23, label: '10', offsetX: 44, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 24, label: '11', offsetX: 87, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 25, label: '12', offsetX: 130, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 26, label: '13', offsetX: 174, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 27, label: '14', offsetX: 218, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 28, label: '15', offsetX: 261, offsetY: 0, width: 40, height: 74, status: 'available' },
      { id: 29, label: '16', offsetX: 305, offsetY: 0, width: 40, height: 74, status: 'available' },
    ],
  },
];

const ROWS_PORTERIA: ZoneRow[] = [
  {
    id: 'pp-top',
    x: 95.3,
    y: 52,
    rotation: 84,
    rowScale: 1.82,
    textRotation: '0deg',
    slots: [
      { id: 36, label: '7', offsetX: 0, offsetY: 3, width: 41, height: 73, status: 'available' },
      { id: 37, label: '8', offsetX: 44, offsetY: 3, width: 41, height: 73, status: 'available' },
      { id: 38, label: '9', offsetX: 88, offsetY: 3, width: 41, height: 73, status: 'available' },
      { id: 39, label: '10', offsetX: 132, offsetY: 3, width: 41, height: 73, status: 'available' },
    ],
  },
  {
    id: 'pp-mid',
    x: 84,
    y: 27,
    rotation: 84,
    rowScale: 1.81,
    textRotation: '0deg',
    slots: [
      { id: 30, label: '1', offsetX: 0, offsetY: 0, width: 39, height: 79, status: 'available' },
      { id: 31, label: '2', offsetX: 40, offsetY: 0, width: 40, height: 79, status: 'available' },
      { id: 32, label: '3', offsetX: 84, offsetY: 0, width: 41, height: 79, status: 'available' },
      { id: 33, label: '4', offsetX: 129, offsetY: 0, width: 41, height: 79, status: 'available' },
      { id: 34, label: '5', offsetX: 173, offsetY: 0, width: 41, height: 79, status: 'available' },
      { id: 35, label: '6', offsetX: 218, offsetY: 0, width: 41, height: 79, status: 'available' },
    ],
  },
  {
    id: 'pp-bottom',
    x: 16.5,
    y: 47,
    rotation: 83.5,
    rowScale: 1.83,
    textRotation: '-90deg',
    slots: [
      { id: 46, label: 'Discap.', offsetX: 0, offsetY: 0, width: 44, height: 82, status: 'forbidden' },
      { id: 40, label: 'Visita', offsetX: 45, offsetY: 0, width: 41, height: 82, status: 'forbidden' },
      { id: 41, label: 'Visita', offsetX: 115, offsetY: 0, width: 41, height: 82, status: 'forbidden' },
      { id: 42, label: 'Visita', offsetX: 159, offsetY: 0, width: 41, height: 82, status: 'forbidden' },
      { id: 43, label: 'Visita', offsetX: 203, offsetY: 0, width: 41, height: 82, status: 'forbidden' },
      { id: 44, label: 'Visita', offsetX: 248, offsetY: 0, width: 41, height: 82, status: 'forbidden' },
      { id: 45, label: 'Visita', offsetX: 292, offsetY: 0, width: 41, height: 82, status: 'forbidden' },
    ],
  },
];

const ROWS_PLAYA: ZoneRow[] = [
  {
    id: 'playa-left',
    x: 58.1,
    y: 94.5,
    rotation: 0,
    rowScale: 1.72,
    slots: [
      { id: 100, label: '8', offsetX: 0, offsetY: 0, width: 71, height: 40, status: 'available' },
      { id: 101, label: '9', offsetX: 74.5, offsetY: 0, width: 71, height: 40, status: 'available' },
      { id: 102, label: '10', offsetX: 149, offsetY: 0, width: 71, height: 40, status: 'available' },
    ],
  },
  {
    id: 'playa-right',
    x: 11,
    y: 24,
    rotation: 0,
    rowScale: 1.72,
    slots: [
      { id: 99, label: '7', offsetX: 0, offsetY: 0, width: 72, height: 40, status: 'available' },
      { id: 98, label: '6', offsetX: 76, offsetY: 0, width: 70, height: 40, status: 'available' },
      { id: 97, label: '5', offsetX: 150, offsetY: 0, width: 70, height: 40, status: 'available' },
      { id: 96, label: '4', offsetX: 225, offsetY: 0, width: 70, height: 40, status: 'available' },
      { id: 95, label: '3', offsetX: 299, offsetY: 0, width: 70, height: 40, status: 'available' },
      { id: 94, label: '2', offsetX: 372, offsetY: 0, width: 70, height: 40, status: 'available' },
      { id: 93, label: '1', offsetX: 447, offsetY: 0, width: 70, height: 40, status: 'available' },
    ],
  },
];

const ROWS_FISHERMAN: ZoneRow[] = [
  {
    id: 'fisherman-col-1',
    x: 49.7,
    y: 21,
    rotation: 9,
    rowScale: 1.91,
    textRotation: '0deg',
    slots: [
      { id: 146, label: '4', offsetX: 0, offsetY: 0, width: 38, height: 74, status: 'available' },
      { id: 105, label: '3', offsetX: 41, offsetY: 0, width: 38, height: 74, status: 'available' },
      { id: 104, label: '2', offsetX: 82, offsetY: 0, width: 38, height: 74, status: 'available' },
      { id: 103, label: '1', offsetX: 123, offsetY: 0, width: 38, height: 74, status: 'available' },
    ],
  },
  {
    id: 'fisherman-loose',
    x: 37.5,
    y: 45.5,
    rotation: 98,
    rowScale: 1.91,
    slots: [
      { id: 147, label: '5', offsetX: 0, offsetY: 0, width: 40, height: 74, status: 'available' },
    ],
  },
];

const ROWS_ORIENTE: ZoneRow[] = [
  {
    id: 'ori-row-1',
    x: 40.2,
    y: 2.3,
    rotation: 6,
    rowScale: 1.87,
    textRotation: '0deg',
    slots: [
      { id: 55, label: '9', offsetX: 0, offsetY: 0, width: 44, height: 80, status: 'available' },
      { id: 54, label: '8', offsetX: 47, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 53, label: '7', offsetX: 93, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 52, label: '6', offsetX: 139, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 204, label: 'Pool', offsetX: 185, offsetY: 0, width: 43, height: 80, status: 'forbidden' },
      { id: 205, label: 'Pool', offsetX: 231, offsetY: 0, width: 43, height: 80, status: 'forbidden' },
      { id: 49, label: '3', offsetX: 277, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 48, label: '2', offsetX: 323, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 47, label: 'Visita', offsetX: 369, offsetY: 0, width: 43, height: 80, status: 'forbidden' },
    ],
  },
  {
    id: 'ori-row-bottom',
    x: 37.8,
    y: 45,
    rotation: 6,
    rowScale: 1.9,
    textRotation: '0deg',
    slots: [
      { id: 56, label: '10', offsetX: 0, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 57, label: '11', offsetX: 46, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 58, label: '12', offsetX: 91, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 59, label: '13', offsetX: 136, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 60, label: '14', offsetX: 181, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 61, label: '15', offsetX: 227, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 50, label: 'd', offsetX: 271, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 51, label: 'e', offsetX: 317, offsetY: 0, width: 43, height: 80, status: 'available' },
      { id: 148, label: 'f', offsetX: 365, offsetY: 0, width: 43, height: 80, status: 'available' },
    ],
  },
  {
    id: 'ori-row-left-vertical',
    x: 10.4,
    y: 70,
    rotation: 85.5,
    rowScale: 1.9,
    slots: [
      { id: 62, label: '16', offsetX: 0, offsetY: 0, width: 42, height: 80, status: 'available' },
      { id: 63, label: '17', offsetX: 45, offsetY: 0, width: 42, height: 80, status: 'available' },
      { id: 64, label: '18', offsetX: 90, offsetY: 0, width: 42, height: 80, status: 'available' },
      { id: 65, label: '19', offsetX: 135, offsetY: 0, width: 42, height: 80, status: 'available' },
    ],
  },
  {
    id: 'ori-row-lower-1',
    x: 23.7,
    y: 130,
    rotation: 6,
    rowScale: 1.8,
    textRotation: '0deg',
    slots: [
      { id: 66, label: '20', offsetX: 0, offsetY: 0, width: 43, height: 90, status: 'available' },
      { id: 67, label: '21', offsetX: 46, offsetY: 0, width: 43, height: 90, status: 'available' },
      { id: 68, label: '22', offsetX: 92, offsetY: 0, width: 43, height: 90, status: 'available' },
      { id: 69, label: '23', offsetX: 139, offsetY: 0, width: 43, height: 90, status: 'available' },
    ],
  },
  {
    id: 'ori-row-lower-2',
    x: 17.8,
    y: 181,
    rotation: 6,
    rowScale: 1.83,
    textRotation: '0deg',
    slots: [
      { id: 70, label: '24', offsetX: 0, offsetY: 0, width: 39, height: 83, status: 'available' },
      { id: 71, label: '25', offsetX: 41, offsetY: 0, width: 39, height: 83, status: 'available' },
      { id: 72, label: '26', offsetX: 82, offsetY: 0, width: 39, height: 83, status: 'available' },
      { id: 73, label: '27', offsetX: 123, offsetY: 0, width: 39, height: 83, status: 'available' },
      { id: 74, label: 'Discap.', offsetX: 165, offsetY: 0, width: 39, height: 83, status: 'forbidden' },
    ],
  },
  {
    id: 'ori-pool-right',
    x: 76,
    y: 32,
    rotation: 6,
    rowScale: 1.87,
    textRotation: '0deg',
    slots: [
      { id: 201, label: 'Pool', offsetX: 136, offsetY: -4, width: 43, height: 80, status: 'forbidden' },
      { id: 202, label: 'Pool', offsetX: 182, offsetY: -4, width: 43, height: 80, status: 'forbidden' },
      { id: 206, label: 'Pool', offsetX: 145, offsetY: 80, width: 81, height: 43, status: 'forbidden' },
    ],
  },
];

const ROWS_SUR_ORIENTE: ZoneRow[] = [
  {
    id: 'sur-ori-row-1',
    x: 52.8,
    y: 24,
    rotation: 96,
    rowScale: 1.39,
    slots: [
      { id: 77, label: '1', offsetX: 0, offsetY: 0, width: 63, height: 120, status: 'available' },
      { id: 76, label: '2', offsetX: 69, offsetY: 0, width: 63, height: 120, status: 'available' },
      { id: 75, label: '3', offsetX: 138, offsetY: 0, width: 63, height: 120, status: 'available' },
      { id: 79, label: 'Visita', offsetX: 208, offsetY: 0, width: 63, height: 120, status: 'forbidden' },
      { id: 78, label: 'Visita', offsetX: 277, offsetY: 0, width: 63, height: 120, status: 'forbidden' },
    ],
  },
];

const ROWS_MANTENCION: ZoneRow[] = [
  {
    id: 'man-row-1',
    x: 87.6,
    y: 108,
    rotation: 180,
    rowScale: 1.52,
    slots: [
      { id: 92, label: '14', offsetX: -39, offsetY: 0, width: 37, height: 70, status: 'available' },
      { id: 91, label: '13', offsetX: 0, offsetY: 0, width: 37, height: 70, status: 'available' },
      { id: 90, label: '12', offsetX: 39, offsetY: 0, width: 37, height: 70, status: 'available' },
      { id: 9991, label: 'Salida MP', offsetX: 220, offsetY: 0, width: 37, height: 70, status: 'forbidden' },
      { id: 89, label: '10', offsetX: 260, offsetY: 0, width: 37, height: 70, status: 'available' },
      { id: 88, label: '9', offsetX: 300, offsetY: 0, width: 37, height: 70, status: 'available' },
      { id: 87, label: '8', offsetX: 339, offsetY: 0, width: 37, height: 70, status: 'available' },
      { id: 86, label: '7', offsetX: 378, offsetY: 0, width: 37, height: 70, status: 'available' },
      { id: 85, label: '6', offsetX: 419, offsetY: 0, width: 37, height: 70, status: 'available' },
      { id: 84, label: '5', offsetX: 459, offsetY: 0, width: 37, height: 70, status: 'available' },
      { id: 83, label: '4', offsetX: 597, offsetY: -11, width: 37, height: 70, status: 'available' },
      { id: 82, label: '3', offsetX: 638, offsetY: -11, width: 37, height: 70, status: 'available' },
      { id: 81, label: '2', offsetX: 678, offsetY: -11, width: 37, height: 70, status: 'available' },
      { id: 80, label: '1', offsetX: 718, offsetY: -11, width: 37, height: 70, status: 'available' },
    ],
  },
];

// --- OBJETO PRINCIPAL DE ZONAS ---

export const ZONES: Zone[] = [
  {
    id: 'zona_poniente',
    name: 'Zona Poniente',
    image: imgZonaPoniente,
    dbId: 2,
    rows: ROWS_PONIENTE,
  },
  {
    id: 'poniente_porteria',
    name: 'Portería Poniente',
    image: imgPonientePorteria,
    dbId: 3,
    rows: ROWS_PORTERIA,
  },
  {
    id: 'playa',
    name: 'Playa',
    image: imgPlaya,
    dbId: 7,
    rows: ROWS_PLAYA,
  },
  {
    id: 'fisherman',
    name: 'Fisherman',
    image: imgFisherman,
    dbId: 8,
    rows: ROWS_FISHERMAN,
  },
  {
    id: 'oriente',
    name: 'Zona Oriente',
    image: imgOriente,
    dbId: 4,
    rows: ROWS_ORIENTE,
    offsetX: -5,
    offsetY: -0,
    globalScale: 0.88,
  },
  {
    id: 'sur-oriente',
    name: 'Sector Sur-Oriente',
    image: imgSurOriente,
    dbId: 5,
    rows: ROWS_SUR_ORIENTE,
  },
  {
    id: 'mantencion',
    name: 'Zona Mantención',
    image: imgMantencion,
    dbId: 6,
    rows: ROWS_MANTENCION,
  },
];

export const getSlotLabel = (slotId: number): string => {
  for (const zone of ZONES) {
    for (const row of zone.rows) {
      const slot = row.slots.find(s => s.id === slotId);
      if (slot) return slot.label;
    }
  }
  return slotId.toString();
};

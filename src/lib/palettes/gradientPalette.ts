export interface GradientRow {
  label: string;
  colors: string[]; // 7 shades, light → dark
}

/** Cold-to-warm ordered gradient rows for the Gradients palette tab */
export const GRADIENT_ROWS: GradientRow[] = [
  { label: 'Purple', colors: ['#E8DAFB', '#C4A8F0', '#9B71DB', '#7B4FC7', '#5E35A8', '#432580', '#2D1760'] },
  { label: 'Blue',   colors: ['#BFDBFE', '#7BB8F5', '#4093E4', '#2570C4', '#1A56A0', '#103D78', '#0A2A55'] },
  { label: 'Cyan',   colors: ['#BFFAF5', '#7AEEE8', '#3DD8CE', '#1AAFA6', '#0E8A80', '#076660', '#034540'] },
  { label: 'Green',  colors: ['#BBFFB0', '#7AE87A', '#47CC47', '#28A828', '#1A8A1A', '#0F6B0F', '#084D08'] },
  { label: 'Yellow', colors: ['#FFF9C4', '#FFF176', '#FFEB3B', '#F9CE12', '#E6B800', '#C49A00', '#8C6D00'] },
  { label: 'Orange', colors: ['#FFE0B2', '#FFB74D', '#FF9800', '#F57C00', '#E65100', '#BF360C', '#8B2500'] },
  { label: 'Red',    colors: ['#FFCDD2', '#EF9A9A', '#EF5350', '#E53935', '#C62828', '#961E1E', '#601414'] },
  { label: 'Pink',   colors: ['#F8BBD0', '#F06292', '#EC407A', '#D81B60', '#AD1457', '#880E4F', '#5C0A35'] },
  { label: 'Brown',  colors: ['#D7CCC8', '#BCAAA4', '#A1887F', '#8D6E63', '#6D4C41', '#4E342E', '#3E2723'] },
  { label: 'Gray',   colors: ['#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#424242', '#212121'] },
];

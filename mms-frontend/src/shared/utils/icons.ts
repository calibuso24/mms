export const iconMap: Record<string, string> = {
  dashboard: '📊',
  clipboard: '📋',
  'shopping-cart': '🛒',
  boxes: '📦',
  'file-chart': '📈',
  database: '🗄️',
  settings: '⚙️',
  'arrow-left': '⬅️',
  'arrow-right': '➜',
  briefcase: '💼',
  package: '📭',
  box: '📦',
  list: '📝',
  edit: '✏️',
  users: '👥',
  lock: '🔒',
  folder: '📁',
  truck: '🚚',
  file: '📄',
  check: '✓',
  warehouse: '🏢',
  calculator: '🧮',
};

export function getIcon(iconName: string | null): string {
  if (!iconName) return '';
  return iconMap[iconName.toLowerCase()] || '▸';
}

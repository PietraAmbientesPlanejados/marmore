import React from 'react';

// Ícones como wrappers de emoji para preservar o visual original do sistema.
// O parâmetro `size` é aceito (mas não aplicado ao emoji) para compatibilidade
// com o uso existente, ex: <X size={24} />.
//
// Migração futura: trocar para `lucide-react` (já em package.json).

const emoji = (char) => {
  const Icon = () => React.createElement('span', null, char);
  Icon.displayName = `EmojiIcon(${char})`;
  return Icon;
};

export const PlusCircle = emoji('➕');
export const Trash2     = emoji('🗑️');
export const Edit2      = emoji('✏️');
export const Save       = emoji('💾');
export const X          = emoji('❌');
export const Move       = emoji('↔️');
export const Grid       = emoji('⊞');
export const FileText   = emoji('📄');
export const Home       = emoji('🏠');
export const Package    = emoji('📦');
export const Printer    = emoji('🖨️');

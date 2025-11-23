// Mapeamento de estados brasileiros para regiões
export const estadoParaRegiao: Record<string, string> = {
  // Norte
  'AC': 'Norte',
  'AP': 'Norte',
  'AM': 'Norte',
  'PA': 'Norte',
  'RO': 'Norte',
  'RR': 'Norte',
  'TO': 'Norte',
  
  // Nordeste
  'AL': 'Nordeste',
  'BA': 'Nordeste',
  'CE': 'Nordeste',
  'MA': 'Nordeste',
  'PB': 'Nordeste',
  'PE': 'Nordeste',
  'PI': 'Nordeste',
  'RN': 'Nordeste',
  'SE': 'Nordeste',
  
  // Centro-Oeste
  'DF': 'Centro-Oeste',
  'GO': 'Centro-Oeste',
  'MT': 'Centro-Oeste',
  'MS': 'Centro-Oeste',
  
  // Sudeste
  'ES': 'Sudeste',
  'MG': 'Sudeste',
  'RJ': 'Sudeste',
  'SP': 'Sudeste',
  
  // Sul
  'PR': 'Sul',
  'RS': 'Sul',
  'SC': 'Sul',
};

export const estadosData = [
  { nome: 'AC', regiao: 'Norte' },
  { nome: 'AL', regiao: 'Nordeste' },
  { nome: 'AP', regiao: 'Norte' },
  { nome: 'AM', regiao: 'Norte' },
  { nome: 'BA', regiao: 'Nordeste' },
  { nome: 'CE', regiao: 'Nordeste' },
  { nome: 'DF', regiao: 'Centro-Oeste' },
  { nome: 'ES', regiao: 'Sudeste' },
  { nome: 'GO', regiao: 'Centro-Oeste' },
  { nome: 'MA', regiao: 'Nordeste' },
  { nome: 'MT', regiao: 'Centro-Oeste' },
  { nome: 'MS', regiao: 'Centro-Oeste' },
  { nome: 'MG', regiao: 'Sudeste' },
  { nome: 'PA', regiao: 'Norte' },
  { nome: 'PB', regiao: 'Nordeste' },
  { nome: 'PR', regiao: 'Sul' },
  { nome: 'PE', regiao: 'Nordeste' },
  { nome: 'PI', regiao: 'Nordeste' },
  { nome: 'RJ', regiao: 'Sudeste' },
  { nome: 'RN', regiao: 'Nordeste' },
  { nome: 'RS', regiao: 'Sul' },
  { nome: 'RO', regiao: 'Norte' },
  { nome: 'RR', regiao: 'Norte' },
  { nome: 'SC', regiao: 'Sul' },
  { nome: 'SP', regiao: 'Sudeste' },
  { nome: 'SE', regiao: 'Nordeste' },
  { nome: 'TO', regiao: 'Norte' },
];

export function getRegiaoFromEstado(estado: string): string {
  return estadoParaRegiao[estado] || '';
}

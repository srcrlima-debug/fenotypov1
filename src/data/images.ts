export interface ImageData {
  id: number;
  imageUrl: string;
  nome: string;
}

// Ordem customizada: foto 10 primeiro, depois 1-9, depois 11-30
const customOrder = [10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

export const trainingImages: ImageData[] = customOrder.map((fotoId, index) => ({
  id: index + 1, // ID sequencial para navegação (1-30)
  imageUrl: `/images/foto-${fotoId}.jpg`, // URL da foto original
  nome: `Foto ${fotoId}`,
}));

export const getImageByPage = (page: number): ImageData | undefined => {
  return trainingImages.find((img) => img.id === page);
};

// Função auxiliar para obter o ID original da foto a partir da página
export const getOriginalFotoId = (page: number): number => {
  return customOrder[page - 1] || page;
};

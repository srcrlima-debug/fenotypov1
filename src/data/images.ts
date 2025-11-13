export interface ImageData {
  id: number;
  imageUrl: string;
  nome: string;
}

export const trainingImages: ImageData[] = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  imageUrl: `/images/foto-${i + 1}.jpg`,
  nome: `Foto ${i + 1}`,
}));

export const getImageByPage = (page: number): ImageData | undefined => {
  return trainingImages.find((img) => img.id === page);
};

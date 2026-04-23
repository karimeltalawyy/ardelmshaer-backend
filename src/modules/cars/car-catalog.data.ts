import { CarType } from '@prisma/client';

export interface CarCatalogModel {
  model: string;
  capacityOptions: number[];
  seatLayoutOptions?: Array<{ code: string; labelAr: string; columns: number }>;
}

export interface CarCatalogBrand {
  brand: string;
  models: CarCatalogModel[];
}

export type CarCatalogMap = Record<CarType, CarCatalogBrand[]>;

// Master catalog (product data), served from backend for option-driven admin UX.
export const CAR_CATALOG: CarCatalogMap = {
  sedan: [
    { brand: 'Toyota', models: [{ model: 'Camry', capacityOptions: [4, 5] }, { model: 'Corolla', capacityOptions: [4, 5] }] },
    { brand: 'Hyundai', models: [{ model: 'Sonata', capacityOptions: [4, 5] }, { model: 'Elantra', capacityOptions: [4, 5] }] },
  ],
  family: [
    { brand: 'Toyota', models: [{ model: 'Innova', capacityOptions: [7, 8] }, { model: 'Fortuner', capacityOptions: [7] }] },
    { brand: 'Kia', models: [{ model: 'Carnival', capacityOptions: [7, 8] }] },
  ],
  vip: [
    { brand: 'Lexus', models: [{ model: 'ES', capacityOptions: [4] }, { model: 'LS', capacityOptions: [4] }] },
    { brand: 'Mercedes-Benz', models: [{ model: 'E-Class', capacityOptions: [4] }, { model: 'S-Class', capacityOptions: [4] }] },
  ],
  limousine: [
    { brand: 'GMC', models: [{ model: 'Yukon XL', capacityOptions: [8, 9] }] },
    { brand: 'Chevrolet', models: [{ model: 'Suburban', capacityOptions: [8, 9] }] },
  ],
  minibus: [
    {
      brand: 'Toyota',
      models: [
        {
          model: 'Hiace',
          capacityOptions: [12, 13, 14],
          seatLayoutOptions: [
            { code: '4c', labelAr: '4 مقاعد بالصف', columns: 4 },
            { code: '3c', labelAr: '3 مقاعد بالصف', columns: 3 },
          ],
        },
      ],
    },
    {
      brand: 'Hyundai',
      models: [
        {
          model: 'H350',
          capacityOptions: [12, 13, 14],
          seatLayoutOptions: [
            { code: '4c', labelAr: '4 مقاعد بالصف', columns: 4 },
            { code: '3c', labelAr: '3 مقاعد بالصف', columns: 3 },
          ],
        },
      ],
    },
  ],
  bus: [
    {
      brand: 'Mercedes-Benz',
      models: [
        {
          model: 'Tourismo',
          capacityOptions: [40, 45, 49],
          seatLayoutOptions: [
            { code: '4c', labelAr: '4 مقاعد بالصف', columns: 4 },
            { code: '5c', labelAr: '5 مقاعد بالصف', columns: 5 },
          ],
        },
      ],
    },
    {
      brand: 'MAN',
      models: [
        {
          model: 'Lion’s Coach',
          capacityOptions: [40, 45, 49],
          seatLayoutOptions: [
            { code: '4c', labelAr: '4 مقاعد بالصف', columns: 4 },
            { code: '5c', labelAr: '5 مقاعد بالصف', columns: 5 },
          ],
        },
      ],
    },
  ],
};

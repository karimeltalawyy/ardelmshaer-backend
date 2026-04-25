import { CarType } from '@prisma/client';

export interface CarCatalogModel {
  model: string;
  capacityOptions: number[];
}

export interface CarCatalogBrand {
  brand: string;
  models: CarCatalogModel[];
}

export type CarCatalogMap = Record<CarType, CarCatalogBrand[]>;

export const CAR_CATALOG: Partial<CarCatalogMap> = {
  starex: [
    { brand: 'Hyundai', models: [{ model: 'Starex', capacityOptions: [12] }] },
  ],
  staria: [
    { brand: 'Hyundai', models: [{ model: 'Staria', capacityOptions: [11] }] },
  ],
};

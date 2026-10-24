/** Так в корзине и заказе обозначен товар без размеров; в базе у него пустой size. */
export const NO_SIZE = "—";

export const sizeKey = (size: string) => (size === NO_SIZE ? "" : size);

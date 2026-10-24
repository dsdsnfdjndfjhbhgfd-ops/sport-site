import type { PaymentProvider } from "./types";

/** Тестовая оплата без внешних сервисов: ведёт на страницу /pay/mock/[orderId]. */
export const mockProvider: PaymentProvider = {
  name: "mock",
  async createPayment({ orderId }) {
    return { paymentId: `mock_${orderId}`, redirectUrl: `/pay/mock/${orderId}` };
  },
  async getStatus() {
    // Статус меняется напрямую на тестовой странице оплаты
    return "PENDING";
  },
};

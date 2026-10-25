export type PaymentStatus = "PENDING" | "PAID" | "CANCELED";

export interface PaymentRequest {
  orderId: string;
  amount: number; // в копейках
  description: string;
  email: string;
}

export interface CreatedPayment {
  paymentId: string;
  redirectUrl: string;
}

/**
 * Любой платёжный провайдер реализует этот интерфейс.
 * Чтобы добавить новый (CloudPayments, Тинькофф и т.д.) — создайте файл
 * рядом и зарегистрируйте его в ./index.ts.
 */
export interface PaymentProvider {
  name: string;
  createPayment(req: PaymentRequest): Promise<CreatedPayment>;
  getStatus(paymentId: string): Promise<PaymentStatus>;
}

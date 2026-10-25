import { requireUser } from "@/lib/auth";
import { CheckoutForm } from "./CheckoutForm";

export const metadata = { title: "Оформление заказа" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const isTest = (process.env.PAYMENT_PROVIDER || "mock") === "mock";
  return (
    <div className="container">
      <div className="page-head">
        <h1>Оформление заказа</h1>
      </div>
      <CheckoutForm defaultName={user.name} testMode={isTest} />
    </div>
  );
}

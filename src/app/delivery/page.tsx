import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { FREE_SHIPPING_FROM, SHIPPING_PRICE } from "@/lib/config";
import { formatPrice } from "@/lib/money";

export const metadata = { title: "Доставка и оплата" };

/** Все платежи покупателя — цена товаров и доставка; других сборов и комиссий нет. */
export default function DeliveryPage() {
  return (
    <LegalPage title="Доставка и оплата">
      <section>
        <h2>Стоимость доставки</h2>
        <dl className="legal-details">
          <dt>Заказ до {formatPrice(FREE_SHIPPING_FROM)}</dt>
          <dd>{formatPrice(SHIPPING_PRICE)}</dd>
          <dt>Заказ от {formatPrice(FREE_SHIPPING_FROM)}</dt>
          <dd>бесплатно</dd>
        </dl>
        <p style={{ marginTop: 16 }}>
          Стоимость доставки видна в корзине и при оформлении до перехода к оплате. Других сборов, комиссий и
          доплат нет: к оплате — цена товаров плюс доставка.
        </p>
      </section>

      <section>
        <h2>Сроки</h2>
        <p>Доставляем по России. Срок зависит от адреса — мы сообщим его после оформления заказа.</p>
      </section>

      <section>
        <h2>Оплата</h2>
        <p>
          Онлайн банковской картой при оформлении заказа. Данные карты вводятся на странице платёжного сервиса, мы их
          не получаем и не храним. Цены указаны в рублях и окончательные: в них уже включены все налоги.
        </p>
      </section>

      <section>
        <h2>Возврат</h2>
        <p>
          Условия возврата и обмена — на странице <Link href="/returns">«Возврат и обмен»</Link>.
        </p>
      </section>
    </LegalPage>
  );
}

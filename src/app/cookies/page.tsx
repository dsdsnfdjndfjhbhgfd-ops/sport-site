import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Файлы cookie" };

export default function CookiesPage() {
  return (
    <LegalPage title="Файлы cookie">
      <section>
        <h2>Что сайт хранит в вашем браузере</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Зачем</th>
                <th>Срок</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>session</td>
                <td>cookie</td>
                <td>Держит вас в учётной записи после входа. Появляется только после входа или регистрации.</td>
                <td>30 дней или до выхода</td>
              </tr>
              <tr>
                <td>cart</td>
                <td>localStorage</td>
                <td>Содержимое корзины</td>
                <td>Пока вы его не очистите</td>
              </tr>
              <tr>
                <td>cookie-notice</td>
                <td>localStorage</td>
                <td>Запоминает, что вы закрыли уведомление о cookie</td>
                <td>Пока вы его не очистите</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Чего на сайте нет</h2>
        <p>
          Сайт не использует рекламные и аналитические cookie, счётчики посещаемости, пиксели социальных сетей и другие
          сторонние трекеры. Шрифты загружаются с нашего сервера, а не со сторонних.
        </p>
        <p>
          При оплате вы переходите на страницу платёжного сервиса. Он может устанавливать свои cookie по своим
          правилам; на страницах нашего сайта его код не загружается.
        </p>
      </section>

      <section>
        <h2>Как отключить</h2>
        <p>
          Cookie и данные сайта можно удалить или запретить в настройках браузера. Без cookie session не получится
          войти в учётную запись и оформить заказ, без localStorage не будет работать корзина.
        </p>
        <p>
          Как мы обращаемся с персональными данными — в <Link href="/privacy">Политике обработки персональных данных</Link>.
        </p>
      </section>
    </LegalPage>
  );
}

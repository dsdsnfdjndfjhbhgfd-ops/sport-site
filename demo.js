// Оживляет статическую демо-копию сайта (см. scripts/export-static.mjs):
// корзина в localStorage, выбор размера, сортировка, поиск. Заказы, вход и
// изменения в админке в демо-версии не сохраняются — для них нужен сервер.
(function () {
  var DEMO = window.__DEMO__ || { base: "", path: "/", query: {} };
  var BASE = DEMO.base;
  var FREE_SHIPPING_FROM = 500000;
  var SHIPPING_PRICE = 39000;

  function formatPrice(kopecks) {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: kopecks % 100 === 0 ? 0 : 2,
    }).format(kopecks / 100);
  }
  function shippingFor(subtotal) {
    return subtotal >= FREE_SHIPPING_FROM || subtotal === 0 ? 0 : SHIPPING_PRICE;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function link(path) {
    return BASE + path + (path.endsWith("/") ? "" : "/");
  }

  // --- корзина ---

  function load() {
    try {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    } catch (e) {
      return [];
    }
  }
  function save(items) {
    try {
      localStorage.setItem("cart", JSON.stringify(items));
    } catch (e) {}
    renderBadge();
  }
  function subtotal(items) {
    return items.reduce(function (n, i) {
      return n + i.price * i.quantity;
    }, 0);
  }
  function renderBadge() {
    var a = document.querySelector('a.icon-link[aria-label="Корзина"]');
    if (!a) return;
    var count = load().reduce(function (n, i) {
      return n + i.quantity;
    }, 0);
    var badge = a.querySelector(".badge");
    if (!count) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "badge";
      a.appendChild(badge);
    }
    badge.textContent = count;
  }

  // --- уведомление ---

  function toast(text) {
    var el = document.getElementById("demo-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-toast";
      el.style.cssText =
        "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:100;max-width:min(560px,calc(100% - 32px));" +
        "background:#17322a;color:#fff;padding:14px 20px;border-radius:12px;font-size:14px;line-height:1.4;box-shadow:0 6px 24px rgba(0,0,0,.25)";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = "block";
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.style.display = "none";
    }, 4500);
  }

  function banner() {
    var el = document.createElement("div");
    el.style.cssText =
      "background:#d9c9a8;color:#0e1f1a;text-align:center;font-size:13px;padding:8px 16px;line-height:1.4";
    el.textContent =
      "Демо-версия для просмотра: корзина работает, но заказы, вход и изменения в админке не сохраняются.";
    document.body.insertBefore(el, document.body.firstChild);
  }

  // --- страница товара ---

  function productPage() {
    var product = window.__DEMO_PRODUCT__;
    var buy = document.querySelector(".buy-row");
    if (!product || !buy) return;
    var root = buy.parentElement;
    var named = product.sizes.filter(function (s) {
      return s.size !== "";
    });
    var stockOf = function (name) {
      var found = named.find(function (s) {
        return s.size === name;
      });
      return found ? found.stock : 0;
    };
    var inStock = named.filter(function (s) {
      return s.stock > 0;
    });
    var size = inStock.length === 1 ? inStock[0].size : "";
    var total = product.sizes.reduce(function (n, s) {
      return n + s.stock;
    }, 0);
    var input = buy.querySelector(".qty input");
    var qtyButtons = buy.querySelectorAll(".qty button");
    var line = root.querySelector(".stock-line");
    var msg = document.createElement("div");
    buy.after(msg);

    function available() {
      return named.length ? stockOf(size) : total;
    }
    function setQty(q) {
      input.value = Math.min(Math.max(available(), 1), Math.max(1, q || 1));
    }
    function renderLine() {
      if (!line) return;
      var left = available();
      var suffix = size ? " размера " + size : "";
      line.className = left > 0 && left <= 3 ? "stock-line stock-low" : "stock-line";
      line.textContent =
        named.length && !size
          ? "Под каждым размером указано, сколько штук осталось"
          : (left <= 3 ? "Осталось всего " : "В наличии ") + left + " шт." + suffix;
    }

    root.querySelectorAll(".sizes .size").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        size = btn.firstChild.textContent.trim();
        root.querySelectorAll(".sizes .size").forEach(function (b) {
          b.className = b === btn ? "size selected" : "size";
        });
        setQty(Number(input.value));
        renderLine();
        msg.innerHTML = "";
      });
    });
    qtyButtons[0].addEventListener("click", function () {
      setQty(Number(input.value) - 1);
    });
    qtyButtons[1].addEventListener("click", function () {
      setQty(Number(input.value) + 1);
    });
    input.addEventListener("change", function () {
      setQty(Number(input.value));
    });
    buy.querySelector(".btn-red").addEventListener("click", function () {
      if (named.length && !size) {
        msg.innerHTML = '<p class="stock-low">Выберите размер</p>';
        return;
      }
      var items = load();
      var item = {
        productId: product.productId,
        slug: product.slug,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        size: size || "—",
        quantity: Number(input.value) || 1,
      };
      var existing = items.find(function (i) {
        return i.productId === item.productId && i.size === item.size;
      });
      if (existing) existing.quantity += item.quantity;
      else items.push(item);
      save(items);
      msg.innerHTML =
        '<p class="added">Товар добавлен. <a href="' +
        link("/cart") +
        '" style="text-decoration:underline">Перейти в корзину</a></p>';
    });
  }

  // --- корзина и оформление ---

  function emptyCart(text) {
    return (
      '<div class="empty"><p>' + text + '</p><a href="' + link("/catalog") + '" class="btn">В каталог</a></div>'
    );
  }

  function cartPage() {
    var container = document.querySelector("main .container");
    var head = container.querySelector(".page-head");
    var body = document.createElement("div");
    container.innerHTML = "";
    container.appendChild(head);
    container.appendChild(body);

    function render() {
      var items = load();
      if (!items.length) {
        body.innerHTML = emptyCart("Ваша корзина пуста");
        return;
      }
      var sub = subtotal(items);
      var shipping = shippingFor(sub);
      body.innerHTML =
        '<div class="cart"><div>' +
        items
          .map(function (item, idx) {
            return (
              '<div class="cart-item"><img src="' + esc(item.imageUrl) + '" alt="' + esc(item.name) + '">' +
              '<div><a href="' + link("/product/" + item.slug) + '" style="font-weight:500">' + esc(item.name) + "</a>" +
              '<div class="meta">Размер: ' + esc(item.size) + "</div>" +
              '<div class="row-actions" style="margin-top:10px"><div class="qty">' +
              '<button data-act="dec" data-idx="' + idx + '">−</button>' +
              '<input type="number" min="1" value="' + item.quantity + '" data-idx="' + idx + '">' +
              '<button data-act="inc" data-idx="' + idx + '">+</button></div>' +
              '<button class="link-btn" data-act="remove" data-idx="' + idx + '">Удалить</button></div></div>' +
              '<div class="price">' + formatPrice(item.price * item.quantity) + "</div></div>"
            );
          })
          .join("") +
        '</div><aside class="summary"><h3>Итого</h3>' +
        '<div class="summary-row"><span>Товары</span><span>' + formatPrice(sub) + "</span></div>" +
        '<div class="summary-row"><span>Доставка</span><span>' + (shipping ? formatPrice(shipping) : "Бесплатно") + "</span></div>" +
        (shipping
          ? '<p class="muted" style="font-size:13px">До бесплатной доставки: ' + formatPrice(FREE_SHIPPING_FROM - sub) + "</p>"
          : "") +
        '<div class="summary-row summary-total"><span>К оплате</span><span>' + formatPrice(sub + shipping) + "</span></div>" +
        '<a href="' + link("/checkout") + '" class="btn btn-red btn-block" style="margin-top:16px">Оформить заказ</a>' +
        "</aside></div>";
    }

    body.addEventListener("click", function (e) {
      var act = e.target.getAttribute("data-act");
      if (!act) return;
      var items = load();
      var idx = Number(e.target.getAttribute("data-idx"));
      if (act === "remove") items.splice(idx, 1);
      if (act === "dec") items[idx].quantity = Math.max(1, items[idx].quantity - 1);
      if (act === "inc") items[idx].quantity += 1;
      save(items);
      render();
    });
    body.addEventListener("change", function (e) {
      if (e.target.tagName !== "INPUT") return;
      var items = load();
      items[Number(e.target.getAttribute("data-idx"))].quantity = Math.max(1, Number(e.target.value) || 1);
      save(items);
      render();
    });
    render();
  }

  function checkoutPage() {
    var container = document.querySelector("main .container");
    var head = container.querySelector(".page-head");
    var items = load();
    container.innerHTML = "";
    container.appendChild(head);
    var body = document.createElement("div");
    container.appendChild(body);
    if (!items.length) {
      body.innerHTML = emptyCart("Корзина пуста");
      return;
    }
    var sub = subtotal(items);
    var shipping = shippingFor(sub);
    body.innerHTML =
      '<form class="cart" id="demo-checkout"><div><h3>Получатель</h3><div class="field-row">' +
      '<div class="field"><label for="fullName">ФИО</label><input id="fullName" name="fullName" required></div>' +
      '<div class="field"><label for="phone">Телефон</label><input id="phone" name="phone" type="tel" placeholder="+7 900 000-00-00" required></div>' +
      '</div><h3>Доставка</h3><div class="field"><label for="address">Адрес</label>' +
      '<textarea id="address" name="address" placeholder="Город, улица, дом, квартира, индекс" required></textarea></div>' +
      '<div class="notice">Тестовый режим оплаты: реальные деньги не списываются.</div></div>' +
      '<aside class="summary"><h3>Ваш заказ</h3>' +
      items
        .map(function (i) {
          return (
            '<div class="summary-row" style="font-size:14px"><span>' + esc(i.name) + " · " + esc(i.size) + " × " + i.quantity +
            "</span><span>" + formatPrice(i.price * i.quantity) + "</span></div>"
          );
        })
        .join("") +
      '<div class="summary-row"><span>Доставка</span><span>' + (shipping ? formatPrice(shipping) : "Бесплатно") + "</span></div>" +
      '<div class="summary-row summary-total"><span>К оплате</span><span>' + formatPrice(sub + shipping) + "</span></div>" +
      '<button class="btn btn-red btn-block" style="margin-top:16px">Перейти к оплате</button></aside></form>';
  }

  // --- каталог: сортировка и поиск ---

  function catalogPage() {
    var select = document.querySelector(".toolbar select");
    if (select) {
      select.addEventListener("change", function () {
        var q = Object.assign({}, DEMO.query, { sort: select.value });
        if (q.sort === "new") delete q.sort;
        var parts = Object.keys(q)
          .filter(function (k) {
            return k !== "q" && q[k];
          })
          .sort()
          .map(function (k) {
            return k + "-" + q[k];
          });
        location.href = link("/catalog" + (parts.length ? "/" + parts.join("_") : ""));
      });
    }

    var search = new URLSearchParams(location.search).get("q");
    if (!search) return;
    var needle = search.trim().toLowerCase();
    var cards = document.querySelectorAll(".grid .card");
    var shown = 0;
    cards.forEach(function (card) {
      var text = (card.querySelector(".card-name") || card).textContent.toLowerCase();
      var match = text.indexOf(needle) !== -1;
      card.style.display = match ? "" : "none";
      if (match) shown++;
    });
    var h1 = document.querySelector(".page-head h1");
    if (h1) h1.textContent = "Поиск: " + search;
    var count = document.querySelector(".toolbar span");
    if (count) count.textContent = shown + " товаров";
    if (!shown) {
      var grid = document.querySelector(".grid");
      var p = document.createElement("p");
      p.className = "empty";
      p.textContent = "Ничего не найдено";
      grid.after(p);
    }
    document.querySelectorAll('input[name="q"]').forEach(function (i) {
      i.value = search;
    });
  }

  // --- формы, которым нужен сервер ---

  function blockForms() {
    document.addEventListener(
      "submit",
      function (e) {
        var form = e.target;
        if (form.classList.contains("search")) return;
        e.preventDefault();
        if (form.id === "demo-checkout") {
          toast("Это демо-версия: заказ и оплата работают только на полной версии сайта с сервером.");
        } else if (DEMO.path.indexOf("/admin") === 0) {
          toast("Это демо-версия: изменения в админке не сохраняются.");
        } else {
          toast("Это демо-версия: вход, регистрация и заказы работают только на полной версии сайта.");
        }
      },
      true,
    );
  }

  banner();
  renderBadge();
  blockForms();
  if (DEMO.path.indexOf("/product/") === 0) productPage();
  if (DEMO.path === "/cart") cartPage();
  if (DEMO.path === "/checkout") checkoutPage();
  if (DEMO.path === "/catalog") catalogPage();
})();

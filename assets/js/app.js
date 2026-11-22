
// ---------- 1. DATA ----------
const IMG = "assets/images/";
const products = [
  { id: 1, name: "Wireless Mouse",      category: "Accessories", price: 12.50,  stock: 20, icon: "bi-mouse",      image: IMG + "accessroies/mouse.png" },
  { id: 2, name: "Keyboard",            category: "Accessories", price: 24.00,  stock: 15, icon: "bi-keyboard",   image: IMG + "accessroies/keyboard.png" },
  { id: 3, name: "USB Flash 64GB",      category: "Storage",     price: 8.75,   stock: 30, icon: "bi-usb-drive",  image: IMG + "storage/flash.png" },
  { id: 4, name: "SSD 1TB NVMe",        category: "Storage",     price: 59.00,  stock: 10, icon: "bi-device-ssd", image: IMG + "storage/ssd.png" },
  { id: 5, name: "Gaming Headset",      category: "Audio",       price: 35.00,  stock: 8,  icon: "bi-headset",    image: IMG + "audio/headset.png" },
  { id: 6, name: "Webcam",              category: "Accessories", price: 29.00,  stock: 12, icon: "bi-webcam",     image: IMG + "accessroies/webcam.png" },
  { id: 7, name: "24-inch Monitor",     category: "Display",     price: 149.00, stock: 5,  icon: "bi-display",    image: IMG + "display/monitor.png" },
  { id: 8, name: "Laptop Core i5",      category: "Laptop",      price: 549.00, stock: 3,  icon: "bi-laptop",     image: IMG + "laptop/laptop.png" },
];

// Business rules
const VAT_RATE = 0.10;                          // 10% VAT
const FREE_DELIVERY_MIN = 100;                  // free delivery when subtotal >= $100
const DELIVERY_FEES = { pp: 1.50, province: 3.00 };
const COUPONS = { SAVE10: 0.10, STUDENT5: 0.05 };
const KHR_RATE = 4100;                          // 1 USD = 4,100 riel

// ---------- 2. STATE ----------
let cart = JSON.parse(localStorage.getItem("qt_cart")) || [];   // [{ id, qty }]
let couponCode = "";              // applied coupon ("" = none)
let deliveryZone = "pp";          // "pp" | "province"
let selectedCategory = "All";
let searchText = "";

function saveCart() {
  localStorage.setItem("qt_cart", JSON.stringify(cart));
}

// ---------- 3. HELPERS ----------
const round2 = (n) => Math.round(n * 100) / 100;
const money = (n) => "$" + n.toFixed(2);
const riel = (n) => n.toLocaleString("en-US") + " ៛";
const findProduct = (id) => products.find((p) => p.id === id);
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const toast = new bootstrap.Toast(document.getElementById("cartToast"), { delay: 1800 });
function showToast(message) {
  document.getElementById("toastMessage").textContent = message;
  toast.show();
}

// ---------- TASK 1 & 2: RENDER PRODUCTS (+ filter & search) ----------
function renderCategories() {
  const categories = ["All", ...new Set(products.map((p) => p.category))];
  document.getElementById("categoryFilter").innerHTML = categories.map((c) => `
    <button type="button" data-category="${c}"
      class="btn btn-sm ${c === selectedCategory ? "btn-primary" : "btn-outline-primary"}">${c}</button>
  `).join("");
}

function renderProducts() {
  const list = products.filter((p) =>
    (selectedCategory === "All" || p.category === selectedCategory) &&
    p.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const container = document.getElementById("productList");
  if (list.length === 0) {
    container.innerHTML = `<div class="col-12"><div class="alert alert-secondary">No products found.</div></div>`;
    return;
  }

  container.innerHTML = list.map((p) => {
    const inCart = cart.find((item) => item.id === p.id)?.qty || 0;
    const left = p.stock - inCart;
    return `
      <div class="col">
        <div class="card h-100 border-0 shadow-sm product-card">
          <div class="product-img-wrap">
            <img src="${p.image}" alt="${p.name}" class="product-img" loading="lazy">
          </div>
          <div class="card-body text-center">
            <span class="badge text-bg-secondary d-block mx-auto mb-2" style="width: fit-content">${p.category}</span>
            <h5 class="card-title h6">${p.name}</h5>
            <p class="fs-5 fw-bold text-success mb-1">${money(p.price)}</p>
            <small class="${left > 0 ? "text-muted" : "text-danger"}">
              ${left > 0 ? `In stock: ${left}` : "Out of stock"}
            </small>
          </div>
          <div class="card-footer bg-white border-0 pb-3">
            <button class="btn btn-primary w-100" data-add="${p.id}" ${left <= 0 ? "disabled" : ""}>
              <i class="bi bi-cart-plus me-1"></i>Add to cart
            </button>
          </div>
        </div>
      </div>`;
  }).join("");
}

// ---------- TASK 3 & 5: CART ACTIONS ----------
function addToCart(id) {
  const product = findProduct(id);
  const item = cart.find((i) => i.id === id);

  if (item) {
    if (item.qty >= product.stock) {
      showToast(`Only ${product.stock} ${product.name} in stock`);
      return;
    }
    item.qty++;
  } else {
    cart.push({ id, qty: 1 });
  }
  saveCart();
  updateUI();
  showToast(`${product.name} added to cart`);
}

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  const product = findProduct(id);

  if (delta > 0 && item.qty >= product.stock) {
    showToast(`Only ${product.stock} ${product.name} in stock`);
    return;
  }
  item.qty += delta;
  if (item.qty <= 0) {
    removeItem(id);
    return;
  }
  saveCart();
  updateUI();
}

function removeItem(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  updateUI();
}

function clearCart() {
  cart = [];
  couponCode = "";
  document.getElementById("couponInput").value = "";
  document.getElementById("couponMessage").innerHTML = "";
  saveCart();
  updateUI();
}

// ---------- TASK 6: CALCULATION ----------
function calcTotals() {
  const subtotal = round2(cart.reduce((sum, item) => sum + findProduct(item.id).price * item.qty, 0));
  const discountRate = COUPONS[couponCode] || 0;
  const discount = round2(subtotal * discountRate);
  const afterDiscount = round2(subtotal - discount);
  const vat = round2(afterDiscount * VAT_RATE);
  let delivery = 0;
  if (cart.length > 0 && subtotal < FREE_DELIVERY_MIN) {
    delivery = DELIVERY_FEES[deliveryZone];
  }
  const total = round2(afterDiscount + vat + delivery);
  const totalKHR = Math.round((total * KHR_RATE) / 100) * 100;   // round to nearest 100 riel
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return { subtotal, discountRate, discount, afterDiscount, vat, delivery, total, totalKHR, itemCount };
}

// ---------- TASK 4: RENDER CART + SUMMARY ----------
function renderCart() {
  const list = document.getElementById("cartItems");

  if (cart.length === 0) {
    list.innerHTML = `
      <li class="list-group-item text-center text-muted py-5 border-0">
        <i class="bi bi-cart3 fs-1 d-block mb-2"></i>Your cart is empty
      </li>`;
  } else {
    list.innerHTML = cart.map((item) => {
      const p = findProduct(item.id);
      return `
        <li class="list-group-item px-0">
          <div class="d-flex align-items-center gap-3">
            <img src="${p.image}" alt="${p.name}" class="cart-thumb">
            <div class="flex-grow-1">
              <div class="fw-semibold">${p.name}</div>
              <small class="text-muted">${money(p.price)} each</small>
            </div>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary" data-qty="-1" data-id="${p.id}"><i class="bi bi-dash-lg"></i></button>
              <span class="btn btn-light disabled qty-box">${item.qty}</span>
              <button class="btn btn-outline-secondary" data-qty="1" data-id="${p.id}"><i class="bi bi-plus-lg"></i></button>
            </div>
            <div class="text-end" style="width: 70px">
              <div class="fw-bold">${money(p.price * item.qty)}</div>
              <button class="btn btn-link btn-sm text-danger p-0" data-remove="${p.id}">Remove</button>
            </div>
          </div>
        </li>`;
    }).join("");
  }

  const t = calcTotals();
  document.getElementById("cartSummary").innerHTML = `
    <div class="d-flex justify-content-between"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
    <div class="d-flex justify-content-between text-success">
      <span>Discount ${couponCode ? `(${couponCode} −${t.discountRate * 100}%)` : ""}</span><span>−${money(t.discount)}</span></div>
    <div class="d-flex justify-content-between"><span>VAT 10%</span><span>${money(t.vat)}</span></div>
    <div class="d-flex justify-content-between"><span>Delivery</span>
      <span>${t.delivery === 0 && cart.length > 0 ? "FREE" : money(t.delivery)}</span></div>
    <hr class="my-2">
    <div class="d-flex justify-content-between fs-5 fw-bold"><span>Total</span><span id="totalUSD">${money(t.total)}</span></div>
    <div class="d-flex justify-content-between text-muted"><span>Total in riel</span><span id="totalKHR">${riel(t.totalKHR)}</span></div>`;

  document.getElementById("cartBadge").textContent = t.itemCount;
  document.getElementById("checkoutBtn").disabled = cart.length === 0;
  document.getElementById("clearCartBtn").disabled = cart.length === 0;
}

function updateUI() {
  renderProducts();
  renderCart();
}

// ---------- TASK 7: COUPON & DELIVERY ----------
function applyCoupon() {
  const code = document.getElementById("couponInput").value.trim().toUpperCase();
  const msg = document.getElementById("couponMessage");

  if (code === "") {
    couponCode = "";
    msg.innerHTML = "";
  } else if (COUPONS[code] !== undefined) {
    couponCode = code;
    msg.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill"></i> ${code} applied: ${COUPONS[code] * 100}% off</span>`;
  } else {
    couponCode = "";
    msg.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> Invalid coupon code</span>`;
  }
  renderCart();
}

// ---------- TASK 9 & 10: CHECKOUT + RECEIPT ----------
const cartPanel = bootstrap.Offcanvas.getOrCreateInstance("#cartPanel");
const checkoutModal = new bootstrap.Modal("#checkoutModal");
const receiptModal = new bootstrap.Modal("#receiptModal");

function openCheckout() {
  if (cart.length === 0) return;
  document.getElementById("checkoutTotal").textContent =
    `${money(calcTotals().total)} (${riel(calcTotals().totalKHR)})`;
  cartPanel.hide();
  checkoutModal.show();
}

function placeOrder(event) {
  event.preventDefault();
  const form = event.target;

  if (!form.checkValidity()) {          // Bootstrap validation
    form.classList.add("was-validated");
    return;
  }

  const t = calcTotals();
  const orderNo = "QT-" + String(Date.now()).slice(-6);
  const order = {
    orderNo,
    date: new Date().toLocaleString("en-GB"),
    name: document.getElementById("customerName").value.trim(),
    phone: document.getElementById("customerPhone").value.trim(),
    address: document.getElementById("customerAddress").value.trim(),
    payment: form.querySelector('input[name="payment"]:checked').value,
    items: cart.map((i) => ({ ...findProduct(i.id), qty: i.qty })),
    totals: t,
  };

  renderReceipt(order);

  // reduce stock, then empty the cart
  order.items.forEach((i) => { findProduct(i.id).stock -= i.qty; });
  clearCart();
  form.reset();
  form.classList.remove("was-validated");

  checkoutModal.hide();
  receiptModal.show();
}

function renderReceipt(o) {
  const t = o.totals;
  const rows = o.items.map((i, n) => `
    <tr>
      <td>${n + 1}</td><td>${i.name}</td>
      <td class="text-center">${i.qty}</td>
      <td class="text-end">${money(i.price)}</td>
      <td class="text-end">${money(i.price * i.qty)}</td>
    </tr>`).join("");

  document.getElementById("receiptBody").innerHTML = `
    <div class="d-flex justify-content-between mb-3">
      <div>
        <h5 class="mb-0">QuickTech Shop</h5>
        <small class="text-muted">Phnom Penh, Cambodia</small>
      </div>
      <div class="text-end">
        <div class="fw-bold">Order ${o.orderNo}</div>
        <small class="text-muted">${o.date}</small>
      </div>
    </div>
    <div class="row small mb-3">
      <div class="col-sm-6"><strong>Customer:</strong> ${escapeHtml(o.name)}<br><strong>Phone:</strong> ${escapeHtml(o.phone)}</div>
      <div class="col-sm-6"><strong>Address:</strong> ${escapeHtml(o.address)}<br><strong>Payment:</strong> ${o.payment}</div>
    </div>
    <table class="table table-sm table-striped align-middle">
      <thead class="table-dark"><tr><th>#</th><th>Product</th><th class="text-center">Qty</th><th class="text-end">Price</th><th class="text-end">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="4" class="text-end">Subtotal</td><td class="text-end">${money(t.subtotal)}</td></tr>
        <tr><td colspan="4" class="text-end">Discount</td><td class="text-end">−${money(t.discount)}</td></tr>
        <tr><td colspan="4" class="text-end">VAT 10%</td><td class="text-end">${money(t.vat)}</td></tr>
        <tr><td colspan="4" class="text-end">Delivery</td><td class="text-end">${money(t.delivery)}</td></tr>
        <tr class="fw-bold fs-5"><td colspan="4" class="text-end">Total (USD)</td><td class="text-end">${money(t.total)}</td></tr>
        <tr class="fw-bold"><td colspan="4" class="text-end">Total (KHR)</td><td class="text-end">${riel(t.totalKHR)}</td></tr>
      </tfoot>
    </table>
    <p class="text-center text-muted small mb-0">Thank you for shopping with QuickTech!</p>`;
}

// ---------- EVENTS (event delegation) ----------
document.getElementById("productList").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (btn) addToCart(Number(btn.dataset.add));
});

document.getElementById("categoryFilter").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-category]");
  if (!btn) return;
  selectedCategory = btn.dataset.category;
  renderCategories();
  renderProducts();
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  searchText = e.target.value;
  renderProducts();
});

document.getElementById("cartItems").addEventListener("click", (e) => {
  const qtyBtn = e.target.closest("[data-qty]");
  const removeBtn = e.target.closest("[data-remove]");
  if (qtyBtn) changeQty(Number(qtyBtn.dataset.id), Number(qtyBtn.dataset.qty));
  if (removeBtn) removeItem(Number(removeBtn.dataset.remove));
});

document.getElementById("applyCouponBtn").addEventListener("click", applyCoupon);
document.getElementById("deliverySelect").addEventListener("change", (e) => {
  deliveryZone = e.target.value;
  renderCart();
});
document.getElementById("clearCartBtn").addEventListener("click", () => {
  if (confirm("Remove all items from the cart?")) clearCart();
});
document.getElementById("checkoutBtn").addEventListener("click", openCheckout);
document.getElementById("checkoutForm").addEventListener("submit", placeOrder);
document.getElementById("printBtn").addEventListener("click", () => window.print());

// ---------- START ----------
renderCategories();
updateUI();

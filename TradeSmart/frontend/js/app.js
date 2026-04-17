const API_URL = "http://localhost:5000/api";
const ALERT_SETTINGS_KEY = "tradesmart-alert-settings";

let latestProducts = [];
let notifiedLowStockIds = new Set();

function formatCurrency(amount) {
    const value = Number(amount) || 0;
    return `Rs. ${value.toFixed(2)}`;
}

function getOrderProductSummary(order) {
    if (!Array.isArray(order.products) || order.products.length === 0) {
        return "No products";
    }

    return order.products
        .map((item) => item?.product?.name || "Unnamed product")
        .join(", ");
}

function getOrderQuantity(order) {
    if (!Array.isArray(order.products) || order.products.length === 0) {
        return 0;
    }

    return order.products.reduce((total, item) => total + (Number(item?.quantity) || 0), 0);
}

function getAlertSettings() {
    try {
        return JSON.parse(localStorage.getItem(ALERT_SETTINGS_KEY)) || {};
    } catch {
        return {};
    }
}

function setAlertSettings(settings) {
    localStorage.setItem(ALERT_SETTINGS_KEY, JSON.stringify(settings));
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildLowStockMessage(product) {
    const settings = getAlertSettings();
    const ownerName = settings.ownerName || "Shop owner";

    return `Hello ${ownerName}, low stock alert for ${product.name}. Only ${product.stock} unit(s) left in your shop. Please restock soon.`;
}

function getLowStockProducts(products = latestProducts) {
    return products.filter((product) => {
        const threshold = Number(product.lowStockThreshold) || 0;
        return Number(product.stock) <= threshold;
    });
}

function updateAlertStatus() {
    const alertStatus = document.getElementById("alertStatus");
    if (!alertStatus) return;

    const settings = getAlertSettings();
    if (settings.mobile) {
        alertStatus.innerHTML = `
            <strong>Alert number saved:</strong> ${escapeHtml(settings.mobile)}<br>
            <span class="metric-note">Messages will be prepared for ${escapeHtml(settings.ownerName || "the shop owner")} when stock becomes low.</span>
        `;
        return;
    }

    alertStatus.textContent = "Save the mobile number once to generate ready-to-send stock warning messages.";
}

function prefillAlertSettings() {
    const settings = getAlertSettings();
    const ownerInput = document.getElementById("shopOwnerName");
    const mobileInput = document.getElementById("shopMobile");

    if (ownerInput) ownerInput.value = settings.ownerName || "";
    if (mobileInput) mobileInput.value = settings.mobile || "";

    updateAlertStatus();
}

function requestNotificationAccess() {
    if (!("Notification" in window)) {
        alert("Browser notifications are not supported on this device.");
        return;
    }

    Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
            alert("Browser alerts enabled for low stock updates.");
        } else {
            alert("Notification permission was not granted.");
        }
    });
}

function notifyLowStock(product) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
    }

    if (notifiedLowStockIds.has(product._id)) {
        return;
    }

    new Notification("TradeSmart Low Stock Alert", {
        body: `${product.name} is down to ${product.stock} unit(s). Restock soon.`,
    });

    notifiedLowStockIds.add(product._id);
}

function renderLowStockAlerts(products = latestProducts) {
    const lowStockList = document.getElementById("lowStockList");
    if (!lowStockList) return;

    const settings = getAlertSettings();
    const lowStockProducts = getLowStockProducts(products);

    if (lowStockProducts.length === 0) {
        lowStockList.innerHTML = `<div class="empty-state">No low stock items right now.</div>`;
        return;
    }

    lowStockList.innerHTML = lowStockProducts.map((product) => {
        const message = buildLowStockMessage(product);
        const encodedMessage = encodeURIComponent(message);
        const smsLink = settings.mobile ? `sms:${encodeURIComponent(settings.mobile)}?body=${encodedMessage}` : "";
        const waLink = settings.mobile ? `https://wa.me/${String(settings.mobile).replace(/\D/g, "")}?text=${encodedMessage}` : "";

        notifyLowStock(product);

        return `
            <div class="alert-item low-stock">
                <strong>${escapeHtml(product.name)}</strong>
                <div class="alert-meta">Stock: ${product.stock} | Alert level: ${product.lowStockThreshold} | Sold today: ${product.soldToday || 0}</div>
                <div class="metric-note">${escapeHtml(message)}</div>
                <div class="alert-actions">
                    ${smsLink ? `<a class="link-chip" href="${smsLink}">Send SMS</a>` : ""}
                    ${waLink ? `<a class="link-chip" href="${waLink}" target="_blank" rel="noreferrer">WhatsApp Alert</a>` : ""}
                </div>
            </div>
        `;
    }).join("");
}

/* =======================
   REGISTER USER
======================= */
function registerUser(e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    })
    .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Registration failed");
        return data;
    })
    .then((data) => {
        alert(data.message || "Registration successful");
        window.location.href = "login.html";
    })
    .catch((err) => {
        console.error("REGISTER ERROR:", err);
        alert(err.message);
    });
}

/* =======================
   LOGIN USER
======================= */
function loginUser(e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    })
    .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Login failed");
        }

        return data;
    })
    .then((data) => {
        if (data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
        }

        if (data.token) {
            localStorage.setItem("token", data.token);
        }

        alert(data.message || "Login successful");
        window.location.href = "dashboard.html";
    })
    .catch((err) => {
        console.error("LOGIN ERROR:", err);
        alert(err.message);
    });
}

/* =======================
   LOAD ORDERS
======================= */
function loadOrders() {
    fetch(`${API_URL}/orders`)
    .then((res) => res.json())
    .then((data) => {
        const table = document.getElementById("ordersTableBody");

        if (!table) return;

        if (!Array.isArray(data)) {
            throw new Error(data.message || "Invalid orders response");
        }

        table.innerHTML = "";

        data.forEach((order) => {
            const productSummary = getOrderProductSummary(order);
            const quantity = getOrderQuantity(order);
            const total = order.totalAmount ?? order.total;
            const orderDate = order.createdAt || order.date;

            table.innerHTML += `
                <tr>
                    <td>${order._id}</td>
                    <td>${productSummary}</td>
                    <td>${quantity}</td>
                    <td>${formatCurrency(total)}</td>
                    <td>${orderDate ? new Date(orderDate).toLocaleDateString() : "-"}</td>
                </tr>
            `;
        });
    })
    .catch((err) => {
        console.error(err);
        alert("Failed to load orders");
    });
}

/* =======================
   LOAD PRODUCTS
======================= */
function loadProducts() {
    fetch(`${API_URL}/products`)
    .then((res) => res.json())
    .then((data) => {
        const table = document.getElementById("productsTableBody");

        if (!table) return;

        if (!Array.isArray(data)) {
            throw new Error(data.message || "Invalid products response");
        }

        latestProducts = data;
        notifiedLowStockIds = new Set();

        table.innerHTML = "";

        data.forEach((product) => {
            const lowStock = Number(product.stock) <= Number(product.lowStockThreshold || 0);

            table.innerHTML += `
                <tr>
                    <td>
                        <div class="metric-stack">
                            <strong>${escapeHtml(product.name)}</strong>
                            <span class="metric-note">${escapeHtml(product._id)}</span>
                        </div>
                    </td>
                    <td>${formatCurrency(product.price)}</td>
                    <td>${escapeHtml(product.category || "-")}</td>
                    <td><span class="stock-badge ${lowStock ? "low" : ""}">${product.stock ?? 0} in stock</span></td>
                    <td>${product.soldToday ?? 0}</td>
                    <td>${product.totalSold ?? 0}</td>
                    <td>${product.lowStockThreshold ?? 0}</td>
                    <td>
                        <form class="sales-form" onsubmit="recordDailySale(event, '${product._id}')">
                            <input type="number" min="1" value="1" name="quantity" aria-label="Daily sold quantity for ${escapeHtml(product.name)}">
                            <button type="submit">Add Daily Sold</button>
                        </form>
                    </td>
                </tr>
            `;
        });

        renderLowStockAlerts(data);
        updateAlertStatus();
    })
    .catch((err) => {
        console.error(err);
        alert("Failed to load products");
    });
}

/* =======================
   ADD PRODUCT
======================= */
function addProduct(e) {
    e.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const price = Number(document.getElementById("productPrice").value);
    const category = document.getElementById("productCategory").value.trim();
    const stock = Number(document.getElementById("productStock").value);
    const lowStockThreshold = Number(document.getElementById("productThreshold").value);

    fetch(`${API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, category, stock, lowStockThreshold })
    })
    .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Add failed");
        return data;
    })
    .then(() => {
        alert("Product added");
        e.target.reset();
        document.getElementById("productThreshold").value = 5;
        loadProducts();
    })
    .catch((err) => {
        console.error(err);
        alert(err.message);
    });
}

/* =======================
   RECORD DAILY SALE
======================= */
function recordDailySale(e, productId) {
    e.preventDefault();

    const form = e.target;
    const quantity = Number(form.quantity.value);

    fetch(`${API_URL}/products/${productId}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity })
    })
    .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not record sale");
        return data;
    })
    .then((data) => {
        form.reset();
        form.quantity.value = 1;
        loadProducts();

        if (data.lowStock) {
            alert(`Low stock warning: ${data.product.name} is now at ${data.product.stock} unit(s).`);
        } else {
            alert(data.message || "Daily sale recorded");
        }
    })
    .catch((err) => {
        console.error(err);
        alert(err.message);
    });
}

/* =======================
   SAVE ALERT SETTINGS
======================= */
function saveAlertSettings(e) {
    e.preventDefault();

    const ownerName = document.getElementById("shopOwnerName").value.trim();
    const mobile = document.getElementById("shopMobile").value.trim();

    setAlertSettings({ ownerName, mobile });
    updateAlertStatus();
    renderLowStockAlerts();
    alert("Stock alert contact saved");
}

/* =======================
   AUTO LOAD
======================= */
window.onload = function () {
    if (window.location.pathname.includes("dashboard.html")) {
        loadOrders();
    }

    if (window.location.pathname.includes("product.html")) {
        prefillAlertSettings();
        loadProducts();
    }
};

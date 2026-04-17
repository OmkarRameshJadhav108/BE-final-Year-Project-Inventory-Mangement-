const API_URL = "http://localhost:5000/api";
const ALERT_SETTINGS_KEY = "tradesmart-alert-settings";
const CRITICAL_ALERTS_KEY = "tradesmart-critical-alerts";
const VERY_LOW_STOCK_LIMIT = 2;

const COMMON_PRODUCT_PRESETS = [
    { name: "Sugar", category: "Grocery", price: 45, stock: 100, lowStockThreshold: 10 },
    { name: "Rice", category: "Grocery", price: 60, stock: 120, lowStockThreshold: 15 },
    { name: "Milk", category: "Dairy", price: 30, stock: 40, lowStockThreshold: 8 },
    { name: "Bread", category: "Bakery", price: 35, stock: 30, lowStockThreshold: 6 },
    { name: "Tea Powder", category: "Beverages", price: 120, stock: 25, lowStockThreshold: 5 },
    { name: "Soap", category: "Home Care", price: 28, stock: 50, lowStockThreshold: 10 }
];

let latestProducts = [];
let notifiedLowStockIds = new Set();
let latestOrders = [];

function encodeSvg(svg) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createProductPhotoSvg(config) {
    return encodeSvg(`
        <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${config.bgStart}" />
                    <stop offset="100%" stop-color="${config.bgEnd}" />
                </linearGradient>
                <linearGradient id="card" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#ffffff" />
                    <stop offset="100%" stop-color="${config.cardEnd}" />
                </linearGradient>
            </defs>
            <rect width="96" height="96" rx="24" fill="url(#bg)" />
            <ellipse cx="48" cy="74" rx="26" ry="8" fill="rgba(20,34,58,0.12)" />
            ${config.body}
            <text x="48" y="84" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="9" font-weight="700" fill="#183153">${config.label}</text>
        </svg>
    `);
}

function getProductImage(product) {
    if (product?.image) {
        return product.image;
    }

    const productName = String(product?.name || "").toLowerCase();

    const photoMap = {
        sugar: createProductPhotoSvg({
            bgStart: "#fff4da",
            bgEnd: "#f4c56d",
            cardEnd: "#f3efe7",
            label: "SUGAR",
            body: `
                <path d="M33 24h30l4 38c0 6-8 10-19 10s-19-4-19-10z" fill="url(#card)" />
                <path d="M36 24h24l-2 8H38z" fill="#d7b57a" />
                <rect x="40" y="42" width="16" height="12" rx="4" fill="#f6d58b" />
                <circle cx="48" cy="48" r="3.5" fill="#ffffff" />
            `
        }),
        rice: createProductPhotoSvg({
            bgStart: "#f4efe3",
            bgEnd: "#c8a97a",
            cardEnd: "#f8f4eb",
            label: "RICE",
            body: `
                <path d="M31 25h34l3 36c0 7-8 12-20 12s-20-5-20-12z" fill="url(#card)" />
                <path d="M35 30h26" stroke="#b18654" stroke-width="3" stroke-linecap="round" />
                <ellipse cx="48" cy="50" rx="10" ry="7" fill="#efe5d3" />
                <circle cx="44" cy="48" r="1.4" fill="#d8ccb3" />
                <circle cx="48" cy="51" r="1.4" fill="#d8ccb3" />
                <circle cx="52" cy="47" r="1.4" fill="#d8ccb3" />
            `
        }),
        milk: createProductPhotoSvg({
            bgStart: "#e3f3ff",
            bgEnd: "#72b9ff",
            cardEnd: "#eef8ff",
            label: "MILK",
            body: `
                <path d="M39 24h18l3 8v27c0 7-5 12-12 12s-12-5-12-12V32z" fill="url(#card)" />
                <rect x="42" y="20" width="12" height="7" rx="2" fill="#3f84d8" />
                <rect x="40" y="41" width="16" height="13" rx="5" fill="#7dc2ff" />
                <path d="M45 45c2-4 4-4 6 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" />
            `
        }),
        bread: createProductPhotoSvg({
            bgStart: "#ffe9d4",
            bgEnd: "#ef9a5d",
            cardEnd: "#fff3e8",
            label: "BREAD",
            body: `
                <rect x="28" y="40" width="40" height="22" rx="11" fill="#d07b35" />
                <path d="M32 40c0-10 8-17 16-17s16 7 16 17" fill="#f2ba7b" />
                <path d="M40 33c1 4 1 8 0 12M48 31c1 5 1 10 0 14M56 33c1 4 1 8 0 12" stroke="#cb8a49" stroke-width="2" stroke-linecap="round" />
            `
        }),
        tea: createProductPhotoSvg({
            bgStart: "#f1eadf",
            bgEnd: "#8b6b45",
            cardEnd: "#f9f6ef",
            label: "TEA",
            body: `
                <rect x="33" y="24" width="30" height="40" rx="6" fill="url(#card)" />
                <rect x="38" y="30" width="20" height="16" rx="4" fill="#8c6a43" />
                <ellipse cx="48" cy="52" rx="9" ry="7" fill="#b98a4d" />
                <path d="M42 52h12" stroke="#fff2d8" stroke-width="2" stroke-linecap="round" />
            `
        }),
        soap: createProductPhotoSvg({
            bgStart: "#e4f7ef",
            bgEnd: "#5fc89f",
            cardEnd: "#f0fffa",
            label: "SOAP",
            body: `
                <rect x="30" y="38" width="36" height="22" rx="11" fill="#8be0bd" />
                <rect x="34" y="42" width="28" height="14" rx="7" fill="#b8f0d9" />
                <circle cx="62" cy="31" r="5" fill="rgba(255,255,255,0.7)" />
                <circle cx="56" cy="26" r="3" fill="rgba(255,255,255,0.6)" />
            `
        })
    };

    if (productName.includes("sugar")) return photoMap.sugar;
    if (productName.includes("rice")) return photoMap.rice;
    if (productName.includes("milk")) return photoMap.milk;
    if (productName.includes("bread")) return photoMap.bread;
    if (productName.includes("tea")) return photoMap.tea;
    if (productName.includes("soap")) return photoMap.soap;

    const paletteByCategory = {
        grocery: ["#fff0c7", "#f6b73c"],
        dairy: ["#e6f4ff", "#53a6ff"],
        bakery: ["#ffe8d7", "#ff9966"],
        beverages: ["#efe7ff", "#8c67ff"],
        "home care": ["#def7ef", "#20a36a"],
        general: ["#e8eef8", "#4f6d8f"]
    };

    const categoryKey = String(product?.category || "general").toLowerCase();
    const [bg, accent] = paletteByCategory[categoryKey] || paletteByCategory.general;
    const initials = String(product?.name || "P")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "P";

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
            <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${bg}" />
                    <stop offset="100%" stop-color="${accent}" />
                </linearGradient>
            </defs>
            <rect width="72" height="72" rx="20" fill="url(#g)" />
            <circle cx="56" cy="16" r="8" fill="rgba(255,255,255,0.45)" />
            <text x="36" y="42" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" fill="#183153">${initials}</text>
        </svg>
    `;

    return encodeSvg(svg);
}

function formatCurrency(amount) {
    const value = Number(amount) || 0;
    return `Rs. ${value.toFixed(2)}`;
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
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

function getOrderStatusLabel(status) {
    const labels = {
        placed: "Placed",
        processing: "Processing",
        shipped: "Shipped",
        delivered: "Delivered"
    };

    return labels[status] || "Placed";
}

function getShopkeeperRelevantOrders(orders = latestOrders) {
    const user = getCurrentUser();
    const userName = String(user?.name || "").trim().toLowerCase();

    if (!userName) return orders;

    return orders.filter((order) => {
        return String(order.shopkeeperName || "").trim().toLowerCase() === userName;
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
        return null;
    }
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

function getCriticalAlertState() {
    try {
        return JSON.parse(localStorage.getItem(CRITICAL_ALERTS_KEY)) || {};
    } catch {
        return {};
    }
}

function setCriticalAlertState(state) {
    localStorage.setItem(CRITICAL_ALERTS_KEY, JSON.stringify(state));
}

function logoutUser() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

function getDashboardRouteForRole(role) {
    if (role === "shopkeeper") return "shopkeeper-dashboard.html";
    if (role === "manufacturer") return "manufacturer-dashboard.html";
    return "dashboard.html";
}

function hydrateMainDashboard() {
    const user = getCurrentUser();
    const role = user?.role || "inventory_manager";

    const eyebrow = document.getElementById("dashboardEyebrow");
    const title = document.getElementById("dashboardTitle");
    const copy = document.getElementById("dashboardCopy");
    const productsLink = document.getElementById("dashboardProductsLink");
    const retailerAlertsLink = document.getElementById("dashboardRetailerAlertsLink");
    const bigRetailerMetrics = document.getElementById("bigRetailerMetrics");
    const bigRetailerSection = document.getElementById("bigRetailerSection");

    if (!eyebrow || !title || !copy || !productsLink) return;

    if (role === "big_retailer") {
        eyebrow.textContent = "Big Retailer Dashboard";
        title.textContent = "Control Stock, Alerts, and Shopkeeper Refill";
        copy.textContent = "Track branch inventory, catch low-stock shops early, call shopkeepers quickly, and move straight into replenishment actions from one dashboard.";
        productsLink.textContent = "Manage Branch Products";

        if (retailerAlertsLink) {
            retailerAlertsLink.textContent = "Retailer Stock";
        }
        return;
    }

    eyebrow.textContent = "Inventory Manager Dashboard";
    title.textContent = "Control Stock, Alerts, and Shop Flow";
    copy.textContent = "Track total inventory, catch low-stock risks early, and move directly into product planning and replenishment actions.";
    productsLink.textContent = "Manage Products";

    if (retailerAlertsLink) {
        retailerAlertsLink.textContent = "Retailer Stock";
    }
}

function hydrateProductPageNavigation() {
    const backLink = document.getElementById("productBackLink");
    if (!backLink) return;

    const eyebrow = document.getElementById("productPageEyebrow");
    const title = document.getElementById("productPageTitle");
    const copy = document.getElementById("productPageCopy");
    const user = getCurrentUser();
    const role = user?.role || "inventory_manager";
    const dashboardRoute = getDashboardRouteForRole(role);

    backLink.href = dashboardRoute;

    if (role === "big_retailer") {
        backLink.textContent = "Open Dashboard";
        if (eyebrow) eyebrow.textContent = "Big Retailer Branch Control";
        if (title) title.textContent = "Manage Branch Products";
        if (copy) copy.textContent = "Add products for each branch, assign shopkeepers, and return to the main dashboard to see low-stock branches, critical items, and refill actions.";
        return;
    }

    if (role === "shopkeeper") {
        backLink.textContent = "Open Shopkeeper Dashboard";
        if (eyebrow) eyebrow.textContent = "Shopkeeper Stock Control";
        if (copy) copy.textContent = "Track daily sold units, watch low stock live, and return to the shopkeeper dashboard for quick sales and shelf updates.";
        return;
    }

    backLink.textContent = "Open Inventory Dashboard";
}

function getLowStockProducts(products = latestProducts) {
    return products.filter((product) => {
        const threshold = Number(product.lowStockThreshold) || 0;
        return Number(product.stock) <= threshold;
    });
}

function getStockTone(product) {
    const stock = Number(product.stock) || 0;
    const threshold = Number(product.lowStockThreshold) || 0;

    if (stock <= threshold) return "low";
    if (stock <= threshold + 5) return "medium";
    return "healthy";
}

function buildWhatsAppLink(number, message) {
    const digits = String(number || "").replace(/\D/g, "");
    if (!digits) return "";
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function buildTelLink(number) {
    const digits = String(number || "").replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : "";
}

function buildMapLink(address) {
    const query = String(address || "").trim();
    return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

function buildQuickOrderPayload(product, quantity) {
    const user = getCurrentUser();
    const branchName = product.shopName || "Main Branch";
    const branchAddress = product.shopAddress || "";
    const shopkeeperName = product.assignedShopkeeper || user?.name || "Shopkeeper";

    return {
        retailerName: "Retailer Team",
        shopkeeperName,
        branchName,
        branchAddress,
        shopkeeperGstin: product.shopkeeperGstin || "",
        driverName: product.driverName || "",
        driverPhone: product.driverPhone || "",
        paymentMethod: product.preferredPaymentMethod || "UPI",
        paymentStatus: "pending",
        shipmentStatus: "placed",
        trackingNote: `Quick low stock order for ${product.name}`,
        expectedShipmentDate: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)).toISOString(),
        products: [
            {
                product: product._id,
                quantity
            }
        ]
    };
}

function submitLowStockOrder(product, quantity) {
    const payload = buildQuickOrderPayload(product, quantity);

    return fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Failed to place order");
        return data;
    });
}

function renderShopkeeperPlacedOrders(orders = latestOrders) {
    const container = document.getElementById("shopkeeperPlacedOrders");
    if (!container) return;

    const relevantOrders = getShopkeeperRelevantOrders(orders)
        .slice()
        .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

    container.innerHTML = relevantOrders.length === 0
        ? `<div class="empty-state">No placed low stock orders yet.</div>`
        : relevantOrders.map((order) => {
            const productSummary = getOrderProductSummary(order);
            const mapLink = buildMapLink(order.branchAddress);
            const driverLink = buildTelLink(order.driverPhone);

            return `
                <div class="alert-item">
                    <strong>${escapeHtml(order.billNumber || order._id)}</strong>
                      <div class="alert-meta">${escapeHtml(order.branchName || "Main Branch")} | ${escapeHtml(getOrderStatusLabel(order.shipmentStatus))}</div>
                      <div class="metric-note">${escapeHtml(productSummary)}</div>
                      <div class="metric-note">Placed: ${escapeHtml(formatDate(order.createdAt))} | Expected: ${escapeHtml(formatDate(order.expectedShipmentDate))} | Total: ${escapeHtml(formatCurrency(order.totalAmount))}</div>
                      <div class="metric-note">GSTIN: ${escapeHtml(order.shopkeeperGstin || "-")} | Payment: ${escapeHtml(order.paymentMethod || "-")} (${escapeHtml(order.paymentStatus || "pending")})</div>
                      <div class="alert-actions">
                        <button type="button" class="inline-action-button" onclick="openOrderBill('${order._id}')">View Bill</button>
                        ${mapLink ? `<a class="link-chip" href="${mapLink}" target="_blank" rel="noreferrer">Map</a>` : ""}
                        ${driverLink ? `<a class="link-chip" href="${driverLink}">Driver</a>` : ""}
                    </div>
                </div>
            `;
        }).join("");
}

function openOrderBill(orderId) {
    const order = latestOrders.find((item) => item._id === orderId);
    if (!order) {
        alert("Bill not found for this order");
        return;
    }

    const billWindow = window.open("", "_blank", "width=900,height=700");
    if (!billWindow) {
        alert("Please allow popups to view the bill");
        return;
    }

    const productLines = Array.isArray(order.products)
        ? order.products.map((item) => {
            const productName = item?.product?.name || "Unnamed product";
            const quantity = Number(item?.quantity) || 0;
            const price = Number(item?.product?.price) || 0;
            const lineTotal = quantity * price;

            return `
                <tr>
                    <td>${escapeHtml(productName)}</td>
                    <td>${quantity}</td>
                    <td>${escapeHtml(formatCurrency(price))}</td>
                    <td>${escapeHtml(formatCurrency(lineTotal))}</td>
                </tr>
            `;
        }).join("")
        : "";

    billWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>TradeSmart Bill ${escapeHtml(order.billNumber || order._id)}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #1f2a3d; }
                .bill-shell { max-width: 860px; margin: 0 auto; }
                .bill-head { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
                .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #eef4ff; color: #2457b7; font-weight: 700; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #dbe4f0; padding: 10px; text-align: left; }
                th { background: #1d4f91; color: #fff; }
                .total { margin-top: 20px; text-align: right; font-size: 1.1rem; font-weight: 700; }
                .meta { color: #667085; margin-top: 6px; }
                .actions { margin-top: 24px; }
                button { padding: 10px 16px; border: none; border-radius: 10px; background: #1f63d8; color: #fff; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="bill-shell">
                <div class="bill-head">
                    <div>
                        <h1>TradeSmart Bill</h1>
                        <div class="meta">Bill No: ${escapeHtml(order.billNumber || order._id)}</div>
                        <div class="meta">Placed Date: ${escapeHtml(formatDate(order.createdAt))}</div>
                        <div class="meta">Expected Shipment: ${escapeHtml(formatDate(order.expectedShipmentDate))}</div>
                    </div>
                    <div>
                        <span class="badge">${escapeHtml(getOrderStatusLabel(order.shipmentStatus))}</span>
                    </div>
                </div>
                <div class="meta">Branch: ${escapeHtml(order.branchName || "-")}</div>
                <div class="meta">Address: ${escapeHtml(order.branchAddress || "-")}</div>
                <div class="meta">Shopkeeper: ${escapeHtml(order.shopkeeperName || "-")}</div>
                <div class="meta">Shopkeeper GSTIN: ${escapeHtml(order.shopkeeperGstin || "-")}</div>
                <div class="meta">Payment Method: ${escapeHtml(order.paymentMethod || "-")}</div>
                <div class="meta">Payment Status: ${escapeHtml(order.paymentStatus || "pending")}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Line Total</th>
                        </tr>
                    </thead>
                    <tbody>${productLines}</tbody>
                </table>
                <div class="total">Grand Total: ${escapeHtml(formatCurrency(order.totalAmount))}</div>
                <div class="actions">
                    <button onclick="window.print()">Print Bill</button>
                </div>
            </div>
        </body>
        </html>
    `);
    billWindow.document.close();
}

function buildRetailerLowStockMessage(product) {
    const settings = getAlertSettings();
    const retailerName = settings.retailerName || "Retailer";
    return `Hello ${retailerName}, ${product.name} stock is low at ${product.stock} units. Please arrange restocking for the shop.`;
}

function buildShopkeeperLowStockMessage(product) {
    const settings = getAlertSettings();
    const shopkeeperName = settings.shopkeeperName || "Shopkeeper";
    return `Hello ${shopkeeperName}, ${product.name} is now low in inventory with only ${product.stock} units left. Please manage the shelf carefully and inform the retailer.`;
}

function buildCriticalRetailerMessage(product) {
    const settings = getAlertSettings();
    const retailerName = settings.retailerName || "Retailer";
    return `Urgent alert for ${retailerName}: ${product.name} stock is critically low with only ${product.stock} units left. Please restock immediately.`;
}

function buildCriticalShopkeeperMessage(product) {
    const settings = getAlertSettings();
    const shopkeeperName = settings.shopkeeperName || "Shopkeeper";
    return `Urgent alert for ${shopkeeperName}: ${product.name} has reached very low stock at ${product.stock} units. Please update the shelf and contact the retailer now.`;
}

function isVeryLowStock(product) {
    const stock = Number(product.stock) || 0;
    const threshold = Number(product.lowStockThreshold) || 0;
    const criticalLevel = Math.min(Math.max(threshold, 1), VERY_LOW_STOCK_LIMIT);
    return stock <= criticalLevel;
}

function triggerAutomaticWhatsAppAlerts(products = latestProducts) {
    const settings = getAlertSettings();
    const retailerLinkable = Boolean(String(settings.retailerMobile || "").replace(/\D/g, ""));
    const shopkeeperLinkable = Boolean(String(settings.shopkeeperMobile || "").replace(/\D/g, ""));

    if (!retailerLinkable && !shopkeeperLinkable) {
        return;
    }

    const criticalProducts = products.filter((product) => isVeryLowStock(product));
    if (criticalProducts.length === 0) {
        return;
    }

    const alertState = getCriticalAlertState();

    criticalProducts.forEach((product) => {
        const stateKey = `${product._id}:${product.stock}`;
        if (alertState[stateKey]) {
            return;
        }

        const retailerLink = buildWhatsAppLink(settings.retailerMobile, buildCriticalRetailerMessage(product));
        const shopkeeperLink = buildWhatsAppLink(settings.shopkeeperMobile, buildCriticalShopkeeperMessage(product));

        if (retailerLink) {
            window.open(retailerLink, "_blank", "noopener,noreferrer");
        }

        if (shopkeeperLink) {
            window.open(shopkeeperLink, "_blank", "noopener,noreferrer");
        }

        alertState[stateKey] = true;
    });

    setCriticalAlertState(alertState);
}

function updateAlertStatus() {
    const alertStatus = document.getElementById("alertStatus");
    if (!alertStatus) return;

    const settings = getAlertSettings();
    if (settings.retailerMobile || settings.shopkeeperMobile) {
        alertStatus.innerHTML = `
            <strong>Retailer WhatsApp:</strong> ${escapeHtml(settings.retailerMobile || "Not saved")}<br>
            <strong>Shopkeeper WhatsApp:</strong> ${escapeHtml(settings.shopkeeperMobile || "Not saved")}<br>
            <span class="metric-note">Low stock messages will be prepared for both roles automatically. Very low stock opens WhatsApp drafts automatically.</span>
        `;
        return;
    }

    alertStatus.textContent = "Save the WhatsApp numbers once to generate ready-to-send stock warning messages. Very low stock can auto-open WhatsApp drafts.";
}

function prefillAlertSettings() {
    const settings = getAlertSettings();

    const retailerName = document.getElementById("retailerName");
    const retailerMobile = document.getElementById("retailerMobile");
    const shopkeeperName = document.getElementById("shopkeeperName");
    const shopkeeperMobile = document.getElementById("shopkeeperMobile");

    if (retailerName) retailerName.value = settings.retailerName || "";
    if (retailerMobile) retailerMobile.value = settings.retailerMobile || "";
    if (shopkeeperName) shopkeeperName.value = settings.shopkeeperName || "";
    if (shopkeeperMobile) shopkeeperMobile.value = settings.shopkeeperMobile || "";

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
        body: `${product.name} is down to ${product.stock} unit(s). Restock soon.`
    });

    notifiedLowStockIds.add(product._id);
}

function renderProductPresets() {
    const presetsContainer = document.getElementById("productPresets");
    if (!presetsContainer) return;

    presetsContainer.innerHTML = COMMON_PRODUCT_PRESETS.map((preset) => `
        <button type="button" class="preset-chip" onclick='applyProductPreset(${JSON.stringify(preset)})'>
            <img class="preset-thumb" src="${getProductImage(preset)}" alt="${escapeHtml(preset.name)}">
            <span>${escapeHtml(preset.name)}</span>
        </button>
    `).join("");
}

function applyProductPreset(preset) {
    document.getElementById("productName").value = preset.name;
    document.getElementById("productPrice").value = preset.price;
    document.getElementById("productCategory").value = preset.category;
    document.getElementById("productStock").value = preset.stock;
    document.getElementById("productThreshold").value = preset.lowStockThreshold;
}

function renderLowStockAlerts(products = latestProducts) {
    const lowStockList = document.getElementById("lowStockList");
    const inventoryLowStockList = document.getElementById("inventoryLowStockList");
    const targets = [lowStockList, inventoryLowStockList].filter(Boolean);
    if (targets.length === 0) return;

    const settings = getAlertSettings();
    const lowStockProducts = getLowStockProducts(products);

    const html = lowStockProducts.length === 0
        ? `<div class="empty-state">No low stock items right now.</div>`
        : lowStockProducts.map((product) => {
            const retailerMessage = buildRetailerLowStockMessage(product);
            const shopkeeperMessage = buildShopkeeperLowStockMessage(product);
            const retailerLink = buildWhatsAppLink(settings.retailerMobile, retailerMessage);
            const shopkeeperLink = buildWhatsAppLink(settings.shopkeeperMobile, shopkeeperMessage);
            const mapLink = buildMapLink(product.shopAddress);

            notifyLowStock(product);

            return `
                <div class="alert-item low-stock">
                    <strong>${escapeHtml(product.name)}</strong>
                    <div class="alert-meta">Stock: ${product.stock} | Alert level: ${product.lowStockThreshold} | Sold today: ${product.soldToday || 0}</div>
                    <div class="metric-note">${escapeHtml(product.shopAddress || "No branch address saved")}</div>
                    <div class="metric-note">${escapeHtml(retailerMessage)}</div>
                    <div class="alert-actions">
                        ${retailerLink ? `<a class="link-chip" href="${retailerLink}" target="_blank" rel="noreferrer">WhatsApp Retailer</a>` : ""}
                        ${shopkeeperLink ? `<a class="link-chip" href="${shopkeeperLink}" target="_blank" rel="noreferrer">WhatsApp Shopkeeper</a>` : ""}
                        ${mapLink ? `<a class="link-chip" href="${mapLink}" target="_blank" rel="noreferrer">Map</a>` : ""}
                    </div>
                </div>
            `;
        }).join("");

    targets.forEach((target) => {
        target.innerHTML = html;
    });
}

function renderInventoryManagerMetrics(products) {
    const totalProducts = document.getElementById("metricTotalProducts");
    if (!totalProducts) return;

    const stockUnits = products.reduce((sum, product) => sum + (Number(product.stock) || 0), 0);
    const lowStockCount = getLowStockProducts(products).length;
    const stockValue = products.reduce((sum, product) => sum + ((Number(product.price) || 0) * (Number(product.stock) || 0)), 0);

    document.getElementById("metricTotalProducts").textContent = products.length;
    document.getElementById("metricStockUnits").textContent = stockUnits;
    document.getElementById("metricLowStock").textContent = lowStockCount;
    document.getElementById("metricStockValue").textContent = formatCurrency(stockValue);

    const dashboardMapLink = document.getElementById("dashboardMapLink");
    if (dashboardMapLink) {
        const priorityProduct = getLowStockProducts(products).find((product) => String(product.shopAddress || "").trim());
        const mapLink = buildMapLink(priorityProduct?.shopAddress) || "https://www.google.com/maps";
        dashboardMapLink.href = mapLink;
        dashboardMapLink.textContent = priorityProduct?.shopAddress ? "Open Branch Map" : "Open Map";
    }
}

function renderShopkeeperDashboard(products) {
    const soldTodayEl = document.getElementById("shopkeeperSoldToday");
    if (!soldTodayEl) return;

    const soldToday = products.reduce((sum, product) => sum + (Number(product.soldToday) || 0), 0);
    const lowStock = getLowStockProducts(products);

    soldTodayEl.textContent = soldToday;
    document.getElementById("shopkeeperLowStock").textContent = lowStock.length;
    document.getElementById("shopkeeperProducts").textContent = products.length;

    const quickSales = document.getElementById("shopkeeperQuickSales");
    quickSales.innerHTML = products.slice(0, 8).map((product) => `
        <div class="quick-sale-card">
            <div>
                <strong>${escapeHtml(product.name)}</strong>
                <div class="metric-note">${escapeHtml(product.category || "General")} | ${product.stock} left</div>
            </div>
            <form class="sales-form" onsubmit="recordDailySale(event, '${product._id}')">
                <input type="number" min="1" value="1" name="quantity" aria-label="Daily sold quantity for ${escapeHtml(product.name)}">
                <button type="submit">Sold</button>
            </form>
        </div>
    `).join("");

    const stockBoard = document.getElementById("shopkeeperStockBoard");
    stockBoard.innerHTML = products.map((product) => {
        const tone = getStockTone(product);
        const toneLabel = tone === "low" ? "Low stock" : tone === "medium" ? "Watch stock" : "Healthy stock";

        return `
            <div class="stock-board-item ${tone}">
                <strong>${escapeHtml(product.name)}</strong>
                <div class="alert-meta">${product.stock} units left</div>
                <div class="metric-note">${toneLabel}</div>
            </div>
        `;
    }).join("");

    const orderQueue = document.getElementById("shopkeeperOrderQueue");
    if (orderQueue) {
        orderQueue.innerHTML = lowStock.length === 0
            ? `<div class="empty-state">No low stock items need retailer orders right now.</div>`
            : lowStock.map((product) => {
                const mapLink = buildMapLink(product.shopAddress);
                return `
                    <div class="alert-item low-stock">
                        <strong>${escapeHtml(product.name)}</strong>
                        <div class="alert-meta">${escapeHtml(product.shopName || "Main Branch")} | ${product.stock} left | Alert level ${product.lowStockThreshold || 0}</div>
                        <div class="metric-note">${escapeHtml(product.shopAddress || "No branch address saved")}</div>
                        <form class="sales-form reorder-form" onsubmit="placeLowStockOrder(event, '${product._id}')">
                            <input type="number" min="1" value="${Math.max(1, Number(product.lowStockThreshold) || 1)}" name="quantity" aria-label="Reorder quantity for ${escapeHtml(product.name)}">
                            <button type="submit">Place Reorder</button>
                        </form>
                        <div class="alert-actions">
                            ${product.shopkeeperPhone ? `<a class="link-chip" href="${buildTelLink(product.shopkeeperPhone)}">Call Retailer Side</a>` : ""}
                            ${mapLink ? `<a class="link-chip" href="${mapLink}" target="_blank" rel="noreferrer">Map</a>` : ""}
                        </div>
                    </div>
                `;
            }).join("");
    }
}

function renderBigRetailerDashboard(products) {
    const shopsMetric = document.getElementById("bigRetailerShops");
    if (!shopsMetric) return;

    const branchMap = new Map();
    const shopkeeperMap = new Map();
    const lowStockProducts = getLowStockProducts(products);

    products.forEach((product) => {
        const shopName = product.shopName || "Main Branch";
        const shopkeeperName = product.assignedShopkeeper || "Unassigned Shopkeeper";
        const phone = product.shopkeeperPhone || "";
        const key = `${shopName}::${shopkeeperName}`;

        if (!branchMap.has(key)) {
            branchMap.set(key, {
                shopName,
                shopkeeperName,
                phone,
                products: []
            });
        }

        branchMap.get(key).products.push(product);
        shopkeeperMap.set(key, true);
    });

    const branchEntries = Array.from(branchMap.values());
    const lowBranchEntries = branchEntries.filter((branch) =>
        branch.products.some((product) => Number(product.stock) <= Number(product.lowStockThreshold || 0))
    );
    const criticalItems = products.filter((product) => isVeryLowStock(product)).length;

    document.getElementById("bigRetailerShops").textContent = new Set(branchEntries.map((branch) => branch.shopName)).size;
    document.getElementById("bigRetailerShopkeepers").textContent = shopkeeperMap.size;
    document.getElementById("bigRetailerLowBranches").textContent = lowBranchEntries.length;
    document.getElementById("bigRetailerCriticalItems").textContent = criticalItems;

    const alertBox = document.getElementById("bigRetailerAlertBox");
    if (alertBox) {
        alertBox.textContent = lowStockProducts.length === 0
            ? "No low stock items right now."
            : `Low stock alert: ${lowStockProducts.length} product(s) need refill attention.`;
    }

    const stockTable = document.getElementById("bigRetailerStockTable");
    if (stockTable) {
        stockTable.innerHTML = lowStockProducts.length === 0
            ? `<tr><td colspan="8">No low stock products right now.</td></tr>`
            : lowStockProducts.map((product) => {
                const stock = Number(product.stock) || 0;
                const minLimit = Number(product.lowStockThreshold) || 0;
                const shopName = product.shopName || "Main Branch";
                const shopAddress = product.shopAddress || "";
                const shopkeeperName = product.assignedShopkeeper || "Unassigned Shopkeeper";
                const phone = product.shopkeeperPhone || "";
                const driverName = product.driverName || "No driver assigned";
                const driverPhone = product.driverPhone || "";
                const manufacturerName = product.manufacturerName || "No manufacturer set";
                const manufacturerPhone = product.manufacturerPhone || "";
                const message = `Hello ${shopkeeperName}, ${product.name} stock is low at ${stock} units in ${shopName}. Please refill this item quickly.`;
                const callLink = buildTelLink(phone);
                const whatsappLink = buildWhatsAppLink(phone, message);
                const mapLink = buildMapLink(shopAddress);
                const driverLink = buildTelLink(driverPhone);
                const manufacturerMessage = `Hello ${manufacturerName}, ${product.name} is low at ${shopName}. Please support the retailer with replenishment.`;
                const manufacturerLink = buildWhatsAppLink(manufacturerPhone, manufacturerMessage) || buildTelLink(manufacturerPhone);

                return `
                    <tr class="low-stock-row">
                        <td>${escapeHtml(product.name)}</td>
                        <td>${escapeHtml(shopName)}</td>
                        <td>${escapeHtml(shopkeeperName)}</td>
                        <td>
                            <div class="metric-stack">
                                <strong>${escapeHtml(phone || "-")}</strong>
                                <span class="metric-note">${escapeHtml(shopAddress || "No branch address")}</span>
                            </div>
                        </td>
                        <td>${stock}</td>
                        <td>${minLimit}</td>
                        <td><span class="status-pill low">LOW STOCK</span></td>
                        <td>
                            <div class="action-group">
                                ${callLink ? `<a class="action-chip call" href="${callLink}">Call Shopkeeper</a>` : ""}
                                ${whatsappLink ? `<a class="action-chip whatsapp" href="${whatsappLink}" target="_blank" rel="noreferrer">WhatsApp</a>` : ""}
                                ${mapLink ? `<a class="action-chip map" href="${mapLink}" target="_blank" rel="noreferrer">Map</a>` : ""}
                                ${driverLink ? `<a class="action-chip driver" href="${driverLink}">Driver: ${escapeHtml(driverName)}</a>` : ""}
                                ${manufacturerLink ? `<a class="action-chip manufacturer" href="${manufacturerLink}" target="_blank" rel="noreferrer">Manufacturer Team</a>` : ""}
                            </div>
                        </td>
                    </tr>
                `;
            }).join("");
    }

    const branchBoard = document.getElementById("bigRetailerBranchBoard");
    branchBoard.innerHTML = branchEntries.map((branch) => {
        const criticalCount = branch.products.filter((product) => isVeryLowStock(product)).length;
        const lowCount = branch.products.filter((product) =>
            Number(product.stock) <= Number(product.lowStockThreshold || 0)
        ).length;
        const tone = criticalCount > 0 ? "low" : lowCount > 0 ? "medium" : "healthy";

        return `
            <div class="stock-board-item ${tone}">
                <strong>${escapeHtml(branch.shopName)}</strong>
                <div class="alert-meta">${escapeHtml(branch.shopkeeperName)}</div>
                <div class="metric-note">${lowCount} low stock item(s) | ${criticalCount} critical item(s)</div>
            </div>
        `;
    }).join("");
}

function renderManufacturerDashboard(products) {
    const requestsMetric = document.getElementById("manufacturerRequests");
    if (!requestsMetric) return;

    const lowStockProducts = getLowStockProducts(products);
    const criticalItems = lowStockProducts.filter((product) => isVeryLowStock(product)).length;
    const branches = new Set(lowStockProducts.map((product) => product.shopName || "Main Branch"));
    const teams = new Set(lowStockProducts.map((product) => product.manufacturerName || "Unassigned Manufacturer"));

    requestsMetric.textContent = lowStockProducts.length;
    document.getElementById("manufacturerCritical").textContent = criticalItems;
    document.getElementById("manufacturerBranches").textContent = branches.size;
    document.getElementById("manufacturerTeams").textContent = teams.size;

    const alertBox = document.getElementById("manufacturerAlertBox");
    if (alertBox) {
        alertBox.textContent = lowStockProducts.length === 0
            ? "No manufacturer-side requests right now."
            : `${lowStockProducts.length} low stock request(s) are waiting for manufacturer support.`;
    }

    const table = document.getElementById("manufacturerOrdersTable");
    if (!table) return;

    table.innerHTML = lowStockProducts.length === 0
        ? `<tr><td colspan="8">No refill requests right now.</td></tr>`
        : lowStockProducts.map((product) => {
            const stock = Number(product.stock) || 0;
            const minLimit = Number(product.lowStockThreshold) || 0;
            const shopName = product.shopName || "Main Branch";
            const address = product.shopAddress || "No branch address";
            const retailContact = product.shopkeeperPhone || product.manufacturerPhone || "";
            const driverPhone = product.driverPhone || "";
            const requestMessage = `Manufacturer update needed for ${product.name} at ${shopName}. Current stock is ${stock} and alert limit is ${minLimit}.`;
            const mapLink = buildMapLink(address);
            const retailLink = buildTelLink(retailContact);
            const driverLink = buildTelLink(driverPhone);
            const whatsappLink = buildWhatsAppLink(retailContact, requestMessage);

            return `
                <tr class="low-stock-row">
                    <td>${escapeHtml(product.name)}</td>
                    <td>${escapeHtml(shopName)}</td>
                    <td>${escapeHtml(address)}</td>
                    <td>${stock}</td>
                    <td>${minLimit}</td>
                    <td>${escapeHtml(product.assignedShopkeeper || "Retail Team")} ${retailContact ? `<br><span class="metric-note">${escapeHtml(retailContact)}</span>` : ""}</td>
                    <td>${escapeHtml(product.driverName || "No driver")} ${driverPhone ? `<br><span class="metric-note">${escapeHtml(driverPhone)}</span>` : ""}</td>
                    <td>
                        <div class="action-group">
                            ${retailLink ? `<a class="action-chip call" href="${retailLink}">Call Retailer</a>` : ""}
                            ${whatsappLink ? `<a class="action-chip whatsapp" href="${whatsappLink}" target="_blank" rel="noreferrer">WhatsApp</a>` : ""}
                            ${driverLink ? `<a class="action-chip driver" href="${driverLink}">Call Driver</a>` : ""}
                            ${mapLink ? `<a class="action-chip map" href="${mapLink}" target="_blank" rel="noreferrer">View Map</a>` : ""}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
}

function registerUser(e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value;

    fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
    })
    .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Registration failed");
        return data;
    })
    .then((data) => {
        if (data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
        }
        alert(data.message || "Registration successful");
        window.location.href = getDashboardRouteForRole(data.user?.role || role);
    })
    .catch((err) => {
        console.error("REGISTER ERROR:", err);
        alert(err.message);
    });
}

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
        window.location.href = getDashboardRouteForRole(data.user?.role || "inventory_manager");
    })
    .catch((err) => {
        console.error("LOGIN ERROR:", err);
        alert(err.message);
    });
}

function loadOrders() {
    fetch(`${API_URL}/orders`)
    .then((res) => res.json())
    .then((data) => {
        const table = document.getElementById("ordersTableBody");
        const manufacturerTable = document.getElementById("manufacturerShipmentTable");
        const productOrdersTable = document.getElementById("productOrdersTableBody");

        if (!table && !manufacturerTable && !productOrdersTable) return;

        if (!Array.isArray(data)) {
            throw new Error(data.message || "Invalid orders response");
        }

        latestOrders = data;

        if (table) table.innerHTML = "";
        if (manufacturerTable) manufacturerTable.innerHTML = "";
        if (productOrdersTable) productOrdersTable.innerHTML = "";

        data.forEach((order) => {
            const productSummary = getOrderProductSummary(order);
            const quantity = getOrderQuantity(order);
            const total = order.totalAmount ?? order.total;
            const mapLink = buildMapLink(order.branchAddress);
            const driverLink = buildTelLink(order.driverPhone);

            if (table) {
                table.innerHTML += `
                    <tr>
                        <td>${order._id}</td>
                        <td>
                            <div class="metric-stack">
                                <strong>${escapeHtml(order.branchName || "-")}</strong>
                                <span class="metric-note">${escapeHtml(order.shopkeeperName || "-")}</span>
                            </div>
                        </td>
                        <td>${productSummary}</td>
                        <td>${quantity}</td>
                        <td><span class="status-pill ${escapeHtml(order.shipmentStatus || "placed")}">${escapeHtml(getOrderStatusLabel(order.shipmentStatus))}</span></td>
                        <td>${formatDate(order.createdAt || order.date)}</td>
                        <td>${formatDate(order.expectedShipmentDate)}</td>
                        <td>${formatDate(order.actualShipmentDate)}</td>
                        <td>${formatCurrency(total)}</td>
                        <td>
                            <div class="action-group">
                                ${mapLink ? `<a class="action-chip map" href="${mapLink}" target="_blank" rel="noreferrer">Map</a>` : ""}
                                ${driverLink ? `<a class="action-chip driver" href="${driverLink}">Driver</a>` : ""}
                            </div>
                        </td>
                    </tr>
                `;
            }

            if (manufacturerTable) {
                manufacturerTable.innerHTML += `
                    <tr>
                        <td>${order._id}</td>
                        <td>${escapeHtml(order.branchName || "-")}</td>
                        <td>${productSummary}</td>
                        <td><span class="status-pill ${escapeHtml(order.shipmentStatus || "placed")}">${escapeHtml(getOrderStatusLabel(order.shipmentStatus))}</span></td>
                        <td>${formatDate(order.expectedShipmentDate)}</td>
                        <td>${formatDate(order.actualShipmentDate)}</td>
                        <td>
                            <div class="action-group">
                                ${mapLink ? `<a class="action-chip map" href="${mapLink}" target="_blank" rel="noreferrer">Map</a>` : ""}
                                ${driverLink ? `<a class="action-chip driver" href="${driverLink}">Driver</a>` : ""}
                            </div>
                        </td>
                    </tr>
                `;
            }

            if (productOrdersTable) {
                productOrdersTable.innerHTML += `
                    <tr>
                        <td>${order._id}</td>
                        <td>${escapeHtml(order.billNumber || "-")}</td>
                        <td>${escapeHtml(order.branchName || "-")}</td>
                        <td>${productSummary}</td>
                        <td>${quantity}</td>
                        <td>${escapeHtml(order.shopkeeperGstin || "-")}</td>
                        <td>${escapeHtml(order.paymentMethod || "-")} / ${escapeHtml(order.paymentStatus || "pending")}</td>
                        <td><span class="status-pill ${escapeHtml(order.shipmentStatus || "placed")}">${escapeHtml(getOrderStatusLabel(order.shipmentStatus))}</span></td>
                        <td>${formatDate(order.createdAt || order.date)}</td>
                        <td>${formatDate(order.expectedShipmentDate)}</td>
                        <td>${formatCurrency(total)}</td>
                    </tr>
                `;
            }
        });

        if (table && !table.innerHTML.trim()) {
            table.innerHTML = `<tr><td colspan="10">No recent orders yet.</td></tr>`;
        }

        if (manufacturerTable && !manufacturerTable.innerHTML.trim()) {
            manufacturerTable.innerHTML = `<tr><td colspan="7">No shipment orders yet.</td></tr>`;
        }

        if (productOrdersTable && !productOrdersTable.innerHTML.trim()) {
            productOrdersTable.innerHTML = `<tr><td colspan="11">No placed refill orders yet.</td></tr>`;
        }

        renderShopkeeperPlacedOrders(data);
    })
    .catch((err) => {
        console.error(err);
        alert("Failed to load orders");
    });
}

function placeLowStockOrder(e, productId) {
    e.preventDefault();

    const product = latestProducts.find((item) => item._id === productId);
    if (!product) {
        alert("Product not found for reorder");
        return;
    }

    const quantity = Math.max(1, Number(e.target.quantity.value) || 1);
    submitLowStockOrder(product, quantity)
    .then(() => {
        alert(`Order placed for ${product.name}`);
        loadOrders();
        e.target.reset();
    })
    .catch((err) => {
        console.error(err);
        alert(err.message);
    });
}

function placeQuickRefillOrder(productId) {
    const product = latestProducts.find((item) => item._id === productId);
    if (!product) {
        alert("Product not found for refill order");
        return;
    }

    const suggestedQuantity = Math.max((Number(product.lowStockThreshold) || 1) * 2, 5);
    const quantityInput = window.prompt(`Enter refill order quantity for ${product.name}`, String(suggestedQuantity));
    if (quantityInput === null) {
        return;
    }

    const quantity = Math.max(1, Number(quantityInput) || suggestedQuantity);

    submitLowStockOrder(product, quantity)
    .then(() => {
        alert(`Refill order placed between shopkeeper and retailer for ${product.name}`);
        loadOrders();
        loadProducts();
    })
    .catch((err) => {
        console.error(err);
        alert(err.message);
    });
}

function loadProducts() {
    fetch(`${API_URL}/products`)
    .then((res) => res.json())
    .then((data) => {
        const table = document.getElementById("productsTableBody");

        if (!Array.isArray(data)) {
            throw new Error(data.message || "Invalid products response");
        }

        latestProducts = data;
        notifiedLowStockIds = new Set();

        if (table) {
            table.innerHTML = "";

            data.forEach((product) => {
                const stockTone = getStockTone(product);
                const lowStock = stockTone === "low";
                const productImage = getProductImage(product);

                table.innerHTML += `
                    <tr>
                        <td>
                            <img class="product-thumb" src="${productImage}" alt="${escapeHtml(product.name)}">
                        </td>
                        <td>
                            <div class="metric-stack product-name-stack">
                                <strong>${escapeHtml(product.name)}</strong>
                                <span class="metric-note">${escapeHtml(product._id)}</span>
                            </div>
                        </td>
                        <td>
                            <div class="metric-stack">
                                <strong>${escapeHtml(product.shopName || "Main Branch")}</strong>
                                <span class="metric-note">${escapeHtml(product.assignedShopkeeper || "No shopkeeper assigned")}</span>
                            </div>
                        </td>
                        <td>${formatCurrency(product.price)}</td>
                        <td>${escapeHtml(product.category || "-")}</td>
                        <td><span class="stock-badge ${stockTone}">${product.stock ?? 0} in stock</span></td>
                        <td>${product.soldToday ?? 0}</td>
                        <td>${product.totalSold ?? 0}</td>
                        <td>${product.lowStockThreshold ?? 0}</td>
                        <td>
                            <div class="metric-stack">
                                <form class="sales-form" onsubmit="recordDailySale(event, '${product._id}')">
                                    <input type="number" min="1" value="1" name="quantity" aria-label="Daily sold quantity for ${escapeHtml(product.name)}">
                                    <button type="submit">Add Daily Sold</button>
                                </form>
                                ${lowStock ? `<button type="button" class="inline-action-button" onclick="placeQuickRefillOrder('${product._id}')">Place Refill Order</button>` : ""}
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        renderLowStockAlerts(data);
        renderInventoryManagerMetrics(data);
        renderShopkeeperDashboard(data);
        renderBigRetailerDashboard(data);
        renderManufacturerDashboard(data);
        updateAlertStatus();
        triggerAutomaticWhatsAppAlerts(data);
    })
    .catch((err) => {
        console.error(err);
        alert("Failed to load products");
    });
}

function addProduct(e) {
    e.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const price = Number(document.getElementById("productPrice").value);
    const category = document.getElementById("productCategory").value.trim();
    const stock = Number(document.getElementById("productStock").value);
    const lowStockThreshold = Number(document.getElementById("productThreshold").value);
    const shopName = document.getElementById("productShopName").value.trim();
    const shopAddress = document.getElementById("productShopAddress").value.trim();
    const assignedShopkeeper = document.getElementById("productShopkeeper").value.trim();
    const shopkeeperPhone = document.getElementById("productShopkeeperPhone").value.trim();
    const shopkeeperGstin = document.getElementById("productShopkeeperGstin").value.trim();
    const driverName = document.getElementById("productDriverName").value.trim();
    const driverPhone = document.getElementById("productDriverPhone").value.trim();
    const manufacturerName = document.getElementById("productManufacturerName").value.trim();
    const manufacturerPhone = document.getElementById("productManufacturerPhone").value.trim();
    const preferredPaymentMethod = document.getElementById("productPaymentMethod").value;

    fetch(`${API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name,
            price,
            category,
            stock,
            lowStockThreshold,
            shopName,
            shopAddress,
            assignedShopkeeper,
            shopkeeperPhone,
            shopkeeperGstin,
            driverName,
            driverPhone,
            manufacturerName,
            manufacturerPhone,
            preferredPaymentMethod
        })
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
            const shouldOrder = window.confirm(`Low stock warning: ${data.product.name} is now at ${data.product.stock} unit(s).\n\nDo you want to place a refill order now?`);
            if (shouldOrder) {
                placeQuickRefillOrder(productId);
                return;
            }
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

function saveAlertSettings(e) {
    e.preventDefault();

    const retailerName = document.getElementById("retailerName").value.trim();
    const retailerMobile = document.getElementById("retailerMobile").value.trim();
    const shopkeeperName = document.getElementById("shopkeeperName").value.trim();
    const shopkeeperMobile = document.getElementById("shopkeeperMobile").value.trim();

    setAlertSettings({ retailerName, retailerMobile, shopkeeperName, shopkeeperMobile });
    updateAlertStatus();
    renderLowStockAlerts();
    alert("WhatsApp alert contacts saved");
}

function ensureRoleAccess() {
    const user = getCurrentUser();
    const path = window.location.pathname;

    if (!user && (path.includes("dashboard.html") || path.includes("shopkeeper-dashboard.html") || path.includes("manufacturer-dashboard.html") || path.includes("shopkeeper-alerts.html") || path.includes("product.html"))) {
        window.location.href = "login.html";
        return;
    }

    if (!user && path.includes("big-retailer-dashboard.html")) {
        window.location.href = "login.html";
        return;
    }

    if (user && path.includes("dashboard.html") && user.role === "shopkeeper") {
        window.location.href = "shopkeeper-dashboard.html";
    }

    if (user && path.includes("shopkeeper-dashboard.html") && user.role !== "shopkeeper") {
        window.location.href = getDashboardRouteForRole(user.role);
    }

    if (user && path.includes("manufacturer-dashboard.html") && user.role !== "manufacturer") {
        window.location.href = getDashboardRouteForRole(user.role);
    }

    if (user && path.includes("shopkeeper-alerts.html") && user.role !== "big_retailer") {
        window.location.href = getDashboardRouteForRole(user.role);
    }

    if (user && path.includes("big-retailer-dashboard.html") && user.role !== "big_retailer") {
        window.location.href = getDashboardRouteForRole(user.role);
    }
}

window.onload = function () {
    ensureRoleAccess();

    if (window.location.pathname.includes("dashboard.html")) {
        hydrateMainDashboard();
        loadProducts();
        loadOrders();
    }

    if (window.location.pathname.includes("shopkeeper-dashboard.html")) {
        loadProducts();
    }

    if (window.location.pathname.includes("manufacturer-dashboard.html")) {
        loadProducts();
        loadOrders();
    }

    if (window.location.pathname.includes("shopkeeper-alerts.html")) {
        loadProducts();
    }

    if (window.location.pathname.includes("big-retailer-dashboard.html")) {
        loadProducts();
    }

    if (window.location.pathname.includes("product.html")) {
        hydrateProductPageNavigation();
        prefillAlertSettings();
        renderProductPresets();
        loadProducts();
        loadOrders();
    }
};

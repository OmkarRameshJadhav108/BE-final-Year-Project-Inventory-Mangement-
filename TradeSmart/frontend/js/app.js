const API_URL = "http://localhost:5000/api";

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

        table.innerHTML = "";

        data.forEach((product) => {
            table.innerHTML += `
                <tr>
                    <td>${product._id}</td>
                    <td>${product.name}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td>${product.category || "-"}</td>
                    <td>${product.stock ?? 0}</td>
                </tr>
            `;
        });
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

    fetch(`${API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, category, stock })
    })
    .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Add failed");
        return data;
    })
    .then(() => {
        alert("Product added");
        e.target.reset();
        loadProducts();
    })
    .catch((err) => {
        console.error(err);
        alert(err.message);
    });
}

/* =======================
   AUTO LOAD
======================= */
window.onload = function () {
    if (window.location.pathname.includes("dashboard.html")) {
        loadOrders();
    }

    if (window.location.pathname.includes("product.html")) {
        loadProducts();
    }
};

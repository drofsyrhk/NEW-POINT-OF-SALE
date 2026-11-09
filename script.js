// ===== PRODUCTS (edit names, prices and IDs here) =====
const products = [
    { id: 1, name: "Classic Burger",    price: 99,  category: "Burger",   image: "CLASSIC BURGER.jpg" },
    { id: 2, name: "Cheese Burger",     price: 119, category: "Burger",   image: "chess burger.jpg" },
    { id: 3, name: "Classic Footlong",  price: 89,  category: "Footlong", image: "footlong.avif" },
    { id: 4, name: "Chicken BBQ",       price: 89,  category: "Chicken",  image: "chicken.avif" },
    { id: 5, name: "French Fries",      price: 69,  category: "Sides",    image: "french fries.jpg" },
    { id: 6, name: "Cold Soda",         price: 100, category: "Drinks",   image: "cold soda.jpg" },
    { id: 7, name: "Chicken Nuggets",   price: 99,  category: "Chicken",  image: "chicken nuggets.jpg" },
    { id: 8, name: "Pizza",             price: 149, category: "Sides",    image: "pizza.jpg" },
    { id: 9, name: "Taco",              price: 79,  category: "Sides",    image: "taco.jpg" }
];

// ===== USERS (edit here) =====
const users = [
    { username: "admin",   password: "9876",     name: "Admin", admin: true },   // admin: true = can reset sales
    { username: "cashier", password: "9876",     name: "Cashier" },
    { username: "meow",    password: "meowmeow", name: "meow" }
];

// ===== THINGS THE APP REMEMBERS =====
let currentUser = null;       // who is signed in
let cart = {};                // the current order: { productId: quantity }
let activeCategory = "All";   // the selected category button
let orderNo = 1;              // the next order number
let orders = [];              // all finished orders, newest first


// ===== SMALL HELPERS =====

// find one thing in the page, like $(".toast")
function $(selector) {
    return document.querySelector(selector);
}

// make a number look like money: 99 becomes ₱99
function peso(number) {
    return "₱" + Math.round(number * 100) / 100;
}

// find a product using its id
function findProduct(id) {
    return products.find(p => p.id == id);
}

// show or hide a popup
function show(selector) {
    $(selector).classList.add("show");
}
function hide(selector) {
    $(selector).classList.remove("show");
}

// copy a <template> from index.html, fill in the text, and add it to the page
// example data: { name: "Taco", price: "₱79" }  ->  fills data-field="name" and data-field="price"
function addFromTemplate(templateId, parentSelector, data) {
    const copy = $("#" + templateId).content.cloneNode(true);
    const item = copy.firstElementChild;

    for (const spot of copy.querySelectorAll("[data-field]")) {
        spot.textContent = data[spot.dataset.field];
    }

    $(parentSelector).appendChild(copy);
    return item;    // so we can add buttons/clicks to it
}


// ===== SAVE AND LOAD (kept in this browser) =====
function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem("craveSales"));
        if (saved) {
            orderNo = saved.orderNo;
            orders = saved.orders || [];
        }
    } catch (e) {}
}

function saveData() {
    try {
        localStorage.setItem("craveSales", JSON.stringify({ orderNo: orderNo, orders: orders }));
    } catch (e) {}
}


// ===== MENU =====
function showCategories() {
    $(".menu-categories").innerHTML = "";

    // make a list of category names, starting with "All"
    const names = ["All"];
    for (const p of products) {
        if (!names.includes(p.category)) names.push(p.category);
    }

    for (const name of names) {
        const button = addFromTemplate("tpl-category", ".menu-categories", { name: name });
        if (name === activeCategory) button.classList.add("active");

        button.onclick = function () {
            activeCategory = name;
            showCategories();
            showProducts();
        };
    }
}

function showProducts() {
    $(".menu-products").innerHTML = "";

    for (const p of products) {
        // skip products that are not in the selected category
        if (activeCategory !== "All" && p.category !== activeCategory) continue;

        const card = addFromTemplate("tpl-product", ".menu-products", {
            name: p.name,
            price: peso(p.price)
        });

        const picture = card.querySelector(".product-image");
        picture.src = p.image;
        picture.alt = p.name;

        // click the card or the + button to add one to the order
        card.onclick = function () { changeCart(p.id, 1); };
        card.querySelector(".product-add").onclick = function (event) {
            event.stopPropagation();    // so the card click does not fire twice
            changeCart(p.id, 1);
        };
    }
}


// ===== ORDER (the cart) =====

// add or remove items. amount is +1 or -1
function changeCart(id, amount) {
    cart[id] = (cart[id] || 0) + amount;
    if (cart[id] <= 0) delete cart[id];
    showCart();
}

// add up the price of everything in the cart
function getTotal() {
    let total = 0;
    for (const id in cart) {
        total += findProduct(id).price * cart[id];
    }
    return total;
}

function showCart() {
    $(".order-rows").innerHTML = "";

    const ids = Object.keys(cart);
    $(".order-empty").hidden = ids.length > 0;    // hide "Tap an item" when there are items

    for (const id of ids) {
        const p = findProduct(id);
        const row = addFromTemplate("tpl-order-item", ".order-rows", {
            name: p.name,
            line: peso(p.price) + " × " + cart[id] + " = " + peso(p.price * cart[id]),
            qty: cart[id]
        });
        row.querySelector(".order-minus").onclick = function () { changeCart(p.id, -1); };
        row.querySelector(".order-plus").onclick = function () { changeCart(p.id, 1); };
    }

    showTotals();
}

function showTotals() {
    const total = getTotal();
    const cash = parseFloat($(".order-cash-input").value);

    $(".order-total-amount").textContent = peso(total);

    // change is only shown when the cash is more than the total
    if (cash > total) {
        $(".order-change-amount").textContent = peso(cash - total);
    } else {
        $(".order-change-amount").textContent = peso(0);
    }

    $(".order-charge").disabled = (total === 0);
}

function chargeOrder() {
    const total = getTotal();
    if (total === 0) return;

    if (!currentUser) {
        showToast("Please sign in first.", true);
        openLogin();
        return;
    }

    // blank cash = exact payment
    let cash = total;
    if ($(".order-cash-input").value !== "") {
        cash = parseFloat($(".order-cash-input").value);
    }

    if (cash < total) {
        showToast("Cash is " + peso(total - cash) + " short.", true);
        return;
    }

    showReceipt(total, cash);

    // save this order into the list
    const items = [];
    for (const id in cart) {
        const p = findProduct(id);
        items.push({ name: p.name, price: p.price, qty: cart[id] });
    }
    orders.unshift({
        no: orderNo,
        time: new Date().toLocaleString(),
        cashier: currentUser.name,
        total: total,
        items: items
    });

    orderNo++;
    saveData();
    clearOrder();
    showOrderNumber();
}

function clearOrder() {
    cart = {};
    $(".order-cash-input").value = "";
    showCart();
}

function showOrderNumber() {
    $(".order-number").textContent = orderNo;
}


// ===== RECEIPT =====
function showReceipt(total, cash) {
    $("#receipt-no").textContent = orderNo;
    $("#receipt-time").textContent = new Date().toLocaleString();
    $("#receipt-cashier").textContent = currentUser.name;
    $("#receipt-total").textContent = peso(total);
    $("#receipt-cash").textContent = peso(cash);
    $("#receipt-change").textContent = peso(cash - total);

    // one row for each item
    $(".receipt-rows").innerHTML = "";
    for (const id in cart) {
        const p = findProduct(id);
        addFromTemplate("tpl-receipt-row", ".receipt-rows", {
            name: cart[id] + " × " + p.name,
            amount: peso(p.price * cart[id])
        });
    }

    show(".receipt");
}


// ===== HISTORY =====
function showHistory() {
    // no orders yet: show "No sales yet." and stop
    $(".history-empty").hidden = orders.length > 0;
    $(".history-content").hidden = orders.length === 0;
    if (orders.length === 0) return;

    // count how many of each product were sold
    const sold = {};        // { "Taco": { qty: 3, money: 237 } }
    let itemsSold = 0;
    let revenue = 0;

    for (const order of orders) {
        revenue += order.total;
        for (const item of order.items) {
            if (!sold[item.name]) sold[item.name] = { qty: 0, money: 0 };
            sold[item.name].qty += item.qty;
            sold[item.name].money += item.qty * item.price;
            itemsSold += item.qty;
        }
    }

    $("#history-orders-count").textContent = orders.length;
    $("#history-items-count").textContent = itemsSold;
    $("#history-revenue").textContent = peso(revenue);

    // best sellers: the most sold product comes first
    const ranked = Object.entries(sold).sort((a, b) => b[1].qty - a[1].qty);
    const topQty = ranked[0][1].qty;

    $(".history-bars").innerHTML = "";
    for (const [name, data] of ranked) {
        const bar = addFromTemplate("tpl-history-bar", ".history-bars", {
            name: name,
            qty: data.qty + " sold · " + peso(data.money)
        });
        // the bar width is a percent of the best seller
        bar.querySelector(".history-bar div").style.width = (data.qty / topQty) * 100 + "%";
    }

    // list of all orders
    $(".history-orders").innerHTML = "";
    for (const order of orders) {
        const names = [];
        for (const item of order.items) names.push(item.qty + " × " + item.name);

        addFromTemplate("tpl-history-order", ".history-orders", {
            no: "Order #" + order.no,
            total: peso(order.total),
            meta: order.time + " · " + order.cashier,
            items: names.join(", ")
        });
    }
}

function openHistory() {
    showHistory();
    // only the admin can see the Reset button
    $(".history-reset").hidden = !(currentUser && currentUser.admin);
    show(".history");
}

function askReset() {
    if (!currentUser || !currentUser.admin) {
        showToast("Only the admin can reset sales.", true);
        return;
    }
    show(".confirm");
}

function resetSales() {
    orderNo = 1;
    orders = [];
    saveData();
    showOrderNumber();
    showHistory();
    hide(".confirm");
    showToast("Sales reset.");
}


// ===== SIGN IN =====
function showUser() {
    if (currentUser) {
        $(".topbar-user").textContent = "👤 " + currentUser.name + " · Sign out";
    } else {
        $(".topbar-user").textContent = "👤 Sign in";
    }
}

function openLogin() {
    $(".login-error").textContent = "";
    $(".login-username").value = "";
    $(".login-password").value = "";
    show(".login");
    $(".login-username").focus();
}

function checkLogin() {
    const username = $(".login-username").value.trim().toLowerCase();
    const password = $(".login-password").value;
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        $(".login-error").textContent = "Wrong username or password.";
        return;
    }

    currentUser = user;
    try { sessionStorage.setItem("craveUser", user.username); } catch (e) {}
    hide(".login");
    showUser();
    showToast("Signed in as " + user.name);
}

function signOut() {
    currentUser = null;
    try { sessionStorage.removeItem("craveUser"); } catch (e) {}
    showUser();
}


// ===== SMALL MESSAGE (toast) =====
function showToast(message, isError) {
    const toast = $(".toast");
    toast.textContent = message;
    toast.classList.toggle("error", isError === true);
    toast.classList.add("show");
    setTimeout(function () { toast.classList.remove("show"); }, 3000);
}


// ===== START (runs when the page opens) =====
loadData();
showCategories();
showProducts();
showCart();
showOrderNumber();

// remember who was signed in
try {
    const savedName = sessionStorage.getItem("craveUser");
    currentUser = users.find(u => u.username === savedName) || null;
} catch (e) {}
showUser();

// order buttons
$(".order-cash-input").oninput = showTotals;
$(".order-charge").onclick = chargeOrder;
$(".order-clear").onclick = clearOrder;

// top bar buttons
$(".topbar-user").onclick = function () {
    if (currentUser) signOut(); else openLogin();
};
$(".topbar-history").onclick = openHistory;

// sign in popup buttons
$(".login-button").onclick = checkLogin;
$(".login-cancel").onclick = function () { hide(".login"); };
$(".login-password").onkeydown = function (event) {
    if (event.key === "Enter") checkLogin();
};

// receipt popup buttons
$(".receipt-print").onclick = function () { window.print(); };
$(".receipt-close").onclick = function () { hide(".receipt"); };

// history popup buttons
$(".history-reset").onclick = askReset;
$(".history-close").onclick = function () { hide(".history"); };

// confirm popup buttons
$(".confirm-yes").onclick = resetSales;
$(".confirm-no").onclick = function () { hide(".confirm"); };

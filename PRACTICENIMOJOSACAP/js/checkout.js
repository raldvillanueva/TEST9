function loadCheckout(){
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let container = document.getElementById("summary-items");

  if(!container) return;

  container.innerHTML = "";

  let subtotal = 0;

  cart.forEach(item => {
    item.qty = item.qty || 1;
    let itemTotal = item.price * item.qty;
    subtotal += itemTotal;

    container.innerHTML += `
      <div class="order-item">
        <img src="${item.img}" class="order-img" alt="${item.name}">
        <div class="order-info">
          <p class="name">${item.name}</p>
          <p class="qty">x${item.qty}</p>
        </div>
        <div class="order-price">&#8369;${itemTotal}</div>
      </div>
    `;
  });

  let total = subtotal + 50;

  document.getElementById("subtotal").innerText = subtotal;
  document.getElementById("total").innerText = total;

  updatePlaceOrderBtn(total);
}

function updatePlaceOrderBtn(total){
  if(total === undefined){
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let subtotal = cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
    total = subtotal + 50;
  }

  const btn = document.querySelector('.place-order-btn');
  const notice = document.getElementById("cod-notice");
  if(!btn) return;

  const isCOD = document.querySelector('input[name="payment"]:checked')?.value === 'Cash on Delivery';
  const qr = document.getElementById("gcash-qr");

  if(isCOD && total > 2000){
    btn.disabled = true;
    if(notice) notice.style.display = 'block';
  } else {
    btn.disabled = false;
    if(notice) notice.style.display = 'none';
  }

  if(qr) qr.style.display = isCOD ? 'none' : 'block';
}

function clearFieldErrors(){
  document.querySelectorAll('.field-error').forEach(e => e.remove());
  document.querySelectorAll('.field-invalid').forEach(e => e.classList.remove('field-invalid'));
}

function showFieldError(inputId, msg){
  const input = document.getElementById(inputId);
  if(!input) return;

  // Remove any existing error for this field
  document.querySelectorAll(`.field-error[data-for="${inputId}"]`).forEach(e => e.remove());

  const err = document.createElement('p');
  err.className = 'field-error';
  err.dataset.for = inputId;
  err.textContent = msg;

  const phoneField = input.closest('.phone-field');
  if(phoneField){
    // Phone fields: insert error after the outermost wrapper
    const wrapper = phoneField.parentElement?.classList.contains('field-wrap')
      ? phoneField.parentElement : phoneField;
    wrapper.classList.add('field-invalid');
    wrapper.insertAdjacentElement('afterend', err);
  } else {
    const wrap = input.closest('.field-wrap');
    if(wrap){
      wrap.classList.add('field-invalid');
      wrap.appendChild(err);
    }
  }
}

function placeOrder(){
  const fname       = document.getElementById("fname").value.trim();
  const lname       = document.getElementById("lname").value.trim();
  const name        = (fname + " " + lname).trim();
  const phone       = document.getElementById("phone").value.trim();
  const address     = document.getElementById("address").value.trim();
  const city        = document.getElementById("city").value.trim();
  const postal      = document.getElementById("postal").value.trim();
  const region      = document.getElementById("region").value.trim();


  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  if(cart.length === 0){
    showMsg("Your cart is empty");
    return;
  }

  // Ingredient availability check
  const adminDB = JSON.parse(localStorage.getItem('sl_admin_db') || '{}');
  const adminProducts = adminDB.products || [];
  const adminIngredients = adminDB.ingredients || [];
  const needed = {};
  cart.forEach(item => {
    const p = adminProducts.find(pp => pp.name.toLowerCase() === item.name.toLowerCase());
    if(p && p.recipe){
      p.recipe.forEach(r => {
        needed[r.ingredientId] = (needed[r.ingredientId] || 0) + r.qty * (item.qty || 1);
      });
    }
  });
  const shortages = [];
  Object.entries(needed).forEach(([ingId, required]) => {
    const ing = adminIngredients.find(i => i.id === ingId);
    if(ing && ing.stock < required) shortages.push(ing.name);
  });
  if(shortages.length > 0){
    const minRestockDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    minRestockDate.setHours(0, 0, 0, 0);
    const minLabel = minRestockDate.toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' });
    showMsg(`Sorry, we don't have enough ingredients for your order. Please pick a delivery date from ${minLabel} or later.`);
    return;
  }

  // Daily limit check
  const todayStr = new Date().toISOString().slice(0,10);
  const limitErrors = [];
  cart.forEach(item => {
    const p = adminProducts.find(pp => pp.name.toLowerCase() === item.name.toLowerCase());
    if(p){
      const limit = p.dailyLimit ?? p.stock ?? 0;
      const sold = (p.lastResetDate === todayStr) ? (p.soldToday || 0) : 0;
      const available = Math.max(0, limit - sold);
      if((item.qty || 1) > available){
        limitErrors.push(`${item.name}: only ${available} left for today`);
      }
    }
  });
  if(limitErrors.length > 0){
    showMsg(`Daily limit reached: ${limitErrors.join(', ')}.`);
    return;
  }

  const cookieNotice = document.getElementById("cookie-notice");
  if(cookieNotice) cookieNotice.style.display = "none";

  clearFieldErrors();
  let hasError = false;

  if(!fname)   { showFieldError("fname", "First name cannot be empty"); hasError = true; }
  if(!lname)   { showFieldError("lname", "Last name cannot be empty"); hasError = true; }
  if(!address) { showFieldError("address", "Address cannot be empty"); hasError = true; }
  if(!postal)  { showFieldError("postal", "Postal code cannot be empty"); hasError = true; }
  if(!city)    { showFieldError("city", "City cannot be empty"); hasError = true; }
  if(!region)  { showFieldError("region", "Region cannot be empty"); hasError = true; }
  if(!phone){
    showFieldError("phone", "Phone cannot be empty"); hasError = true;
  } else if(!/^9\d{9}$/.test(phone)){
    showFieldError("phone", "Invalid phone number (e.g. 9XXXXXXXXX)"); hasError = true;
  }


  if(hasError){
    const firstInvalid = document.querySelector('.field-invalid, .field-error');
    if(firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  let subtotal = 0;
  cart.forEach(item => { subtotal += item.price * (item.qty || 1); });
  let total = subtotal + 50;

  const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const orderKey = currentUser ? "orders_" + currentUser.email : "orders_guest";

  let orders = JSON.parse(localStorage.getItem(orderKey)) || [];
  const orderId = 'WEB-' + Date.now();

  orders.push({ id: orderId, items: cart, total: total, date: new Date().toISOString() });
  localStorage.setItem(orderKey, JSON.stringify(orders));

  const selectedPayment = document.querySelector('input[name="payment"]:checked')?.value || 'Cash on Delivery';
  const preferredDate = localStorage.getItem("preferredDate") || null;
  const preferredTime = localStorage.getItem("preferredTime") || null;
  const contactMethod = localStorage.getItem("contactMethod") || null;

  const adminOrder = {
    id: orderId,
    customer: name,
    customerEmail: currentUser ? currentUser.email : 'guest',
    phone: phone,
    address: address + ', ' + city,
    items: cart.map(item => ({ id: item.id, name: item.name, qty: item.qty || 1, price: item.price, img: item.img || '' })),
    total: total,
    type: 'Online',
    status: 'Pending',
    date: new Date().toISOString(),
    payment: selectedPayment,
    ...(preferredDate && { preferredDate }),
    ...(preferredTime && { preferredTime }),
    ...(contactMethod && { contactMethod })
  };

  const storeOrders = JSON.parse(localStorage.getItem('sl_store_orders')) || [];
  storeOrders.push(adminOrder);
  localStorage.setItem('sl_store_orders', JSON.stringify(storeOrders));

  localStorage.removeItem("cart");
  localStorage.removeItem("preferredDate");
  localStorage.removeItem("preferredTime");
  localStorage.removeItem("contactMethod");

  showMsg("Order placed successfully 🎉", "success");

  setTimeout(() => { window.location.href = "../pages/orders.html"; }, 1500);
}

function goBack(){
  window.location.href = "../pages/homepage.html";
}

function toggleContactMenu(e){
  e.stopPropagation();
  document.getElementById("contactDropdown").classList.toggle("open");
}

function signOut(){
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("loggedIn");
  window.location.href = "../pages/login.html";
}

document.addEventListener("click", function(){
  const dd = document.getElementById("contactDropdown");
  if(dd) dd.classList.remove("open");
});

function goToCart(){
  window.location.href = "../pages/cart.html";
}

function showMsg(text, type="error"){
  const msg = document.getElementById("msg");
  msg.innerText = text;
  msg.className = "msg show " + type;
  setTimeout(() => { msg.classList.remove("show"); }, 2500);
}

function prefillFromProfile(){
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  // Show email in contact row
  const emailEl = document.getElementById("contactEmailDisplay");
  const avatarEl = document.getElementById("userAvatar");
  if(emailEl){
    const email = user ? user.email : localStorage.getItem("loggedIn") === "true" ? "Logged in" : "Guest";
    emailEl.innerText = email;
    if(avatarEl && user && user.email) avatarEl.innerText = user.email[0].toUpperCase();
  }

  if(!user) return;

  if(user.fname) document.getElementById("fname").value = user.fname;
  if(user.lname) document.getElementById("lname").value = user.lname;
  if(user.phone) document.getElementById("phone").value = user.phone.replace(/^0/, "");

  const addresses = user.addresses || [];
  if(addresses.length > 0){
    document.getElementById("address").value = addresses[0].address || "";
    document.getElementById("city").value = addresses[0].city || "";
  }
}

function toggleInstructions(e){
  e.preventDefault();
  const area = document.getElementById("deliveryInstructions");
  area.classList.toggle("hidden");
  if(!area.classList.contains("hidden")) area.focus();
}

document.addEventListener("DOMContentLoaded", () => {
  loadCheckout();
  prefillFromProfile();

  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const countEl = document.getElementById("checkoutCartCount");
  if(countEl) countEl.innerText = cart.length;

  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener("change", () => updatePlaceOrderBtn());
  });

  function applyPhoneRestrictions(input){
    if(!input) return;
    input.addEventListener("keypress", function(e){
      if(!/[0-9]/.test(e.key)) e.preventDefault();
      if(this.value.length >= 10) e.preventDefault();
    });
    input.addEventListener("input", function(){
      let v = this.value.replace(/[^0-9]/g, "");
      if(v.startsWith("0")) v = v.slice(1);
      this.value = v.slice(0, 10);
    });
    input.addEventListener("paste", function(e){
      const paste = (e.clipboardData || window.clipboardData).getData("text");
      if(!/^[0-9]+$/.test(paste)) e.preventDefault();
    });
  }

  applyPhoneRestrictions(document.getElementById("phone"));
});

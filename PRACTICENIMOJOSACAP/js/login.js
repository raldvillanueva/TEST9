/* ---- MULTI-USER HELPERS ---- */
function getUsers(){
  return JSON.parse(localStorage.getItem("sl_users")) || [];
}
function saveUsers(users){
  localStorage.setItem("sl_users", JSON.stringify(users));
}

// Migrate any account stored in the old single-user "user" key into sl_users
function migrateOldAccount(){
  const old = JSON.parse(localStorage.getItem("user"));
  if(!old || !old.email) return;
  const users = getUsers();
  const already = users.find(u => u.email.toLowerCase() === old.email.toLowerCase());
  if(!already){
    users.push({ fname: old.fname||"", lname: old.lname||"", email: old.email, password: old.password||"", phone: old.phone||"", addresses: old.addresses||[] });
    saveUsers(users);
  }
}

function findUser(email){
  migrateOldAccount(); // ensure old accounts are visible before searching
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

/* MESSAGE */
function showMsg(text){
  const msg = document.getElementById("msg");
  msg.innerText = text;
  msg.classList.add("show");
  setTimeout(()=> msg.classList.remove("show"), 2500);
}

/* PANEL SWITCHING */
function showPanel(id){
  ['panel-main','panel-phone','panel-otp'].forEach(p=>{
    const el = document.getElementById(p);
    if(el) el.classList.add('hidden');
  });
  document.getElementById(id).classList.remove('hidden');
  // Clear OTP input whenever leaving the OTP panel
  if(id !== 'panel-otp'){
    const otpInput = document.getElementById('otp-code');
    if(otpInput) otpInput.value = '';
  }
}

function goToPassword(){
  const email = document.getElementById('email').value.trim();
  const errEl = document.getElementById('email-error');
  if(!email){
    errEl.textContent = 'Please enter your email address';
    errEl.classList.remove('hidden');
    setTimeout(()=>errEl.classList.add('hidden'), 3000);
    return;
  }
  let user = findUser(email);
  if(!user){
    const users = getUsers();
    user = { fname: '', lname: '', email, password: '', phone: '', addresses: [] };
    users.push(user);
    saveUsers(users);
  }
  errEl.classList.add('hidden');

  // Show OTP panel immediately, send code in the background
  document.getElementById('email-display').textContent = email;
  showPanel('panel-otp');

  fetch('http://127.0.0.1:5000/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  .then(r => r.json())
  .then(data => {
    if(!data.success){
      const errEl2 = document.getElementById('otp-error');
      errEl2.textContent = 'Failed to send code. Try again.';
      errEl2.classList.remove('hidden');
      setTimeout(()=>errEl2.classList.add('hidden'), 3000);
    }
  })
  .catch(()=>{
    const errEl2 = document.getElementById('otp-error');
    errEl2.textContent = 'Server error. Make sure the OTP server is running.';
    errEl2.classList.remove('hidden');
    setTimeout(()=>errEl2.classList.add('hidden'), 4000);
  });
}

function resendOTP(){
  const email = document.getElementById('email').value.trim();
  const btn   = document.getElementById('resend-btn');
  const errEl = document.getElementById('otp-error');

  btn.style.pointerEvents = 'none';
  btn.textContent = 'Sending...';

  fetch('http://127.0.0.1:5000/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  .then(r => r.json())
  .then(data => {
    if(data.success){
      btn.textContent = 'Sent!';
      setTimeout(() => {
        btn.textContent = 'Resend code';
        btn.style.pointerEvents = '';
      }, 30000);
    } else {
      btn.textContent = 'Resend code';
      btn.style.pointerEvents = '';
      errEl.textContent = 'Failed to resend. Try again.';
      errEl.classList.remove('hidden');
      setTimeout(() => errEl.classList.add('hidden'), 3000);
    }
  })
  .catch(() => {
    btn.textContent = 'Resend code';
    btn.style.pointerEvents = '';
    errEl.textContent = 'Server error. Make sure the OTP server is running.';
    errEl.classList.remove('hidden');
    setTimeout(() => errEl.classList.add('hidden'), 4000);
  });
}

function submitOTP(){
  const email  = document.getElementById('email').value.trim();
  const otp    = document.getElementById('otp-code').value.trim();
  const errEl  = document.getElementById('otp-error');

  if(!otp || otp.length < 6){
    errEl.textContent = 'Enter the 6-digit code';
    errEl.classList.remove('hidden');
    setTimeout(()=>errEl.classList.add('hidden'), 3000);
    return;
  }

  fetch('http://127.0.0.1:5000/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  })
  .then(r => r.json())
  .then(data => {
    if(data.success){
      const user = findUser(email);
      localStorage.setItem('loggedIn', 'true');
      localStorage.setItem('loggedInUser', JSON.stringify(user));
      showMsg('Login successful');
      setTimeout(()=>{ window.location.href = 'homepage.html'; }, 1200);
    } else {
      errEl.textContent = 'Incorrect code. Please try again.';
      errEl.classList.remove('hidden');
      setTimeout(()=>errEl.classList.add('hidden'), 3000);
    }
  })
  .catch(()=>{
    errEl.textContent = 'Server error. Make sure the OTP server is running.';
    errEl.classList.remove('hidden');
    setTimeout(()=>errEl.classList.add('hidden'), 4000);
  });
}

function loginWithPhone(){
  const phone = document.getElementById('phone').value.trim();
  const errEl = document.getElementById('phone-error');
  if(!phone || phone.length < 10){
    errEl.textContent = 'Please enter a valid 10-digit phone number';
    errEl.classList.remove('hidden');
    setTimeout(()=>errEl.classList.add('hidden'), 3000);
    return;
  }
  errEl.textContent = 'Phone number login is not yet available.';
  errEl.classList.remove('hidden');
  setTimeout(()=>errEl.classList.add('hidden'), 3000);
}

/* REGISTER */
function register(){
  const fname    = document.getElementById("fname").value.trim();
  const lname    = document.getElementById("lname").value.trim();
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if(!fname || !lname || !email || !password){
    showMsg("Fill all fields");
    return;
  }

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    showMsg("Invalid email format");
    return;
  }

  if(password.length < 6){
    showMsg("Password must be at least 6 characters");
    return;
  }

  const users = getUsers();

  if(users.find(u => u.email.toLowerCase() === email.toLowerCase())){
    showMsg("Email already registered");
    return;
  }

  const newUser = { fname, lname, email, password, phone:"", addresses:[] };
  users.push(newUser);
  saveUsers(users);

  showMsg("Account created!");
  setTimeout(()=>{ window.location.href = "login.html"; }, 1500);
}

/* LOGIN */
function login(){
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errEl    = document.getElementById("pass-error");

  const user = findUser(email);

  if(!user){
    errEl.textContent = "No account found for this email";
    errEl.classList.remove('hidden');
    setTimeout(()=>errEl.classList.add('hidden'), 3000);
    return;
  }

  if(user.password !== password){
    errEl.textContent = "Incorrect password. Please try again.";
    errEl.classList.remove('hidden');
    setTimeout(()=>errEl.classList.add('hidden'), 3000);
    return;
  }

  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("loggedInUser", JSON.stringify(user));

  showMsg("Login successful");
  setTimeout(()=>{ window.location.href = "homepage.html"; }, 1200);
}

/* ENTER KEY SUPPORT */
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('email')?.addEventListener('keydown', e=>{ if(e.key==='Enter') goToPassword(); });

  const phoneInput = document.getElementById('phone');
  if(phoneInput){
    phoneInput.addEventListener('keydown', e=>{ if(e.key==='Enter') loginWithPhone(); });
    phoneInput.addEventListener('keypress', function(e){
      if(!/[0-9]/.test(e.key)) e.preventDefault();
      if(this.value.length >= 10) e.preventDefault();
    });
    phoneInput.addEventListener('input', function(){
      this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
    });
    phoneInput.addEventListener('paste', function(e){
      const paste = (e.clipboardData || window.clipboardData).getData('text');
      if(!/^[0-9]+$/.test(paste)) e.preventDefault();
    });
  }

  const otpInput = document.getElementById('otp-code');
  if(otpInput){
    // Digits only, max 6
    otpInput.addEventListener('input', ()=>{
      otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
    });
    otpInput.addEventListener('keydown', e=>{ if(e.key==='Enter') submitOTP(); });
  }
});

/* NAV */
function goToRegister(){
  window.location.href = "../pages/register.html";
}

function goToLogin(){
  window.location.href = "../pages/login.html";
}

/* FORGOT */
function forgotPassword(){
  showMsg("Redirecting...");
  setTimeout(()=>{
    window.location.href = "../pages/forgot.html";
  }, 800);
}

function goBack(){
  window.location.href = "../pages/homepage.html";
}

let verified = false;

/* 🔥 SHOW MESSAGE (UI STYLE) */
function showMsg(text, type = "error") {
  const msg = document.getElementById("msg");

  msg.innerText = text;
  msg.className = "msg show " + type;

  setTimeout(() => {
    msg.classList.remove("show");
  }, 2500);
}

/* ✅ SEND OTP */
function sendOTP() {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    showMsg("Enter email first");
    return;
  }

  fetch("http://127.0.0.1:5000/send-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showMsg("OTP sent to your email ✅", "success");

      // 👉 MOVE TO STEP 2
      document.getElementById("step1").classList.add("hidden");
      document.getElementById("step2").classList.remove("hidden");

    } else {
      showMsg("Failed to send OTP ❌");
    }
  })
  .catch(() => {
    showMsg("Server error ⚠️");
  });
}

/* ✅ VERIFY OTP */
function verifyOTP() {
  const email = document.getElementById("email").value;
  const otp = document.getElementById("otp").value;

  if (!otp) {
    showMsg("Enter OTP");
    return;
  }

  fetch("http://127.0.0.1:5000/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, otp })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      verified = true;
      showMsg("OTP verified ✅", "success");

      // 👉 MOVE TO STEP 3
      document.getElementById("step2").classList.add("hidden");
      document.getElementById("step3").classList.remove("hidden");

    } else {
      showMsg("Invalid OTP ❌");
    }
  });
}

/* ✅ RESET PASSWORD */
function resetPassword() {
  const email   = document.getElementById("email").value.trim();
  const newpass = document.getElementById("newpass").value;
  const confirm = document.getElementById("confirmpass").value;

  if (!verified) {
    showMsg("Verify OTP first");
    return;
  }

  if (!newpass || newpass.length < 6) {
    showMsg("Password must be at least 6 characters");
    return;
  }

  if (newpass !== confirm) {
    showMsg("Passwords do not match ❌");
    return;
  }

  // Migrate old single-user account if needed
  const oldAccount = JSON.parse(localStorage.getItem("user"));
  if(oldAccount && oldAccount.email){
    const existing = JSON.parse(localStorage.getItem("sl_users")) || [];
    const alreadyIn = existing.find(u => u.email.toLowerCase() === oldAccount.email.toLowerCase());
    if(!alreadyIn){
      existing.push({ fname: oldAccount.fname||"", lname: oldAccount.lname||"", email: oldAccount.email, password: oldAccount.password||"", phone: oldAccount.phone||"", addresses: oldAccount.addresses||[] });
      localStorage.setItem("sl_users", JSON.stringify(existing));
    }
  }

  // Update the correct user in the multi-user array
  const users = JSON.parse(localStorage.getItem("sl_users")) || [];
  const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  if (idx === -1) {
    showMsg("No account found for this email");
    return;
  }

  users[idx].password = newpass;
  localStorage.setItem("sl_users", JSON.stringify(users));

  // If that user is currently logged in, update their session too
  const session = JSON.parse(localStorage.getItem("loggedInUser"));
  if (session && session.email.toLowerCase() === email.toLowerCase()) {
    session.password = newpass;
    localStorage.setItem("loggedInUser", JSON.stringify(session));
  }

  showMsg("Password updated! 🎉", "success");
  setTimeout(() => { window.location.href = "login.html"; }, 1500);
}

/* 🔙 BACK TO LOGIN */
function goToLogin() {
  window.location.href = "login.html";
}
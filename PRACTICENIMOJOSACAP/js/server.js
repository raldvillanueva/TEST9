const express    = require("express");
const cors       = require("cors");
const nodemailer = require("nodemailer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

let otpStore = {};

/* ── EMAIL SETUP ── */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "villanuevagerald73@gmail.com",
    pass: "krncdvhwboknalrm"
  }
});

/* ─────────────────────────────────────────
   EXISTING ROUTES
   ───────────────────────────────────────── */

/* SEND OTP */
app.post("/send-otp", async (req, res) => {
  console.log("🔥 BACKEND HIT");
  const { email } = req.body;
  if (!email) return res.json({ success: false });

  const otp = Math.floor(100000 + Math.random() * 900000);
  otpStore[email] = otp;

  try {
    await transporter.sendMail({
      from:    "SugarLoomPh",
      to:      email,
      subject: "OTP Code",
      text:    `Your OTP is: ${otp}`
    });
    console.log("✅ EMAIL SENT:", otp);
    res.json({ success: true });
  } catch (err) {
    console.log("❌ ERROR:", err);
    res.json({ success: false });
  }
});

/* VERIFY OTP */
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (otpStore[email] == otp) return res.json({ success: true });
  res.json({ success: false });
});

/* GEMINI CHAT */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "API DITO LAGAY");
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

app.post("/chat", async (req, res) => {
  const { message } = req.body;
  console.log("💬 CHAT HIT:", message);
  if (!message) return res.json({ reply: "No message received." });

  try {
    const chat = model.startChat({
      history: [
        { role: "user",  parts: [{ text: `You are SugarLoom Assistant, a friendly AI chatbot for SugarLoom Ph — a Manila-based cookie and brownie shop. Only answer questions related to the bakery. Keep replies short and friendly with food emojis.` }] },
        { role: "model", parts: [{ text: "Hi! I'm the SugarLoom Assistant 🍪 How can I help you today?" }] }
      ]
    });
    const result = await chat.sendMessage(message);
    const reply  = result.response.text();
    console.log("✅ Gemini reply:", reply);
    res.json({ reply });
  } catch (err) {
    console.log("❌ Gemini error:", err.message);
    res.json({ reply: "Sorry, AI is unavailable right now 😔" });
  }
});

/* SEND ORDER STATUS EMAIL */
app.post("/send-order-notification", async (req, res) => {
  const { to_email, to_name, order_id, status, status_message, items, order_total, product_img, website_url } = req.body;
  if (!to_email || !order_id) return res.json({ success: false, error: "Missing fields" });

  const itemsHtml = (items || []).map(i =>
    `<tr>
      <td style="padding:8px 0;font-size:14px">${i.name}</td>
      <td style="padding:8px 0;font-size:14px;text-align:center">x${i.qty}</td>
      <td style="padding:8px 0;font-size:14px;text-align:right">₱${((i.price||0)*i.qty).toLocaleString()}</td>
    </tr>`
  ).join("");

  const html = `
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fafaf8;border-radius:16px;overflow:hidden;border:1px solid #e8e8e0">

    <!-- Header -->
    <div style="background:#1a1a1a;padding:28px 32px;text-align:center">
      <p style="color:#fff;font-size:22px;font-weight:700;margin:0;letter-spacing:1px">🍪 SugarLoomPh</p>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <p style="font-size:15px;color:#555;margin:0 0 4px">Hi <strong>${to_name}</strong>,</p>
      <h2 style="font-size:20px;color:#1a1a1a;margin:12px 0">${status_message}</h2>


      <!-- Order Info -->
      <div style="background:#fff;border:1px solid #e8e8e0;border-radius:12px;padding:20px;margin:20px 0">
        <p style="font-size:12px;color:#999;font-weight:700;letter-spacing:1px;margin:0 0 12px">ORDER DETAILS</p>
        <p style="font-size:13px;color:#777;margin:0 0 12px">Order ID: <strong style="color:#1a1a1a">${order_id}</strong> &nbsp;|&nbsp; Status: <strong style="color:#1a1a1a">${status}</strong></p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee">
          <thead>
            <tr>
              <th style="text-align:left;font-size:11px;color:#999;padding:8px 0;font-weight:600">ITEM</th>
              <th style="text-align:center;font-size:11px;color:#999;padding:8px 0;font-weight:600">QTY</th>
              <th style="text-align:right;font-size:11px;color:#999;padding:8px 0;font-weight:600">PRICE</th>
            </tr>
          </thead>
          <tbody style="border-top:1px solid #eee">${itemsHtml}</tbody>
          <tfoot>
            <tr style="border-top:1px solid #eee">
              <td colspan="2" style="padding:12px 0;font-size:14px;font-weight:700;color:#1a1a1a">Total</td>
              <td style="padding:12px 0;font-size:16px;font-weight:700;color:#1a1a1a;text-align:right">${order_total}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- CTA -->
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px">
        ${String(status).trim() === 'Fulfilled'
          ? 'Thank you for choosing SugarLoomPh! We hope you enjoyed every bite. We\'d love to bake for you again — visit our store anytime! 🍪'
          : 'Please check the website for further details on your order status and delivery updates.'}
      </p>
      <a href="${website_url || '#'}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:13px 28px;border-radius:30px;font-size:14px;font-weight:600;text-decoration:none">
        ${String(status).trim() === 'Fulfilled' ? 'Visit Store →' : 'View Order →'}
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #e8e8e0;text-align:center">
      <p style="font-size:12px;color:#aaa;margin:0">SugarLoomPh &nbsp;·&nbsp; Freshly baked with love 🍪</p>
    </div>

  </div>`;

  try {
    await transporter.sendMail({
      from:    '"SugarLoomPh" <villanuevagerald73@gmail.com>',
      to:      to_email,
      subject: `Order ${order_id} — ${status}`,
      html
    });
    console.log(`✅ Order email sent to ${to_email} [${order_id} → ${status}]`);
    res.json({ success: true });
  } catch (err) {
    console.log("❌ Order email error:", err.message);
    res.json({ success: false, error: err.message });
  }
});

/* HEALTH CHECK */
app.get("/", (_req, res) => res.send("Server is running ✅"));

/* ─────────────────────────────────────────
   LALAMOVE DEMO ROUTES
   (Simulates real Lalamove responses — no API key needed)
   ───────────────────────────────────────── */

/* In-memory store: orderRef → { bookedAt, customerName, deliveryAddress } */
const demoBookings = {};

/* Status progression based on elapsed time since booking */
function getDemoStatus(bookedAt) {
  const elapsed = (Date.now() - bookedAt) / 1000; // seconds
  if (elapsed < 10)  return { status: "ASSIGNING_DRIVER", driver: null };
  if (elapsed < 20)  return {
    status: "ON_GOING",
    driver: { name: "Juan dela Cruz", phone: "+639171234567", plate: "ABC 1234" }
  };
  if (elapsed < 30) return {
    status: "PICKED_UP",
    driver: { name: "Juan dela Cruz", phone: "+639171234567", plate: "ABC 1234" }
  };
  return {
    status: "COMPLETED",
    driver: { name: "Juan dela Cruz", phone: "+639171234567", plate: "ABC 1234" }
  };
}

/**
 * POST /lalamove/create-order
 * Body: { customerName, customerPhone, deliveryAddress }
 * Returns a simulated Lalamove booking response.
 */
app.post("/lalamove/create-order", (req, res) => {
  const { customerName, customerPhone, deliveryAddress } = req.body;
  if (!customerName || !customerPhone || !deliveryAddress) {
    return res.json({ success: false, error: "Missing required fields." });
  }

  const orderRef = "LLM-" + Date.now();
  demoBookings[orderRef] = { bookedAt: Date.now(), customerName, deliveryAddress };

  console.log("🛵 Demo Lalamove booking created:", orderRef, "→", customerName, deliveryAddress);

  res.json({
    success:   true,
    orderRef:  orderRef,
    shareLink: "https://share.lalamove.com/demo/" + orderRef,
    price:     "80.00",
    currency:  "PHP"
  });
});

/**
 * GET /lalamove/track/:orderRef
 * Returns simulated tracking status that progresses over time.
 */
app.get("/lalamove/track/:orderRef", (req, res) => {
  const booking = demoBookings[req.params.orderRef];
  if (!booking) return res.json({ success: false, error: "Order not found." });

  const { status, driver } = getDemoStatus(booking.bookedAt);
  console.log("📍 Demo tracking:", req.params.orderRef, "→", status);

  res.json({ success: true, status, driver });
});

app.listen(5000, () => {
  console.log("🔥 Server running on http://localhost:5000");
});

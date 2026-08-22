# 4️⃣ Try It Yourself!

You can run the demo files with **just Node.js** — no setup needed.

---

## ▶️ Run the OTP demo (best starting point!)

Open a terminal in this folder and run:

```bash
node 3_the_code_explained/verify_otp.js
```

### What you'll see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         OTP Verification Demo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 [SIMULATED EMAIL to student@example.com]
   Subject: Your verification code
   Body: Your OTP is ──► 583920
   (Expires in 10 minutes)

Test 1: User types wrong code "000000"
❌ Wrong OTP. You typed: 000000

Test 2: User types the correct code
✅ OTP verified! Creating your account now...

Test 3: User tries same code again (one-time use!)
❌ No OTP found for this email.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Notice: After a correct submission,
the OTP is deleted and cannot be reused!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ▶️ Run the OTP store demo

```bash
node 3_the_code_explained/otp_store.js
```

This shows how the OTP is stored, verified, and fails when used twice.

---

## 📖 Just want to read?

No problem — just open the files and read them top to bottom.
Every single line has a comment explaining what it does.

---

## 💡 Key things to understand after reading

| Concept | Explanation |
|---|---|
| `Map` | A key→value store. Like a dictionary or phonebook |
| `Math.random()` | Generates a random number between 0 and 1 |
| `Date.now()` | Current time in milliseconds |
| `async/await` | Waits for slow operations (like sending emails) to finish |
| `nodemailer` | A library that handles sending emails via Gmail/SMTP |
| `store.delete(email)` | Removes the OTP — makes it one-time use |

---

## 🧠 Challenge: Modify the code!

Try these experiments in `verify_otp.js`:

1. **Change the expiry time** — make OTP expire in 1 minute instead of 10
   - Find `const TEN_MINUTES = 10 * 60 * 1000` and change `10` to `1`

2. **Change the OTP length** — make it 4 digits instead of 6
   - Find `Math.floor(100000 + Math.random() * 900000)`
   - Change to `Math.floor(1000 + Math.random() * 9000)` for 4 digits

3. **Add a limit** — only allow 3 attempts before the OTP is deleted
   - Add an `attempts` counter to the stored entry
   - In `submitOtp()`, increment it each time the code is wrong
   - If attempts > 3, delete the OTP and return an error

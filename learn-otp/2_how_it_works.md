# 2️⃣ How It Works — Step by Step

Let's trace exactly what happens when someone registers on FlexTag.

---

## 🗺️ The Full Journey

```
USER fills in name, email, password
         ↓
USER clicks "Send Verification Code"
         ↓
🖥️  BACKEND receives the email address
         ↓
🔢  BACKEND generates a random code → e.g. "847291"
         ↓
💾  BACKEND saves: { email → "847291", expires in 10 min }
         ↓
📧  BACKEND sends email to user with code "847291"
         ↓
📬  USER checks their inbox and sees the code
         ↓
USER types "847291" into the OTP boxes
         ↓
🖥️  BACKEND checks: does "847291" match what we stored?
         ↓
    ✅ YES → Create the account, log the user in
    ❌ NO  → Show error, don't create account
```

---

## 📦 What is the "Store"?

When the backend generates the OTP, it needs to **remember it** somewhere
so it can check it later when the user submits.

We use a simple JavaScript `Map` (like a dictionary / phonebook):

```
KEY          → VALUE
─────────────────────────────────────────────
user@gmail.com → { code: "847291", expires: 9:30pm }
bob@gmail.com  → { code: "123904", expires: 9:45pm }
```

Think of it like sticky notes on a noticeboard:
- Key   = the email (who the note is for)
- Value = the OTP code + when it expires

---

## 📧 How does the email get sent?

We use a library called **Nodemailer**.

Nodemailer is like a post office worker — you give it:
1. The recipient's email
2. The subject
3. The message (the OTP code)

And it goes and delivers it for you via Gmail.

```
You → Nodemailer → Gmail servers → Recipient's inbox
```

---

## ✅ How is the OTP verified?

When the user submits their code, the backend:

1. Looks up the email in the store → finds `{ code: "847291", expires: 9:30pm }`
2. Checks: has it expired? → if yes, reject
3. Checks: does the submitted code match "847291"? → if no, reject
4. If everything passes → **delete** the OTP (one-time use!) and create the account

---

## 🔄 What happens with "Resend"?

If the user clicks "Resend Code":
- A NEW random code is generated
- It **replaces** the old one in the store
- The old code no longer works
- A new email is sent with the new code
- The 10-minute timer resets

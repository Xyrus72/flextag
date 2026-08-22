# 1️⃣ What is an OTP?

## OTP = One-Time Password

An OTP is a **random number code** (usually 6 digits) that:
- Is sent to your email (or phone)
- Can only be used **once**
- **Expires** after a short time (like 10 minutes)

---

## 🤔 Why do we use it?

Imagine someone tries to create an account using **your** email address.

Without OTP:
```
❌ Hacker types: victim@gmail.com
❌ Account gets created instantly
❌ Now the hacker has an account pretending to be you!
```

With OTP:
```
✅ Hacker types: victim@gmail.com
✅ A code is sent to victim@gmail.com
✅ Only YOU can read that email
✅ Hacker can't get the code → account NOT created
✅ Your email is protected!
```

---

## 🔢 What does an OTP look like?

It's just a random 6-digit number:

```
483920
```

or

```
017364
```

Every time it's different. You can't guess it.

---

## ⏰ Why does it expire?

If OTPs lasted forever:
- Someone could steal an old OTP and use it later
- That would be a security risk

So we make it expire in **10 minutes**.
After 10 minutes, you need to request a new one.

---

## 🗑️ Why can it only be used once?

If you could use the same OTP multiple times:
- Someone watching your email could save the code
- They could keep using it over and over

So after you enter it once — it's **deleted**. Gone forever.

---

## Summary

| Feature | Why? |
|---|---|
| Random 6 digits | Hard to guess |
| Sent to your email | Only you can receive it |
| Expires in 10 min | Can't be stolen and used later |
| One-time use only | Can't be reused by anyone |

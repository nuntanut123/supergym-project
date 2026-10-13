document.getElementById("signupForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget, msg = document.getElementById("signupMessage");
  msg.hidden = false;
  if (form.password.value !== form.confirmPassword.value) {
    msg.textContent = "Passwords do not match"; return;
  }
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = "Creating account...";
  try {
    const payload = Object.fromEntries(new FormData(form));
    delete payload.confirmPassword;
    const res = await fetch("/api/auth/register", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    msg.textContent = "Account created! Redirecting to Login...";
    form.reset();
    setTimeout(() => {location.href = "index.html";}, 1200);
  } catch (e) {msg.textContent = e.message;} finally {btn.disabled = false; btn.textContent = "Sign Up";}
});

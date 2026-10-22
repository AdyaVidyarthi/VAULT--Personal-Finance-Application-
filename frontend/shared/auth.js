const form = document.getElementById("auth-form");
const nameInput = document.getElementById("name");
const nameLabel = document.getElementById("name-label");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("auth-message");
const submitButton = document.getElementById("submit-button");
const loginTab = document.getElementById("login-tab");
const signupTab = document.getElementById("signup-tab");
let mode = "login";

function setMode(nextMode) {
  mode = nextMode;
  const signup = mode === "signup";
  nameInput.classList.toggle("is-hidden", !signup);
  nameLabel.classList.toggle("is-hidden", !signup);
  nameInput.required = signup;
  passwordInput.autocomplete = signup ? "new-password" : "current-password";
  loginTab.classList.toggle("active", !signup);
  signupTab.classList.toggle("active", signup);
  loginTab.setAttribute("aria-selected", String(!signup));
  signupTab.setAttribute("aria-selected", String(signup));
  document.getElementById("form-eyebrow").textContent = signup
    ? "Start with a clear picture"
    : "Welcome back";
  document.getElementById("form-title").textContent = signup
    ? "Create your account"
    : "Sign in";
  document.getElementById("form-subtitle").textContent = signup
    ? "Your personal finance space starts here."
    : "Pick up where you left off.";
  submitButton.textContent = signup ? "Create account" : "Sign in";
  message.textContent = "";
}

loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  submitButton.disabled = true;
  try {
    const credentials = {
      email: emailInput.value.trim(),
      password: passwordInput.value,
    };
    if (mode === "signup") {
      await FinanceAPI.auth.signup({
        ...credentials,
        name: nameInput.value.trim(),
      });
    } else {
      await FinanceAPI.auth.login(credentials);
    }
    window.location.replace(new URL("Home/home.html", window.location.href));
  } catch (error) {
    message.textContent =
      error.message || "Unable to sign in. Please try again.";
  } finally {
    submitButton.disabled = false;
  }
});

FinanceAPI.auth
  .me()
  .then(() => {
    window.location.replace(new URL("Home/home.html", window.location.href));
  })
  .catch(() => {});

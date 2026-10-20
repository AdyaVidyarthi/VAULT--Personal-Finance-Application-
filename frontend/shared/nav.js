// Shared navigation script to highlight active page based on current URL
document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname.toLowerCase();
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    // Clean link href to match folder or file
    const cleanHref = href.toLowerCase();

    if (
      (cleanHref.includes("home") &&
        (currentPath.includes("home") ||
          currentPath.endsWith("/") ||
          currentPath.endsWith("index.html"))) ||
      (cleanHref.includes("transaction") &&
        currentPath.includes("transaction")) ||
      (cleanHref.includes("budget") && currentPath.includes("budget")) ||
      (cleanHref.includes("saving") &&
        (currentPath.includes("saving") || currentPath.includes("investment")))
    ) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  if (!window.FinanceAPI || window.location.pathname.endsWith("/auth.html"))
    return;

  FinanceAPI.auth
    .me()
    .then(({ user }) => {
      const nav = document.querySelector(".nav-links");
      if (!nav) return;

      const accountItem = document.createElement("li");
      accountItem.className = "nav-account";
      const accountName = document.createElement("span");
      accountName.className = "nav-account-name";
      accountName.textContent = user.name;
      const logoutButton = document.createElement("button");
      logoutButton.className = "nav-logout";
      logoutButton.type = "button";
      logoutButton.textContent = "Sign out";
      logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;
        try {
          await FinanceAPI.auth.logout();
        } finally {
          window.location.replace(
            new URL("../auth.html", window.location.href),
          );
        }
      });
      accountItem.append(accountName, logoutButton);
      nav.appendChild(accountItem);
    })
    .catch(() => {
      window.location.replace(new URL("../auth.html", window.location.href));
    });
});

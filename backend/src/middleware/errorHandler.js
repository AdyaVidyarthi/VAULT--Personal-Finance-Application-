export function errorHandler(error, _req, res, _next) {
  console.error("Server error:", error);
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
  const message =
    status < 500 ? "Invalid request." : "An unexpected server error occurred.";

  res.status(status).json({ error: message });
}

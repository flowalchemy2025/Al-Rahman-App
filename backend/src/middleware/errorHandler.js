export const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    error: err.message || "Internal server error",
  };

  if (err.details) payload.details = err.details;
  if (process.env.NODE_ENV !== "production" && err.stack) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

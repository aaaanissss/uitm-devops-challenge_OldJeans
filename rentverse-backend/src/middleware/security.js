const rateLimit = require('express-rate-limit');

/**
 * 1. Rate Limiter
 * Restricts the number of requests from the same IP to prevent DDoS/Brute-force.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  },
});

/**
 * 2. Conditional HTTPS Redirection
 * Forces HTTPS only when in Production environment.
 * Skips this check for Development (localhost/http).
 */
const enforceHTTPS = (req, res, next) => {
  // Only enforce in production
  if (process.env.NODE_ENV === 'production') {
    // Check if the request is already HTTPS (trusted proxies set x-forwarded-proto)
    if (req.headers['x-forwarded-proto'] !== 'https' && !req.secure) {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
  }
  // Proceed if in development or if connection is already secure
  next();
};

module.exports = { apiLimiter, enforceHTTPS };

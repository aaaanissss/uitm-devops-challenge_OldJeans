const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { passport, handleAppleSignIn } = require('../config/passport');

// Task 1: MFA
const speakeasy = require('speakeasy'); // For TOTP generation and verification
const qrcode = require('qrcode'); // For generating QR codes
const { auth } = require('../middleware/auth'); // Import auth middleware
const router = express.Router();

// Security monitoring
const {
  logAuditEvent,
  runLoginDetectionRules,
} = require('../services/securityMonitoring');

// Initialize Passport
router.use(passport.initialize());

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: User's date of birth (YYYY-MM-DD)
 *         phone:
 *           type: string
 *           description: User's phone number
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 name:
 *                   type: string
 *                 dateOfBirth:
 *                   type: string
 *                   format: date
 *                 phone:
 *                   type: string
 *                 role:
 *                   type: string
 *             token:
 *               type: string
 */

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request
 *       409:
 *         description: User already exists
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty().trim().withMessage('First name is required'),
    body('lastName').notEmpty().trim().withMessage('Last name is required'),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),
    body('phone').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, password, firstName, lastName, dateOfBirth, phone } =
        req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create full name for backward compatibility
      const fullName = `${firstName} ${lastName}`;

      // Create user with USER role
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          name: fullName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          phone: phone || null,
          role: 'USER',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          dateOfBirth: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      console.error('User registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // CASE 1: user not found or inactive → LOGIN_FAILURE
      if (!user || !user.isActive) {
        const failureLog = await logAuditEvent({
          req,
          userId: user ? user.id : null,
          eventType: 'LOGIN_FAILURE',
          metadata: {
            reason: !user ? 'USER_NOT_FOUND' : 'USER_INACTIVE',
            email,
          },
        });

        await runLoginDetectionRules({
          req,
          user: user || null,
          eventType: 'LOGIN_FAILURE',
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      // CASE 2: wrong password → LOGIN_FAILURE
      if (!isPasswordValid) {
        const failureLog = await logAuditEvent({
          req,
          userId: user.id,
          eventType: 'LOGIN_FAILURE',
          metadata: {
            reason: 'INVALID_PASSWORD',
            email,
          },
        });

        await runLoginDetectionRules({
          req,
          user,
          eventType: 'LOGIN_FAILURE',
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // At this point, credentials are correct
      // We'll log success + run detection later, after MFA decision.

      // If user has MFA enabled, do NOT issue full JWT yet
      if (user.mfaEnabled && user.mfaSecret) {
        // Short-lived token just for MFA step
        const mfaToken = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            role: user.role,
            purpose: 'mfa_login',
          },
          process.env.JWT_SECRET,
          { expiresIn: '5m' } // 5 minutes
        );

        // Remove password before sending
        const { password: _, ...userWithoutPassword } = user;

        // CASE 3: Credentials ok, but MFA required
        const primarySuccessLog = await logAuditEvent({
          req,
          userId: user.id,
          eventType: 'LOGIN_SUCCESS', // successful primary auth
          metadata: {
            email,
            mfaRequired: true,
          },
        });

        // Optional: log MFA_CHALLENGE separately (we keep it)
        await logAuditEvent({
          req,
          userId: user.id,
          eventType: 'MFA_CHALLENGE',
          metadata: {
            email,
          },
        });

        // (Detection rules hook – no rules for success yet, but we pass latestLog)
        await runLoginDetectionRules({
          req,
          user,
          eventType: 'LOGIN_SUCCESS',
        });

        return res.json({
          success: true,
          message: 'MFA required',
          data: {
            status: 'MFA_REQUIRED',
            mfaToken,
            user: userWithoutPassword,
          },
        });
      }

      // CASE 4: No MFA → normal login success
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const { password: _, ...userWithoutPassword } = user;

      // Log LOGIN_SUCCESS
      await logAuditEvent({
        req,
        userId: user.id,
        eventType: 'LOGIN_SUCCESS',
        metadata: {
          email,
          mfaRequired: false,
        },
      });

      // (Detection rules hook – no rules for success yet, but future-proof)
      await runLoginDetectionRules({
        req,
        user,
        eventType: 'LOGIN_SUCCESS',
      });

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/mfa/setup
 * Requires: Authorization: Bearer <JWT>
 * Purpose: Generate TOTP secret + QR code for the current user
 */
/**
 * @swagger
 * /api/auth/mfa/setup:
 *   post:
 *     summary: Start MFA setup (generate TOTP secret + QR code)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA setup initiated
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/auth/mfa/confirm:
 *   post:
 *     summary: Confirm MFA setup by validating first TOTP code
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: MFA enabled successfully
 *       400:
 *         description: Invalid code or MFA not initialized
 */
router.post('/mfa/setup', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Prevent regenerating if already enabled (change setting if i want later la)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfaEnabled: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate a new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Rentverse (${user.email})`,
      length: 20,
    });

    // Generate QR code data URL
    const otpauthUrl = secret.otpauth_url;

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Save secret (but do NOT enable yet)
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret.base32,
        // mfaEnabled stays false until confirmed
      },
    });

    return res.json({
      success: true,
      message: 'MFA setup initiated',
      data: {
        qrCode: qrCodeDataUrl,
        secret: secret.base32, // frontend normally doesn't show this, but useful for dev/demo
      },
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/mfa/confirm
 * Requires: Authorization: Bearer <JWT>
 * Body: { code: "123456" }
 * Purpose: Verify TOTP once and enable MFA on the account
 */
router.post(
  '/mfa/confirm',
  auth,
  [body('code').isLength({ min: 6, max: 6 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const { code } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          mfaSecret: true,
          mfaEnabled: true,
        },
      });

      if (!user || !user.mfaSecret) {
        return res.status(400).json({
          success: false,
          message: 'MFA not initialized for this user',
        });
      }

      const isValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: code,
        window: 1, // allow +/- 30s drift
      });

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid MFA code',
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
        },
      });

      return res.json({
        success: true,
        message: 'MFA enabled successfully',
      });
    } catch (error) {
      console.error('MFA confirm error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/mfa/verify
 * Body: { code: "123456", mfaToken: "<token from /login>" }
 * Purpose: Complete login by verifying TOTP and issuing normal JWT
 */
/**
 * @swagger
 * /api/auth/mfa/verify:
 *   post:
 *     summary: Verify MFA code during login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - mfaToken
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *               mfaToken:
 *                 type: string
 *                 description: Short-lived token issued by /api/auth/login when MFA is required
 *     responses:
 *       200:
 *         description: MFA verification successful
 *       400:
 *         description: Bad request (wrong or expired code)
 *       401:
 *         description: Invalid or expired MFA token
 */
router.post(
  '/mfa/verify',
  [
    body('code').isLength({ min: 6, max: 6 }).trim(),
    body('mfaToken').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { code, mfaToken } = req.body;

      let payload;
      try {
        payload = jwt.verify(mfaToken, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired MFA token',
        });
      }

      if (payload.purpose !== 'mfa_login') {
        return res.status(400).json({
          success: false,
          message: 'Invalid MFA token purpose',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecret) {
        return res.status(401).json({
          success: false,
          message: 'User not eligible for MFA login',
        });
      }

      console.log('[MFA VERIFY] serverTime:', new Date().toISOString())
      console.log('[MFA VERIFY] userId:', user.id, 'email:', user.email)
      console.log('[MFA VERIFY] secretLen:', user.mfaSecret?.length)

      const now = speakeasy.totp({ secret: user.mfaSecret, encoding: 'base32' })
      const prev = speakeasy.totp({ secret: user.mfaSecret, encoding: 'base32', time: Math.floor(Date.now()/1000) - 30 })
      const next = speakeasy.totp({ secret: user.mfaSecret, encoding: 'base32', time: Math.floor(Date.now()/1000) + 30 })

      console.log('[MFA VERIFY] expected now/prev/next:', now, prev, next)
      console.log('[MFA VERIFY] received code:', code)

      const isValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: code,
        window: 1,
      });

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid MFA code',
        });
      }

      // MFA passed → issue normal long-lived JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const { password: _, ...userWithoutPassword } = user;

      return res.json({
        success: true,
        message: 'MFA verification successful',
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    } catch (error) {
      console.error('MFA verify error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        dateOfBirth: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        mfaEnabled: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
});

/**
 * POST /api/auth/mfa/disable
 * Requires: Authorization: Bearer <JWT>
 * Purpose: Turn off MFA and delete secret
 */
/**
 * @swagger
 * /api/auth/mfa/disable:
 *   post:
 *     summary: Disable MFA for the current user
 *     description: Disables MFA and clears the stored TOTP secret for the authenticated user.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: MFA is not enabled for this user
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/mfa/disable', auth, async (req, res) => {
  try {
    const userId = req.user.id

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    })

    return res.json({
      success: true,
      message: 'MFA disabled successfully',
    })
  } catch (error) {
    console.error('Disable MFA error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
})

/**
 * @swagger
 * /api/auth/check-email:
 *   post:
 *     summary: Check if email exists in the system
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to check
 *     responses:
 *       200:
 *         description: Email check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     exists:
 *                       type: boolean
 *                       description: Whether the email exists in the system
 *                     isActive:
 *                       type: boolean
 *                       description: Whether the account is active (only returned if exists is true)
 *                     role:
 *                       type: string
 *                       description: User role (only returned if exists is true)
 *       400:
 *         description: Bad request - Invalid email format
 */
router.post(
  '/check-email',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email } = req.body;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          isActive: true,
          role: true,
        },
      });

      if (!user) {
        return res.json({
          success: true,
          data: {
            exists: false,
          },
        });
      }

      res.json({
        success: true,
        data: {
          exists: true,
          isActive: user.isActive,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Check email error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

// ============= OAuth Routes =============

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: OAuth login successful
 *       401:
 *         description: OAuth login failed
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user.id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Redirect to frontend with token
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}&provider=google`
      );
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_error`
      );
    }
  }
);

/**
 * @swagger
 * /api/auth/facebook:
 *   get:
 *     summary: Initiate Facebook OAuth login
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Facebook OAuth consent screen
 */
router.get(
  '/facebook',
  passport.authenticate('facebook', {
    scope: ['email'],
  })
);

/**
 * @swagger
 * /api/auth/facebook/callback:
 *   get:
 *     summary: Facebook OAuth callback
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: OAuth login successful
 *       401:
 *         description: OAuth login failed
 */
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user.id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Redirect to frontend with token
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}&provider=facebook`
      );
    } catch (error) {
      console.error('Facebook OAuth callback error:', error);
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_error`
      );
    }
  }
);

/**
 * @swagger
 * /api/auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth login
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to GitHub OAuth consent screen
 */
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
  })
);

/**
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: OAuth login successful
 *       401:
 *         description: OAuth login failed
 */
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user.id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Redirect to frontend with token
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}&provider=github`
      );
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_error`
      );
    }
  }
);

/**
 * @swagger
 * /api/auth/twitter:
 *   get:
 *     summary: Initiate Twitter OAuth login
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Twitter OAuth consent screen
 */
router.get('/twitter', passport.authenticate('twitter'));

/**
 * @swagger
 * /api/auth/twitter/callback:
 *   get:
 *     summary: Twitter OAuth callback
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: OAuth login successful
 *       401:
 *         description: OAuth login failed
 */
router.get(
  '/twitter/callback',
  passport.authenticate('twitter', { session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user.id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Redirect to frontend with token
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}&provider=twitter`
      );
    } catch (error) {
      console.error('Twitter OAuth callback error:', error);
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_error`
      );
    }
  }
);

/**
 * @swagger
 * /api/auth/apple:
 *   post:
 *     summary: Apple Sign In authentication
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identityToken
 *             properties:
 *               identityToken:
 *                 type: string
 *                 description: Apple ID token from the client
 *               user:
 *                 type: object
 *                 description: User information (only provided on first sign in)
 *                 properties:
 *                   email:
 *                     type: string
 *                   name:
 *                     type: object
 *                     properties:
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *     responses:
 *       200:
 *         description: Apple Sign In successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Invalid Apple token
 */
router.post('/apple', async (req, res) => {
  try {
    const { identityToken, user: userInfo } = req.body;

    if (!identityToken) {
      return res.status(400).json({
        success: false,
        message: 'Identity token is required',
      });
    }

    // Handle Apple Sign In
    const user = await handleAppleSignIn(identityToken, userInfo);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Apple Sign In successful',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Apple Sign In error:', error);
    res.status(401).json({
      success: false,
      message: 'Apple Sign In failed',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/auth/oauth/link:
 *   post:
 *     summary: Link OAuth account to existing user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - providerId
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, facebook, apple, github, twitter]
 *               providerId:
 *                 type: string
 *                 description: ID from the OAuth provider
 *     responses:
 *       200:
 *         description: OAuth account linked successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: OAuth account already linked to another user
 */
router.post('/oauth/link', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { provider, providerId } = req.body;

    if (!provider || !providerId) {
      return res.status(400).json({
        success: false,
        message: 'Provider and providerId are required',
      });
    }

    if (
      !['google', 'facebook', 'apple', 'github', 'twitter'].includes(provider)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider',
      });
    }

    // Check if OAuth account is already linked to another user
    const fieldName = `${provider}Id`;
    const existingUser = await prisma.user.findFirst({
      where: {
        [fieldName]: providerId,
        id: { not: decoded.userId },
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `This ${provider} account is already linked to another user`,
      });
    }

    // Link OAuth account to current user
    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: { [fieldName]: providerId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        googleId: true,
        facebookId: true,
        appleId: true,
        githubId: true,
        twitterId: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      message: `${provider} account linked successfully`,
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('OAuth link error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/auth/oauth/unlink:
 *   post:
 *     summary: Unlink OAuth account from user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, facebook, apple, github, twitter]
 *     responses:
 *       200:
 *         description: OAuth account unlinked successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/oauth/unlink', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider is required',
      });
    }

    if (
      !['google', 'facebook', 'apple', 'github', 'twitter'].includes(provider)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider',
      });
    }

    // Unlink OAuth account from current user
    const fieldName = `${provider}Id`;
    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: { [fieldName]: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        googleId: true,
        facebookId: true,
        appleId: true,
        githubId: true,
        twitterId: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      message: `${provider} account unlinked successfully`,
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('OAuth unlink error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;

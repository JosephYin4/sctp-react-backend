// app.js
require('dotenv').config();

const express = require('express');

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { body, validationResult } = require('express-validator');

// make sure this comes AFTER dotenv config
const userRoutes = require('./routes/users');
const cartRoutes = require('./routes/cart');
const productsRouter = require('./routes/products');


const app = express();
const pool = require('./data/database');

// Middleware
app.use(cors());
/* app.use(cors({
  origin: 'https://5173-josephyin4-reactshoppar-lt49spcbj1l.ws-us116.gitpod.io', // Allow the React app domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
  credentials: true, // If you need to send cookies or authentication headers
  //allowedHeaders: ['Content-Type', 'Authorization'], // Add any custom headers you use
})); */
app.use(express.json());

console.log(process.env.DB_USER);
console.log(process.env.DB_PASSWORD)

// Database connection pool
/*const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}); */

// Validation middleware
const registerValidation = [
  body('name').trim().isLength({ min: 2 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 4 }),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  }),
  body('salutation').isIn(['Mr', 'Ms', 'Mrs']),
  body('country').isIn(['sg', 'my', 'in', 'th']),

];

//routes
app.use('/api/products', productsRouter);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);


// Handle routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to our e-commerce API' });
});


// Registration endpoint
app.post('/api/register', registerValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      password,
      salutation,
      country,
      emailMarketing,
      smsMarketing
    } = req.body;

    // Get database connection from pool
    const connection = await pool.getConnection();

    try {
      // Start transaction
      await connection.beginTransaction();

      // Check if email already exists
      const [existingUsers] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          error: 'Email already registered'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Insert user
      const [userResult] = await connection.query(
        `INSERT INTO users (name, email, password, salutation, country)
         VALUES (?, ?, ?, ?, ?)`,
        [name, email, passwordHash, salutation, country]
      );

      // Insert marketing preferences
      await connection.query(
        `INSERT INTO marketing_preferences (email_marketing, sms_marketing)
         VALUES (?, ?)`,
        [emailMarketing, smsMarketing]
      );

      // Commit transaction
      await connection.commit();

      res.status(201).json({
        message: 'User registered successfully',
        userId: userResult.insertId
      });

    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    } finally {
      // Release connection back to pool
      connection.release();
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'An error occurred during registration'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
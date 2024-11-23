const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const jwt = require('jsonwebtoken');

// POST register a new user
router.post('/register', (req, res) => {
  res.json({ message: "Register a new user" });
});

// POST login a user
router.post('/login', (req, res) => {
  res.json({ message: "Login a user" });
});


module.exports = router;
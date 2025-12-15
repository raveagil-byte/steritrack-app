const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const verifyToken = require('../middleware/authMiddleware');

// Public Routes
router.post('/login', usersController.login);
router.post('/register', usersController.registerPublic);

// Protected Routes
router.get('/', verifyToken, usersController.getAllUsers);
router.post('/', verifyToken, usersController.createUser);
router.put('/:id', verifyToken, usersController.updateUser);
router.put('/:id/status', verifyToken, usersController.updateUserStatus);
router.put('/:id/profile', verifyToken, usersController.updateUserProfile);
router.delete('/:id', verifyToken, usersController.deleteUser);

module.exports = router;

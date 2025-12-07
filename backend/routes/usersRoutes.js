const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');

router.get('/', usersController.getAllUsers);
router.post('/login', usersController.login);
router.post('/', usersController.createUser);
router.put('/:id', usersController.updateUser);
router.put('/:id/status', usersController.updateUserStatus);
router.put('/:id/profile', usersController.updateUserProfile);
router.delete('/:id', usersController.deleteUser);

module.exports = router;

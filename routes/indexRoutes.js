const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

router.get('/', indexController.getHomePage);
router.get('/sc-list', indexController.getScListPage); 

module.exports = router;
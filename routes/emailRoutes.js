const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/emailController');

// Route for sending invoice email
router.post('/send-email-invoice', invoiceController.sendInvoiceEmail);

module.exports = router;
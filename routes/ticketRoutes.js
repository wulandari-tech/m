const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
router.get('/', isAuthenticated, ticketController.listUserTickets);
router.get('/new', isAuthenticated, ticketController.getNewTicketForm);
router.post('/', isAuthenticated, ticketController.createTicket);
router.get('/:id', isAuthenticated, ticketController.viewTicket);
router.post('/:id/reply', isAuthenticated, ticketController.replyToTicket);
router.post('/:id/close', isAuthenticated, ticketController.closeTicket);


router.get('/admin/all', isAuthenticated, isAdmin, ticketController.listAllTicketsAdmin);
router.get('/admin/view/:id', isAuthenticated, isAdmin, ticketController.viewTicketAdmin);
router.post('/admin/:id/reply', isAuthenticated, isAdmin, ticketController.replyToTicketAdmin);
router.post('/admin/:id/status', isAuthenticated, isAdmin, ticketController.updateTicketStatusAdmin);
router.post('/admin/:id/assign', isAuthenticated, isAdmin, ticketController.assignTicketAdmin);

module.exports = router;
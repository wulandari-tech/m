const Ticket = require('../models/ticket');
const User = require('../models/user');
const Order = require('../models/order');
const SourceCode = require('../models/sourceCode');
const mongoose = require('mongoose');

exports.listUserTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ user: req.user._id })
            .sort({ updatedAt: -1, createdAt: -1 });
        res.render('tickets/list', { 
            titlePage: 'Tiket Bantuan Saya', 
            tickets,
            breadcrumbs: [{ name: 'Dashboard', url: '/dashboard' }, { name: 'Tiket Bantuan Saya', active: true }]
        });
    } catch (error) {
        console.error("Error listing user tickets:", error);
        req.flash('error_msg', 'Gagal memuat daftar tiket.');
        res.redirect('/dashboard');
    }
};

exports.getNewTicketForm = async (req, res) => {
    try {
        const userOrders = await Order.find({ user: req.user._id, paymentStatus: 'completed' })
            .populate('sourceCode', 'title')
            .sort({ createdAt: -1 });
        
        const userSCs = await SourceCode.find({ seller: req.user._id })
             .select('title')
             .sort({title: 1});

        res.render('tickets/new', { 
            titlePage: 'Buat Tiket Bantuan Baru',
            userOrders,
            userSCs,
            subject: req.flash('form_subject')[0] || '',
            message: req.flash('form_message')[0] || '',
            order: req.flash('form_order')[0] || '',
            sc: req.flash('form_sc')[0] || '',
            priority: req.flash('form_priority')[0] || 'medium',
            breadcrumbs: [{ name: 'Dashboard', url: '/dashboard' }, { name: 'Tiket Bantuan', url: '/api/tickets' }, { name: 'Buat Tiket Baru', active: true }]
        });
    } catch (error) {
        console.error("Error getting new ticket form:", error);
        req.flash('error_msg', 'Gagal memuat form tiket baru.');
        res.redirect('/api/tickets');
    }
};

exports.createTicket = async (req, res) => {
    const { subject, message, order, sc, priority } = req.body;
    let errors = [];
    if (!subject || !message) {
        errors.push({ msg: 'Subjek dan pesan wajib diisi.' });
    }
    if (subject && subject.length < 5) errors.push({ msg: 'Subjek minimal 5 karakter.' });
    if (message && message.length < 10) errors.push({ msg: 'Pesan minimal 10 karakter.' });
    if (!['low', 'medium', 'high'].includes(priority)) errors.push({ msg: 'Prioritas tidak valid.' });

    if (errors.length > 0) {
        req.flash('errors', errors);
        req.flash('form_subject', subject);
        req.flash('form_message', message);
        req.flash('form_order', order);
        req.flash('form_sc', sc);
        req.flash('form_priority', priority);
        return res.redirect('/api/tickets/new');
    }

    try {
        const newTicket = new Ticket({
            user: req.user._id,
            subject,
            order: order || null,
            sc: sc || null,
            priority,
            messages: [{ sender: req.user._id, message }]
        });
        await newTicket.save();
        req.flash('success_msg', 'Tiket bantuan berhasil dibuat.');
        res.redirect(`/api/tickets/${newTicket._id}`);
    } catch (error) {
        console.error("Error creating ticket:", error);
        req.flash('error_msg', 'Gagal membuat tiket bantuan.');
        res.redirect('/api/tickets/new');
    }
};

exports.viewTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate('user', 'name email')
            .populate('order', 'scTitleAtPurchase midtransOrderId')
            .populate('sc', 'title')
            .populate('messages.sender', 'name role')
            .populate('assignedTo', 'name');

        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets');
        }
        if (ticket.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            req.flash('error_msg', 'Anda tidak berhak mengakses tiket ini.');
            return res.redirect('/api/tickets');
        }
        
        const breadcrumbs = [
            { name: 'Dashboard', url: '/dashboard' }, 
            { name: 'Tiket Bantuan', url: '/api/tickets' }, 
            { name: `Tiket #${ticket._id.toString().slice(-6).toUpperCase()}`, active: true }
        ];
        if (req.user.role === 'admin' && ticket.user._id.toString() !== req.user._id.toString()) {
            breadcrumbs.splice(1,1, { name: 'Semua Tiket (Admin)', url: '/api/tickets/admin/all' });
        }


        res.render('tickets/view', { 
            titlePage: `Detail Tiket: ${ticket.subject}`, 
            ticket,
            breadcrumbs,
            reply_message: req.flash('form_reply_message')[0] || '',
        });
    } catch (error) {
        console.error("Error viewing ticket:", error);
        req.flash('error_msg', 'Gagal memuat detail tiket.');
        res.redirect('/api/tickets');
    }
};

exports.replyToTicket = async (req, res) => {
    const { reply_message } = req.body;
    if (!reply_message || reply_message.trim().length < 5) {
        req.flash('error_msg', 'Pesan balasan minimal 5 karakter.');
        req.flash('form_reply_message', reply_message);
        return res.redirect(`/api/tickets/${req.params.id}`);
    }
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets');
        }
        if (ticket.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            req.flash('error_msg', 'Anda tidak berhak membalas tiket ini.');
            return res.redirect('/api/tickets');
        }
        if (ticket.status === 'closed' || ticket.status === 'resolved') {
            req.flash('error_msg', 'Tidak dapat membalas tiket yang sudah ditutup atau diselesaikan.');
            return res.redirect(`/api/tickets/${req.params.id}`);
        }

        ticket.messages.push({ sender: req.user._id, message: reply_message });
        if (ticket.user.toString() === req.user._id.toString()) { // User replies
            ticket.status = 'pending_reply'; // Awaiting admin/support reply
        } else { // Admin/support replies
            ticket.status = 'open'; // Or could be 'pending_customer_reply' if needed
        }
        ticket.updatedAt = Date.now();
        await ticket.save();
        req.flash('success_msg', 'Balasan berhasil dikirim.');
        res.redirect(`/api/tickets/${req.params.id}`);
    } catch (error) {
        console.error("Error replying to ticket:", error);
        req.flash('error_msg', 'Gagal mengirim balasan.');
        res.redirect(`/api/tickets/${req.params.id}`);
    }
};

exports.closeTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets');
        }
        if (ticket.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            req.flash('error_msg', 'Anda tidak berhak menutup tiket ini.');
            return res.redirect('/api/tickets');
        }
        
        ticket.status = 'closed';
        ticket.updatedAt = Date.now();
        await ticket.save();
        req.flash('success_msg', 'Tiket berhasil ditutup.');
        res.redirect(`/api/tickets/${req.params.id}`);
    } catch (error) {
        console.error("Error closing ticket:", error);
        req.flash('error_msg', 'Gagal menutup tiket.');
        res.redirect(`/api/tickets/${req.params.id}`);
    }
};


exports.listAllTicketsAdmin = async (req, res) => {
    try {
        const statusFilter = req.query.status || '';
        let query = {};
        if (statusFilter && ['open', 'pending_reply', 'resolved', 'closed'].includes(statusFilter)) {
            query.status = statusFilter;
        }

        const tickets = await Ticket.find(query)
            .populate('user', 'name email')
            .populate('assignedTo', 'name')
            .sort({ status: 1, updatedAt: -1 });
        
        const breadcrumbs = [
            { name: 'Admin Dashboard', url: '/admin/dashboard' }, // Assuming admin has a dashboard
            { name: 'Semua Tiket Bantuan', active: true }
        ];

        res.render('tickets/admin_list', { 
            titlePage: 'Manajemen Tiket Bantuan', 
            tickets,
            breadcrumbs,
            currentStatusFilter: statusFilter
        });
    } catch (error) {
        console.error("Error listing all tickets for admin:", error);
        req.flash('error_msg', 'Gagal memuat daftar semua tiket.');
        res.redirect('/admin/dashboard'); // Or admin's main page
    }
};

exports.viewTicketAdmin = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate('user', 'name email')
            .populate({ path: 'order', populate: { path: 'sourceCode', select: 'title' } })
            .populate('sc', 'title')
            .populate('messages.sender', 'name role')
            .populate('assignedTo', 'name');

        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets/admin/all');
        }

        const supportStaff = await User.find({ role: { $in: ['admin', 'support'] } }).select('name _id'); // Assuming a 'support' role exists
        
        const breadcrumbs = [
            { name: 'Admin Dashboard', url: '/admin/dashboard' },
            { name: 'Semua Tiket Bantuan', url: '/api/tickets/admin/all' }, 
            { name: `Detail Tiket #${ticket._id.toString().slice(-6).toUpperCase()}`, active: true }
        ];

        res.render('tickets/admin_view', { 
            titlePage: `Admin: Detail Tiket - ${ticket.subject}`, 
            ticket,
            supportStaff,
            breadcrumbs,
            reply_message: req.flash('form_reply_message')[0] || ''
        });
    } catch (error) {
        console.error("Error admin viewing ticket:", error);
        req.flash('error_msg', 'Gagal memuat detail tiket untuk admin.');
        res.redirect('/api/tickets/admin/all');
    }
};

exports.replyToTicketAdmin = async (req, res) => {
    const { reply_message } = req.body;
    if (!reply_message || reply_message.trim().length < 5) {
        req.flash('error_msg', 'Pesan balasan minimal 5 karakter.');
         req.flash('form_reply_message', reply_message);
        return res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    }
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets/admin/all');
        }
         if (ticket.status === 'closed' || ticket.status === 'resolved') {
            req.flash('error_msg', 'Tidak dapat membalas tiket yang sudah ditutup atau diselesaikan.');
            return res.redirect(`/api/tickets/admin/view/${req.params.id}`);
        }

        ticket.messages.push({ sender: req.user._id, message: reply_message });
        ticket.status = 'open';
        ticket.updatedAt = Date.now();
        await ticket.save();
        req.flash('success_msg', 'Balasan berhasil dikirim.');
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    } catch (error) {
        console.error("Error admin replying to ticket:", error);
        req.flash('error_msg', 'Gagal mengirim balasan.');
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    }
};


exports.updateTicketStatusAdmin = async (req, res) => {
    const { status } = req.body;
    if (!status || !['open', 'pending_reply', 'resolved', 'closed'].includes(status)) {
        req.flash('error_msg', 'Status tiket tidak valid.');
        return res.redirect('back');
    }
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets/admin/all');
        }
        ticket.status = status;
        ticket.updatedAt = Date.now();
        await ticket.save();
        req.flash('success_msg', `Status tiket berhasil diubah menjadi ${status}.`);
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    } catch (error) {
        console.error("Error updating ticket status by admin:", error);
        req.flash('error_msg', 'Gagal mengubah status tiket.');
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    }
};

exports.assignTicketAdmin = async (req, res) => {
    const { assignedTo } = req.body; // User ID of admin/support staff
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets/admin/all');
        }
        if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo) && assignedTo !== "unassign") {
            req.flash('error_msg', 'ID staff tidak valid.');
             return res.redirect(`/api/tickets/admin/view/${req.params.id}`);
        }

        if (assignedTo === "unassign") {
            ticket.assignedTo = null;
        } else {
            const staffUser = await User.findById(assignedTo);
            if (!staffUser || (staffUser.role !== 'admin' && staffUser.role !== 'support')) { // Assuming 'support' role
                 req.flash('error_msg', 'Staff tidak ditemukan atau bukan admin/support.');
                 return res.redirect(`/api/tickets/admin/view/${req.params.id}`);
            }
            ticket.assignedTo = assignedTo;
        }
        
        ticket.updatedAt = Date.now();
        await ticket.save();
        req.flash('success_msg', `Tiket berhasil ${assignedTo === "unassign" ? "dilepas" : "ditugaskan"}.`);
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    } catch (error) {
        console.error("Error assigning ticket by admin:", error);
        req.flash('error_msg', 'Gagal menugaskan tiket.');
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    }
};
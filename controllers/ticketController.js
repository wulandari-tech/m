const Ticket = require('../models/ticket');
const User = require('../models/user');
const Order = require('../models/order');
const SourceCode = require('../models/sourceCode');
const mongoose = require('mongoose');


exports.listUserTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ user: req.user._id })
            .sort({ updatedAt: -1 })
            .populate('assignedTo', 'name')
            .populate('sc', 'title')
            .populate('order', 'scTitleAtPurchase');
        res.render('tickets/list', {
            titlePage: 'Tiket Bantuan Saya',
            tickets,
            breadcrumbs: [{ name: 'Dashboard', url: '/dashboard' }, { name: 'Tiket Bantuan Saya', active: true }]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat daftar tiket.');
        res.redirect('/dashboard');
    }
};

exports.getNewTicketForm = async (req, res) => {
    try {
        const { receiver, receiverName, scId, scTitle, orderId: queryOrderId } = req.query;
        const userOrders = await Order.find({ user: req.user._id, paymentStatus: 'completed' })
            .populate({path: 'sourceCode', select: 'title _id'})
            .select('scTitleAtPurchase createdAt sourceCode');
        
        let prefilledSubject = "";
        if (scTitle) {
            prefilledSubject = `Pertanyaan tentang SC: ${scTitle}`;
        } else if (queryOrderId) {
            const orderForSubject = await Order.findById(queryOrderId).select('scTitleAtPurchase midtransOrderId');
            prefilledSubject = `Pertanyaan tentang Pesanan ${orderForSubject ? (orderForSubject.scTitleAtPurchase || `ID ${orderForSubject.midtransOrderId || queryOrderId.slice(-5)}`) : `ID ${queryOrderId.slice(-5)}`}`;
        }

        res.render('tickets/new', {
            titlePage: receiverName ? `Kirim Pesan ke ${receiverName}` : 'Buat Tiket Bantuan Baru',
            userOrders,
            receiverId: receiver,
            receiverName: receiverName,
            relatedScId: scId,
            relatedScTitle: scTitle,
            relatedOrderId: queryOrderId,
            prefilledSubject,
            subject: req.flash('form_subject')[0] || prefilledSubject,
            message: req.flash('form_message')[0] || '',
            orderId: req.flash('form_orderId')[0] || queryOrderId || '',
            scIdFlash: req.flash('form_scId')[0] || scId || '',
            priority: req.flash('form_priority')[0] || 'medium',
            breadcrumbs: [
                { name: 'Dashboard', url: '/dashboard' },
                { name: 'Tiket Bantuan Saya', url: '/api/tickets' },
                { name: 'Buat Tiket Baru', active: true }
            ]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat form tiket baru.');
        res.redirect('/api/tickets');
    }
};

exports.createTicket = async (req, res) => {
    const { subject, message, orderId, scId, priority, receiverId, receiverName, relatedScId, relatedScTitle, relatedOrderId } = req.body;
    let errors = [];

    if (!subject || !message) errors.push({ msg: 'Subjek dan Pesan wajib diisi.' });
    if (subject && subject.length < 5) errors.push({ msg: 'Subjek minimal 5 karakter.' });
    if (message && message.length < 10) errors.push({ msg: 'Pesan minimal 10 karakter.' });

    if (errors.length > 0) {
        req.flash('errors', errors);
        req.flash('form_subject', subject);
        req.flash('form_message', message);
        req.flash('form_orderId', orderId);
        req.flash('form_scId', scId);
        req.flash('form_priority', priority);
        
        let redirectQuery = "";
        if (receiverId) redirectQuery += `?receiver=${receiverId}`;
        if (receiverName) redirectQuery += `${redirectQuery ? '&' : '?'}receiverName=${encodeURIComponent(receiverName)}`;
        if (relatedScId) redirectQuery += `${redirectQuery ? '&' : '?'}scId=${relatedScId}`;
        if (relatedScTitle) redirectQuery += `${redirectQuery ? '&' : '?'}scTitle=${encodeURIComponent(relatedScTitle)}`;
        if (relatedOrderId) redirectQuery += `${redirectQuery ? '&' : '?'}orderId=${relatedOrderId}`;
        return res.redirect(`/api/tickets/new${redirectQuery}`);
    }

    try {
        const ticketData = {
            user: req.user._id,
            subject,
            priority: priority || 'medium',
            messages: [{ sender: req.user._id, message }],
        };
        if (orderId && mongoose.Types.ObjectId.isValid(orderId)) ticketData.order = orderId;
        if (scId && mongoose.Types.ObjectId.isValid(scId)) ticketData.sc = scId;
        if (receiverId && mongoose.Types.ObjectId.isValid(receiverId)) {
            ticketData.assignedTo = receiverId; 
            ticketData.status = 'pending_reply'; // Langsung menunggu balasan dari seller/admin
        }


        const newTicket = new Ticket(ticketData);
        await newTicket.save();
        req.flash('success_msg', 'Tiket berhasil dibuat. Anda akan segera mendapatkan balasan.');
        res.redirect(`/api/tickets/${newTicket._id}`);
    } catch (error) {
        req.flash('error_msg', `Gagal membuat tiket: ${error.message}`);
        res.redirect('/api/tickets/new');
    }
};

exports.viewTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate('user', 'name email')
            .populate({ path: 'order', populate: { path: 'sourceCode', select: 'title _id' } })
            .populate({ path: 'sc', select: 'title _id', populate: { path: 'seller', select: 'name _id storeName' } })
            .populate('messages.sender', 'name role profilePicture')
            .populate('assignedTo', 'name role');

        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets');
        }
        
        const isOwner = ticket.user._id.toString() === req.user._id.toString();
        const isAdminOrSupport = req.user.role === 'admin'; 
        const isAssignedTo = ticket.assignedTo && ticket.assignedTo._id.toString() === req.user._id.toString();
        const canView = isOwner || isAdminOrSupport || isAssignedTo;

        if (!canView) {
            req.flash('error_msg', 'Anda tidak berhak mengakses tiket ini.');
            return res.redirect('/api/tickets');
        }
        
        const breadcrumbs = [
            { name: 'Dashboard', url: '/dashboard' },
            { name: 'Tiket Bantuan Saya', url: '/api/tickets' },
            { name: `Tiket #${ticket._id.toString().slice(-6).toUpperCase()}`, active: true }
        ];
        
        res.render('tickets/view', { 
            titlePage: `Detail Tiket: ${ticket.subject}`, 
            ticket,
            breadcrumbs,
            isOwner,
            isAdminOrSupport
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat detail tiket.');
        res.redirect('/api/tickets');
    }
};

exports.replyToTicket = async (req, res) => {
    const { message } = req.body;
    if (!message || message.trim().length < 5) {
        req.flash('error_msg', 'Balasan minimal 5 karakter.');
        return res.redirect(`/api/tickets/${req.params.id}`);
    }
    try {
        const ticket = await Ticket.findById(req.params.id).populate('user', '_id').populate('assignedTo', '_id');
        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets');
        }

        const isOwner = ticket.user._id.toString() === req.user._id.toString();
        const isAdminOrSupport = req.user.role === 'admin';
        const isAssignedTo = ticket.assignedTo && ticket.assignedTo._id.toString() === req.user._id.toString();
        const canReply = isOwner || isAdminOrSupport || isAssignedTo;

        if (!canReply || ticket.status === 'closed' || ticket.status === 'resolved') {
            req.flash('error_msg', 'Tidak dapat membalas tiket ini atau tiket sudah ditutup/selesai.');
            return res.redirect(`/api/tickets/${req.params.id}`);
        }

        ticket.messages.push({ sender: req.user._id, message: message.trim() });
        
        if (isOwner) {
            ticket.status = ticket.assignedTo ? 'pending_reply' : 'open';
        } else { 
            ticket.status = 'open';
        }
        ticket.updatedAt = Date.now();
        await ticket.save();

        req.flash('success_msg', 'Balasan berhasil dikirim.');
        res.redirect(`/api/tickets/${req.params.id}`);
    } catch (error) {
        req.flash('error_msg', `Gagal mengirim balasan: ${error.message}`);
        res.redirect(`/api/tickets/${req.params.id}`);
    }
};

exports.closeTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id).populate('user', '_id');
        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets');
        }

        const canClose = ticket.user._id.toString() === req.user._id.toString() || req.user.role === 'admin';
        if (!canClose) {
            req.flash('error_msg', 'Anda tidak berhak menutup tiket ini.');
            return res.redirect(`/api/tickets/${req.params.id}`);
        }
        
        if (ticket.status === 'closed') {
            req.flash('info_msg', 'Tiket ini sudah ditutup sebelumnya.');
            return res.redirect(`/api/tickets/${req.params.id}`);
        }

        ticket.status = 'closed';
        ticket.updatedAt = Date.now();
        ticket.messages.push({ 
            sender: req.user._id, 
            message: `Tiket ditutup oleh ${req.user.name}.`
        });
        await ticket.save();

        req.flash('success_msg', 'Tiket berhasil ditutup.');
        res.redirect(`/api/tickets/${req.params.id}`);
    } catch (error) {
        req.flash('error_msg', `Gagal menutup tiket: ${error.message}`);
        res.redirect(`/api/tickets/${req.params.id}`);
    }
};


exports.listAllTicketsAdmin = async (req, res) => {
    try {
        const { status = 'open', priority = 'all', search = '', sort = 'updatedAt_desc', page = 1, limit = 15 } = req.query;
        let query = {};
        
        if (status && status !== 'all') query.status = status;
        if (priority && priority !== 'all') query.priority = priority;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const usersWithName = await User.find({ name: searchRegex }).select('_id');
            const userIds = usersWithName.map(u => u._id);
            query.$or = [
                { subject: searchRegex },
                { 'messages.message': searchRegex },
                { user: { $in: userIds } }
            ];
        }

        let sortOption = {};
        if(sort === 'updatedAt_desc') sortOption.updatedAt = -1;
        else if (sort === 'updatedAt_asc') sortOption.updatedAt = 1;
        else if (sort === 'createdAt_desc') sortOption.createdAt = -1;
        else if (sort === 'createdAt_asc') sortOption.createdAt = 1;
        else sortOption.updatedAt = -1;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const tickets = await Ticket.find(query)
            .populate('user', 'name email')
            .populate('assignedTo', 'name')
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum);
        
        const totalTickets = await Ticket.countDocuments(query);
        const totalPages = Math.ceil(totalTickets / limitNum);
            
        res.render('tickets/admin_list', {
            titlePage: 'Manajemen Tiket Bantuan',
            tickets,
            currentStatus: status,
            currentPriority: priority,
            currentSearch: search,
            currentSort: sort,
            currentPage: pageNum,
            totalPages,
            limit: limitNum,
            totalTickets,
            breadcrumbs: [
                { name: 'Dashboard Admin', url: '/admin/dashboard' },
                { name: 'Manajemen Tiket', active: true }
            ]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat daftar semua tiket.');
        res.redirect('/admin/dashboard');
    }
};

exports.viewTicketAdmin = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate('user', 'name email')
            .populate({ path: 'order', populate: { path: 'sourceCode', select: 'title _id' }})
            .populate({ path: 'sc', select: 'title _id', populate: { path: 'seller', select: 'name _id storeName' } })
            .populate('messages.sender', 'name role profilePicture')
            .populate('assignedTo', 'name role');

        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets/admin/all');
        }
        
        const adminsAndSupport = await User.find({ role: { $in: ['admin', 'support_staff']}}).select('name _id'); // Ganti 'support_staff' jika role Anda berbeda

        const breadcrumbs = [
            { name: 'Dashboard Admin', url: '/admin/dashboard' },
            { name: 'Manajemen Tiket', url: '/api/tickets/admin/all' },
            { name: `Tiket #${ticket._id.toString().slice(-6).toUpperCase()}`, active: true }
        ];

        res.render('tickets/view_admin', {
            titlePage: `Detail Tiket (Admin): ${ticket.subject}`, 
            ticket,
            adminsAndSupport,
            breadcrumbs,
            isAdminView: true
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat detail tiket admin.');
        res.redirect('/api/tickets/admin/all');
    }
};


exports.replyToTicketAdmin = async (req, res) => {
     const { message } = req.body;
    if (!message || message.trim().length < 5) {
        req.flash('error_msg', 'Balasan minimal 5 karakter.');
        return res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    }
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets/admin/all');
        }

        if (ticket.status === 'closed' || ticket.status === 'resolved') {
            req.flash('error_msg', 'Tidak dapat membalas tiket yang sudah ditutup/selesai.');
            return res.redirect(`/api/tickets/admin/view/${req.params.id}`);
        }

        ticket.messages.push({ sender: req.user._id, message: message.trim() });
        ticket.status = 'open';
        ticket.updatedAt = Date.now();
        if (!ticket.assignedTo) {
            ticket.assignedTo = req.user._id;
        }
        await ticket.save();

        req.flash('success_msg', 'Balasan berhasil dikirim.');
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    } catch (error) {
        req.flash('error_msg', `Gagal mengirim balasan: ${error.message}`);
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    }
};

exports.updateTicketStatusAdmin = async (req, res) => {
    const { status, priority } = req.body;
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets/admin/all');
        }
        
        let messageLog = "";
        let statusChanged = false;
        let priorityChanged = false;

        if (status && ticket.status !== status) {
            messageLog += `Status tiket diubah dari '${ticket.status}' menjadi '${status}'`;
            ticket.status = status;
            statusChanged = true;
        }
        if (priority && ticket.priority !== priority) {
            if(statusChanged) messageLog += `, dan prioritas diubah`; else messageLog += `Prioritas tiket diubah`;
            messageLog += ` dari '${ticket.priority}' menjadi '${priority}'`;
            ticket.priority = priority;
            priorityChanged = true;
        }
        
        if(!statusChanged && !priorityChanged) {
            req.flash('info_msg', 'Tidak ada perubahan status atau prioritas.');
            return res.redirect(`/api/tickets/admin/view/${req.params.id}`);
        }

        messageLog += ` oleh ${req.user.name}.`;
        ticket.updatedAt = Date.now();
        ticket.messages.push({ sender: req.user._id, message: messageLog });
        
        await ticket.save();
        req.flash('success_msg', 'Status/Prioritas tiket berhasil diperbarui.');
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    } catch (error) {
        req.flash('error_msg', `Gagal memperbarui status tiket: ${error.message}`);
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    }
};

exports.assignTicketAdmin = async (req, res) => {
    const { assignToUserId } = req.body;
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            req.flash('error_msg', 'Tiket tidak ditemukan.');
            return res.redirect('/api/tickets/admin/all');
        }
        
        if (!assignToUserId || assignToUserId === "unassign") { // Opsi untuk unassign
            const oldAssigned = ticket.assignedTo ? (await User.findById(ticket.assignedTo).select('name')).name : "Tidak ada";
            ticket.assignedTo = null;
            ticket.updatedAt = Date.now();
            ticket.messages.push({ sender: req.user._id, message: `Assignment tiket ke ${oldAssigned} dibatalkan oleh ${req.user.name}.` });
            await ticket.save();
            req.flash('success_msg', `Assignment tiket berhasil dibatalkan.`);
            return res.redirect(`/api/tickets/admin/view/${req.params.id}`);
        }

        const assignToUser = await User.findById(assignToUserId);
        if (!assignToUser || (assignToUser.role !== 'admin' && assignToUser.role !== 'support_staff')) { // Sesuaikan 'support_staff'
             req.flash('error_msg', 'User yang akan di-assign tidak valid atau bukan tim support.');
            return res.redirect(`/api/tickets/admin/view/${req.params.id}`);
        }

        ticket.assignedTo = assignToUserId;
        ticket.updatedAt = Date.now();
        ticket.messages.push({ sender: req.user._id, message: `Tiket di-assign ke ${assignToUser.name} oleh ${req.user.name}.` });
        await ticket.save();

        req.flash('success_msg', `Tiket berhasil di-assign ke ${assignToUser.name}.`);
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    } catch (error) {
        req.flash('error_msg', `Gagal meng-assign tiket: ${error.message}`);
        res.redirect(`/api/tickets/admin/view/${req.params.id}`);
    }
};
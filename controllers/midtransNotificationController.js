const crypto = require('crypto');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const Order = require('../models/order'); 
const midtransSnap = require('../config/midtrans'); 
module.exports.handle_notification = async (req, res) => {
    const notificationJson = req.body;
    console.log('Received Midtrans Notification:', JSON.stringify(notificationJson, null, 2));

    try {
        const statusResponse = await midtransSnap.transaction.notification(notificationJson);
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;
        const paymentType = statusResponse.payment_type;
        const transactionIdMidtrans = statusResponse.transaction_id; // ID transaksi dari Midtrans
        const grossAmount = parseFloat(statusResponse.gross_amount);

        console.log(`Transaction notification received. Order ID: ${orderId}, Transaction Status: ${transactionStatus}, Fraud Status: ${fraudStatus}, Payment Type: ${paymentType}`);

        const localTransaction = await Transaction.findOne({ midtransOrderId: orderId });

        if (!localTransaction) {
            console.error(`Transaction with Midtrans Order ID ${orderId} not found in local DB.`);
            return res.status(404).send('Transaction not found locally.');
        }

        if (localTransaction.status === 'success') {
            console.log(`Transaction ${orderId} already processed as success.`);
            return res.status(200).send('Transaction already success.');
        }

        let newStatus = 'pending';
        let transactionUpdate = {
            midtransTransactionId: transactionIdMidtrans,
            paymentMethod: paymentType,
            metadata: { ...localTransaction.metadata, midtransNotification: notificationJson }
        };

        if (transactionStatus == 'capture') {
            if (fraudStatus == 'accept') {
                newStatus = 'success';
            } else if (fraudStatus == 'challenge') {
                newStatus = 'pending_challenge'; // Atau status lain sesuai kebutuhan
            }
        } else if (transactionStatus == 'settlement') {
            newStatus = 'success';
        } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
            newStatus = 'failed'; // Atau 'cancelled', 'expired'
            if(transactionStatus == 'expire') newStatus = 'expired';
            if(transactionStatus == 'cancel') newStatus = 'cancelled';
            if(transactionStatus == 'deny') newStatus = 'failed';
        } else if (transactionStatus == 'pending') {
            newStatus = 'pending';
        }

        transactionUpdate.status = newStatus;
        await Transaction.updateOne({ _id: localTransaction._id }, transactionUpdate);
        console.log(`Local transaction ${localTransaction._id} (Midtrans Order ID: ${orderId}) status updated to ${newStatus}`);

        if (newStatus === 'success') {
            if (localTransaction.type === 'deposit') {
                const user = await User.findById(localTransaction.user);
                if (user) {
                    user.balance += grossAmount; // grossAmount dari notifikasi lebih akurat
                    await user.save();
                    console.log(`User ${user.email} balance updated. New balance: ${user.balance}`);
                } else {
                    console.error(`User with ID ${localTransaction.user} for deposit not found.`);
                }
            } else if (localTransaction.type === 'purchase_sc' || localTransaction.type === 'rent_sc') {
                // Jika pembelian/sewa SC langsung via Midtrans (bukan saldo)
                // Update status Order yang terkait (jika ada)
                if (localTransaction.relatedOrder) {
                    await Order.updateOne(
                        { _id: localTransaction.relatedOrder },
                        { paymentStatus: 'completed', transactionId: transactionIdMidtrans }
                    );
                    console.log(`Order ${localTransaction.relatedOrder} status updated to completed.`);
                }
            }
        }

        res.status(200).send('Notification processed successfully.');

    } catch (error) {
        console.error('Error processing Midtrans notification:', error);
        let errorMessage = 'Failed to process notification.';
        if (error.ApiResponse && error.ApiResponse.error_messages) {
            errorMessage = error.ApiResponse.error_messages.join(', ');
        } else if (error.message) {
            errorMessage = error.message;
        }
        res.status(500).send(errorMessage);
    }
};
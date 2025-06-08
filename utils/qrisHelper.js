const axios = require('axios');
const FormData = require('form-data');
const QRCode = require('qrcode');
const { Readable } = require('stream');

async function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

function convertCRC16(str) {
    let crc = 0xFFFF;
    const strlen = str.length;
    for (let c = 0; c < strlen; c++) {
        crc ^= str.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    let hex = crc & 0xFFFF;
    hex = ("000" + hex.toString(16).toUpperCase()).slice(-4);
    return hex;
}

function generateTransactionId() {
    const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `SCM-${Date.now().toString().slice(-6)}-${randomString}`;
}

function generateExpirationTime(minutes = 30) {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + minutes);
    return expirationTime;
}

async function uploadToCatbox(buffer) {
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        const stream = await bufferToStream(buffer);
        form.append('fileToUpload', stream, {
            filename: 'qris_image.png',
            contentType: 'image/png'
        });

        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: { ...form.getHeaders() },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 15000
        });

        if (!response.data || typeof response.data !== 'string' || !response.data.startsWith('http')) {
            throw new Error('Failed to upload image to Catbox or received invalid URL.');
        }
        return response.data;
    } catch (error) {
        throw error;
    }
}

function findTagInfo(data, tagId) {
    const tagIndex = data.indexOf(tagId);
    if (tagIndex === -1 || (tagIndex + tagId.length + 2) > data.length) {
        return null;
    }
    const lengthStr = data.substring(tagIndex + tagId.length, tagIndex + tagId.length + 2);
    if (!/^\d+$/.test(lengthStr)) return null;
    const lengthVal = parseInt(lengthStr, 10);
    if (isNaN(lengthVal) || (tagIndex + tagId.length + 2 + lengthVal) > data.length) {
        return null;
    }
    return {
        index: tagIndex,
        id: tagId,
        lengthOfLength: 2,
        lengthOfValue: lengthVal,
        value: data.substring(tagIndex + tagId.length + 2, tagIndex + tagId.length + 2 + lengthVal),
        fullBlock: data.substring(tagIndex, tagIndex + tagId.length + 2 + lengthVal)
    };
}

function removeTag(data, tagId) {
    const tagInfo = findTagInfo(data, tagId);
    if (tagInfo) {
        return data.substring(0, tagInfo.index) + data.substring(tagInfo.index + tagInfo.fullBlock.length);
    }
    return data;
}

async function createDynamicQRIS(amount, baseQrisCode) {
    if (!baseQrisCode || typeof baseQrisCode !== 'string' || baseQrisCode.length < 30) {
        throw new Error('Valid Base QRIS code is required.');
    }
    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Valid positive amount is required.');
    }

    let qrisData = baseQrisCode;
    const crcTagId = "63";
    const crcTagInfo = findTagInfo(qrisData, crcTagId);
    if (crcTagInfo) {
        qrisData = qrisData.substring(0, crcTagInfo.index);
    } else if (qrisData.length > 4 && qrisData.match(/[0-9A-F]{4}$/)) {
        qrisData = qrisData.slice(0, -4);
    }

    const pointOfInitiationTagId = "01";
    const pointOfInitiationTagInfo = findTagInfo(qrisData, pointOfInitiationTagId);

    if (!pointOfInitiationTagInfo) {
        throw new Error("Base QRIS code missing Point of Initiation Method (Tag 01).");
    }

    if (pointOfInitiationTagInfo.value === "11") {
        const tagBlockWithoutValue = qrisData.substring(pointOfInitiationTagInfo.index, pointOfInitiationTagInfo.index + pointOfInitiationTagId.length + pointOfInitiationTagInfo.lengthOfLength);
        const dataAfterTag = qrisData.substring(pointOfInitiationTagInfo.index + pointOfInitiationTagInfo.fullBlock.length);
        qrisData = qrisData.substring(0, pointOfInitiationTagInfo.index) + tagBlockWithoutValue + "12" + dataAfterTag;
    } else if (pointOfInitiationTagInfo.value !== "12") {
        throw new Error("Base QRIS code has an unexpected Point of Initiation Method value. Expected '11' or '12'.");
    }
    
    qrisData = removeTag(qrisData, "54");

    const numericAmount = parsedAmount.toString();
    const amountLength = ("0" + numericAmount.length).slice(-2);
    const newAmountField = "54" + amountLength + numericAmount;

    let insertionPoint = -1;
    const orderedRootTagsAfterAmount = ["55", "56", "57", "58", "59", "60", "61", "62", "64"];
    
    for (const tagId of orderedRootTagsAfterAmount) {
        const tagInfo = findTagInfo(qrisData, tagId);
        if (tagInfo) {
            insertionPoint = tagInfo.index;
            break;
        }
    }
    
    let finalQrisStringToCrc;
    if (insertionPoint !== -1) {
        finalQrisStringToCrc = qrisData.substring(0, insertionPoint) + newAmountField + qrisData.substring(insertionPoint);
    } else {
        finalQrisStringToCrc = qrisData + newAmountField;
    }
    
    const finalCrcValue = convertCRC16(finalQrisStringToCrc);
    const finalQrisString = finalQrisStringToCrc + "6304" + finalCrcValue;

    const buffer = await QRCode.toBuffer(finalQrisString, {
        errorCorrectionLevel: 'M', type: 'png', margin: 2, width: 300,
        rendererOpts: { quality: 0.9 }
    });

    const imageUrl = await uploadToCatbox(buffer);

    return {
        transactionId: generateTransactionId(),
        amount: numericAmount,
        expirationTime: generateExpirationTime(),
        qrImageUrl: imageUrl,
        qrString: finalQrisString
    };
}

async function checkQRISPaymentStatus(merchantId, apiKey) {
    if (!merchantId || !apiKey) {
        throw new Error('Merchant ID and API Key are required for checking Okeconnect status.');
    }
    const apiUrl = `https://gateway.okeconnect.com/api/mutasi/qris/${merchantId}/${apiKey}`;
    try {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        if (response.data && response.data.data) {
            return { success: true, data: response.data.data };
        }
        return { success: false, message: "No mutation data found or invalid response from Okeconnect.", data: [] };
    } catch (error) {
        return { success: false, message: `Failed to check QRIS status via Okeconnect: ${error.message}`, error: error };
    }
}

module.exports = {
    createDynamicQRIS,
    checkQRISPaymentStatus,
    generateTransactionId
};
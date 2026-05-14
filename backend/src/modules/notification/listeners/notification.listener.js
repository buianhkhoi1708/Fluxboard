const eventBus = require('../../../common/utils/eventBus');
const notificationDispatcher = require('../services/notificationDispatcher.service');

eventBus.on('extension_requested', async (payload) => {
    await notificationDispatcher.dispatchExtensionRequest(payload);
});

eventBus.on('extension_approved', async (payload) => {
    await notificationDispatcher.dispatchExtensionApproved(payload);
});

eventBus.on('extension_rejected', async (payload) => {
    await notificationDispatcher.dispatchExtensionRejected(payload);
});

eventBus.on('send_email_notification', async (payload) => {
    // await notificationDispatcher.dispatchDeadlineAlert(payload);
});
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Sends a notification to a specific user.
 * @param {string} recipientEmail - Email of the user to receive the notification.
 * @param {string} message - The notification text.
 * @param {string} issueId - ID of the related issue (optional).
 */
export async function sendNotification(recipientEmail, message, issueId = null) {
    if (!recipientEmail) return;

    try {
        // We need the User UID to add to their subcollection.
        // In a real app, recipientEmail might not be enough if we don't have the map.
        // But our `users` collection is keyed by UID. We need to find the UID for this email.

        // Query users collection for the UID
        const q = query(collection(db, 'users'), where('email', '==', recipientEmail));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.warn(`User ${recipientEmail} not found for notification.`);
            return;
        }

        const recipientUid = snapshot.docs[0].id;

        await addDoc(collection(db, 'users', recipientUid, 'notifications'), {
            message,
            issueId,
            read: false,
            createdAt: serverTimestamp()
        });

        console.log(`Notification sent to ${recipientEmail}`);

    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

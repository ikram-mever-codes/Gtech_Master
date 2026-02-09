import sendEmail from "./emailService";

type EmailPayload = {
    to: string;
    subject: string;
    html: string;
};

export async function sendEmailSafe(payload: EmailPayload) {
    try {
        await sendEmail(payload);
    } catch (error) {
        console.error("Email sending failed:", {
            to: payload.to,
            subject: payload.subject,
            error,
        });
        // ❗ intentionally not throwing error
    }
}

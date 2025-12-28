import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});
export async function sendEmail(to: string, subject: string, html: string) {
  return transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
}

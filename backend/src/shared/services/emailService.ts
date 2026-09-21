import nodemailer from 'nodemailer';

/**
 * Envío de emails: SMTP (Gmail, etc.) si SMTP_USER está configurado;
 * si no, Resend (RESEND_API_KEY); si no hay nada, solo log.
 */
export const sendEmail = async (input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) => {
  const from =
    process.env.EMAIL_FROM ||
    (process.env.SMTP_USER
      ? `OrigenRed <${process.env.SMTP_USER}>`
      : 'OrigenRed <noreply@origenred.com.ar>');

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return { sent: true };
    } catch (err) {
      console.error('[email:smtp:error]', err);
      return { sent: false, error: String(err) };
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email:skip] ${input.to} — ${input.subject}`);
    return { sent: false, skipped: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[email:resend:error]', err);
    return { sent: false, error: err };
  }

  return { sent: true };
};

export const sendSellerApprovedEmail = async (input: {
  email: string;
  name: string;
  businessName: string;
}) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://origenred.com.ar';
  return sendEmail({
    to: input.email,
    subject: 'Tu cuenta de vendedor fue aprobada — OrigenRed',
    html: `
      <p>Hola ${input.name},</p>
      <p>Tu solicitud para vender como <strong>${input.businessName}</strong> fue aprobada.</p>
      <p>Ya podés publicar productos y vincular Mercado Pago desde tu panel de vendedor.</p>
      <p><a href="${frontendUrl}/vendedor">Ir al panel de vendedor</a></p>
      <p>— OrigenRed</p>
    `,
    text: `Tu cuenta de vendedor ${input.businessName} fue aprobada. Panel: ${frontendUrl}/vendedor`,
  });
};

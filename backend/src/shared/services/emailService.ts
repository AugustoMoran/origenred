/**
 * Envío de emails vía Resend (opcional). Sin RESEND_API_KEY solo registra en log.
 */
export const sendEmail = async (input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'OrigenRed <noreply@origenred.com.ar>';

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
    console.error('[email:error]', err);
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

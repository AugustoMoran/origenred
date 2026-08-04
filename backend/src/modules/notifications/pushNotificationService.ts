type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
};

export const sendExpoPush = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) => {
  const unique = [...new Set(tokens.filter(Boolean))];
  if (!unique.length) return;

  const messages: ExpoPushMessage[] = unique.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.warn('Expo push failed:', err);
  }
};

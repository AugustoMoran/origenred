import { useEffect } from 'react';
import { router } from 'expo-router';
import { setupNotificationResponseHandler } from '../services/pushNotifications';

export const PushNotificationBootstrap = () => {
  useEffect(() => {
    return setupNotificationResponseHandler((data) => {
      if (data.type === 'chat' && data.conversationId) {
        router.push('/orders');
        return;
      }
      if (data.type === 'order' && data.orderNumber) {
        router.push('/vendedor/orders');
        return;
      }
    });
  }, []);

  return null;
};

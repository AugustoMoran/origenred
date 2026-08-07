import { useEffect } from 'react';
import { router } from 'expo-router';
import { setupNotificationResponseHandler } from '../services/pushNotifications';

export const PushNotificationBootstrap = () => {
  useEffect(() => {
    return setupNotificationResponseHandler((data) => {
      const orderNumber = data.orderNumber ? String(data.orderNumber) : '';

      if (data.type === 'chat' && orderNumber) {
        router.push(`/chat/${orderNumber}`);
        return;
      }

      if (data.type === 'order' && orderNumber) {
        const role = data.role ? String(data.role) : '';
        const status = data.status ? String(data.status) : '';
        if (role === 'buyer' || status === 'shipped' || status === 'delivered') {
          router.push(`/order/${orderNumber}`);
          return;
        }
        router.push('/vendedor/orders');
      }
    });
  }, []);

  return null;
};

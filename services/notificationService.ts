
export const notificationService = {
  // Request permission from the user
  requestPermission: async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications.');
      return 'denied';
    }
    
    // We check current permission first
    if (Notification.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.error('Error requesting permission', e);
      return 'denied';
    }
  },

  // Check current permission state
  getPermission: (): NotificationPermission => {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  },

  // Send a notification using the best available method
  sendNotification: async (title: string, options?: NotificationOptions) => {
    if (Notification.permission !== 'granted') {
        console.warn('Cannot send notification: Permission not granted');
        return;
    }

    try {
        // Method 1: Service Worker (Best for Mobile/Android PWA)
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            if (registration && 'showNotification' in registration) {
                return await registration.showNotification(title, {
                    ...options,
                    icon: options?.icon || '/icon.png', // Ensure icon is present
                    vibrate: [200, 100, 200] // Vibration pattern for Android
                } as any);
            }
        }

        // Method 2: Standard Web Notification (Fallback for Desktop/Open Tab)
        return new Notification(title, {
            ...options,
            icon: options?.icon || '/icon.png'
        });
    } catch (e) {
        console.error('Notification failed:', e);
    }
  }
};

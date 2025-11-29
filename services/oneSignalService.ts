import OneSignal from 'react-onesignal';

export const oneSignalService = {
  // Initialize OneSignal
  initialize: async (appId: string) => {
    try {
      await OneSignal.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: {
          scope: '/'
        }
      });
      
      console.log('OneSignal initialized');
      return true;
    } catch (error) {
      console.error('OneSignal initialization failed:', error);
      return false;
    }
  },

  // Request notification permission
  requestPermission: async (): Promise<boolean> => {
    try {
      const permission = await OneSignal.Notifications.requestPermission();
      return permission;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  },

  // Check if user is subscribed
  isSubscribed: async (): Promise<boolean> => {
    try {
      const isPushSupported = await OneSignal.Notifications.isPushSupported();
      if (!isPushSupported) return false;
      
      const permission = await OneSignal.Notifications.permissionNative;
      return permission === 'granted';
    } catch (error) {
      return false;
    }
  },

  // Send a tag (for user segmentation)
  setUserTag: async (key: string, value: string) => {
    try {
      await OneSignal.User.addTag(key, value);
    } catch (error) {
      console.error('Failed to set user tag:', error);
    }
  },

  // Get the OneSignal Player ID (unique device ID)
  getPlayerId: async (): Promise<string | null> => {
    try {
      const id = await OneSignal.User.PushSubscription.id;
      return id;
    } catch (error) {
      return null;
    }
  },

  // Send notification (via OneSignal REST API)
  sendNotification: async (
    title: string,
    message: string,
    data?: any
  ): Promise<boolean> => {
    // This would typically be called from your backend
    // For client-side, notifications are scheduled via OneSignal dashboard or REST API
    console.log('To send notifications, use OneSignal Dashboard or REST API');
    return false;
  }
};

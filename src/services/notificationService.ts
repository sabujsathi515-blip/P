export class NotificationService {
  public static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    try {
      return await Notification.requestPermission();
    } catch (e) {
      console.warn('Could not request notification permission', e);
      return 'denied';
    }
  }

  public static isSupported(): boolean {
    return 'Notification' in window;
  }

  public static getPermission(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  public static show(title: string, options?: NotificationOptions): Notification | null {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return null;
    }
    try {
      const notif = new Notification(title, {
        icon: '/icon-192.svg',
        badge: '/icon-192.svg',
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      return notif;
    } catch (e) {
      console.error('Failed to show notification', e);
      return null;
    }
  }

  public static notifyNewMessage(senderName: string, text: string) {
    this.show(`New message from ${senderName}`, {
      body: text.length > 80 ? text.slice(0, 80) + '…' : text,
      tag: 'message-notif',
    });
  }

  public static notifyIncomingCall(callerName: string, type: 'audio' | 'video') {
    this.show(`Incoming ${type === 'video' ? 'Video' : 'Audio'} Call`, {
      body: `${callerName} is calling you on ConnectCall... Click to answer.`,
      tag: 'call-notif',
      requireInteraction: true,
      silent: false,
    });
  }

  public static notifyMissedCall(callerName: string, type: 'audio' | 'video') {
    this.show(`Missed ${type === 'video' ? 'Video' : 'Audio'} Call`, {
      body: `You missed a call from ${callerName}`,
      tag: 'missed-call-notif',
    });
  }
}

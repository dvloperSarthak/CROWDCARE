
'use client';

import { useEffect, useRef } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

/**
 * TacticalNotificationListener
 * A background listener that triggers browser system notifications for 
 * new broadcasts and critical mission alerts.
 */
export function TacticalNotificationListener() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const lastBroadcastIdRef = useRef<string | null>(null);
  const lastAlertIdRef = useRef<string | null>(null);

  // Tactical Broadcasts
  const broadcastQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'broadcasts'), orderBy('timestamp', 'desc'), limit(1));
  }, [db, user]);
  const { data: broadcasts } = useCollection(broadcastQuery);

  // Critical Alerts (Latest)
  const alertQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'rescueEvents'), orderBy('scanTime', 'desc'), limit(1));
  }, [db, user]);
  const { data: alerts } = useCollection(alertQuery);

  // Request Notification Permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const sendSystemNotification = (title: string, body: string, tag: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      // If document is hidden or backgrounded, use Service Worker if possible
      if (document.visibilityState === 'hidden') {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            tag,
            icon: 'https://picsum.photos/seed/guardian/192/192',
            badge: 'https://picsum.photos/seed/badge/96/96',
            renotify: true,
          });
        });
      } else {
        // Foreground system notification
        new Notification(title, { body, icon: 'https://picsum.photos/seed/guardian/192/192' });
      }
    }
  };

  // Process Broadcasts
  useEffect(() => {
    if (!broadcasts || broadcasts.length === 0) return;
    const latest = broadcasts[0];

    // Initialize ref on first run to avoid notifying about historical data
    if (lastBroadcastIdRef.current === null) {
      lastBroadcastIdRef.current = latest.id;
      return;
    }

    if (latest.id !== lastBroadcastIdRef.current) {
      lastBroadcastIdRef.current = latest.id;
      
      const title = "COMMAND BROADCAST";
      const message = latest.message;
      
      toast({
        title,
        description: message,
        className: "bg-primary text-white font-black uppercase border-none shadow-2xl",
      });

      sendSystemNotification(title, message, 'broadcast');
    }
  }, [broadcasts, toast]);

  // Process Active Rescue Signals
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    const latest = alerts[0];

    if (lastAlertIdRef.current === null) {
      lastAlertIdRef.current = latest.id;
      return;
    }

    if (latest.id !== lastAlertIdRef.current) {
      lastAlertIdRef.current = latest.id;
      
      // Notify about high-priority SOS or new missions
      if (latest.status === 'SOS' || latest.status === 'Scanned') {
        const title = latest.status === 'SOS' ? "URGENT SOS SIGNAL" : "NEW MISSION DISPATCH";
        const message = `Incident ${latest.id}: Status updated to ${latest.status}`;

        toast({
          variant: latest.status === 'SOS' ? "destructive" : "default",
          title,
          description: message,
        });

        sendSystemNotification(title, message, 'alert');
      }
    }
  }, [alerts, toast]);

  return null;
}

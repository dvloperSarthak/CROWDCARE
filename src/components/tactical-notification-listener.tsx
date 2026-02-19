
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

  const sendSystemNotification = (title: string, body: string, tag: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      // If document is backgrounded or site is "closed" (active in SW), send to Service Worker
      if (document.visibilityState === 'hidden' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_TACTICAL_ALERT',
          payload: { title, body, tag }
        });
      } else {
        // Foreground system notification
        new Notification(title, { 
          body, 
          icon: 'https://picsum.photos/seed/guardian/192/192',
          tag 
        });
      }
    }
  };

  // Process Broadcasts
  useEffect(() => {
    if (!broadcasts || broadcasts.length === 0) return;
    const latest = broadcasts[0];

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
      
      if (latest.status === 'SOS' || latest.status === 'Scanned' || latest.status === 'Child Reunited') {
        const title = latest.status === 'SOS' ? "URGENT SOS SIGNAL" : 
                      latest.status === 'Child Reunited' ? "MISSION RESOLVED" : "NEW MISSION DISPATCH";
        
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

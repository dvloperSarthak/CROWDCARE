
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { TacticalNotificationListener } from '@/components/tactical-notification-listener';

export const metadata: Metadata = {
  title: 'CrowdCare Guardian',
  description: 'QR-Based Rescue System for Large Events',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('Guardian Tactical Service Worker registered');
                  }, function(err) {
                    console.log('Guardian Service Worker registration failed: ', err);
                  });
                });
              }
              
              // Request notification permission globally
              if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
              }
            `,
          }}
        />
      </head>
      <body className="font-body antialiased bg-background min-h-screen flex flex-col">
        <FirebaseClientProvider>
          <TacticalNotificationListener />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <footer className="w-full py-8 px-4 border-t bg-white mt-auto">
            <div className="container mx-auto text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                Made By Electronics And Telecom. Students (GPN)
              </p>
            </div>
          </footer>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}

"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldAlert, UserCog, Camera, LayoutDashboard, Fingerprint, LogIn, UserCircle } from 'lucide-react';
import { useAuth, initiateAnonymousSignIn, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';

export default function Home() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const handleGuestAccess = () => {
    if (auth && !user) {
      initiateAnonymousSignIn(auth);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12 bg-slate-50">
      <div className="text-center space-y-4 max-w-2xl">
        <div className="flex justify-center mb-4">
          <div className="bg-primary p-4 rounded-full shadow-lg">
            <ShieldAlert className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-primary">
          CrowdCare <span className="text-foreground">Guardian</span>
        </h1>
        <p className="text-xl text-muted-foreground font-medium">
          Secure, Network-Independent QR Rescue System for Large Events.
        </p>
      </div>

      <div className="w-full max-w-5xl space-y-8">
        <div className="flex justify-center gap-4">
          {!user ? (
            <Button size="lg" className="gap-2 px-8 h-12 text-lg shadow-md" asChild>
              <Link href="/login"><LogIn className="w-5 h-5" /> Staff Login</Link>
            </Button>
          ) : (
            <div className="bg-white border rounded-full px-6 py-2 flex items-center gap-2 shadow-sm">
              <UserCircle className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm">
                Signed in as {user.isAnonymous ? 'Guest Volunteer' : user.email}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link href="/admin/register" className="group">
            <Card className={`h-full hover:border-primary transition-all cursor-pointer shadow-md hover:shadow-xl bg-white border-2 ${(!user || user.isAnonymous) ? 'opacity-50 grayscale' : ''}`}>
              <CardHeader>
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <UserCog className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">Admin Panel</CardTitle>
                <CardDescription className="text-base">
                  Child Registration & QR Generation.
                </CardDescription>
              </CardHeader>
              {(!user || user.isAnonymous) && (
                <CardContent>
                  <p className="text-xs font-bold text-destructive">STAFF CREDENTIALS REQUIRED</p>
                </CardContent>
              )}
            </Card>
          </Link>

          <Link href="/volunteer" className="group" onClick={handleGuestAccess}>
            <Card className="h-full hover:border-primary transition-all cursor-pointer shadow-md hover:shadow-xl bg-white border-2 border-primary/20">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-2">
                  <Camera className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">Volunteer App</CardTitle>
                <CardDescription className="text-base">
                  QR Scanner & Rescue Dispatch.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/control-room" className="group">
            <Card className={`h-full hover:border-primary transition-all cursor-pointer shadow-md hover:shadow-xl bg-white border-2 ${(!user || user.isAnonymous) ? 'opacity-50 grayscale' : ''}`}>
              <CardHeader>
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">Control Room</CardTitle>
                <CardDescription className="text-base">
                  Live Monitoring & Log Tracking.
                </CardDescription>
              </CardHeader>
              {(!user || user.isAnonymous) && (
                <CardContent>
                  <p className="text-xs font-bold text-destructive">STAFF CREDENTIALS REQUIRED</p>
                </CardContent>
              )}
            </Card>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold">
        <Fingerprint className="w-4 h-4" />
        <span>End-to-End Encrypted & Privacy Centric</span>
      </div>
    </div>
  );
}

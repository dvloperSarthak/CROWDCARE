
"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldAlert, UserCog, Camera, LayoutDashboard, Fingerprint, LogIn, UserCircle } from 'lucide-react';
import { useAuth, initiateAnonymousSignIn, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { cn } from '@/lib/utils';

export default function Home() {
  const auth = useAuth();
  const { user } = useUser();

  const handleGuestAccess = () => {
    if (auth && !user) {
      initiateAnonymousSignIn(auth);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12 bg-slate-50 overflow-hidden">
      <div className="text-center space-y-4 max-w-2xl relative z-10">
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

      <div className="w-full max-w-6xl space-y-8 relative z-10">
        <div className="flex flex-col items-center gap-4">
          {user && (
            <div className="bg-white border rounded-full px-6 py-2 flex items-center gap-2 shadow-sm animate-entrance">
              <UserCircle className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm">
                Signed in as {user.isAnonymous ? 'Guest Volunteer' : user.email}
              </span>
            </div>
          )}

          <Button size="lg" className="gap-2 px-8 h-12 text-lg shadow-md" asChild>
            <Link href="/login">
              <LogIn className="w-5 h-5" /> 
              {user?.isAnonymous ? 'Sign in as Guardian' : 'Guardian Login'}
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <RoleCard 
            href="/admin/register"
            icon={<UserCog className="w-6 h-6" />}
            title="Admin Panel"
            description="Child Registration & QR Generation."
            isRestricted={!user || user.isAnonymous}
          />

          <RoleCard 
            href="/volunteer"
            icon={<Camera className="w-6 h-6" />}
            title="Volunteer App"
            description="QR Scanner & Rescue Dispatch."
            onClick={handleGuestAccess}
          />

          <RoleCard 
            href="/control-room"
            icon={<LayoutDashboard className="w-6 h-6" />}
            title="Control Room"
            description="Live Monitoring & Log Tracking."
            isRestricted={!user || user.isAnonymous}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold relative z-10">
        <Fingerprint className="w-4 h-4" />
        <span>End-to-End Encrypted & Privacy Centric</span>
      </div>
    </div>
  );
}

function RoleCard({ 
  href, 
  icon, 
  title, 
  description, 
  isRestricted = false,
  onClick 
}: { 
  href: string; 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  isRestricted?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="relative group h-full">
      <div className="relative h-full rounded-[1.25rem] border border-border p-2 md:p-3 transition-all">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <Link 
          href={href} 
          onClick={onClick}
          className={cn(
            "relative flex h-full flex-col justify-between overflow-hidden rounded-xl border bg-background p-6 shadow-sm transition-all group-hover:bg-slate-50/50",
            isRestricted && "opacity-60 grayscale"
          )}
        >
          <div className="space-y-4">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              {icon}
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-tight">{title}</h3>
              <p className="text-muted-foreground font-medium">{description}</p>
            </div>
          </div>
          {isRestricted && (
            <div className="mt-4 pt-4 border-t border-dashed">
              <p className="text-[10px] font-black text-destructive tracking-widest uppercase">GUARDIAN CREDENTIALS REQUIRED</p>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}

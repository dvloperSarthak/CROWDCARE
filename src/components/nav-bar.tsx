"use client";

import Link from 'next/link';
import { ShieldAlert, ChevronLeft, LogOut, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export function NavBar({ title, backHref }: { title: string, backHref?: string }) {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center px-6">
        {backHref && (
          <Button variant="ghost" size="icon" asChild className="mr-4">
            <Link href={backHref}>
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
        )}
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {user && (
            <div className="hidden md:flex items-center gap-2 mr-4 bg-slate-50 px-3 py-1 rounded-full border">
              <UserCircle className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold max-w-[150px] truncate">
                {user.isAnonymous ? 'Guest' : user.email}
              </span>
            </div>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Role Select</Link>
          </Button>
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

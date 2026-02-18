import Link from 'next/link';
import { ShieldAlert, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NavBar({ title, backHref }: { title: string, backHref?: string }) {
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
        <div className="ml-auto flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Role Select</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
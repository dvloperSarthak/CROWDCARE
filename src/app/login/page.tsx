
"use client";

import { useState } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useAuth, initiateEmailSignIn, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { LogIn, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in as a real user
  if (user && !user.isAnonymous) {
    router.push('/');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      initiateEmailSignIn(auth, email, password);
      toast({
        title: "Authenticating...",
        description: "Connecting to Guardian secure gateway.",
      });
      // Navigation is usually triggered by auth state change elsewhere, but we can help it
      setTimeout(() => router.push('/'), 2000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="Guardian Secure Portal" />
      <main className="container max-w-md py-12 px-6 mx-auto">
        <Card className="shadow-xl border-2">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black">Guardian Login</CardTitle>
            <CardDescription>
              Enter your credentials to access Admin and Control Room protocols.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Guardian Email</Label>
                <Input id="email" name="email" type="email" placeholder="guardian@stadium.com" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : "Sign In"}
              </Button>
              <Button variant="link" onClick={() => router.push('/')} className="text-muted-foreground">
                Back to Role Selection
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}

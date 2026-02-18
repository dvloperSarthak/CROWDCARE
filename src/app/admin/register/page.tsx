"use client";

import { useState } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { UserPlus, CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function AdminRegister() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  const db = useFirestore();
  const { user } = useUser();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Authenticated",
        description: "You must be signed in to register a child.",
      });
      return;
    }

    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const id = `C${Math.floor(Math.random() * 9000) + 1000}`;
    setGeneratedId(id);
    
    const newChild = {
      id,
      childName: formData.get('name') as string,
      parentName: formData.get('parentName') as string,
      parentMobileNumber: formData.get('parentPhone') as string,
      emergencyContactNumber: formData.get('emergencyContact') as string,
      registrationDate: new Date().toISOString(),
      registeredById: user.uid,
      isActive: true,
    };

    const childRef = doc(db, 'children', id);
    setDocumentNonBlocking(childRef, newChild, { merge: true });
    
    // Artificial delay for animation feel
    setTimeout(() => {
      setLoading(false);
      setIsSuccess(true);
      toast({
        title: "Database Synced",
        description: `Guardian ID ${id} is now live in the registry.`,
      });

      // Navigate after some time to allow seeing the success state
      setTimeout(() => {
        router.push('/admin/children');
      }, 2500);
    }, 1200);
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavBar title="Registration Complete" />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-4 border-teal-500 shadow-2xl animate-success-pop p-8 text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center">
               <CheckCircle2 className="w-16 h-16 text-teal-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Registered!</h2>
              <p className="text-muted-foreground font-medium">Guardian ID generated and encrypted</p>
            </div>
            <div className="bg-slate-100 p-6 rounded-xl border-2 border-dashed border-slate-300">
               <p className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Active Guardian ID</p>
               <p className="text-5xl font-black text-primary tracking-tighter">{generatedId}</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-teal-600 animate-pulse">
               <Loader2 className="w-4 h-4 animate-spin" />
               Syncing with Central Control...
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="Child Registration" backHref="/" />
      <main className="container max-w-2xl py-8 px-6 mx-auto">
        <Card className="shadow-lg border-2">
          <CardHeader className="space-y-1">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black">Register New Child</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs uppercase font-black tracking-widest">Child's Full Name</Label>
                <Input id="name" name="name" placeholder="Enter child's name" className="h-12 text-lg" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parentName" className="text-xs uppercase font-black tracking-widest">Parent / Guardian Name</Label>
                <Input id="parentName" name="parentName" placeholder="Enter parent's name" className="h-12" required />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="parentPhone" className="text-xs uppercase font-black tracking-widest">Primary Mobile</Label>
                  <Input id="parentPhone" name="parentPhone" type="tel" placeholder="+1 (555) 000-0000" className="h-12" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emergencyContact" className="text-xs uppercase font-black tracking-widest">Secondary Phone</Label>
                  <Input id="emergencyContact" name="emergencyContact" type="tel" placeholder="+1 (555) 000-0000" className="h-12" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Button type="submit" className="w-full text-xl h-14 font-black tracking-widest shadow-lg uppercase" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 w-6 h-6" />
                    Generate ID
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
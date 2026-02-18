
"use client";

import { useState, useEffect, useRef } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { UserPlus, CheckCircle2, Loader2, QrCode, Lock, ImagePlus, X, CloudUpload } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';

export default function AdminRegister() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  const roleRef = useMemoFirebase(() => user ? doc(db, 'roles_admin', user.uid) : null, [db, user]);
  const { data: adminRole, isLoading: loadingAdmin } = useDoc(roleRef);

  const isEmailUser = user && !user.isAnonymous;
  const isAdmin = !!adminRole || isEmailUser;
  const isAuthenticatedGuardian = user && !user.isAnonymous;

  useEffect(() => {
    if (!isUserLoading && !loadingAdmin) {
      if (!isAuthenticatedGuardian || !isAdmin) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Guardian credentials required for registration protocols.",
        });
      }
    }
  }, [isAuthenticatedGuardian, isAdmin, isUserLoading, loadingAdmin, toast]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function uploadToGuardianNet(base64: string): Promise<string | null> {
    try {
      const res = await fetch(base64);
      const blob = await res.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'guardian-id-photo.jpg');
      
      const response = await fetch('https://imgup.infinityfreeapp.com/wp-json/imgup/v1/upload', {
        method: 'POST',
        headers: {
          'X-API-Key': 'irHNL9Ibs5LyVUyI2WYXq1mCdiJ9EDxc'
        },
        body: formData
      });

      if (!response.ok) return null;
      
      const result = await response.json();
      return result.url || result.data?.url || null;
    } catch (error) {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAuthenticatedGuardian || !isAdmin) return;

    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const id = `C${Math.floor(Math.random() * 9000) + 1000}`;
    setGeneratedId(id);

    let finalPhotoUrl = photoBase64;
    if (photoBase64) {
      const remoteUrl = await uploadToGuardianNet(photoBase64);
      if (remoteUrl) {
        finalPhotoUrl = remoteUrl;
      }
    }
    
    const newChild = {
      id,
      childName: formData.get('name') as string,
      parentName: formData.get('parentName') as string,
      parentMobileNumber: formData.get('parentPhone') as string,
      emergencyContactNumber: formData.get('emergencyContact') as string,
      registrationDate: new Date().toISOString(),
      registeredById: user.uid,
      isActive: true,
      photoUrl: finalPhotoUrl,
    };

    const childRef = doc(db, 'children', id);
    setDocumentNonBlocking(childRef, newChild, { merge: true });
    
    setTimeout(() => {
      setLoading(false);
      setIsSuccess(true);
      toast({
        title: "Registry Updated",
        description: `Guardian ID ${id} is now live on secure servers.`,
      });

      setTimeout(() => {
        router.push('/admin/children');
      }, 2500);
    }, 1200);
  }

  if (isUserLoading || (loadingAdmin && !isEmailUser)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Authenticating Protocol...</p>
      </div>
    );
  }

  if (!isAuthenticatedGuardian || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar title="Restricted Area" backHref="/" />
        <main className="container max-w-md py-20 px-6 mx-auto text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase">Guardian Access Only</h2>
          <Button className="w-full h-12 font-bold" onClick={() => router.push('/login')}>
            Guardian Login
          </Button>
        </main>
      </div>
    );
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
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Registered</h2>
              <p className="text-muted-foreground font-medium">Guardian ID generated successfully</p>
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
      <NavBar title="Child Registration" backHref="/admin/children" />
      <main className="container max-w-2xl py-8 px-6 mx-auto">
        <Card className="shadow-lg border-2">
          <CardHeader className="space-y-1">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight">Register New ID</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4 py-4">
                <div 
                  className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center relative overflow-hidden group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoBase64 ? (
                    <>
                      <Image src={photoBase64} alt="Preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <CloudUpload className="w-8 h-8 text-white" />
                      </div>
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="destructive" 
                        className="absolute top-1 right-1 w-6 h-6 rounded-full z-10"
                        onClick={(e) => { e.stopPropagation(); setPhotoBase64(null); }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ImagePlus className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Add Photo</span>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                />
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
                  <CloudUpload className="w-3 h-3" /> Official Secure Storage
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs uppercase font-black tracking-widest">Child's Full Name</Label>
                <Input id="name" name="name" placeholder="Enter child's name" className="h-12 text-lg font-bold" required />
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
                    Transmitting...
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

"use client";

import { useState, useRef } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Lock, ImagePlus, CloudUpload, Activity, Info, Sparkles } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { extractPhysicalDescription } from '@/ai/flows/extract-description-flow';

export default function AdminRegister() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  const roleRef = useMemoFirebase(() => user ? doc(db, 'roles_admin', user.uid) : null, [db, user]);
  const { data: adminRole, isLoading: loadingAdmin } = useDoc(roleRef);

  const isEmailUser = user && !user.isAnonymous;
  const isAdmin = !!adminRole || isEmailUser;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const runAiVision = async () => {
    if (!previewUrl || !selectedFile) return;
    setIsExtracting(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const dataUri = reader.result as string;
        const result = await extractPhysicalDescription({ photoDataUri: dataUri });
        setDescription(result.description);
        toast({ title: "AI Vision Sync", description: "Physical profile extracted from photo." });
        setIsExtracting(false);
      };
    } catch (e) {
      toast({ variant: "destructive", title: "Vision Failure", description: "AI could not process the photo." });
      setIsExtracting(false);
    }
  };

  async function uploadToImgBB(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('https://api.imgbb.com/1/upload?key=6874d5a39ecc03ce08ca12b3f4f00fd8', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data?.url || null;
    } catch (error) {
      return null;
    }
  }

  async function handleSubmit() {
    if (!isAdmin || !formRef.current) return;

    setLoading(true);
    const formData = new FormData(formRef.current);
    const id = `C${Math.floor(Math.random() * 9000) + 1000}`;
    setGeneratedId(id);

    let finalPhotoUrl = null;
    if (selectedFile) {
      finalPhotoUrl = await uploadToImgBB(selectedFile);
    }
    
    const newChild = {
      id,
      childName: formData.get('name') as string,
      age: parseInt(formData.get('age') as string) || 0,
      physicalDescription: description || formData.get('description') as string || '',
      parentName: formData.get('parentName') as string,
      parentMobileNumber: formData.get('parentPhone') as string,
      emergencyContactNumber: formData.get('emergencyContact') as string,
      medicalRequirements: formData.get('medical') as string || 'None',
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
        description: `Guardian ID ${id} is now live.`,
      });
      setTimeout(() => router.push('/admin/children'), 2500);
    }, 1200);
  }

  if (isUserLoading || (loadingAdmin && !isEmailUser)) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar title="Restricted Area" backHref="/" />
        <main className="container max-w-md py-20 px-6 mx-auto text-center space-y-6">
          <Lock className="w-20 h-20 text-destructive mx-auto" />
          <h2 className="text-2xl font-black uppercase">Guardian Access Only</h2>
          <Button className="w-full h-12 font-bold" onClick={() => router.push('/login')}>Guardian Login</Button>
        </main>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <NavBar title="Registration Complete" />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-4 border-teal-500 p-8 text-center space-y-6 animate-success-pop">
            <CheckCircle2 className="w-16 h-16 text-teal-600 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Registered</h2>
              <p className="text-muted-foreground">Guardian ID generated successfully</p>
            </div>
            <div className="bg-slate-100 p-6 rounded-xl border-2 border-dashed border-slate-300">
               <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Active Guardian ID</p>
               <p className="text-5xl font-black text-primary">{generatedId}</p>
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
          <CardHeader>
            <CardTitle className="text-2xl font-black uppercase">Register New ID</CardTitle>
          </CardHeader>
          <form ref={formRef} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4 py-4">
                <div 
                  className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center relative overflow-hidden group cursor-pointer shadow-inner"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <>
                      <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <CloudUpload className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ImagePlus className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase">Add Photo</span>
                    </div>
                  )}
                </div>
                {previewUrl && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    className="h-8 font-black uppercase text-[10px]" 
                    onClick={runAiVision}
                    disabled={isExtracting}
                  >
                    {isExtracting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
                    AI Vision Description
                  </Button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 grid gap-2">
                  <Label htmlFor="name" className="text-xs uppercase font-black">Child's Full Name</Label>
                  <Input id="name" name="name" placeholder="Enter name" className="h-12 text-lg font-bold" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="age" className="text-xs uppercase font-black">Age</Label>
                  <Input id="age" name="age" type="number" placeholder="0" className="h-12 text-lg font-bold" required />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description" className="text-xs uppercase font-black flex items-center gap-2">
                   <Info className="w-3 h-3" /> Physical Description
                </Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Blonde hair, red t-shirt..." 
                  className="min-h-[80px]" 
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="medical" className="text-xs uppercase font-black flex items-center gap-2">
                  <Activity className="w-3 h-3 text-red-500" /> Medical Alerts
                </Label>
                <Textarea id="medical" name="medical" placeholder="Allergies, etc..." className="min-h-[80px]" />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="parentName" className="text-xs uppercase font-black">Parent Name</Label>
                  <Input id="parentName" name="parentName" className="h-12" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="parentPhone" className="text-xs uppercase font-black">Mobile</Label>
                  <Input id="parentPhone" name="parentPhone" className="h-12" required />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center pt-6">
              <InteractiveHoverButton 
                text={loading ? "Generating..." : "Generate ID"} 
                className="w-full h-16"
                disabled={loading}
              />
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}

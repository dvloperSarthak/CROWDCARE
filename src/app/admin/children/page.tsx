
"use client";

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { NavBar } from '@/components/nav-bar';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Search, Download, Loader2, UserCircle, Map as MapIcon, Eye, Navigation, Camera, Upload, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

// Dynamically import tactical map for inbuilt embed
const TacticalMap = dynamic(() => import('@/components/tactical-map'), { 
  ssr: false,
  loading: () => <div className="h-48 w-full bg-slate-100 animate-pulse rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] font-black uppercase text-slate-400">Loading Tactical Intel...</div>
});

export default function ChildrenList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const db = useFirestore();
  const { user } = useUser();

  // Filter children to only show those registered by the current user
  const childrenRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(collection(db, 'children'), where('registeredById', '==', user.uid));
  }, [db, user]);
  
  const { data: children, isLoading } = useCollection(childrenRef);

  const eventsRef = useMemoFirebase(() => user ? collection(db, 'rescueEvents') : null, [db, user]);
  const { data: events } = useCollection(eventsRef);

  const filtered = children?.filter(c => 
    c.childName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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

  const handlePhotoUpdate = async (childId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(childId);
    
    const remoteUrl = await uploadToImgBB(file);
    
    if (remoteUrl) {
      const childDocRef = doc(db, 'children', childId);
      updateDocumentNonBlocking(childDocRef, { photoUrl: remoteUrl });
      toast({
        title: "Registry Updated",
        description: "Identification photo has been synced with GuardianNet via ImgBB.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Secure storage node rejected the transmission.",
      });
    }
    setUploadingId(null);
  };

  const handlePrint = (childId: string, childName: string, photo?: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${childId}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Guardian ID - ${childId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              background: #f1f5f9; 
            }
            .card { 
              width: 320px; 
              height: 500px; 
              background: white; 
              border-radius: 20px; 
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); 
              overflow: hidden; 
              display: flex; 
              flex-direction: column; 
              position: relative;
              border: 1px solid #e2e8f0;
            }
            .lanyard-slot {
              display: flex;
              justify-content: center;
              gap: 40px;
              padding: 15px 0;
              background: #f8fafc;
            }
            .slot {
              width: 30px;
              height: 6px;
              background: #cbd5e1;
              border-radius: 10px;
            }
            .photo-area { 
              flex: 1; 
              background: #0f172a; 
              position: relative; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              overflow: hidden;
            }
            .background-image {
              position: absolute;
              width: 100%;
              height: 100%;
              object-fit: cover;
              opacity: 0.8;
            }
            .qr-overlay {
              position: relative;
              z-index: 10;
              background: white;
              padding: 12px;
              border-radius: 12px;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
              width: 180px;
              height: 180px;
            }
            .qr-overlay img {
              width: 100%;
              height: 100%;
            }
            .info-area { 
              height: 100px; 
              background: white; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              padding: 10px;
              border-top: 4px solid #FF7733;
            }
            .brand { 
              font-size: 28px; 
              font-weight: 900; 
              color: #0f172a; 
              text-transform: uppercase; 
              letter-spacing: -1px;
              margin: 0;
            }
            .child-id {
              font-size: 14px;
              font-weight: 700;
              color: #FF7733;
              margin-top: 4px;
              letter-spacing: 2px;
            }
            .name-badge {
              position: absolute;
              top: 30px;
              left: 20px;
              background: #FF7733;
              color: white;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
              z-index: 20;
            }
            @media print {
              body { background: white; }
              .card { box-shadow: none; border: 1px solid #ddd; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="lanyard-slot">
              <div class="slot"></div>
              <div class="slot"></div>
            </div>
            <div class="name-badge">${childName}</div>
            <div class="photo-area">
              ${photo ? `<img src="${photo}" class="background-image" />` : `<div class="background-image" style="background: linear-gradient(45deg, #1e293b, #0f172a);"></div>`}
              <div class="qr-overlay">
                <img src="${qrUrl}" />
              </div>
            </div>
            <div class="info-area">
              <h1 class="brand">Crowd Care</h1>
              <span class="child-id">${childId}</span>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExport = async (childId: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${childId}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GuardianID-${childId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "Failed to generate Guardian ID file.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="My Registered IDs" backHref="/" />
      <main className="container py-8 px-6 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Search your registrations..." className="pl-10 h-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button className="w-full md:w-auto font-black uppercase tracking-widest shadow-lg" asChild>
            <a href="/admin/register">New Registration</a>
          </Button>
        </div>

        <Card className="shadow-md border-2">
          <CardContent className="p-0">
            {isLoading || !user ? (
              <div className="flex flex-col items-center justify-center py-24 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Syncing Personal Registry...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-16">Photo</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">ID</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Name</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Live Telemetry</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">Ops</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">You haven't registered any children yet.</TableCell></TableRow>
                  ) : (
                    filtered.map((child) => {
                      const latestEvent = events
                        ?.filter(e => e.childId === child.id)
                        .sort((a, b) => new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime())[0];

                      return (
                        <TableRow key={child.id}>
                          <TableCell>
                            {child.photoUrl ? (
                              <div className="w-10 h-10 rounded-full border border-primary overflow-hidden relative shadow-sm">
                                <Image src={child.photoUrl} alt={child.childName} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"><UserCircle className="w-6 h-6 text-slate-400" /></div>
                            )}
                          </TableCell>
                          <TableCell className="font-black text-primary tracking-tighter text-lg">{child.id}</TableCell>
                          <TableCell className="font-black text-sm uppercase">{child.childName}</TableCell>
                          <TableCell>
                            {latestEvent ? (
                              <div className="flex flex-col gap-1">
                                <p className="font-mono text-[10px] font-bold text-slate-700 leading-tight">
                                  {latestEvent.locationLatitude.toFixed(6)}, {latestEvent.locationLongitude.toFixed(6)}
                                </p>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="link" size="sm" className="h-auto p-0 text-[9px] font-black uppercase text-primary items-center justify-start gap-1">
                                      <MapIcon className="w-2.5 h-2.5" /> View Tactical Map
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle className="font-black uppercase tracking-tight">Situational Intelligence: {child.id}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="w-full h-[300px] rounded-xl overflow-hidden border-2 border-slate-900 shadow-xl relative">
                                        <TacticalMap 
                                          alerts={[latestEvent]} 
                                          center={[latestEvent.locationLatitude, latestEvent.locationLongitude]} 
                                          zoom={17} 
                                        />
                                      </div>
                                      <div className="w-full h-[300px] rounded-xl overflow-hidden border-2 border-slate-900 shadow-xl">
                                        <iframe
                                          title="Google Maps Satellite Embed"
                                          width="100%"
                                          height="100%"
                                          style={{ border: 0 }}
                                          src={`https://maps.google.com/maps?q=${latestEvent.locationLatitude},${latestEvent.locationLongitude}&t=k&z=18&ie=UTF8&iwloc=&output=embed`}
                                          allowFullScreen
                                        ></iframe>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 font-bold uppercase italic">No Active Signal</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="secondary" className="gap-2 font-black uppercase text-[10px] h-8 shadow-sm"><Eye className="w-3 h-3" /> Inspect</Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader><DialogTitle className="text-center font-black uppercase">Guardian ID Profile: {child.id}</DialogTitle></DialogHeader>
                                <div className="flex flex-col items-center justify-center p-6 space-y-6">
                                  <div className="flex gap-4 items-center">
                                    <div className="relative">
                                      {child.photoUrl ? (
                                        <div className="w-24 h-24 rounded-2xl border-4 border-primary overflow-hidden relative shadow-lg">
                                          <Image src={child.photoUrl} alt={child.childName} fill className="object-cover" />
                                        </div>
                                      ) : (
                                        <div className="w-24 h-24 rounded-2xl border-4 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                                          <UserCircle className="w-12 h-12 text-slate-300" />
                                        </div>
                                      )}
                                      <label 
                                        className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary/90 transition-colors"
                                        title="Update ID Photo"
                                      >
                                        {uploadingId === child.id ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          accept="image/*" 
                                          onChange={(e) => handlePhotoUpdate(child.id, e)} 
                                        />
                                      </label>
                                    </div>
                                    <div className="bg-white p-3 border-8 border-primary rounded-xl shadow-2xl">
                                      <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${child.id}`} alt="QR" width={100} height={100} className="rounded-sm" />
                                    </div>
                                  </div>
                                  <div className="text-center space-y-1 w-full">
                                    <p className="font-black text-3xl text-slate-900 tracking-tighter">{child.id}</p>
                                    <p className="font-black text-xl text-primary uppercase">{child.childName}</p>
                                    {!child.photoUrl && (
                                      <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mt-2 animate-pulse">Photo Required for SITREP Verification</p>
                                    )}
                                  </div>

                                  {latestEvent && (
                                    <div className="w-full space-y-3">
                                      <div className="bg-slate-900 p-4 rounded-xl border-2 border-primary/20 space-y-2 shadow-inner">
                                        <div className="flex justify-between items-center">
                                          <p className="font-mono text-xs font-bold text-slate-300">{latestEvent.locationLatitude.toFixed(6)}, {latestEvent.locationLongitude.toFixed(6)}</p>
                                          <Badge className="bg-primary/20 border-primary text-primary text-[8px] font-black uppercase">Live Tracking</Badge>
                                        </div>
                                      </div>
                                      
                                      <div className="w-full h-48 rounded-xl overflow-hidden border-2 border-slate-900 shadow-2xl relative">
                                        <iframe
                                          title="Google Maps Situational Embed"
                                          width="100%"
                                          height="100%"
                                          style={{ border: 0 }}
                                          src={`https://maps.google.com/maps?q=${latestEvent.locationLatitude},${latestEvent.locationLongitude}&z=16&ie=UTF8&iwloc=&output=embed`}
                                          allowFullScreen
                                        ></iframe>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex gap-4 w-full pt-4">
                                    <Button className="flex-1 h-12 text-xs font-black uppercase" onClick={() => handlePrint(child.id, child.childName, child.photoUrl)}><Printer className="w-4 h-4 mr-2" /> Print ID</Button>
                                    <Button variant="outline" className="flex-1 h-12 text-xs font-black uppercase" onClick={() => handleExport(child.id)}><Download className="w-4 h-4 mr-2" /> Export</Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

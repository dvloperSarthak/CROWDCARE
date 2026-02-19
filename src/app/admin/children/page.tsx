"use client";

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { NavBar } from '@/components/nav-bar';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { Badge } from '@/components/ui/badge';
import { Printer, Search, Loader2, UserCircle, Eye, Camera, Edit2, Save, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ChildrenList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [editingChild, setEditingChild] = useState<any | null>(null);
  const [now, setNow] = useState(new Date());
  const db = useFirestore();
  const { user } = useUser();

  // Tick every few seconds to refresh the "Live" indicators
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(interval);
  }, []);

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
      toast({ title: "Registry Updated", description: "Identification photo synced." });
    } else {
      toast({ variant: "destructive", title: "Upload Failed", description: "Secure storage node rejected transmission." });
    }
    setUploadingId(null);
  };

  const handleUpdateProfile = () => {
    if (!editingChild) return;
    const childDocRef = doc(db, 'children', editingChild.id);
    updateDocumentNonBlocking(childDocRef, {
      parentName: editingChild.parentName,
      parentMobileNumber: editingChild.parentMobileNumber,
      emergencyContactNumber: editingChild.emergencyContactNumber
    });
    toast({ title: "Profile Updated", description: "Guardian contact intelligence synced." });
    setEditingChild(null);
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
            body { font-family: 'Inter', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f1f5f9; }
            .card { width: 320px; height: 500px; background: white; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; display: flex; flex-direction: column; position: relative; border: 1px solid #e2e8f0; }
            .lanyard-slot { display: flex; justify-content: center; gap: 40px; padding: 15px 0; background: #f8fafc; }
            .slot { width: 30px; height: 6px; background: #cbd5e1; border-radius: 10px; }
            .photo-area { flex: 1; background: #0f172a; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .background-image { position: absolute; width: 100%; height: 100%; object-fit: cover; opacity: 0.8; }
            .qr-overlay { position: relative; z-index: 10; background: white; padding: 12px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); width: 180px; height: 180px; }
            .qr-overlay img { width: 100%; height: 100%; }
            .info-area { height: 100px; background: white; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; border-top: 4px solid #FF7733; }
            .brand { font-size: 28px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -1px; margin: 0; }
            .child-id { font-size: 14px; font-weight: 700; color: #FF7733; margin-top: 4px; letter-spacing: 2px; }
            .name-badge { position: absolute; top: 30px; left: 20px; background: #FF7733; color: white; padding: 4px 12px; border-radius: 4px; font-size: 10px; font-weight: 900; text-transform: uppercase; z-index: 20; }
            @media print { body { background: white; } .card { box-shadow: none; border: 1px solid #ddd; } }
          </style>
        </head>
        <body>
          <div class="card"><div class="lanyard-slot"><div class="slot"></div><div class="slot"></div></div><div class="name-badge">${childName}</div><div class="photo-area">
              ${photo ? `<img src="${photo}" class="background-image" />` : `<div class="background-image" style="background: linear-gradient(45deg, #1e293b, #0f172a);"></div>`}
              <div class="qr-overlay"><img src="${qrUrl}" /></div>
            </div><div class="info-area"><h1 class="brand">Crowd Care</h1><span class="child-id">${childId}</span></div></div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="Guardian Registry" backHref="/" />
      <main className="container py-8 px-6 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Search tactical registry..." className="pl-10 h-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <InteractiveHoverButton 
            text="New Registration" 
            className="w-full md:w-56 h-11"
            onClick={() => window.location.href = "/admin/register"}
          />
        </div>

        <Card className="shadow-md border-2 overflow-hidden rounded-2xl">
          <CardContent className="p-0">
            {isLoading || !user ? (
              <div className="flex flex-col items-center justify-center py-24 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Syncing field data...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-16">Photo</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">ID</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Name</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Live Location</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">Ops</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground">No registrations found.</TableCell></TableRow>
                  ) : (
                    filtered.map((child) => {
                      const latestEvent = events
                        ?.filter(e => e.childId === child.id)
                        .sort((a, b) => new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime())[0];
                      
                      const isVeryRecent = latestEvent && (now.getTime() - new Date(latestEvent.scanTime).getTime() < 30000);

                      return (
                        <TableRow key={child.id} className={cn(isVeryRecent && "bg-primary/5")}>
                          <TableCell>
                            {child.photoUrl ? (
                              <div className="w-10 h-10 rounded-full border border-primary overflow-hidden relative shadow-sm">
                                <Image src={child.photoUrl} alt={child.childName} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"><UserCircle className="w-6 h-6 text-slate-400" /></div>
                            )}
                          </TableCell>
                          <TableCell className="font-black text-primary text-lg">{child.id}</TableCell>
                          <TableCell className="font-black text-sm uppercase">{child.childName}</TableCell>
                          <TableCell>
                            {latestEvent ? (
                              <div className="flex flex-col gap-1">
                                <Badge className={cn("text-[9px] font-black uppercase w-fit", latestEvent.status === 'SOS' && "bg-red-600 animate-pulse")}>
                                  {latestEvent.status}
                                </Badge>
                                {isVeryRecent && <span className="text-[8px] font-bold text-primary animate-pulse uppercase tracking-tighter">New Signal Incoming</span>}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 font-bold italic uppercase tracking-widest">No Signal</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {latestEvent ? (
                              <div className="flex flex-col gap-1">
                                <Button 
                                  variant="ghost" 
                                  className="p-0 h-auto text-[10px] font-black uppercase text-primary hover:bg-transparent flex items-center gap-1 group"
                                  onClick={() => window.open(`https://www.google.com/maps?q=${latestEvent.locationLatitude},${latestEvent.locationLongitude}`)}
                                >
                                  <MapPin className={cn("w-3 h-3", isVeryRecent && "text-red-500 animate-bounce")} />
                                  <span className="group-hover:underline underline-offset-2">
                                    {latestEvent.locationLatitude.toFixed(4)}, {latestEvent.locationLongitude.toFixed(4)}
                                  </span>
                                </Button>
                                <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter">
                                  Last Scan: {new Date(latestEvent.scanTime).toLocaleTimeString()}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 font-bold italic">Stationary</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingChild(child)}><Edit2 className="w-3 h-3 text-slate-500" /></Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader><DialogTitle className="font-black uppercase">Edit Guardian Profile</DialogTitle></DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-black uppercase">Parent Name</Label>
                                      <Input value={editingChild?.parentName || ''} onChange={e => setEditingChild({...editingChild, parentName: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-black uppercase">Primary Mobile</Label>
                                      <Input value={editingChild?.parentMobileNumber || ''} onChange={e => setEditingChild({...editingChild, parentMobileNumber: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-black uppercase">Secondary Contact</Label>
                                      <Input value={editingChild?.emergencyContactNumber || ''} onChange={e => setEditingChild({...editingChild, emergencyContactNumber: e.target.value})} />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={handleUpdateProfile} className="w-full font-black uppercase h-12"><Save className="w-4 h-4 mr-2" /> Save Updates</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="secondary" className="gap-2 font-black uppercase text-[10px] h-8 shadow-sm"><Eye className="w-3 h-3" /> Inspect</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader><DialogTitle className="text-center font-black uppercase">Guardian ID: {child.id}</DialogTitle></DialogHeader>
                                  <div className="flex flex-col items-center justify-center p-6 space-y-6">
                                    <div className="flex gap-4 items-center">
                                      <div className="relative">
                                        {child.photoUrl ? (
                                          <div className="w-24 h-24 rounded-2xl border-4 border-primary overflow-hidden relative shadow-lg"><Image src={child.photoUrl} alt={child.childName} fill className="object-cover" /></div>
                                        ) : (
                                          <div className="w-24 h-24 rounded-2xl border-4 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center"><UserCircle className="w-12 h-12 text-slate-300" /></div>
                                        )}
                                        <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary/90 transition-colors">
                                          {uploadingId === child.id ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpdate(child.id, e)} />
                                        </label>
                                      </div>
                                      <div className="bg-white p-2 border-4 border-primary rounded-xl shadow-xl"><Image src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${child.id}`} alt="QR" width={80} height={80} /></div>
                                    </div>
                                    <div className="text-center">
                                      <p className="font-black text-2xl text-slate-900">{child.childName}</p>
                                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{child.parentMobileNumber}</p>
                                    </div>
                                    <div className="flex gap-4 w-full pt-4">
                                      <Button className="flex-1 h-12 text-xs font-black uppercase" onClick={() => handlePrint(child.id, child.childName, child.photoUrl)}><Printer className="w-4 h-4 mr-2" /> Print Card</Button>
                                      <Button variant="outline" className="flex-1 h-12 text-xs font-black uppercase" onClick={() => { 
                                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${child.id}`;
                                        window.open(qrUrl, '_blank');
                                      }}><ExternalLink className="w-4 h-4 mr-2" /> QR Link</Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
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

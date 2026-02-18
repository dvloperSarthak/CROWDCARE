
"use client";

import { useState } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { QrCode, Printer, Search, Download, Loader2, UserCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import Image from 'next/image';

export default function ChildrenList() {
  const [searchTerm, setSearchTerm] = useState('');
  const db = useFirestore();

  const childrenRef = useMemoFirebase(() => collection(db, 'children'), [db]);
  const { data: children, isLoading } = useCollection(childrenRef);

  const filtered = children?.filter(c => 
    c.childName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handlePrint = (childId: string, childName: string, photo?: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${childId}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Guardian ID - ${childId}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
            .card { border: 8px solid #FF7733; padding: 40px; border-radius: 24px; text-align: center; max-width: 400px; background: white; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
            .photo { width: 120px; height: 120px; border-radius: 60px; object-fit: cover; border: 4px solid #FF7733; margin-bottom: 20px; }
            h1 { font-size: 48px; margin: 10px 0; color: #0f172a; font-weight: 900; }
            h2 { font-size: 24px; margin: 0; color: #FF7733; font-weight: 700; }
            .qr { width: 180px; height: 180px; margin-top: 20px; }
            .footer { margin-top: 30px; font-size: 10px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            ${photo ? `<img src="${photo}" class="photo" />` : ''}
            <h2>${childName}</h2>
            <h1>${childId}</h1>
            <img src="${qrUrl}" class="qr" />
            <div class="footer">Verified Guardian Protocol</div>
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
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="Guardian ID Registry" backHref="/" />
      <main className="container py-8 px-6 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search by ID or Name..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="w-full md:w-auto font-bold uppercase tracking-widest" variant="outline" asChild>
            <a href="/admin/register">New Registration</a>
          </Button>
        </div>

        <Card className="shadow-md border-2">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Syncing Central Registry...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-16">Photo</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Child Name</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-medium">
                        No matches found in Registry.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((child) => (
                      <TableRow key={child.id}>
                        <TableCell>
                          {child.photoUrl ? (
                            <div className="w-10 h-10 rounded-full border border-primary overflow-hidden relative">
                              <Image src={child.photoUrl} alt={child.childName} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                              <UserCircle className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-primary tracking-tighter">{child.id}</TableCell>
                        <TableCell className="font-bold">{child.childName}</TableCell>
                        <TableCell className="text-sm font-medium">{child.parentName}</TableCell>
                        <TableCell className="text-sm font-mono">{child.parentMobileNumber}</TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" className="gap-2 font-bold uppercase text-[10px]">
                                <QrCode className="w-3 h-3" />
                                Inspect
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-center font-black uppercase">Guardian ID Profile: {child.id}</DialogTitle>
                              </DialogHeader>
                              <div className="flex flex-col items-center justify-center p-6 space-y-6">
                                <div className="flex gap-4 items-center w-full justify-center">
                                  {child.photoUrl && (
                                    <div className="w-24 h-24 rounded-2xl border-4 border-primary overflow-hidden relative shadow-lg">
                                      <Image src={child.photoUrl} alt={child.childName} fill className="object-cover" />
                                    </div>
                                  )}
                                  <div className="bg-white p-4 border-8 border-primary rounded-xl shadow-2xl shrink-0">
                                    <Image 
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${child.id}`}
                                      alt={`QR Code for ${child.id}`}
                                      width={150}
                                      height={150}
                                      className="rounded-sm"
                                    />
                                  </div>
                                </div>
                                <div className="text-center space-y-1">
                                  <p className="font-black text-3xl text-slate-900 tracking-tighter">{child.id}</p>
                                  <p className="font-black text-xl text-primary uppercase">{child.childName}</p>
                                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                    Registered: {new Date(child.registrationDate).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex gap-4 w-full">
                                  <Button 
                                    className="flex-1 gap-2 h-12 text-sm font-black uppercase" 
                                    onClick={() => handlePrint(child.id, child.childName, child.photoUrl)}
                                  >
                                    <Printer className="w-4 h-4" /> Print
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className="flex-1 gap-2 h-12 text-sm font-black uppercase"
                                    onClick={() => handleExport(child.id)}
                                  >
                                    <Download className="w-4 h-4" /> Export
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
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

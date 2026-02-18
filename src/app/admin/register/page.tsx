"use client";

import { useState } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { DataStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { QrCode, UserPlus } from 'lucide-react';

export default function AdminRegister() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const id = `C${Math.floor(Math.random() * 9000) + 1000}`;
    
    const newChild = {
      id,
      name: formData.get('name') as string,
      parentName: formData.get('parentName') as string,
      parentPhone: formData.get('parentPhone') as string,
      emergencyContact: formData.get('emergencyContact') as string,
      registeredAt: new Date().toISOString(),
    };

    DataStore.addChild(newChild);
    
    toast({
      title: "Registration Successful",
      description: `Child ID ${id} has been registered. Redirecting to QR view.`,
    });

    setTimeout(() => {
      router.push('/admin/children');
    }, 1500);
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
            <CardTitle className="text-2xl">Register New Child</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Child's Full Name</Label>
                <Input id="name" name="name" placeholder="Enter child's name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parentName">Parent / Guardian Name</Label>
                <Input id="parentName" name="parentName" placeholder="Enter parent's name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parentPhone">Primary Mobile Number</Label>
                <Input id="parentPhone" name="parentPhone" type="tel" placeholder="+1 (555) 000-0000" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergencyContact">Secondary Emergency Contact (Optional)</Label>
                <Input id="emergencyContact" name="emergencyContact" type="tel" placeholder="+1 (555) 000-0000" />
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button type="submit" className="w-full text-lg h-12" disabled={loading}>
                {loading ? "Registering..." : "Generate Guardian ID"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
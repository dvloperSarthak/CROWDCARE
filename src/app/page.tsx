import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldAlert, UserCog, Camera, LayoutDashboard, Fingerprint } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12">
      <div className="text-center space-y-4 max-w-2xl">
        <div className="flex justify-center mb-4">
          <div className="bg-primary p-4 rounded-full shadow-lg">
            <ShieldAlert className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-primary">
          CrowdCare <span className="text-foreground">Guardian</span>
        </h1>
        <p className="text-xl text-muted-foreground font-medium">
          Secure, Network-Independent QR Rescue System for Large Events.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        <Link href="/admin/register" className="group">
          <Card className="h-full hover:border-primary transition-all cursor-pointer shadow-md hover:shadow-xl bg-white border-2">
            <CardHeader>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <UserCog className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Admin Panel</CardTitle>
              <CardDescription className="text-base">
                Child Registration & QR Generation.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/volunteer" className="group">
          <Card className="h-full hover:border-primary transition-all cursor-pointer shadow-md hover:shadow-xl bg-white border-2">
            <CardHeader>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Camera className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Volunteer App</CardTitle>
              <CardDescription className="text-base">
                QR Scanner & Rescue Dispatch.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/control-room" className="group">
          <Card className="h-full hover:border-primary transition-all cursor-pointer shadow-md hover:shadow-xl bg-white border-2">
            <CardHeader>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Control Room</CardTitle>
              <CardDescription className="text-base">
                Live Monitoring & Log Tracking.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold">
        <Fingerprint className="w-4 h-4" />
        <span>End-to-End Encrypted & Privacy Centric</span>
      </div>
    </div>
  );
}
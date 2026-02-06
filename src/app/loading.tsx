import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Ticket } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex items-center pl-2">
            <Ticket className="h-6 w-6 text-primary" />
            <span className="ml-2 font-bold font-headline">
              mm2D Live
            </span>
          </div>
        </div>
      </header>
      <main className="container mx-auto flex-1 px-4 py-8 md:px-6 md:py-12">
        <div className="grid max-w-3xl mx-auto gap-8 lg:gap-12">
          <Card className="w-full text-center">
            <CardHeader>
              <Skeleton className="mx-auto h-8 w-1/2" />
              <Skeleton className="mx-auto mt-2 h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mx-auto h-24 w-40" />
            </CardContent>
            <CardFooter className="flex justify-center bg-muted/50 p-4">
              <Skeleton className="h-10 w-48" />
            </CardFooter>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-lg" />
                <div className="w-full space-y-2">
                  <Skeleton className="h-7 w-3/5" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-h-[10rem]">
              <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-10">
                <Skeleton className="h-5 w-2/3" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-44" />
            </CardFooter>
          </Card>
        </div>
      </main>
      <footer className="py-6">
        <Skeleton className="mx-auto h-4 w-1/3" />
      </footer>
    </div>
  );
}

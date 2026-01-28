import Header from '@/components/layout/header';
import CurrentNumber from '@/components/lottery/current-number';
import PatternAnalysis from '@/components/lottery/pattern-analysis';
import WeeklyHistory from '@/components/lottery/weekly-history';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-8 md:px-6 md:py-12">
        <div className="grid max-w-3xl mx-auto gap-8 lg:gap-12">
          <CurrentNumber />
          <WeeklyHistory />
          <PatternAnalysis />
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Myanmar 2D Lottery Tracker. All rights
        reserved.
      </footer>
    </div>
  );
}

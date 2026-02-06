import Header from '@/components/layout/header';
import LiveNumber from '@/components/lottery/LiveNumber';
import HistoricalTable from '@/components/lottery/HistoricalTable';
import AiAnalysis from '@/components/lottery/AiAnalysis';
import FirestoreManager from '@/components/lottery/FirestoreManager';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl flex-1 px-4 py-8 md:px-6 md:py-12">
        <div className="grid grid-cols-1 gap-8">
          <LiveNumber />
          <HistoricalTable />
          <AiAnalysis />
          <FirestoreManager />
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} mm2D Live. Data from SET.
      </footer>
    </div>
  );
}

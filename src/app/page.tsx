import Header from '@/components/layout/Header';
import LiveNumber from '@/components/lottery/LiveNumber';
import HistoricalTable from '@/components/lottery/HistoricalTable';
import AiAnalysis from '@/components/lottery/AiAnalysis';
import FirestoreManager from '@/components/lottery/FirestoreManager';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-8 md:px-6 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          
          <div className="lg:col-span-2">
            <LiveNumber />
          </div>

          <div className="lg:col-span-3">
            <HistoricalTable />
          </div>

          <div className="lg:col-span-5">
            <AiAnalysis />
          </div>
          
          <div className="lg:col-span-5">
             <FirestoreManager />
          </div>

        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} mm2D. Data from SET.
      </footer>
    </div>
  );
}

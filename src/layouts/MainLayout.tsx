import Sidebar from '../components/Sidebar';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      <Sidebar />
      <main className="ml-20 flex-1 p-6 relative">
        {/* Header Area */}
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kasir Warung</h1>
            <p className="text-sm text-gray-500">Selasa, 24 Januari 2026</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                <span className="text-green-600 font-bold text-sm">● Online</span>
             </div>
             <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                YZ
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="h-[calc(100vh-140px)]">
           {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;

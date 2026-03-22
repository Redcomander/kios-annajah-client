import { Home, ShoppingCart, Package, Users, Settings, LogOut } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="h-screen w-20 bg-gray-900 flex flex-col items-center py-6 text-white fixed left-0 top-0">
      <div className="mb-8 p-2 bg-blue-600 rounded-lg">
        <Home className="w-6 h-6" />
      </div>
      
      <nav className="flex flex-col gap-6 flex-1 w-full px-2">
        <NavItem icon={<ShoppingCart />} label="Kasir" active />
        <NavItem icon={<Package />} label="Produk" />
        <NavItem icon={<Users />} label="Member" />
        <NavItem icon={<Settings />} label="Setting" />
      </nav>

      <div className="mt-auto pointer cursor-pointer hover:text-red-400">
        <LogOut className="w-6 h-6" />
        <span className="text-[10px] mt-1 block">Exit</span>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => {
  return (
    <button className={`w-full flex flex-col items-center justify-center p-2 rounded-xl transition-all ${active ? 'bg-gray-800 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
      <span className="w-6 h-6">{icon}</span>
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );
}

export default Sidebar;

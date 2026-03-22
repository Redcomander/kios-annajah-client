import { Plus } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image?: string;
  stock: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  return (
    <div 
      onClick={() => onAddToCart(product)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 cursor-pointer hover:shadow-md hover:border-blue-400 transition-all group relative overflow-hidden"
    >
      <div className="h-28 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400 overflow-hidden">
         {product.image ? (
            <img src={`http://localhost:3000${product.image}`} alt={product.name} className="w-full h-full object-cover" />
         ) : (
            <div className="text-4xl">📦</div>
         )}
      </div>
      
      <div className="flex justify-between items-start">
        <div>
           <h3 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">{product.name}</h3>
           <span className="text-xs text-gray-400">{product.category}</span>
        </div>
      </div>
      
      <div className="mt-2 flex items-center justify-between">
         <span className="font-bold text-blue-600">
            Rp {product.price.toLocaleString('id-ID')}
         </span>
         <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            Stok: {product.stock}
         </span>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
         <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
            <Plus size={24} />
         </div>
      </div>
    </div>
  );
};

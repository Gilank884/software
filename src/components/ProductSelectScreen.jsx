import StepWrapper from './StepWrapper'
import { Printer, Check, Star } from 'lucide-react'

const PRODUCTS = [
  { id: 'strip_2', name: 'Photobooth strip 2 pcs', price: 30000, description: 'Perfect for couples' },
  { id: 'strip_4', name: 'Photobooth strip 4 pcs', price: 45000, description: 'Great for small groups', popular: true },
  { id: 'strip_6', name: 'Photobooth strip 6 pcs', price: 55000, description: 'Best for families' },
  { id: 'strip_8', name: 'Photobooth strip 8 pcs', price: 65000, description: 'Party package' }
]

const ProductSelectScreen = ({ onSelect }) => {
  return (
    <StepWrapper title="Pilih Produk" subtitle="Pilih paket photobooth favoritmu">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto font-caveat">
        {PRODUCTS.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelect(product)}
            className={`bg-white/90 backdrop-blur-3xl p-8 rounded-[50px] border-4 transition-all group relative overflow-hidden text-left flex items-center justify-between gap-6 ${
              product.popular ? 'border-rose-100 shadow-xl scale-105 z-10' : 'border-white shadow-lg hover:border-rose-50'
            }`}
          >
            {product.popular && (
              <div className="absolute top-4 right-4 bg-rose-600 text-white px-3 py-1 rounded-full flex items-center gap-1 text-[8px] font-black tracking-widest font-sans z-10">
                 <Star size={8} fill="currentColor" /> POPULAR
              </div>
            )}
            
            <div className="flex-1">
              <h3 className="text-2xl font-black text-slate-800 mb-1">{product.name}</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest font-sans text-[10px] mb-4">{product.description}</p>
              <div className="text-4xl font-black text-gradient-red leading-none">
                Rp {product.price.toLocaleString('id-ID')}
              </div>
            </div>

            <div className={`w-16 h-16 bg-rose-50 rounded-[20px] flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-inner group-hover:bg-rose-600 group-hover:text-white`}>
               <Printer size={28} className="opacity-40 group-hover:opacity-100" />
            </div>

            <div className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-10 transition-all duration-700 pointer-events-none">
               <Printer size={120} />
            </div>
          </button>
        ))}
      </div>
    </StepWrapper>
  )
}

export default ProductSelectScreen

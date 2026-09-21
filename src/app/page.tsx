import Link from 'next/link';
import { QrCode } from 'lucide-react';

export default function Home() {
  const mesas = [1, 2, 3, 4, 5];

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#2C1810] flex flex-col items-center justify-center p-6">
      <div className="text-center w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-[#EADBCE]">
        <h1 className="text-3xl font-black font-serif text-[#8B261E] mb-2">CANTINA DO JÃO KIM</h1>
        <p className="text-sm text-gray-500 mb-8">
          Página de teste: Simule a leitura dos QR Codes das mesas abaixo.
        </p>
        
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-[#8B261E]/10 rounded-2xl">
            <QrCode className="w-16 h-16 text-[#8B261E]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {mesas.map((numero) => (
            <Link 
              key={numero}
              href={`/mesa/${numero}`}
              className={`p-4 rounded-xl border border-gray-200 hover:border-[#8B261E] hover:bg-[#8B261E]/5 transition flex flex-col items-center justify-center text-center shadow-sm ${
                numero === 5 ? 'col-span-2' : ''
              }`}
            >
              <span className="font-black text-lg text-[#2C1810]">Mesa {numero}</span>
              <span className="text-xs text-gray-400 mt-1">Acessar Cardápio</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

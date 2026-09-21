import Link from 'next/link';
import { Utensils, ChefHat, Bell } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black font-serif text-[#8B261E] mb-2">CANTINA DO JÃO KIM</h1>
        <p className="text-zinc-400">Selecione o módulo de acesso</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <Link 
          href="/mesa/9" 
          className="flex flex-col items-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-[#8B261E] hover:bg-zinc-800 transition group"
        >
          <Utensils className="w-12 h-12 text-[#8B261E] mb-4 group-hover:scale-110 transition-transform" />
          <h2 className="text-xl font-bold">Cliente</h2>
          <p className="text-zinc-500 text-sm mt-2 text-center">Visão da Mesa (Ex: Mesa 9)</p>
        </Link>

        <Link 
          href="/cozinha" 
          className="flex flex-col items-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-amber-500 hover:bg-zinc-800 transition group"
        >
          <ChefHat className="w-12 h-12 text-amber-500 mb-4 group-hover:scale-110 transition-transform" />
          <h2 className="text-xl font-bold">Cozinha</h2>
          <p className="text-zinc-500 text-sm mt-2 text-center">Painel KDS de Preparo</p>
        </Link>

        <Link 
          href="/garcom" 
          className="flex flex-col items-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500 hover:bg-zinc-800 transition group"
        >
          <Bell className="w-12 h-12 text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
          <h2 className="text-xl font-bold">Garçom / Bar</h2>
          <p className="text-zinc-500 text-sm mt-2 text-center">Painel de Entregas e Contas</p>
        </Link>
      </div>
    </main>
  );
}

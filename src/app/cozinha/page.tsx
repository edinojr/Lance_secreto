'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChefHat, Clock, CheckCircle2, Flame } from 'lucide-react';

export default function CozinhaPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [agora, setAgora] = useState(Date.now());

  // Atualiza o relógio a cada 1 minuto para os contadores de tempo
  useEffect(() => {
    const timer = setInterval(() => {
      setAgora(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const carregarPedidos = async () => {
    const { data } = await supabase
      .from('pedidos_itens')
      .select(`
        id, quantidade, observacoes, status, solicitado_em, destino,
        clientes (nome),
        cardapio_itens (nome, imagem_url),
        comandas_mesa (mesas (numero))
      `)
      .eq('destino', 'cozinha')
      .in('status', ['aguardando', 'em_preparo'])
      .order('solicitado_em', { ascending: true });

    if (data) setPedidos(data);
  };

  useEffect(() => {
    carregarPedidos();

    const canal = supabase
      .channel('cozinha-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_itens' }, () => {
        carregarPedidos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const alterarStatus = async (id: string, novoStatus: string) => {
    await supabase.from('pedidos_itens').update({ status: novoStatus }).eq('id', id);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6">
      <header className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6 sticky top-0 bg-zinc-950 z-10">
        <div className="flex items-center gap-2">
          <ChefHat className="w-8 h-8 text-amber-500" />
          <h1 className="text-2xl font-bold">PAINEL DA COZINHA</h1>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-bold text-zinc-400">Tempo Real</span>
          </div>
          <div className="bg-zinc-900 px-4 py-2 rounded-lg font-mono text-sm font-bold">
            {pedidos.length} FILA
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pedidos.map((pedido) => {
          const minutos = Math.floor((agora - new Date(pedido.solicitado_em).getTime()) / 60000);
          const muitoAtrasado = minutos > 15;
          const statusColors = {
            aguardando: muitoAtrasado ? 'bg-rose-950 border-rose-500/50' : 'bg-zinc-900 border-zinc-800',
            em_preparo: 'bg-amber-950 border-amber-500/50',
          };

          return (
            <div 
              key={pedido.id} 
              className={`${statusColors[pedido.status as keyof typeof statusColors]} border rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all`}
            >
              {/* Temporizador de Fila */}
              <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-black rounded-bl-lg ${muitoAtrasado && pedido.status === 'aguardando' ? 'bg-rose-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'}`}>
                {minutos} min
              </div>

              <div>
                <div className="flex justify-between items-start border-b border-zinc-800 pb-2 mb-3 pr-10">
                  <span className="text-amber-400 font-bold text-lg leading-none">
                    MESA {pedido.comandas_mesa?.mesas?.numero || '??'}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium leading-none">{pedido.clientes?.nome}</span>
                </div>
                
                <div className="flex gap-3 items-center mb-3">
                  {pedido.cardapio_itens?.imagem_url && (
                    <img src={pedido.cardapio_itens.imagem_url} alt="Prato" className="w-16 h-16 rounded-md object-cover shadow-md shrink-0" />
                  )}
                  <div className="text-base font-semibold text-white leading-tight">
                    <span className="text-amber-500 font-black">{pedido.quantidade}x</span> {pedido.cardapio_itens?.nome}
                  </div>
                </div>

                {pedido.observacoes && (
                  <div className="mt-2 bg-rose-500/10 border border-rose-500/20 rounded-md p-2">
                    <p className="text-rose-400 text-xs font-bold leading-relaxed">
                      ⚠️ {pedido.observacoes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-800 shrink-0">
                {pedido.status === 'aguardando' ? (
                  <button
                    onClick={() => alterarStatus(pedido.id, 'em_preparo')}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition uppercase"
                  >
                    <Flame className="w-4 h-4" /> Preparar
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black tracking-widest text-amber-400 bg-amber-900/30 rounded-lg animate-pulse uppercase">
                    <Flame className="w-4 h-4" /> Fogo
                  </div>
                )}

                <button
                  onClick={() => alterarStatus(pedido.id, 'pronto')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] uppercase tracking-wider"
                >
                  <CheckCircle2 className="w-4 h-4" /> Pronto
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

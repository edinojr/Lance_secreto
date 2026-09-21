'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChefHat, Clock, CheckCircle2, Flame } from 'lucide-react';

export default function CozinhaPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);

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
      .channel('kds-cozinha')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_itens' }, () => {
        carregarPedidos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const alterarStatus = async (id: string, novoStatus: 'em_preparo' | 'pronto') => {
    await supabase
      .from('pedidos_itens')
      .update({
        status: novoStatus,
        pronto_em: novoStatus === 'pronto' ? new Date().toISOString() : null
      })
      .eq('id', id);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6">
      <header className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-amber-500" />
          <h1 className="text-xl font-bold tracking-wide">COZINHA • CANTINA DO JÃO KIM</h1>
        </div>
        <div className="text-sm font-semibold bg-zinc-800 px-3 py-1 rounded-full text-zinc-400">
          {pedidos.length} na fila
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pedidos.map((pedido) => (
          <div
            key={pedido.id}
            className={`p-4 rounded-xl border flex flex-col justify-between ${
              pedido.status === 'em_preparo' ? 'bg-amber-950/30 border-amber-500/50' : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <div>
              <div className="flex justify-between items-start border-b border-zinc-800 pb-2 mb-3">
                <span className="text-amber-400 font-bold text-lg">
                  MESA {pedido.comandas_mesa?.mesas?.numero || '09'}
                </span>
                <span className="text-xs text-zinc-400 font-medium">{pedido.clientes?.nome}</span>
              </div>
              
              <div className="flex gap-3 items-center mb-2">
                {pedido.cardapio_itens?.imagem_url && (
                  <img src={pedido.cardapio_itens.imagem_url} alt="Prato" className="w-16 h-16 rounded-md object-cover shadow-md" />
                )}
                <div className="text-base font-semibold text-white">
                  <span className="text-amber-500 font-black">{pedido.quantidade}x</span> {pedido.cardapio_itens?.nome}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-800">
              {pedido.status === 'aguardando' ? (
                <button
                  onClick={() => alterarStatus(pedido.id, 'em_preparo')}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Flame className="w-4 h-4" /> PREPARANDO
                </button>
              ) : (
                <div className="flex-1 text-center py-2 text-xs font-bold text-amber-400 bg-amber-900/30 rounded-lg">
                  EM PREPARO
                </div>
              )}

              <button
                onClick={() => alterarStatus(pedido.id, 'pronto')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4" /> PRONTO
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

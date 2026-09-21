'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CardapioItem } from '@/types';
import { Utensils, Beer, IceCream, Plus, ShoppingBag, Check } from 'lucide-react';

export default function MesaClientePage() {
  const params = useParams();
  const mesaNumero = params.numero as string;

  // Estado de Autenticação / Check-in
  const [cliente, setCliente] = useState<{ id: string; nome: string } | null>(null);
  const [comandaId, setComandaId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // Estado do Cardápio e Pedido
  const [categoriaAtiva, setCategoriaAtiva] = useState<'lanches' | 'pratos' | 'porcoes' | 'bebidas' | 'sobremesas'>('lanches');
  const [itensCardapio, setItensCardapio] = useState<CardapioItem[]>([]);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  // Máscaras de entrada
  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  const maskPhone = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2');

  // Carregar Cardápio
  useEffect(() => {
    async function carregarCardapio() {
      const { data } = await supabase.from('cardapio_itens').select('*').eq('ativo', true);
      if (data) setItensCardapio(data);
    }
    carregarCardapio();

    // Recupera dados salvos localmente (Lembra o dispositivo do cliente)
    async function autoCheckin() {
      const local = localStorage.getItem('jao_kim_customer');
      if (local) {
        const u = JSON.parse(local);
        setNome(u.nome);
        setCpf(u.cpf || '');
        setWhatsapp(u.whatsapp || '');
        
        // Faz o check-in silencioso para clientes que já escanearam antes
        if (u.nome) {
          const { data: clienteData } = await supabase
            .from('clientes')
            .upsert({ nome: u.nome, cpf: u.cpf, whatsapp: u.whatsapp }, { onConflict: 'cpf' })
            .select()
            .single();

          if (clienteData) {
            setCliente({ id: clienteData.id, nome: clienteData.nome });
            buscarOuCriarComanda(clienteData.id);
          }
        }
      }
    }
    autoCheckin();
  }, []);

  // Isola a lógica de buscar a comanda para poder reaproveitar
  const buscarOuCriarComanda = async (clienteId: string) => {
    // Busca a mesa. Se não existir, não usamos .single() direto para não dar erro 406
    let { data: mesaData } = await supabase.from('mesas').select('id').eq('numero', parseInt(mesaNumero)).maybeSingle();
    
    // Se a mesa não existir no banco, criamos ela automaticamente
    if (!mesaData) {
      const { data: novaMesa } = await supabase
        .from('mesas')
        .insert({ numero: parseInt(mesaNumero) })
        .select()
        .single();
      mesaData = novaMesa;
    }

    if (mesaData) {
      let { data: comanda } = await supabase
        .from('comandas_mesa')
        .select('id')
        .eq('mesa_id', mesaData.id)
        .eq('status', 'aberta')
        .maybeSingle();

      if (!comanda) {
        const { data: novaComanda } = await supabase
          .from('comandas_mesa')
          .insert({
            mesa_id: mesaData.id,
            restaurante_id: 'a0000000-0000-0000-0000-000000000001'
          })
          .select()
          .single();
        comanda = novaComanda;
      }
      if (comanda) setComandaId(comanda.id);
    }
  };

  // Processo de Check-in Manual
  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: clienteData } = await supabase
      .from('clientes')
      .upsert({ nome, cpf, whatsapp }, { onConflict: 'cpf' })
      .select()
      .single();

    if (clienteData) {
      setCliente({ id: clienteData.id, nome: clienteData.nome });
      localStorage.setItem('jao_kim_customer', JSON.stringify({ nome, cpf, whatsapp }));
      buscarOuCriarComanda(clienteData.id);
    }
  };

  // Envio de Pedido com Roteamento Automático
  const fazerPedido = async (item: CardapioItem) => {
    if (!comandaId || !cliente) return;

    await supabase.from('pedidos_itens').insert({
      comanda_mesa_id: comandaId,
      cliente_id: cliente.id,
      cardapio_item_id: item.id,
      quantidade: 1,
      preco_unitario: item.preco,
      destino: item.destino, // 'cozinha' ou 'bar_garcom'
      status: 'aguardando',
      observacoes: null
    });

    setPedidoEnviado(true);
    setTimeout(() => setPedidoEnviado(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C1810] pb-24 relative">
      {/* Modal de Check-in */}
      {!cliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-[#EADBCE]">
            <h1 className="text-2xl font-serif font-black text-center text-[#8B261E]">CANTINA DO JÃO KIM</h1>
            <p className="text-center font-bold text-xs uppercase bg-[#8B261E]/10 text-[#8B261E] py-1 rounded-full mt-2">
              Check-in • Mesa {mesaNumero}
            </p>

            <form onSubmit={handleCheckin} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Seu Nome *</label>
                <input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#8B261E] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase flex justify-between">
                  <span>CPF</span>
                  <span className="text-gray-400 font-normal">Opcional</span>
                </label>
                <input
                  value={cpf}
                  maxLength={14}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#8B261E] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase flex justify-between">
                  <span>WhatsApp</span>
                  <span className="text-gray-400 font-normal">Opcional</span>
                </label>
                <input
                  value={whatsapp}
                  maxLength={15}
                  onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                  placeholder="(11) 90000-0000"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#8B261E] outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#8B261E] hover:bg-[#721f18] text-white font-bold py-3 rounded-xl shadow-lg transition text-sm uppercase tracking-wide mt-2"
              >
                Acessar Cardápio
              </button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-[#EADBCE] sticky top-0 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="font-serif font-black text-lg text-[#8B261E]">JÃO KIM</h2>
          <span className="text-[11px] font-bold text-gray-500">Mesa {mesaNumero} {cliente ? `• Olá, ${cliente.nome.split(' ')[0]}` : ''}</span>
        </div>
        {pedidoEnviado && (
          <div className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 font-bold animate-pulse">
            <Check className="w-3.5 h-3.5" /> Pedido Enviado!
          </div>
        )}
      </header>

      {/* Navegação por Categorias */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 bg-white/80 backdrop-blur border-b border-[#EADBCE] p-3 sticky top-[57px] z-20">
        {(['lanches', 'pratos', 'porcoes', 'bebidas', 'sobremesas'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaAtiva(cat)}
            className={`whitespace-nowrap text-xs font-bold capitalize px-4 py-2 rounded-full transition ${
              categoriaAtiva === cat ? 'bg-[#8B261E] text-white shadow' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista de Itens */}
      <main className="p-4 space-y-4">
        {itensCardapio
          .filter((i) => i.categoria === categoriaAtiva)
          .map((item) => (
            <div key={item.id} className="bg-white border border-[#EADBCE] rounded-2xl p-4 flex gap-4 items-center shadow-sm">
              {item.imagem_url && (
                <img 
                  src={item.imagem_url} 
                  alt={item.nome} 
                  className="w-24 h-24 object-cover rounded-xl shadow-sm"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-[#2C1810] truncate">{item.nome}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-snug">{item.descricao}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm font-black text-[#8B261E]">
                    R$ {item.preco.toFixed(2).replace('.', ',')}
                  </span>
                  <button
                    onClick={() => fazerPedido(item)}
                    disabled={!cliente}
                    className={`p-2 rounded-lg transition shadow flex items-center justify-center ${
                      !cliente ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#8B261E] hover:bg-[#721f18] text-white'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </main>
    </div>
  );
}

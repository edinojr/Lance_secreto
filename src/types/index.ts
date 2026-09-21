export type DestinoItem = 'cozinha' | 'bar_garcom';
export type StatusPedido = 'aguardando' | 'em_preparo' | 'pronto' | 'servido' | 'cancelado';

export interface CardapioItem {
  id: string;
  categoria: 'lanches' | 'pratos' | 'porcoes' | 'bebidas' | 'sobremesas';
  nome: string;
  descricao: string;
  preco: number;
  destino: DestinoItem;
  imagem_url?: string;
  ativo: boolean;
}

export interface PedidoItemComDetalhes {
  id: string;
  comanda_mesa_id: string;
  cliente_id: string;
  quantidade: number;
  preco_unitario: number;
  observacoes: string | null;
  destino: DestinoItem;
  status: StatusPedido;
  solicitado_em: string;
  clientes?: { nome: string };
  cardapio_itens?: { nome: string };
  comandas_mesa?: { mesas?: { numero: number } };
}

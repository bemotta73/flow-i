import * as XLSX from "xlsx";
import { formatBRL } from "./format";

interface CotacaoExport {
  created_at: string;
  vendedor: string;
  canal: string;
  produto: string;
  marca: string | null;
  part_number: string | null;
  custo: number;
  preco_15: number;
  preco_20: number;
  estoque: string | null;
  fornecedor: string | null;
  uf: string | null;
  prazo: string | null;
  link: string | null;
}

export function exportCotacoesToExcel(cotacoes: CotacaoExport[], filename: string) {
  const rows = cotacoes.map((c) => {
    const d = new Date(c.created_at);
    return {
      Data: d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      Hora: d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
      Vendedor: c.vendedor,
      Canal: c.canal,
      Produto: c.produto,
      Marca: c.marca || "",
      "Part Number": c.part_number || "",
      Custo: formatBRL(c.custo),
      "Preço 15%": formatBRL(c.preco_15),
      "Preço 20%": formatBRL(c.preco_20),
      Estoque: c.estoque || "",
      Fornecedor: c.fornecedor || "",
      UF: c.uf || "",
      Prazo: c.prazo || "",
      Link: c.link || "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cotações");
  XLSX.writeFile(wb, filename);
}

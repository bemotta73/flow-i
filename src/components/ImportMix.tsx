import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const SYSTEM_FIELDS = [
  { value: "fornecedor", label: "Fornecedor" },
  { value: "part_number", label: "PN" },
  { value: "produto", label: "Produto" },
  { value: "marca", label: "Marca" },
  { value: "custo", label: "Custo" },
  { value: "ignorar", label: "Ignorar" },
] as const;

const FIELD_KEYWORDS: Record<string, string[]> = {
  fornecedor: ["fornecedor"],
  part_number: ["pn", "part_number", "part number", "partnumber", "codigo"],
  produto: ["produto", "produtos", "descricao", "item"],
  marca: ["marca", "fabricante", "brand"],
  custo: ["custo", "preco", "precos", "valor", "price"],
};

interface MappedItem {
  produto: string;
  marca: string;
  part_number: string;
  custo: number;
  preco_15: number;
  preco_20: number;
  fornecedor: string;
}

interface ImportMixProps {
  onComplete: () => void;
}

const parseCustoBRL = (raw: any): number => {
  if (typeof raw === "number") return raw;
  const s = String(raw || "0")
    .replace(/R\$\s*/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(s) || 0;
};

const ImportMix = ({ onComplete }: ImportMixProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raw spreadsheet data
  const [rawRows, setRawRows] = useState<any[][] | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);

  // Mapping step
  const [mappingOpen, setMappingOpen] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [dataStartRow, setDataStartRow] = useState(3); // 1-indexed for user display

  // Preview step
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<MappedItem[]>([]);
  const [importing, setImporting] = useState(false);

  const detectMapping = (headerCells: string[]): Record<number, string> => {
    const mapping: Record<number, string> = {};
    const usedFields = new Set<string>();

    headerCells.forEach((cell, idx) => {
      const lower = cell.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
        if (!usedFields.has(field) && keywords.some((k) => lower.includes(k))) {
          mapping[idx] = field;
          usedFields.add(field);
          break;
        }
      }
      if (!mapping[idx]) {
        mapping[idx] = "ignorar";
      }
    });

    return mapping;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 }) as any[][];
      console.log("Excel raw (primeiras 3 linhas):", rows.slice(0, 3));

      if (rows.length < 2) {
        toast({ title: "Planilha vazia ou sem dados", variant: "destructive" });
        return;
      }

      setRawRows(rows);

      // Try to find header row in first 10 rows
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const cells = (rows[i] || []).map((c: any) => String(c || ""));
        const matches = Object.values(FIELD_KEYWORDS).filter((keywords) =>
          cells.some((cell) => {
            const lower = cell.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return keywords.some((k) => lower.includes(k));
          })
        );
        if (matches.length >= 2) {
          headerRowIdx = i;
          break;
        }
      }

      // Determine max columns from first few rows
      const maxCols = Math.max(...rows.slice(0, 5).map((r) => (r || []).length), 5);
      let detectedHeaders: string[];
      let detectedMapping: Record<number, string>;
      let detectedStartRow: number;

      if (headerRowIdx !== -1) {
        detectedHeaders = Array.from({ length: maxCols }, (_, i) =>
          String(rows[headerRowIdx]?.[i] ?? `Coluna ${String.fromCharCode(65 + i)}`)
        );
        detectedMapping = detectMapping(detectedHeaders);
        detectedStartRow = headerRowIdx + 2; // 1-indexed for display
      } else {
        // Fallback: A=fornecedor, B=PN, C=produto, D=marca, E=custo
        detectedHeaders = Array.from({ length: maxCols }, (_, i) =>
          `Coluna ${String.fromCharCode(65 + i)}`
        );
        detectedMapping = { 0: "fornecedor", 1: "part_number", 2: "produto", 3: "marca", 4: "custo" };
        for (let i = 5; i < maxCols; i++) detectedMapping[i] = "ignorar";
        detectedStartRow = 1;
      }

      setFileHeaders(detectedHeaders);
      setColumnMapping(detectedMapping);
      setDataStartRow(detectedStartRow);
      setMappingOpen(true);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleMappingChange = (colIdx: number, field: string) => {
    setColumnMapping((prev) => {
      const updated = { ...prev };
      // If field is not "ignorar", remove it from any other column
      if (field !== "ignorar") {
        for (const key of Object.keys(updated)) {
          if (updated[Number(key)] === field) {
            updated[Number(key)] = "ignorar";
          }
        }
      }
      updated[colIdx] = field;
      return updated;
    });
  };

  const goToPreview = () => {
    if (!rawRows) return;

    // Build inverse mapping: field -> colIdx
    const fieldToCol: Record<string, number> = {};
    for (const [idx, field] of Object.entries(columnMapping)) {
      if (field !== "ignorar") fieldToCol[field] = Number(idx);
    }

    if (!("produto" in fieldToCol) || !("custo" in fieldToCol)) {
      toast({ title: "Erro", description: "Mapeie pelo menos Produto e Custo", variant: "destructive" });
      return;
    }

    const startIdx = dataStartRow - 1; // Convert to 0-indexed
    const dadosMapeados: MappedItem[] = rawRows.slice(startIdx).map((row) => {
      const get = (field: string) =>
        field in fieldToCol ? String(row[fieldToCol[field]] ?? "").trim() : "";
      const custo = "custo" in fieldToCol ? parseCustoBRL(row[fieldToCol["custo"]]) : 0;
      return {
        produto: get("produto"),
        marca: get("marca"),
        part_number: get("part_number"),
        custo,
        preco_15: Math.round(custo * 1.15 * 100) / 100,
        preco_20: Math.round(custo * 1.20 * 100) / 100,
        fornecedor: get("fornecedor"),
      };
    }).filter((r) => r.produto && r.custo > 0);

    if (dadosMapeados.length > 0) {
      console.log("Dados mapeados:", JSON.stringify(dadosMapeados[0]));
    }

    if (dadosMapeados.length === 0) {
      toast({ title: "Nenhum produto válido encontrado", variant: "destructive" });
      return;
    }

    setPreviewData(dadosMapeados);
    setMappingOpen(false);
    setPreviewOpen(true);
  };

  const confirmImport = async () => {
    if (previewData.length === 0) return;
    setImporting(true);

    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("lista_mix")
        .select("id, fornecedor, part_number, produto, marca");

      if (existingError) throw existingError;

      const byPartNumber = new Map<string, { id: string; fornecedor: string | null; part_number: string | null; produto: string; marca: string | null }>();
      const byComposite = new Map<string, { id: string; fornecedor: string | null; part_number: string | null; produto: string; marca: string | null }>();

      const normalize = (v: string | null | undefined) => String(v || "").trim().toLowerCase();
      const compositeKey = (produto: string, marca: string | null, fornecedor: string | null) =>
        `${normalize(produto)}|${normalize(marca)}|${normalize(fornecedor)}`;

      for (const row of existingRows || []) {
        if (row.part_number) byPartNumber.set(normalize(row.part_number), row);
        byComposite.set(compositeKey(row.produto, row.marca, row.fornecedor), row);
      }

      let processed = 0;

      for (const item of previewData) {
        let produto = item.produto.trim();
        let partNumber = item.part_number.trim();

        // Fallback para planilhas onde PN veio embutido no produto: "PN - Produto"
        if (!partNumber) {
          const match = produto.match(/^([^\s-][^\n-]{1,80}?)\s*-\s+(.+)$/);
          if (match) {
            partNumber = match[1].trim();
            produto = match[2].trim();
          }
        }

        const payload = {
          fornecedor: item.fornecedor.trim() || null,
          part_number: partNumber || null,
          produto,
          marca: item.marca.trim() || null,
          custo: item.custo,
          preco_15: Math.round(item.custo * 1.15 * 100) / 100,
          preco_20: Math.round(item.custo * 1.2 * 100) / 100,
        };

        console.log("Payload Supabase:", JSON.stringify(payload));

        const existingByPn = payload.part_number ? byPartNumber.get(normalize(payload.part_number)) : undefined;
        const existingByComposite = byComposite.get(compositeKey(payload.produto, payload.marca, payload.fornecedor));
        const existing = existingByPn || existingByComposite;

        if (existing) {
          const mergedPayload = {
            ...payload,
            // Evita apagar dados já existentes quando a linha vem incompleta
            part_number: payload.part_number || existing.part_number || null,
            marca: payload.marca || existing.marca || null,
            fornecedor: payload.fornecedor || existing.fornecedor || null,
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from("lista_mix")
            .update(mergedPayload)
            .eq("id", existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("lista_mix").insert(payload);
          if (error) throw error;
        }

        processed++;
      }

      setPreviewOpen(false);
      setPreviewData([]);
      setRawRows(null);
      toast({ title: "Importação concluída", description: `${processed} produtos processados` });
      onComplete();
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro ao importar",
        description: error?.message || "Falha ao salvar a planilha",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  // Sample rows for mapping preview (show first 3 data rows)
  const sampleRows = rawRows ? rawRows.slice(dataStartRow - 1, dataStartRow + 2) : [];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-warning text-warning hover:bg-warning/10"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4" /> Importar Excel
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Step 1: Column Mapping Dialog */}
      <Dialog open={mappingOpen} onOpenChange={(open) => { if (!open) { setMappingOpen(false); setRawRows(null); } }}>
        <DialogContent className="bg-card border-card-border max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-warning font-semibold">Mapeamento de Colunas</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ajuste o mapeamento das colunas da planilha para os campos do sistema.
          </p>

          {/* Start row selector */}
          <div className="flex items-center gap-3 my-2">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">Dados começam na linha:</label>
            <Input
              type="number"
              min={1}
              max={rawRows?.length || 100}
              value={dataStartRow}
              onChange={(e) => setDataStartRow(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 surface-input"
            />
          </div>

          {/* Mapping table */}
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="table-header-dark border-0">
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Coluna</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Cabeçalho Detectado</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Campo do Sistema</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Amostra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fileHeaders.map((header, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs font-medium text-foreground">
                      {String.fromCharCode(65 + idx)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{header}</TableCell>
                    <TableCell>
                      <Select
                        value={columnMapping[idx] || "ignorar"}
                        onValueChange={(val) => handleMappingChange(idx, val)}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs surface-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SYSTEM_FIELDS.map((f) => (
                            <SelectItem key={f.value} value={f.value} className="text-xs">
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {sampleRows.map((row, ri) => (
                        <span key={ri}>
                          {ri > 0 && " | "}
                          {String(row?.[idx] ?? "")}
                        </span>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setMappingOpen(false); setRawRows(null); }}>
              Cancelar
            </Button>
            <Button onClick={goToPreview}>Próximo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) { setPreviewOpen(false); setPreviewData([]); } }}>
        <DialogContent className="bg-card border-card-border max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-warning font-semibold">Preview da Importação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {previewData.length} produtos encontrados na planilha
          </p>
          <div className="max-h-[50vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="table-header-dark border-0">
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Fornecedor</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">PN</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Produto</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Marca</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">Custo</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">15%</TableHead>
                  <TableHead className="text-xs text-muted-foreground font-semibold uppercase">20%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground">{item.fornecedor}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.part_number}</TableCell>
                    <TableCell className="text-xs text-foreground">{item.produto}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.marca}</TableCell>
                    <TableCell className="text-xs text-foreground">{formatBRL(item.custo)}</TableCell>
                    <TableCell className="text-xs text-primary">{formatBRL(item.preco_15)}</TableCell>
                    <TableCell className="text-xs text-success">{formatBRL(item.preco_20)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPreviewOpen(false); setMappingOpen(true); }}>
              Voltar
            </Button>
            <Button onClick={confirmImport} disabled={importing}>
              {importing ? "Importando..." : "Confirmar Importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImportMix;

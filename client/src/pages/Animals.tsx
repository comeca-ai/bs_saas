import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, History, RefreshCw, Rows3, ShieldCheck, UploadCloud } from "lucide-react";
import { trpc } from "@/lib/trpc";

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  to_confirm: "A confirmar",
};

function statusTone(status: string) {
  if (["active", "to_confirm"].includes(status)) return "good";
  if (["inactive"].includes(status)) return "neutral";
  return "neutral";
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill ${statusTone(value)}`}><span className="status-dot" />{statusLabels[value] ?? value}</span>;
}

function formatDate(dateStr: string) {
  if (!dateStr || dateStr === "--" || dateStr === "[SEM DATA]") return "Sem data";
  const parts = dateStr.toLowerCase().split(" ");
  if (parts.length < 2) return dateStr;
  const monthMap: Record<string, string> = {
    jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
    jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12"
  };
  const month = monthMap[parts[0]];
  const day = parts[1].padStart(2, "0");
  return `${day}/${month}/2026`;
}

function formatWeight(value: string) {
  if (!value || value === "--") return "-";
  return `${parseFloat(value).toFixed(2)} kg`;
}

function formatGMD(value: string) {
  if (!value || value === "--") return "-";
  return `${parseFloat(value).toFixed(2)} kg/d`;
}

export default function AnimalsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("VID");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [animalsData, setAnimalsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load CSV file directly
  useEffect(() => {
    const loadAnimals = async () => {
      try {
        const response = await fetch("/templates/animais.csv");
        if (response.ok) {
          const text = await response.text();
          const rows = text.split("\n").map(line => line.split(";"));
          const headers = rows[0];
          const data = rows.slice(1).filter(row => row.length > 1).map(row => {
            const obj: any = {};
            headers.forEach((h, i) => obj[h] = (row[i] ?? "").trim());
            return obj;
          });
          setAnimalsData(data);
        }
      } catch (e) {
        console.error("Error loading animals:", e);
      } finally {
        setLoading(false);
      }
    };
    loadAnimals();
  }, []);

  const filteredAnimals = useMemo(() => {
    let result = animalsData;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((a: any) => 
        a.VID?.toLowerCase().includes(term) ||
        a.IDE?.toLowerCase().includes(term) ||
        a.Fornecedor?.toLowerCase().includes(term) ||
        a.Raça?.toLowerCase().includes(term) ||
        a.Curral?.toLowerCase().includes(term)
      );
    }
    return result.sort((a: any, b: any) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      if (sortDirection === "asc") {
        return String(aVal).localeCompare(String(bVal), "pt-BR");
      }
      return String(bVal).localeCompare(String(aVal), "pt-BR");
    });
  }, [animalsData, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <>
      <section className="import-hero">
        <div className="import-hero-icon"><Rows3 size={22} /></div>
        <div>
          <span className="eyebrow">Cadastro de Animais</span>
          <h2>Lista de animais</h2>
          <p>Visualize todos os animais importados do Gallagher Animal Performance.</p>
        </div>
        <div className="import-hero-rule"><ShieldCheck size={16} /><span>Dados atualizados automaticamente.</span></div>
      </section>

      <div className="import-layout">
        <section className="panel import-upload-card">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Filtros</span>
              <h2>Buscar animais</h2>
            </div>
            <div className="toolbar-actions">
              <button className="icon-button" onClick={() => setLoading(true)} aria-label="Atualizar lista"><RefreshCw size={15} /></button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Buscar por VID, IDE, Fornecedor, Raça..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>
        </section>

        <section className="panel import-history-card">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Animais ({filteredAnimals.length})</span>
              <h2>Lista completa</h2>
            </div>
          </div>
          {loading ? (
            <div className="loading-panel"><span className="spinner" /> Carregando animais…</div>
          ) : filteredAnimals.length ? (
            <div className="import-history-list">
              {filteredAnimals.map((animal: any, idx: number) => (
                <button 
                  className={`import-history-row`} 
                  key={idx}
                >
                  <span className="history-file-icon"><FileSpreadsheet size={15} /></span>
                  <span className="history-file-copy">
                    <b>{animal.IDE || animal.VID || "Sem ID"}</b>
                    <small>
                      {animal.Raça || "Raça não informada"} · 
                      {animal.Sexo ? ` ${animal.Sexo}` : ""} · 
                      {animal.Fornecedor ? ` ${animal.Fornecedor}` : ""}
                    </small>
                  </span>
                  <span className="history-file-status">
                    <StatusPill value={animal.Status || "active"} />
                    <small>{formatDate(animal["Data de Nascimento"])}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="import-empty">
              <History size={19} />
              <b>Nenhum animal encontrado</b>
              <span>Tente ajustar os filtros.</span>
            </div>
          )}
        </section>
      </div>

      <section className="panel import-workspace">
        <div className="panel-header"><div><span className="eyebrow">Detalhes dos animais</span><h2>Informações completas</h2></div><Rows3 size={18} /></div>
        <div className="table-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }} onClick={() => handleSort("VID")}>VID</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }} onClick={() => handleSort("IDE")}>IDE</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }} onClick={() => handleSort("Peso (kg)")}>Peso</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>GMD (kg/d)</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }} onClick={() => handleSort("Fornecedor")}>Fornecedor</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }} onClick={() => handleSort("Curral Confinamento")}>Curral</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Data Nasc.</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }} onClick={() => handleSort("Raça")}>Raça</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Sexo</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Valor Arroba</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnimals.map((animal: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px" }}>{animal.VID || "-"}</td>
                  <td style={{ padding: "8px" }}>{animal.IDE || "-"}</td>
                  <td style={{ padding: "8px" }}>{formatWeight(animal["Peso (kg)"])}</td>
                  <td style={{ padding: "8px" }}>{formatGMD(animal["Ganho Médio Diário (kg/d) - 1"] || animal["Ganho Médio Diário (kg/d) - 2"])}</td>
                  <td style={{ padding: "8px" }}>{animal.Fornecedor || "-"}</td>
                  <td style={{ padding: "8px" }}>{animal["Curral Confinamento"] || "-"}</td>
                  <td style={{ padding: "8px" }}>{formatDate(animal["Data de Nascimento"])}</td>
                  <td style={{ padding: "8px" }}>{animal.Raça || "-"}</td>
                  <td style={{ padding: "8px" }}>{animal.Sexo || "-"}</td>
                  <td style={{ padding: "8px" }}>{animal["Valor Arroba"] || "-"}</td>
                  <td style={{ padding: "8px" }}>{animal.Estado || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

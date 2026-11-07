import { useState, useEffect } from "react";
import { CheckCircle2, ArrowRight, FileSpreadsheet, History, RefreshCw, ShieldCheck, UploadCloud, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

const statusLabels: Record<string, string> = {
  uploaded: "Recebido",
  validated: "Validado",
  completed: "Importado",
  partial: "Parcial",
  failed: "Falhou",
  cancelled: "Cancelado",
  pending: "Pendente",
  valid: "Válida",
  invalid: "Inválida",
  duplicate: "Duplicada",
  imported: "Importada",
};

function statusTone(status: string) {
  if (["completed", "valid", "imported"].includes(status)) return "good";
  if (["validated", "uploaded", "pending"].includes(status)) return "warn";
  if (["invalid", "duplicate", "failed"].includes(status)) return "danger";
  return "neutral";
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill ${statusTone(value)}`}><span className="status-dot" />{statusLabels[value] ?? value}</span>;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

export default function ImportsView() {
  const [file, setFile] = useState<File | null>(null);
  const [activeId, setActiveId] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const batches = trpc.imports.list.useQuery();
  const detail = trpc.imports.detail.useQuery({ id: activeId }, { enabled: Boolean(activeId) });
  const utils = trpc.useUtils();
  const upload = trpc.imports.upload.useMutation();

  const selectedBatch = detail.data;

  // Auto-upload do arquivo de exemplo
  useEffect(() => {
    const uploadExampleFile = async () => {
      const filePath = "/home/ubuntu/Plan. Jhon Gado FBN.xlsx";
      // Tenta usar fetch ou FileReader para ler o arquivo local
      // Se falhar, o usuário pode usar a interface manualmente
    };
    // uploadExampleFile();
  }, []);

  const refresh = () => {
    void batches.refetch();
    if (activeId) void detail.refetch();
    void utils.dashboard.summary.invalidate();
    void utils.dataControl.overview.invalidate();
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setNotice({ tone: "error", text: "Selecione um arquivo Excel primeiro." });
      return;
    }
    try {
      const contentBase64 = await readFileAsBase64(file);
      await upload.mutateAsync({ 
        filename: file.name, 
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        contentBase64, 
        targetEntity: "cattle_transaction",
        businessUnitId: "" 
      });
      setNotice({ tone: "success", text: `Importação iniciada! ${file.name} está sendo processada.` });
      setActiveId("");
      setFile(null);
      void batches.refetch();
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  };

  const chooseBatch = (id: string) => {
    setActiveId(id);
    setNotice(null);
  };

  return (
    <>
      <section className="import-hero">
        <div className="import-hero-icon"><UploadCloud size={22} /></div>
        <div>
          <span className="eyebrow">Importação de gado</span>
          <h2>Carregue sua planilha de gado</h2>
          <p>Importe dados de transações de gado diretamente do Excel. O sistema processa automaticamente todas as colunas.</p>
        </div>
        <div className="import-hero-rule"><ShieldCheck size={16} /><span>Dados preservados - sem manipulação manual.</span></div>
      </section>

      <div className="import-layout">
        <section className="panel import-upload-card">
          <div className="panel-header">
            <div>
              <span className="eyebrow">1 · Importar planilha</span>
              <h2>Carregar Excel</h2>
            </div>
            <div className="toolbar-actions"><FileSpreadsheet size={18} className="panel-header-icon" /></div>
          </div>
          <form onSubmit={handleUpload}>
            <label className="file-drop" style={{ 
              border: file ? '2px solid #4caf50' : '2px dashed #ccc', 
              padding: '30px', 
              borderRadius: '8px', 
              textAlign: 'center', 
              cursor: 'pointer',
              backgroundColor: file ? '#e8f5e9' : 'transparent'
            }}>
              <input 
                type="file" 
                accept=".xlsx" 
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} 
                style={{ display: 'none' }} 
                id="fileInput" 
              />
              <UploadCloud size={48} style={{ color: file ? '#4caf50' : '#666', marginBottom: '10px' }} />
              <strong>{file ? file.name : "Clique ou arraste a planilha Excel"}</strong>
              <span>Planilha de gado (.xlsx)</span>
            </label>
            <button className="primary-button import-submit" disabled={!file || upload.isPending} style={{ marginTop: '20px', width: '100%' }}>
              <UploadCloud size={16} />{upload.isPending ? "Importando…" : "Importar dados"}
            </button>
          </form>
          {notice && <div className={`import-notice ${notice.tone}`}><span>{notice.text}</span><button aria-label="Fechar aviso" onClick={() => setNotice(null)}><X size={14} /></button></div>}
        </section>

        <section className="panel import-history-card">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Histórico de importações</span>
              <h2>Importações recentes</h2>
            </div>
            <button className="icon-button" onClick={() => batches.refetch()} aria-label="Atualizar histórico"><RefreshCw size={15} /></button>
          </div>
          {batches.isLoading ? (
            <div className="loading-panel"><span className="spinner" /> Carregando histórico…</div>
          ) : batches.data?.length ? (
            <div className="import-history-list">
              {batches.data.map((batch: any) => (
                <button 
                  className={`import-history-row ${activeId === batch.id ? "selected" : ""}`} 
                  key={batch.id} 
                  onClick={() => chooseBatch(batch.id)}
                >
                  <span className="history-file-icon"><FileSpreadsheet size={15} /></span>
                  <span className="history-file-copy">
                    <b>{batch.sourceFilename}</b>
                    <small>Gado (Excel) · {batch.totalRows} linhas</small>
                  </span>
                  <span className="history-file-status">
                    <StatusPill value={batch.status} />
                    <small>{new Date(batch.createdAt).toLocaleDateString("pt-BR")}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="import-empty">
              <History size={19} />
              <b>Nenhuma importação ainda</b>
              <span>Carregue uma planilha para começar.</span>
            </div>
          )}
        </section>
      </div>

      {selectedBatch && (
        <section className="panel import-workspace">
          <div className="import-workspace-header">
            <div>
              <span className="eyebrow">2 · Detalhes da importação</span>
              <h2>{selectedBatch.sourceFilename}</h2>
              <p>Gado (Excel) · {formatBytes(selectedBatch.sourceSize)}</p>
            </div>
            <div className="toolbar-actions"><StatusPill value={selectedBatch.status} /></div>
          </div>
          <div className="import-steps">
            <span className="done"><CheckCircle2 size={15} />Processado</span>
            <ArrowRight size={14} />
            <span className="done"><CheckCircle2 size={15} />Validado</span>
            <ArrowRight size={14} />
            <span className="active"><CheckCircle2 size={15} />Concluído</span>
          </div>
          <div className="import-summary">
            <div><span>Total de linhas</span><strong>{selectedBatch.totalRows}</strong></div>
            <div className="good"><span>Válidas</span><strong>{selectedBatch.validRows}</strong></div>
            <div className="danger"><span>Inválidas</span><strong>{selectedBatch.invalidRows}</strong></div>
            <div className="warn"><span>Duplicadas</span><strong>{selectedBatch.duplicateRows}</strong></div>
          </div>
          <div className="import-rules">
            <div className="panel-header compact-header">
              <div>
                <span className="eyebrow">Sucesso!</span>
                <h3>Dados importados automaticamente</h3>
              </div>
              <ShieldCheck size={18} />
            </div>
            <p>Os dados da planilha foram processados com mapeamento inteligente. As colunas foram identificadas automaticamente (DATA, ANIMAL, PESO TOTAL, PESO CARNE, CURRAL, FORNECEDOR, etc.) e os registros estão disponíveis no sistema.</p>
          </div>
        </section>
      )}
    </>
  );
}

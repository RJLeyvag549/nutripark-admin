import { useState, useMemo } from 'react';
import { X, Plus, ChevronDown, Search } from 'lucide-react';

interface Cargo {
  id: number;
  descripcion: string;
}

interface Zona {
  id: number;
  nombre?: string;
  nombreZona?: string;
}

interface CargoSelectorProps {
  cargos: Cargo[];
  zonas: Zona[];
  selectedCargoId: string;
  onSelect: (id: string) => void;
  onCreateCargo: (nombre: string, idZona: number) => Promise<Cargo | null>;
  onDeleteCargo: (id: number) => Promise<void>;
}

export default function CargoSelector({
  cargos,
  zonas,
  selectedCargoId,
  onSelect,
  onCreateCargo,
  onDeleteCargo
}: CargoSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCargoName, setNewCargoName] = useState('');
  const [selectedZonaId, setSelectedZonaId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCargos = useMemo(() => {
    if (!searchQuery.trim()) return cargos;
    const keywords = searchQuery.toLowerCase().split(/\s+/).filter(k => k.length > 0);
    return cargos.filter(cargo => {
      const desc = cargo.descripcion.toLowerCase();
      return keywords.every(kw => desc.includes(kw));
    });
  }, [cargos, searchQuery]);

  const selectedCargo = cargos.find(c => c.id.toString() === selectedCargoId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCargoName || !selectedZonaId) return;

    setIsSubmitting(true);
    try {
      const created = await onCreateCargo(newCargoName, parseInt(selectedZonaId));
      if (created) {
        onSelect(created.id.toString());
        setNewCargoName('');
        setSelectedZonaId('');
        setShowAddForm(false);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error creating cargo:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 relative">
      <label className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Cargo / Puesto</label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-[var(--text-main)] flex justify-between items-center hover:border-orange-500 transition-colors"
        >
          <span className={selectedCargo ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}>
            {selectedCargo ? selectedCargo.descripcion : 'Seleccionar Cargo'}
          </span>
          <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-[60] w-full mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Search Input */}
            {!showAddForm && (
              <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]/30">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Buscar cargo por palabras clave..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-main)] outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredCargos.length === 0 ? (
                <p className="p-4 text-center text-xs text-[var(--text-muted)] italic">
                  {searchQuery ? 'No se encontraron coincidencias' : 'No hay cargos registrados'}
                </p>
              ) : (
                filteredCargos.map((c) => (
                  <div
                    key={c.id}
                    className="group flex items-center justify-between p-3 rounded-xl hover:bg-orange-500/10 transition-colors cursor-pointer"
                    onClick={() => {
                      onSelect(c.id.toString());
                      setIsOpen(false);
                    }}
                  >
                    <span className={`font-medium ${selectedCargoId === c.id.toString() ? 'text-orange-500' : 'text-[var(--text-main)]'}`}>
                      {c.descripcion}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCargo(c.id);
                      }}
                      className="p-2 text-orange-500 hover:bg-orange-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Eliminar cargo"
                    >
                      <X size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-2 bg-[var(--bg-main)]/50 border-t border-[var(--border-color)]">
              {!showAddForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 text-orange-500 font-bold text-xs uppercase tracking-widest hover:bg-orange-500/10 rounded-xl transition-all"
                >
                  <Plus size={16} /> Añadir Nuevo Cargo
                </button>
              ) : (
                <div className="p-3 space-y-3 animate-in fade-in duration-200">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nombre del cargo"
                    value={newCargoName}
                    onChange={(e) => setNewCargoName(e.target.value)}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-orange-500"
                  />
                  <select
                    value={selectedZonaId}
                    onChange={(e) => setSelectedZonaId(e.target.value)}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-orange-500"
                  >
                    <option value="">Seleccionar Zona</option>
                    {zonas.map(z => (
                      <option key={z.id} value={z.id}>
                        {z.nombre || z.nombreZona || `Zona ${z.id}`}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 p-2 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--bg-main)] rounded-lg transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={isSubmitting || !newCargoName || !selectedZonaId}
                      className="flex-1 bg-orange-500 text-white p-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? '...' : 'Crear'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-50" 
          onClick={() => {
            setIsOpen(false);
            setShowAddForm(false);
          }}
        />
      )}
    </div>
  );
}

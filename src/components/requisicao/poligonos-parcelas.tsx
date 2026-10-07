"use client";

import { CheckCircle2 } from "lucide-react";
import { corDoPoligono } from "@/lib/cores-poligonos";
import { MapaPoligonos, type CamadaPoligono } from "@/components/requisicao/mapa-poligonos";

export interface ParcelaOpcao {
  parcelaCodigo: string;
  nomeArea: string;
  areaHectares: number;
  municipio: string;
  uf: string;
  geometria?: unknown;
}

/**
 * Gleba com 2 ou mais polígonos (#PEND-34): cada polígono nomeado escolhe a sua parcela do
 * SIGEF, e o mapa mostra todos na cor de cada um. A parcela já usada fica desabilitada nas
 * demais linhas.
 */
export function PoligonosParcelas({
  id,
  nomes,
  parcelas,
  valores,
  onChange,
  erro,
}: {
  id: string;
  nomes: string[];
  parcelas: ParcelaOpcao[];
  valores: string[];
  onChange: (indice: number, parcelaCodigo: string) => void;
  erro?: string;
}) {
  const nome = (i: number) => nomes[i]?.trim() || `Polígono ${i + 1}`;
  const camadas: CamadaPoligono[] = nomes.flatMap((_, i) => {
    const p = parcelas.find((x) => x.parcelaCodigo === valores[i]);
    return p ? [{ geometria: p.geometria ?? null, rotulo: nome(i), cor: corDoPoligono(i) }] : [];
  });

  return (
    <fieldset aria-describedby={`${id}-dica${erro ? ` ${id}-erro` : ""}`}>
      <legend className="text-sm font-bold text-gray-900">Parcela de cada polígono *</legend>
      <p id={`${id}-dica`} className="mt-1 text-sm text-gray-700">
        Indique a qual parcela do SIGEF corresponde cada polígono. Cada parcela só pode ser
        usada uma vez.
      </p>
      <div className="mt-2">
        {nomes.map((_, i) => {
          const usadas = valores.filter((v, j) => v && j !== i);
          const escolhida = parcelas.find((p) => p.parcelaCodigo === valores[i]);
          return (
            <div
              key={i}
              className="grid grid-cols-[1rem_minmax(5.5rem,8rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-gray-100 py-2 last:border-b-0"
            >
              <span
                className="h-3.5 w-3.5 rounded-sm border"
                style={
                  escolhida
                    ? { background: corDoPoligono(i), borderColor: corDoPoligono(i) }
                    : { background: "#d1d5db", borderColor: "#9ca3af" }
                }
                aria-hidden="true"
              />
              <label htmlFor={`${id}-${i}`} className="text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
                {nome(i)}
              </label>
              <div className="min-w-0">
                <select
                  id={`${id}-${i}`}
                  value={valores[i] ?? ""}
                  onChange={(e) => onChange(i, e.target.value)}
                  aria-invalid={erro && !valores[i] ? true : undefined}
                  className="w-full min-w-0 rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm"
                >
                  <option value="">Escolha a parcela</option>
                  {parcelas.map((p) => {
                    const jaUsada = usadas.includes(p.parcelaCodigo);
                    return (
                      <option key={p.parcelaCodigo} value={p.parcelaCodigo} disabled={jaUsada}>
                        {(p.nomeArea || "Imóvel rural").slice(0, 70)} · {p.areaHectares.toLocaleString("pt-BR")} ha
                        {jaUsada ? " (já usada)" : ""}
                      </option>
                    );
                  })}
                </select>
                {escolhida && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {escolhida.municipio}/{escolhida.uf} · parcela {escolhida.parcelaCodigo}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {erro && (
        <p id={`${id}-erro`} role="alert" className="mt-1 text-sm text-red-600">
          {erro}
        </p>
      )}
      <figure className="mt-3 space-y-2">
        <figcaption className="text-sm font-bold text-gray-900">Localização dos polígonos</figcaption>
        {camadas.length > 0 ? (
          <MapaPoligonos
            camadas={camadas}
            descricao={`Mapa com ${camadas.length} polígono(s): ${camadas.map((c) => c.rotulo).join(", ")}`}
          />
        ) : (
          <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
            Escolha a parcela de um polígono para vê-lo no mapa.
          </p>
        )}
      </figure>
    </fieldset>
  );
}

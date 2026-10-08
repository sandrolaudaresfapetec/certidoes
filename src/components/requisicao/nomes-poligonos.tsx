"use client";

import { useState } from "react";

import {
  LIMITE_COMPLEMENTO,
  erroNomenclatura,
  nomesRepetidos,
  separarNome,
  type TipoNomePoligono,
} from "@/lib/cjt-formulario";

// A nomenclatura (regras puras) mora em cjt-formulario.ts, onde o servidor também a usa (#PEND-36).
export { LIMITE_COMPLEMENTO, erroNomenclatura, nomesRepetidos, separarNome };

/** Tipos de nome de polígono; "" = apenas o complemento (documento do cliente, item 8). */
const TIPOS = [
  { valor: "Gleba", rotulo: "Gleba" },
  { valor: "Parte", rotulo: "Parte" },
  { valor: "Parcela", rotulo: "Parcela" },
  { valor: "", rotulo: "Apenas o complemento" },
] as const;

type Tipo = TipoNomePoligono;

function comporNome(tipo: Tipo, complemento: string): string {
  if (!complemento) return "";
  return tipo ? `${tipo} ${complemento}` : complemento;
}

/**
 * Nome de cada polígono: o solicitante escolhe um tipo para o pedido todo e informa só o
 * complemento de cada polígono. Os nomes finais (ex.: "Gleba A-1") sobem para o formulário.
 */
export function NomesPoligonos({
  id,
  nomes,
  onChange,
  erro,
}: {
  id: string;
  nomes: string[];
  onChange: (nomes: string[]) => void;
  erro?: string;
}) {
  const [tipo, setTipo] = useState<Tipo>(() => {
    const primeiro = nomes.map((n) => separarNome(n)).find((p) => p !== null);
    return primeiro?.tipo ?? "Gleba";
  });

  const repetidos = nomesRepetidos(nomes);
  const foraDoPadrao = nomes.filter((n) => n.trim() && separarNome(n.trim()) === null);
  const mensagem =
    erro ?? (repetidos.size > 0 ? "Não repita nomes de polígono na mesma solicitação." : undefined);

  function trocarTipo(novo: Tipo) {
    setTipo(novo);
    onChange(
      nomes.map((n) => {
        const partes = separarNome(n.trim());
        return partes ? comporNome(novo, partes.complemento) : n;
      })
    );
  }

  function alterar(i: number, valor: string) {
    const complemento = valor.replace(/[^A-Za-z0-9-]/g, "").slice(0, LIMITE_COMPLEMENTO);
    const copia = [...nomes];
    copia[i] = comporNome(tipo, complemento);
    onChange(copia);
  }

  return (
    <fieldset aria-describedby={`${id}-dica`}>
      <legend className="text-sm font-bold text-gray-900">Nome de cada polígono *</legend>
      <div id={`${id}-dica`} className="mt-1 space-y-1 text-sm text-gray-700">
        <p>
          Escolha o tipo de nome e informe só o complemento de cada polígono: até{" "}
          {LIMITE_COMPLEMENTO} caracteres, com letras sem acento (sem ç), números ou “-”.
        </p>
        <p>Não repita nomes e não use nomes de municípios ou matrículas.</p>
        <p className="text-xs text-gray-600">
          Exemplos: Gleba A-1, Gleba A-2 · Parte 1, Parte 2 · Parcela 9, Parcela 13 · 1, 2, 3
        </p>
      </div>

      <div role="radiogroup" aria-label="Tipo de nome" className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {TIPOS.map((t) => (
          <label key={t.rotulo} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name={`${id}-tipo`}
              value={t.valor}
              checked={tipo === t.valor}
              onChange={() => trocarTipo(t.valor)}
              className="border-gray-300"
            />
            {t.rotulo}
          </label>
        ))}
      </div>

      {foraDoPadrao.length > 0 && (
        <p role="status" className="mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">
          Nome anterior fora do padrão ({foraDoPadrao.map((n) => `“${n}”`).join(", ")}): informe o
          tipo e o complemento de cada polígono.
        </p>
      )}

      <div className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-3">
        {nomes.map((nome, i) => {
          const partes = separarNome(nome.trim());
          const complemento = partes?.complemento ?? "";
          const duplicado = repetidos.has(nome.trim().toLowerCase()) && nome.trim() !== "";
          return (
            <div key={i}>
              <label htmlFor={`${id}-${i}`} className="block text-xs font-medium text-gray-700 mb-1">
                Polígono {i + 1}
              </label>
              <div className="flex items-center gap-2">
                {tipo && (
                  <span className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700">
                    {tipo}
                  </span>
                )}
                <input
                  id={`${id}-${i}`}
                  type="text"
                  maxLength={LIMITE_COMPLEMENTO}
                  autoComplete="off"
                  value={complemento}
                  placeholder="Ex.: A-1"
                  onChange={(e) => alterar(i, e.target.value)}
                  aria-describedby={`${id}-${i}-final`}
                  aria-invalid={duplicado || undefined}
                  className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <p id={`${id}-${i}-final`} className="mt-1 text-xs text-gray-600">
                Nome final: <strong className="font-semibold text-gray-900">{partes ? nome.trim() : "—"}</strong>
              </p>
            </div>
          );
        })}
      </div>

      {mensagem && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {mensagem}
        </p>
      )}
    </fieldset>
  );
}

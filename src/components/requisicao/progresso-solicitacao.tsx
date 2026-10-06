"use client";

import { useEffect, useRef, useState } from "react";

export interface EtapaProgresso {
  nome: string;
  feita: boolean;
}

/**
 * Evolução do preenchimento: barra por etapas no topo e, quando ela sai da tela, um
 * círculo com a porcentagem no canto inferior direito. O círculo some quando a barra
 * volta a aparecer e depois de 100%. Só a barra é um `progressbar` para leitores de
 * tela; o círculo repete a informação e fica oculto para eles.
 */
export function ProgressoSolicitacao({ etapas }: { etapas: EtapaProgresso[] }) {
  const barraRef = useRef<HTMLDivElement>(null);
  const [barraVisivel, setBarraVisivel] = useState(true);

  useEffect(() => {
    const el = barraRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(([entrada]) =>
      setBarraVisivel(entrada.isIntersecting)
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const total = etapas.length;
  const feitas = etapas.filter((e) => e.feita).length;
  const atual = Math.min(feitas + 1, total);
  const pct = Math.round((feitas / total) * 100);
  const texto = `Etapa ${atual} de ${total}: ${etapas[atual - 1].nome}, ${pct}% concluído`;

  const raio = 22;
  const circunferencia = 2 * Math.PI * raio;
  const mostrarCirculo = !barraVisivel && pct < 100;

  return (
    <>
      <div ref={barraRef} className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm font-semibold text-gray-900">
            Etapa {atual} de {total} · {etapas[atual - 1].nome}
          </p>
          <p className="text-xs text-gray-600">{pct}% concluído</p>
        </div>
        <div
          role="progressbar"
          aria-label="Progresso da solicitação"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={texto}
          className="h-2 overflow-hidden rounded-full bg-gray-200"
        >
          <div
            className="h-full bg-emerald-700 transition-all motion-reduce:transition-none"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
        <ol aria-hidden="true" className="mt-3 grid grid-cols-4 gap-1 text-[11px] sm:text-xs">
          {etapas.map((e, i) => (
            <li
              key={e.nome}
              className={
                e.feita
                  ? "font-medium text-emerald-800"
                  : i + 1 === atual
                    ? "font-semibold text-gray-900"
                    : "text-gray-600"
              }
            >
              {e.feita && "✓ "}
              {e.nome}
            </li>
          ))}
        </ol>
      </div>

      <div
        aria-hidden="true"
        className={`fixed bottom-4 right-4 z-40 transition-[opacity,transform,visibility] duration-300 ease-out motion-reduce:translate-y-0 motion-reduce:scale-100 ${
          mostrarCirculo
            ? "visible translate-y-0 scale-100 opacity-100"
            : "pointer-events-none invisible translate-y-3 scale-90 opacity-0"
        }`}
      >
        <div className="relative h-14 w-14 rounded-full bg-white shadow-lg ring-1 ring-gray-200">
          <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
            <circle cx="28" cy="28" r={raio} fill="none" stroke="#e5e7eb" strokeWidth="6" />
            <circle
              cx="28"
              cy="28"
              r={raio}
              fill="none"
              stroke="#047857"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circunferencia}
              strokeDashoffset={circunferencia * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-xs font-bold text-gray-900">
            {pct}%
          </span>
        </div>
      </div>
    </>
  );
}

"use client";

import { useRef, useState } from "react";

/** Texto institucional da CJT e avisos (documento de correções do cliente, item 1). */
function TextoCjt() {
  return (
    <>
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Certidão de Jurisdição Territorial (CJT)
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          A Certidão de Jurisdição Territorial é o documento oficial para fins de tributação em
          prefeituras e registro em cartório, em que se determina a jurisdição territorial a qual
          o imóvel ou propriedade pertence.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          Este documento não constitui prova de propriedade, posse, legitimidade do requerente,
          regularidade registral ou correspondência dominial entre o perímetro apresentado e o
          imóvel indicado.
        </p>
      </div>

      <section
        aria-labelledby="avisos-cjt"
        className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4"
      >
        <h3 id="avisos-cjt" className="text-sm font-semibold text-amber-900">
          Avisos
        </h3>
        <p className="mt-1 text-sm text-amber-900">
          Caso alguma das informações esteja em não conformidade, o processo não prosseguirá,
          atenção ao preenchimento das informações.
        </p>
        <p className="mt-3 text-sm text-amber-900">
          Recomendamos que tenha em mãos os seguintes documentos para auxiliar no preenchimento:
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-900">
          <li>Planta da propriedade;</li>
          <li>Relativo ao proprietário: Documento pessoal ou da empresa;</li>
          <li>Matrícula da área.</li>
        </ul>
      </section>
    </>
  );
}

/**
 * Introdução da Nova Requisição: mostra a CJT e os avisos antes do formulário. O
 * formulário (`children`) só aparece depois de "Iniciar solicitação"; a introdução
 * continua acessível, recolhida, para o solicitante reler sem perder o preenchimento.
 * Aparece sempre que a tela é aberta (decisão do time; sem persistência).
 */
export function IntroducaoCjt({ children }: { children: React.ReactNode }) {
  const [iniciou, setIniciou] = useState(false);
  const formularioRef = useRef<HTMLDivElement>(null);

  if (!iniciou) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <TextoCjt />
        </div>
        <button
          type="button"
          onClick={() => {
            setIniciou(true);
            // Espera o formulário entrar no DOM para levar o foco até ele.
            requestAnimationFrame(() => formularioRef.current?.focus());
          }}
          className="rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Iniciar solicitação
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <details className="group rounded-lg border border-gray-200 bg-white">
        <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-800">
          Sobre a CJT e avisos
          <span className="text-xs font-normal text-emerald-700">
            <span className="group-open:hidden">Ver</span>
            <span className="hidden group-open:inline">Ocultar</span>
          </span>
        </summary>
        <div className="px-4 pb-4">
          <TextoCjt />
        </div>
      </details>
      <p className="text-sm text-gray-600">
        Responda às perguntas abaixo: os campos exibidos mudam conforme o resultado pretendido
        e a situação atual do imóvel.
      </p>
      <div ref={formularioRef} tabIndex={-1} className="outline-none">
        {children}
      </div>
    </div>
  );
}

"use client";

import { useLayoutEffect, useRef } from "react";
import { somenteDigitos, type Mascara } from "@/lib/mascaras";

type PropsInput = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

/**
 * Campo de texto com máscara (CPF, CNPJ, telefone). O pai guarda o texto já formatado.
 * Ao editar no meio do texto, o cursor continua depois do mesmo algarismo.
 */
export function CampoMascarado({
  mascara,
  value,
  onValueChange,
  ...resto
}: PropsInput & {
  mascara: Mascara;
  value: string;
  onValueChange: (valor: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const cursor = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && cursor.current !== null && document.activeElement === el) {
      el.setSelectionRange(cursor.current, cursor.current);
    }
    cursor.current = null;
  });

  function alterar(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const antes = somenteDigitos(el.value.slice(0, el.selectionStart ?? el.value.length)).length;
    const novo = mascara(el.value);
    let posicao = 0;
    let vistos = 0;
    while (posicao < novo.length && vistos < antes) {
      if (/\d/.test(novo[posicao])) vistos++;
      posicao++;
    }
    cursor.current = posicao;
    onValueChange(novo);
  }

  return <input ref={ref} type="text" value={mascara(value)} onChange={alterar} {...resto} />;
}

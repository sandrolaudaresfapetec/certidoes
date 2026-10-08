/** Contagem do que uma execução da análise de duplicidade fez (sem dependências: serve à tela). */
export interface ResumoAnalise {
  analisadas: number;
  liberadas: number;
  comPergunta: number;
  comSobreposicao: number;
  semGeometria: number;
  jaAnalisadas: number;
  erros: number;
}

export function descreverResumo(r: Pick<ResumoAnalise, "analisadas" | "comPergunta" | "comSobreposicao" | "erros">): string {
  if (r.analisadas === 0 && r.erros === 0) return "nenhuma requisição aguardava análise";
  const partes = [`${r.analisadas} analisada${r.analisadas === 1 ? "" : "s"}`];
  if (r.comPergunta) partes.push(`${r.comPergunta} com pergunta ao solicitante`);
  if (r.comSobreposicao) partes.push(`${r.comSobreposicao} com sobreposição`);
  if (r.erros) partes.push(`${r.erros} com erro`);
  return partes.join(", ");
}

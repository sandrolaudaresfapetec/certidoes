/** Selo "N novas" das listas: mensagens do chat que ainda não foram lidas. */
export function SeloMensagensNovas({ quantidade }: { quantidade: number }) {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
      {quantidade} {quantidade === 1 ? "nova" : "novas"}
      <span className="sr-only"> {quantidade === 1 ? "mensagem" : "mensagens"} no chat</span>
    </span>
  );
}

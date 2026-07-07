const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "";
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || "";
const WHATSAPP_INSTANCE = process.env.WHATSAPP_INSTANCE || "";

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

interface WhatsAppMessage {
  to: string;
  text: string;
}

interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsApp(
  msg: WhatsAppMessage
): Promise<WhatsAppResult> {
  const phone = formatPhone(msg.to);

  if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN) {
    console.log(
      `[WhatsApp] Servico nao configurado. Mensagem para ${phone}: ${msg.text}`
    );
    return { success: false, error: "WhatsApp nao configurado" };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/message/sendText/${WHATSAPP_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: WHATSAPP_API_TOKEN,
        },
        body: JSON.stringify({
          number: phone,
          text: msg.text,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[WhatsApp] Erro HTTP ${response.status}: ${errorBody}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.key?.id || data.messageId || "sent",
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] Erro ao enviar: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

export function buildTransitionMessage(params: {
  processOrdem: number;
  expediente: string | null;
  interessado: string;
  fromStage: string;
  toStage: string;
  assignedUserName?: string;
}): string {
  const processRef = params.expediente
    ? `#${params.processOrdem} (${params.expediente})`
    : `#${params.processOrdem}`;

  const stageLabels: Record<string, string> = {
    entrada_sdtc: "Entrada SDTC",
    distribuicao_gdat: "Distribuicao GDAT",
    analise_tecnica: "Analise Tecnica",
    conferencia: "Conferencia",
    assinatura_tecnico: "Assinatura Tecnico",
    assinatura_gerente: "Assinatura Gerente",
    assinatura_diretor: "Assinatura Diretor",
    upload_sei: "Upload SEI",
    finalizado: "Finalizado",
    sobrestado: "Sobrestado",
    cancelado: "Cancelado",
  };

  const from = stageLabels[params.fromStage] || params.fromStage;
  const to = stageLabels[params.toStage] || params.toStage;

  let msg = `*IGC SP - Sistema de Certidoes*\n\n`;
  msg += `Processo ${processRef}\n`;
  msg += `Interessado: ${params.interessado}\n\n`;
  msg += `Etapa: ${from} → ${to}\n`;

  if (params.assignedUserName) {
    msg += `Atribuido a: ${params.assignedUserName}\n`;
  }

  msg += `\nAcesse: ${process.env.NEXT_PUBLIC_APP_URL || "https://certidoes.fly.dev"}/processos`;

  return msg;
}

export async function notifyUsersOnTransition(params: {
  userIds: string[];
  processOrdem: number;
  expediente: string | null;
  interessado: string;
  fromStage: string;
  toStage: string;
  assignedUserName?: string;
  prisma: {
    user: {
      findMany: (args: {
        where: { id: { in: string[] }; phone: { not: null }; active: boolean };
        select: { id: boolean; phone: boolean; name: boolean };
      }) => Promise<Array<{ id: string; phone: string | null; name: string }>>;
    };
  };
}): Promise<{ sent: number; failed: number }> {
  const { prisma, userIds, ...msgParams } = params;

  if (userIds.length === 0) return { sent: 0, failed: 0 };

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, phone: { not: null }, active: true },
    select: { id: true, phone: true, name: true },
  });

  const message = buildTransitionMessage(msgParams);
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.phone) continue;
    const result = await sendWhatsApp({ to: user.phone, text: message });
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

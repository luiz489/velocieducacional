// Regra de fechamento do boletim bimestral — um lugar só.
//
// A view v_boletim_bimestral de propósito NÃO calcula nada disso: ela pivota as notas
// por bimestre e a frequência da chamada. Se a conta existisse em SQL e em TS, as duas
// cópias divergiriam na primeira mudança de regra.
//
// Como fecha:
//   média do semestre  = (B1 + B2) / 2        -> só quando os dois bimestres têm nota
//   resultado          = recuperação substitui a média quando é maior
//   média final        = (resultado 1º sem + resultado 2º sem) / 2
//   situação           >= 7 Aprovado · >= 5 Recuperação · < 5 Reprovado · incompleto Cursando
//
// Frequência NÃO entra na situação: o percentual aparece do lado, com seu próprio alerta
// abaixo de 75%, mas não reprova ninguém automaticamente.

export type SituacaoBoletim = "Aprovado" | "Recuperação" | "Reprovado" | "Cursando";

export interface NotasBimestrais {
  nota_b1: number | null;
  nota_b2: number | null;
  nota_b3: number | null;
  nota_b4: number | null;
  recuperacao_1sem: number | null;
  recuperacao_2sem: number | null;
}

export interface FechamentoBoletim {
  media_1sem: number | null;
  media_2sem: number | null;
  resultado_1sem: number | null;
  resultado_2sem: number | null;
  media_final: number | null;
  situacao: SituacaoBoletim;
}

const arredondar = (n: number) => Math.round(n * 100) / 100;

function mediaDoSemestre(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return arredondar((a + b) / 2);
}

function resultadoDoSemestre(media: number | null, recuperacao: number | null): number | null {
  if (media === null) return null;
  if (recuperacao === null) return media;
  return Math.max(media, recuperacao);
}

export function fecharBoletim(n: NotasBimestrais): FechamentoBoletim {
  const media_1sem = mediaDoSemestre(n.nota_b1, n.nota_b2);
  const media_2sem = mediaDoSemestre(n.nota_b3, n.nota_b4);
  const resultado_1sem = resultadoDoSemestre(media_1sem, n.recuperacao_1sem);
  const resultado_2sem = resultadoDoSemestre(media_2sem, n.recuperacao_2sem);

  const media_final =
    resultado_1sem !== null && resultado_2sem !== null
      ? arredondar((resultado_1sem + resultado_2sem) / 2)
      : null;

  let situacao: SituacaoBoletim = "Cursando";
  if (media_final !== null) {
    situacao = media_final >= 7 ? "Aprovado" : media_final >= 5 ? "Recuperação" : "Reprovado";
  }

  return { media_1sem, media_2sem, resultado_1sem, resultado_2sem, media_final, situacao };
}

/** Disciplina avaliada por conceito não tem média nem situação calculada. */
export const avaliaPorConceito = (tipo: string | null | undefined) => tipo === "conceito";

export const BIMESTRES = [1, 2, 3, 4] as const;
export type Bimestre = (typeof BIMESTRES)[number];
export const rotuloBimestre = (b: number) => `${b}º bim`;

export interface PeriodoLetivo {
  bimestre: number;
  data_inicio: string;
  data_fim: string;
}

/** Em que bimestre cai uma data (yyyy-mm-dd), segundo os períodos configurados. */
export function bimestreDaData(periodos: PeriodoLetivo[] | undefined, dataISO: string): number | null {
  const p = (periodos ?? []).find((x) => dataISO >= x.data_inicio && dataISO <= x.data_fim);
  return p ? p.bimestre : null;
}

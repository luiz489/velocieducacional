export type DadosContratoSaas = {
  numero_contrato: string | null;
  razao_social_contratante: string;
  cnpj_contratante: string | null;
  endereco_contratante: string | null;
  cidade_contratante: string | null;
  uf_contratante: string | null;
  responsavel_nome: string | null;
  valor_implantacao: number;
  parcelas_implantacao: number;
  valor_mensal: number;
  dia_vencimento: number;
  data_inicio: string;
  plano_nome: string | null;
};

export type DadosPlataforma = {
  nome_empresa: string;
  razao_social: string | null;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
};

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function fmtData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Gera o texto completo (HTML) do Contrato de Utilização do Veloci Educacional,
 * no padrão de contrato de empresa de desenvolvimento de software (SaaS B2B):
 * licença de uso, implantação parcelada, mensalidade, SLA detalhado com
 * níveis de severidade, disponibilidade garantida, backup/continuidade de
 * negócio, segurança da informação, atualizações/versionamento, propriedade
 * intelectual, limitação de responsabilidade, LGPD, confidencialidade,
 * não aliciamento de equipe, vigência/rescisão e foro.
 */
export function gerarContratoSaas(dados: DadosContratoSaas, plataforma: DadosPlataforma): string {
  const parcelaImplantacao = dados.parcelas_implantacao > 0
    ? dados.valor_implantacao / dados.parcelas_implantacao
    : dados.valor_implantacao;

  return `
<div style="font-family:Arial, sans-serif; font-size:12px; max-width:800px; margin:auto; line-height:1.5;">

<p style="text-align:center"><strong>${plataforma.nome_empresa}</strong>${plataforma.razao_social ? `<br>${plataforma.razao_social}` : ""}<br>
${plataforma.cnpj ? `CNPJ n.º ${plataforma.cnpj}<br>` : ""}
${plataforma.endereco ? `${plataforma.endereco} - ${plataforma.cidade ?? ""}/${plataforma.uf ?? ""}<br>` : ""}
${plataforma.telefone ? `Telefone: ${plataforma.telefone}` : ""}${plataforma.email ? ` — E-mail: ${plataforma.email}` : ""}</p>

<p style="text-align:center; margin-top:16px"><strong>CONTRATO DE LICENÇA DE USO DE SOFTWARE E PRESTAÇÃO DE SERVIÇOS SAAS,<br>
COM ACORDO DE NÍVEL DE SERVIÇO (SLA)</strong><br>
${dados.numero_contrato ? `Nº ${dados.numero_contrato}` : ""}</p>

<table style="width:100%; border-collapse:collapse; margin-top:12px;">
  <tr><td colspan="2" style="background:#e8e8e8; padding:4px; border:1px solid #999; text-align:center;"><strong>QUALIFICAÇÃO DAS PARTES</strong></td></tr>
  <tr>
    <td style="border:1px solid #999; padding:6px; width:50%; vertical-align:top;">
      <strong>CONTRATADA:</strong><br>
      ${plataforma.nome_empresa}${plataforma.razao_social ? ` (${plataforma.razao_social})` : ""},
      pessoa jurídica de direito privado, desenvolvedora e provedora da solução de software,
      inscrita no CNPJ sob o n.º ${plataforma.cnpj ?? "___________________"},
      com sede em ${plataforma.endereco ?? "___________________"},
      ${plataforma.cidade ?? "___________"}/${plataforma.uf ?? "__"}.
    </td>
    <td style="border:1px solid #999; padding:6px; vertical-align:top;">
      <strong>CONTRATANTE:</strong><br>
      ${dados.razao_social_contratante}, inscrita no CNPJ sob o n.º ${dados.cnpj_contratante ?? "___________________"},
      com sede em ${dados.endereco_contratante ?? "___________________"},
      ${dados.cidade_contratante ?? "___________"}/${dados.uf_contratante ?? "__"},
      neste ato representada por ${dados.responsavel_nome ?? "___________________"}.
    </td>
  </tr>
</table>

<p style="margin-top:14px">As partes acima qualificadas têm entre si justo e acordado o presente Contrato de Licença de Uso de
Software e Prestação de Serviços na modalidade SaaS (Software as a Service), incluindo Acordo de Nível de
Serviço (SLA), referente à plataforma <strong>${plataforma.nome_empresa}</strong>, que se regerá pelas cláusulas seguintes.</p>

<p><strong>CLÁUSULA 1ª — DO OBJETO</strong></p>
<p>O presente contrato tem por objeto a concessão, pela CONTRATADA à CONTRATANTE, de licença não exclusiva,
intransferível e por prazo determinado de uso do software de gestão escolar ${plataforma.nome_empresa} (ERP Escolar),
desenvolvido e mantido pela CONTRATADA, disponibilizado na modalidade SaaS (Software as a Service), acessível
via internet, incluindo os módulos e funcionalidades correspondentes ao plano contratado${dados.plano_nome ? ` (<strong>${dados.plano_nome}</strong>)` : ""},
bem como a prestação dos serviços de hospedagem, manutenção, suporte técnico e evolução da plataforma, nos
termos do Acordo de Nível de Serviço (SLA) estabelecido na Cláusula 6ª.</p>
<p><strong>Parágrafo Único.</strong> A licença de uso não implica em cessão, transferência ou venda do software, do
código-fonte ou de qualquer direito de propriedade intelectual sobre a plataforma, permanecendo estes de
titularidade exclusiva da CONTRATADA, nos termos da Lei nº 9.609/98 (Lei do Software).</p>

<p><strong>CLÁUSULA 2ª — DA IMPLANTAÇÃO</strong></p>
<p>Pela implantação do sistema (configuração inicial, migração de dados, treinamento e disponibilização de acesso),
a CONTRATANTE pagará à CONTRATADA o valor de <strong>R$ ${fmtMoeda(dados.valor_implantacao)}</strong>,
${dados.parcelas_implantacao > 1
    ? `podendo ser parcelado em <strong>${dados.parcelas_implantacao}x de R$ ${fmtMoeda(parcelaImplantacao)}</strong>, mensais e consecutivas.`
    : `pago em parcela única.`}</p>
<p><strong>Parágrafo Único.</strong> A não quitação de qualquer parcela do valor de implantação até a data de
vencimento sujeitará a CONTRATANTE à suspensão do acesso à plataforma, sem prejuízo da cobrança do débito.</p>

<p><strong>CLÁUSULA 3ª — DA MENSALIDADE (SAAS)</strong></p>
<p>Pela licença de uso e prestação contínua dos serviços SaaS, a CONTRATANTE pagará à CONTRATADA o valor
mensal de <strong>R$ ${fmtMoeda(dados.valor_mensal)}</strong>, com vencimento todo dia
<strong>${dados.dia_vencimento}</strong> de cada mês, a partir de ${fmtData(dados.data_inicio)}.</p>
<p><strong>Parágrafo 1º.</strong> O valor mensal poderá ser reajustado anualmente, a cada aniversário deste contrato,
com base na variação acumulada do IGP-M (FGV) ou índice que vier a substituí-lo, ou por negociação entre as partes.</p>
<p><strong>Parágrafo 2º.</strong> O atraso no pagamento da mensalidade sujeitará a CONTRATANTE à multa de 2% (dois
por cento) sobre o valor em atraso, acrescida de juros de mora de 1% (um por cento) ao mês, além de correção
monetária, sem prejuízo da suspensão do acesso à plataforma após 15 (quinze) dias corridos de inadimplência.</p>

<p><strong>CLÁUSULA 4ª — DA FORMA DE PAGAMENTO</strong></p>
<p>Os pagamentos serão realizados por boleto bancário, Pix ou outro meio eletrônico disponibilizado pela
CONTRATADA, não eximindo a CONTRATANTE do pagamento em caso de não recebimento do respectivo instrumento
de cobrança.</p>

<p><strong>CLÁUSULA 5ª — DA IMPLANTAÇÃO E ONBOARDING</strong></p>
<p>A CONTRATADA disponibilizará à CONTRATANTE um processo estruturado de onboarding, incluindo treinamento
inicial da equipe da CONTRATANTE para uso da plataforma, migração assistida dos dados existentes (quando
aplicável) e acompanhamento durante o período inicial de adoção, conforme cronograma acordado entre as partes.</p>

<p><strong>CLÁUSULA 6ª — DO ACORDO DE NÍVEL DE SERVIÇO (SLA)</strong></p>
<p><strong>6.1. Disponibilidade.</strong> A CONTRATADA garante disponibilidade mensal da plataforma de
<strong>99,5% (noventa e nove vírgula cinco por cento)</strong>, calculada sobre o total de horas do mês, excluídas as
janelas de manutenção programada previamente comunicadas com, no mínimo, 48 (quarenta e oito) horas de
antecedência, e eventos de força maior, caso fortuito ou falhas de terceiros (provedores de infraestrutura em
nuvem, conectividade à internet do lado da CONTRATANTE, ataques de negação de serviço de origem externa).</p>
<p><strong>6.2. Créditos por descumprimento.</strong> Caso a disponibilidade mensal efetiva fique abaixo do garantido no
item 6.1, a CONTRATANTE fará jus a créditos na mensalidade seguinte, conforme a tabela abaixo:</p>
<table style="width:100%; border-collapse:collapse; margin:8px 0;">
  <tr>
    <td style="border:1px solid #999; padding:4px; background:#f0f0f0;"><strong>Disponibilidade Mensal</strong></td>
    <td style="border:1px solid #999; padding:4px; background:#f0f0f0;"><strong>Crédito na Mensalidade Seguinte</strong></td>
  </tr>
  <tr><td style="border:1px solid #999; padding:4px;">Entre 99,0% e 99,49%</td><td style="border:1px solid #999; padding:4px;">5%</td></tr>
  <tr><td style="border:1px solid #999; padding:4px;">Entre 97,0% e 98,99%</td><td style="border:1px solid #999; padding:4px;">10%</td></tr>
  <tr><td style="border:1px solid #999; padding:4px;">Abaixo de 97,0%</td><td style="border:1px solid #999; padding:4px;">20%</td></tr>
</table>
<p><strong>6.3. Níveis de severidade de chamados.</strong> Os chamados de suporte técnico abertos pela CONTRATANTE
serão classificados e atendidos conforme os prazos de primeira resposta e meta de resolução abaixo:</p>
<table style="width:100%; border-collapse:collapse; margin:8px 0;">
  <tr>
    <td style="border:1px solid #999; padding:4px; background:#f0f0f0;"><strong>Severidade</strong></td>
    <td style="border:1px solid #999; padding:4px; background:#f0f0f0;"><strong>Descrição</strong></td>
    <td style="border:1px solid #999; padding:4px; background:#f0f0f0;"><strong>1ª Resposta</strong></td>
    <td style="border:1px solid #999; padding:4px; background:#f0f0f0;"><strong>Meta de Resolução</strong></td>
  </tr>
  <tr>
    <td style="border:1px solid #999; padding:4px;"><strong>Crítica (S1)</strong></td>
    <td style="border:1px solid #999; padding:4px;">Sistema totalmente indisponível ou indisponibilidade de função essencial (ex: matrícula, financeiro) sem contorno possível.</td>
    <td style="border:1px solid #999; padding:4px;">Até 2 horas úteis</td>
    <td style="border:1px solid #999; padding:4px;">Até 8 horas úteis</td>
  </tr>
  <tr>
    <td style="border:1px solid #999; padding:4px;"><strong>Alta (S2)</strong></td>
    <td style="border:1px solid #999; padding:4px;">Função relevante operando com erro, mas com contorno (workaround) disponível.</td>
    <td style="border:1px solid #999; padding:4px;">Até 4 horas úteis</td>
    <td style="border:1px solid #999; padding:4px;">Até 24 horas úteis</td>
  </tr>
  <tr>
    <td style="border:1px solid #999; padding:4px;"><strong>Média (S3)</strong></td>
    <td style="border:1px solid #999; padding:4px;">Erro pontual sem impacto relevante na operação, ou dúvida de utilização.</td>
    <td style="border:1px solid #999; padding:4px;">Até 1 dia útil</td>
    <td style="border:1px solid #999; padding:4px;">Até 5 dias úteis</td>
  </tr>
  <tr>
    <td style="border:1px solid #999; padding:4px;"><strong>Baixa (S4)</strong></td>
    <td style="border:1px solid #999; padding:4px;">Solicitação de melhoria, sugestão ou ajuste estético/cosmético.</td>
    <td style="border:1px solid #999; padding:4px;">Até 2 dias úteis</td>
    <td style="border:1px solid #999; padding:4px;">Conforme roadmap</td>
  </tr>
</table>
<p><strong>6.4. Horário de atendimento.</strong> O suporte técnico é prestado em horário comercial (dias úteis, das 8h às
18h, horário de Brasília), pelos canais disponibilizados pela CONTRATADA (chat, e-mail e/ou telefone). Chamados
de severidade Crítica (S1) abertos fora do horário comercial serão atendidos no início do próximo dia útil, salvo
acordo específico de plantão entre as partes.</p>
<p><strong>6.5. Exclusões do SLA.</strong> Não estão cobertos pelo SLA: lentidão ou indisponibilidade decorrente da
conexão de internet ou infraestrutura da própria CONTRATANTE; uso da plataforma em desacordo com sua
finalidade; integrações de terceiros não homologadas pela CONTRATADA; e desenvolvimento de funcionalidades
personalizadas fora do escopo padrão do plano contratado, que poderá ser objeto de orçamento à parte.</p>

<p><strong>CLÁUSULA 7ª — DE BACKUP E CONTINUIDADE DE NEGÓCIO</strong></p>
<p>A CONTRATADA realiza rotinas automatizadas de backup dos dados da CONTRATANTE, com periodicidade mínima
diária, mantendo cópias de segurança por período mínimo de 30 (trinta) dias, com Ponto de Recuperação Objetivo
(RPO) de até 24 (vinte e quatro) horas e Tempo de Recuperação Objetivo (RTO) de até 24 (vinte e quatro) horas,
em caso de incidente que demande restauração.</p>

<p><strong>CLÁUSULA 8ª — DA SEGURANÇA DA INFORMAÇÃO</strong></p>
<p>A CONTRATADA adota práticas de segurança da informação compatíveis com o mercado, incluindo, sem
se limitar a: criptografia de dados em trânsito (HTTPS/TLS); controle de acesso por usuário, papel e
permissão; isolamento lógico dos dados entre diferentes clientes (multi-tenant); e monitoramento de
disponibilidade e segurança da infraestrutura.</p>
<p><strong>Parágrafo Único.</strong> A CONTRATANTE é responsável pela guarda e uso adequado das credenciais de
acesso de seus usuários, respondendo por qualquer dano decorrente de uso indevido, compartilhamento ou
extravio de senhas por parte de seus colaboradores.</p>

<p><strong>CLÁUSULA 9ª — DAS ATUALIZAÇÕES E EVOLUÇÃO DA PLATAFORMA</strong></p>
<p>A CONTRATADA poderá, a seu critério, lançar atualizações, correções e novas funcionalidades na plataforma,
sem custo adicional para a CONTRATANTE, desde que compreendidas no escopo do plano contratado. A CONTRATADA
não garante a implementação de funcionalidades específicas solicitadas pela CONTRATANTE, ficando estas sujeitas
à avaliação de viabilidade e ao roadmap de produto da CONTRATADA.</p>
<p><strong>Parágrafo Único.</strong> Alterações que impliquem em mudanças relevantes de funcionamento serão
comunicadas à CONTRATANTE com antecedência razoável, sempre que possível.</p>

<p><strong>CLÁUSULA 10ª — DA PROPRIEDADE INTELECTUAL</strong></p>
<p>Todos os direitos de propriedade intelectual sobre o software, seu código-fonte, algoritmos, layout, marca,
documentação e demais elementos que o compõem pertencem exclusivamente à CONTRATADA, sendo vedada à
CONTRATANTE qualquer forma de engenharia reversa, descompilação, cópia, distribuição ou sublicenciamento da
plataforma, ainda que parcial.</p>

<p><strong>CLÁUSULA 11ª — DA LIMITAÇÃO DE RESPONSABILIDADE</strong></p>
<p>A responsabilidade civil da CONTRATADA por danos diretos comprovadamente causados à CONTRATANTE em
decorrência da prestação dos serviços fica limitada ao valor total pago pela CONTRATANTE nos últimos 12 (doze)
meses anteriores ao evento gerador do dano.</p>
<p><strong>Parágrafo Único.</strong> Em nenhuma hipótese a CONTRATADA responderá por lucros cessantes, danos
indiretos, incidentais ou consequenciais, decorrentes do uso ou da impossibilidade de uso da plataforma.</p>

<p><strong>CLÁUSULA 12ª — DA PROTEÇÃO DE DADOS (LGPD)</strong></p>
<p>Para os fins da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD), a CONTRATANTE figura
como <strong>Controladora</strong> dos dados pessoais de seus alunos, responsáveis e colaboradores, e a CONTRATADA
figura como <strong>Operadora</strong>, processando tais dados exclusivamente conforme as instruções da CONTRATANTE
e para a finalidade de prestação dos serviços objeto deste contrato.</p>
<p><strong>Parágrafo 1º.</strong> A CONTRATADA se compromete a adotar medidas técnicas e administrativas aptas a
proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda,
alteração, comunicação ou difusão, comunicando a CONTRATANTE em prazo razoável em caso de incidente de
segurança que possa acarretar risco relevante aos titulares dos dados.</p>
<p><strong>Parágrafo 2º.</strong> Em caso de encerramento deste contrato, a CONTRATADA disponibilizará à CONTRATANTE,
mediante solicitação formal, a exportação dos dados armazenados na plataforma, em formato estruturado, no prazo
de até 30 (trinta) dias, sendo os dados eliminados dos servidores da CONTRATADA após esse prazo, ressalvadas as
hipóteses de guarda obrigatória previstas em lei.</p>
<p><strong>Parágrafo 3º.</strong> É de responsabilidade exclusiva da CONTRATANTE a licitude da coleta e do tratamento
dos dados pessoais inseridos na plataforma, bem como a obtenção do consentimento ou base legal aplicável junto
aos titulares (alunos, responsáveis e colaboradores).</p>

<p><strong>CLÁUSULA 13ª — DA CONFIDENCIALIDADE</strong></p>
<p>As partes se comprometem a manter sigilo sobre todas as informações confidenciais a que tiverem acesso em
razão deste contrato, obrigação que perdurará mesmo após o seu término, por prazo de 5 (cinco) anos.</p>

<p><strong>CLÁUSULA 14ª — DO NÃO ALICIAMENTO DE COLABORADORES</strong></p>
<p>As partes se comprometem a não contratar, direta ou indiretamente, colaboradores ou prestadores de serviço
da outra parte que tenham atuado na execução deste contrato, durante sua vigência e pelo período de 12 (doze)
meses após seu término, salvo consentimento prévio e por escrito da parte afetada.</p>

<p><strong>CLÁUSULA 15ª — DA VIGÊNCIA E RESCISÃO</strong></p>
<p>O presente contrato vigorará por prazo indeterminado a partir da data de sua assinatura, podendo ser rescindido
por qualquer das partes, mediante aviso prévio por escrito com antecedência mínima de 30 (trinta) dias.</p>
<p><strong>Parágrafo 1º.</strong> A CONTRATADA poderá rescindir o presente contrato de forma imediata, independentemente
de aviso prévio, em caso de inadimplência da CONTRATANTE superior a 30 (trinta) dias, ou uso indevido da
plataforma que viole a legislação vigente ou os termos deste contrato.</p>
<p><strong>Parágrafo 2º.</strong> O valor de implantação, uma vez pago, não é passível de restituição, salvo acordo em
contrário entre as partes.</p>

<p><strong>CLÁUSULA 16ª — DAS DISPOSIÇÕES GERAIS</strong></p>
<p>O presente contrato obriga as partes e seus sucessores a qualquer título. A tolerância de uma parte para com a
outra, quanto ao descumprimento de qualquer obrigação aqui prevista, não constituirá novação ou renúncia a
direito, podendo a parte tolerante exigir o cumprimento da obrigação a qualquer tempo.</p>

<p><strong>CLÁUSULA 17ª — DO FORO</strong></p>
<p>Fica eleito o foro da Comarca de ${plataforma.cidade ?? "___________"}/${plataforma.uf ?? "__"} para dirimir quaisquer
dúvidas ou controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais
privilegiado que seja.</p>

<p>E, por estarem assim justas e contratadas, as partes firmam o presente instrumento, em duas vias de igual teor,
na presença de duas testemunhas.</p>

<p style="margin-top:20px">${plataforma.cidade ?? ""}, ${fmtData(dados.data_inicio)}.</p>

<div style="display:flex; justify-content:space-between; margin-top:50px;">
  <div style="text-align:center; width:45%;">_______________________________________<br>${plataforma.nome_empresa}<br>CONTRATADA</div>
  <div style="text-align:center; width:45%;">_______________________________________<br>${dados.razao_social_contratante}<br>CONTRATANTE</div>
</div>

<div style="display:flex; justify-content:space-between; margin-top:40px;">
  <div style="text-align:center; width:45%;">_______________________________________<br>Testemunha 1</div>
  <div style="text-align:center; width:45%;">_______________________________________<br>Testemunha 2</div>
</div>

</div>`;
}

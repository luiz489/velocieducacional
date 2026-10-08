-- Fecha o ajuste das declarações:
--
--   * A Declaração de Matrícula (que já tinha ganhado o cabeçalho na migration
--     20261008120000) ainda usava os campos crus de naturalidade e série.
--   * Nas outras 7, a naturalidade nunca era "escondível" em Configurações →
--     Parâmetros → Campos da Matrícula, porque faltava o bloco <!--CAMPO:...-->
--     que gerar_documento() usa para remover o trecho. Agora têm, como a de
--     matrícula: a escola que opta por não coletar naturalidade não vê o trecho.

UPDATE public.document_templates
   SET corpo_html = replace(
         replace(corpo_html,
           '<!--CAMPO:naturalidade-->, natural de {{aluno.naturalidade_cidade}} - {{aluno.naturalidade_uf}}<!--/CAMPO-->',
           '<!--CAMPO:naturalidade-->{{automatico.naturalidade_frase}}<!--/CAMPO-->'),
         '{{aluno.serie}} {{aluno.ensino_padrao}}', '{{automatico.serie_ensino}}')
 WHERE id = '78bc0297-6048-44cb-90a1-801f68defeac';

UPDATE public.document_templates
   SET corpo_html = replace(corpo_html,
         '{{automatico.naturalidade_frase}}',
         '<!--CAMPO:naturalidade-->{{automatico.naturalidade_frase}}<!--/CAMPO-->')
 WHERE id IN ('ef88d6e3-a04c-4108-acc1-e56f1180a8c1',
              'd9b22c1f-eba9-4888-bed4-f2ec0fc8ebf0',
              '2b41a05c-8144-4da2-8410-7f01cfdddcde',
              'c49ea362-f74b-45d4-9e1a-1a7d11ed4642',
              '61ad20c8-ffa5-487c-bdea-78874a37cff6',
              '9b5d7729-c5cc-403e-94ed-cc826cd3fc7d',
              '6ec87d38-c12f-4fed-b6c3-cbe68ccfffe9')
   AND corpo_html NOT LIKE '%<!--CAMPO:naturalidade-->%';

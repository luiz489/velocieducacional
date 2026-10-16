# Fluxo n8n: Prospecção de escolas (Veloci Educacional)

Arquivo: `prospeccao-escolas.json` — importar no n8n da VPS.

## O que o fluxo faz

1. Todo dia às 9h, lê a planilha de leads no Google Sheets.
2. Para cada escola, decide se é hora de enviar o próximo e-mail da sequência (4 e-mails, intervalo de 2 dias entre eles).
3. Se for o **1º e-mail**, baixa o PDF da apresentação de uma URL pública e anexa ao e-mail. Do 2º ao 4º, envia sem anexo.
4. Envia o e-mail via SMTP (credencial separada, só para prospecção — não usa o SMTP transacional do Educacional nem o do Tennis).
5. Atualiza a planilha com o novo status e a data do envio.
6. Para automaticamente quando `numero_envios` chega a 4, ou quando alguém marcar a linha como `respondeu` ou `parar`.

Não há leitura automática de resposta — quem acompanha a caixa de entrada marca manualmente na planilha.

## Planilha (Google Sheets)

Crie uma aba chamada **Leads** com estas colunas (cabeçalho na linha 1, nos nomes exatos):

| coluna | exemplo | obrigatório |
|---|---|---|
| `escola` | Colégio Exemplo | sim |
| `email` | contato@colegioexemplo.com.br | sim |
| `contato` | Maria | não (usado na saudação) |
| `status` | (vazio) | sim — deixar vazio para novos leads |
| `numero_envios` | 0 | sim — começar com `0` |
| `data_ultimo_envio` | (vazio) | não — o fluxo preenche |
| `observacoes` | | não |

Valores possíveis de `status` ao longo do processo: vazio → `enviado` → ... → `finalizado` (após o 4º e-mail), ou `respondeu` / `parar` marcados manualmente para interromper a sequência daquela linha.

## Antes de importar

1. Crie a planilha com a aba `Leads` e as colunas acima, pegue o ID (parte da URL entre `/d/` e `/edit`).
2. No `prospeccao-escolas.json`, troque `COLOQUE_O_ID_DA_PLANILHA_AQUI` (aparece 2x) pelo ID real.
3. Ajuste `fromEmail` nos dois nodes de envio ("Enviar e-mail (com anexo)" e "Enviar e-mail (sem anexo)") para o remetente real.
4. Suba o PDF da apresentação num link público (ex: bucket público do Supabase Storage, ou uma página do site) e troque a `url` no node "Baixar PDF da apresentação" pelo link real. O link precisa responder diretamente com o PDF (sem exigir login).

## Depois de importar no n8n

1. **Credenciais**: crie/selecione no node "Ler planilha de leads" e "Atualizar status na planilha" a credencial Google Sheets OAuth2, e nos dois nodes de envio de e-mail a credencial SMTP — use um SMTP **separado** dos já existentes (Tennis e Educacional transacional), já que é envio frio em volume. Ver `[[n8n-credencial-smtp-separada]]`.
2. **Ativar o workflow**: a importação deixa o fluxo inativo. É preciso ativar (`active: true`) e **reiniciar o n8n** — import sem restart engana e o webhook/schedule não sobe de fato. Ver `[[n8n-import-desativa-workflow]]`.
3. Rode uma vez manualmente com 1-2 linhas de teste antes de liberar pra planilha cheia.

## Ajustes fáceis de fazer depois

- Texto dos 4 e-mails: estão no node "Decidir próximo e-mail" (Code), objeto `templates`. São rascunhos — vale revisar o tom antes do primeiro disparo real.
- Intervalo entre e-mails: constante `INTERVALO_DIAS` (hoje 2).
- Quantidade de e-mails na sequência: constante `TOTAL_EMAILS` (hoje 4) — se mudar, adicionar/remover entradas em `templates`.
- Horário do disparo: node "Disparo diário 9h".

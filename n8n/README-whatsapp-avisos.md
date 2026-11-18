# Fluxo n8n: Avisos por WhatsApp (DM Núcleo)

Arquivo: `whatsapp-avisos-edu.json` — importar no n8n da VPS.

## O que o fluxo faz

Recebe pedidos do Edge Function `avisos-whatsapp` (Supabase) em `POST /webhook/whatsapp-avisos-edu` e fala com o WAHA (`http://waha:3000`, rede interna da VPS) pra cada ação:

- `status` / `qr` — consulta o status da sessão ou busca o QR code atual, responde na hora.
- `conectar` — inicia a sessão se estiver `STOPPED`, reinicia se estiver `FAILED`.
- `desconectar` — faz logout e já religa a sessão (pra um QR novo aparecer sem travar).
- `enviar` — **responde já** (`{"ok":true}`) pra não travar o Edge Function, e só depois, em background, percorre a lista de destinatários mandando cada mensagem via `POST /api/sendText` do WAHA (com 5s de espera entre uma e outra) e avisando o resultado de cada uma pro Edge Function `avisos-whatsapp-callback`.

## Antes de importar

1. **Credencial do WAHA**: crie em Credentials → New → **Header Auth**, nome `WAHA API Key`, Header Name `X-Api-Key`, Value = a `WAHA_API_KEY` que você já usa no Tennis/outros fluxos.
2. **Variável do segredo compartilhado**: em Settings → Variables, crie `AUTOMACAO_SECRET` com o **mesmo valor** que você já usa no fluxo de e-mail do boleto (onde hoje confere o `x-email-secret`) — os dois fluxos passam a citar a mesma variável em vez de ter o valor colado em dois lugares. Ver `[[n8n-credencial-smtp-separada]]` sobre não misturar credenciais de fluxos diferentes.

## Depois de importar no n8n

1. **Credenciais**: nos 8 nodes de HTTP Request que chamam o WAHA (todos com "WAHA" ou "sessão"/"QR" no nome), selecione a credencial `WAHA API Key` criada acima — ela entra como `REPLACE_ME_WAHA_CRED` no JSON e precisa ser trocada pela credencial real.
2. **Ativar o workflow**: a importação deixa o fluxo inativo. É preciso ativar (`active: true`) e **reiniciar o n8n** — import sem restart engana e o webhook não sobe de fato. Ver `[[n8n-import-desativa-workflow]]`.
3. **Testar**: manda um `POST` de teste pro webhook com `{"acao":"status","sessao":"edu-0101"}` (sem o header certo deve voltar 401; com o header certo, deve voltar o status da sessão — `STOPPED` se a sessão ainda não existir no WAHA).
4. Depois disso, a tela "Avisos por WhatsApp" (`/avisos-whatsapp`) já consegue conectar e mandar.

## Pontos de atenção

- **Rede**: o node de HTTP Request assume que o n8n alcança o WAHA pelo nome `waha` (`http://waha:3000`) — só funciona se os dois containers estiverem na mesma rede docker-compose da VPS. Se o n8n não resolver esse nome, confira com `docker network inspect` qual é o nome real do serviço/rede.
- **`sendText` do WAHA**: o endpoint e o formato do corpo (`session`, `chatId`, `text`) seguem a API padrão do WAHA; se a versão instalada usar outro formato, ajuste só o node "Envia mensagem (WAHA)".
- **`chatId`**: é montado como `"<telefone>@c.us"` (telefone já vem normalizado com `55` + DDD + número pelo Edge Function). Se o WAHA devolver erro de formato, confira se a instância espera `@s.whatsapp.net` em vez de `@c.us`.
- **Reenvio**: este fluxo não tenta de novo automaticamente quem deu erro — o item fica marcado `erro` no histórico da tela, e pra reenviar basta disparar um novo aviso pra esse aluno específico.
- **Nomes dos nodes**: dois nodes de código se chamam parecido ("Interpreta status (consulta)" e "Interpreta status (desconectar)") de propósito — são independentes, cada um só interpreta o status dentro do seu próprio ramo.

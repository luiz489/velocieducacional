-- Achado na revisão de segurança: usuarios_escolas_write só validava se o
-- usuário tinha permissão de 'configuracoes:editar' na escola de destino,
-- mas nunca validava se o papel_id sendo atribuído pertence àquela mesma
-- escola. Como usuario_tem_permissao() junta usuarios_escolas.papel_id
-- direto em papel_permissoes sem reconferir papeis.escola_id, um admin com
-- acesso a mais de uma escola do mesmo grupo (caso real e suportado no
-- sistema - grupo econômico/filiais) poderia pegar um papel_id de uma
-- escola (com permissões mais amplas) e atribuí-lo a um usuário em outra
-- escola do grupo, "importando" esse conjunto de permissões pra lá.
--
-- Conferido: hoje não existe nenhuma linha com esse descompasso (papel de
-- uma escola atribuído em outra) - o fix é preventivo, fecha a brecha antes
-- que aconteça.

drop policy if exists usuarios_escolas_write on public.usuarios_escolas;

create policy usuarios_escolas_write on public.usuarios_escolas
for all
using (public.usuario_tem_permissao(escola_id, 'configuracoes', 'editar'))
with check (
  public.usuario_tem_permissao(escola_id, 'configuracoes', 'editar')
  and exists (
    select 1 from public.papeis p
    where p.id = papel_id
      and (p.escola_id is null or p.escola_id = usuarios_escolas.escola_id)
  )
);

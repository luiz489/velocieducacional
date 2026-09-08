-- Carteirinha: link do QR code parametrizavel por escola
-- (o numero exibido passa a ser o RA do aluno - alunos.ra_censo - so no frontend)

ALTER TABLE public.escolas ADD COLUMN IF NOT EXISTS carteirinha_qr_url text;

COMMENT ON COLUMN public.escolas.carteirinha_qr_url IS
  'URL que o QR code da carteirinha aponta (ex: Instagram da escola). Se nulo, o QR usa os dados de verificacao antigos.';

-- pre-preenche pro grupo Colegio Doce Mel
UPDATE public.escolas
SET carteirinha_qr_url = 'https://www.instagram.com/colegiodocemelbarretos'
WHERE grupo_economico_id = '3a28eefe-0ee5-424e-bd55-35ec74f57f8d';

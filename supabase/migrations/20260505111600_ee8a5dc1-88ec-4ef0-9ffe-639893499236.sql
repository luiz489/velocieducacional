
CREATE TABLE public.parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Geral',
  descricao TEXT,
  estado TEXT NOT NULL,
  cidade TEXT NOT NULL,
  endereco TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  telefone TEXT,
  email TEXT,
  website TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active parceiros"
ON public.parceiros FOR SELECT TO authenticated
USING (ativo = true OR public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert parceiros"
ON public.parceiros FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update parceiros"
ON public.parceiros FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_parceiros_updated_at
BEFORE UPDATE ON public.parceiros
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_parceiros_estado_cidade ON public.parceiros(estado, cidade) WHERE ativo = true;

-- Seed alguns parceiros de exemplo em SP
INSERT INTO public.parceiros (nome, categoria, descricao, estado, cidade, endereco, latitude, longitude, telefone) VALUES
('Livraria Saber+', 'Livraria', 'Desconto de 15% em livros didáticos', 'SP', 'São Paulo', 'Av. Paulista, 1000', -23.5613, -46.6558, '(11) 3000-0001'),
('Papelaria Criativa', 'Papelaria', '10% off em material escolar', 'SP', 'São Paulo', 'R. Augusta, 500', -23.5546, -46.6620, '(11) 3000-0002'),
('Clínica OdontoKids', 'Saúde', 'Consultas com 20% de desconto', 'SP', 'Campinas', 'R. Barão de Jaguara, 200', -22.9099, -47.0626, '(19) 3000-0010'),
('Academia FitSchool', 'Esporte', 'Mensalidade reduzida para alunos', 'SP', 'Santos', 'Av. Ana Costa, 300', -23.9608, -46.3331, '(13) 3000-0020'),
('Escola de Idiomas Falar', 'Educação', 'Bolsas de 30% em cursos', 'SP', 'Ribeirão Preto', 'R. General Osório, 800', -21.1776, -47.8104, '(16) 3000-0030'),
('Restaurante Sabor Caseiro', 'Alimentação', '15% off no almoço executivo', 'SP', 'São José dos Campos', 'Av. São João, 1500', -23.2237, -45.9009, '(12) 3000-0040');


-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user is staff or admin
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'staff')
  )
$$;

-- 4. RLS on user_roles: only admins can manage, users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Now tighten RLS on ALL existing tables: replace USING(true) with is_staff check

-- ALUNOS: drop old permissive policies, add staff-only
DROP POLICY IF EXISTS "Authenticated users can delete alunos" ON public.alunos;
DROP POLICY IF EXISTS "Authenticated users can insert alunos" ON public.alunos;
DROP POLICY IF EXISTS "Authenticated users can update alunos" ON public.alunos;
DROP POLICY IF EXISTS "Authenticated users can view alunos" ON public.alunos;

CREATE POLICY "Staff can view alunos" ON public.alunos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert alunos" ON public.alunos FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update alunos" ON public.alunos FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete alunos" ON public.alunos FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- APROVADORES
DROP POLICY IF EXISTS "Authenticated users can insert aprovadores" ON public.aprovadores;
DROP POLICY IF EXISTS "Authenticated users can update aprovadores" ON public.aprovadores;
DROP POLICY IF EXISTS "Authenticated users can view aprovadores" ON public.aprovadores;

CREATE POLICY "Staff can view aprovadores" ON public.aprovadores FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert aprovadores" ON public.aprovadores FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update aprovadores" ON public.aprovadores FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- CONTAS_A_PAGAR
DROP POLICY IF EXISTS "Authenticated users can insert contas_a_pagar" ON public.contas_a_pagar;
DROP POLICY IF EXISTS "Authenticated users can update contas_a_pagar" ON public.contas_a_pagar;
DROP POLICY IF EXISTS "Authenticated users can view contas_a_pagar" ON public.contas_a_pagar;

CREATE POLICY "Staff can view contas_a_pagar" ON public.contas_a_pagar FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert contas_a_pagar" ON public.contas_a_pagar FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update contas_a_pagar" ON public.contas_a_pagar FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- CONTRATOS
DROP POLICY IF EXISTS "Authenticated users can insert contratos" ON public.contratos;
DROP POLICY IF EXISTS "Authenticated users can update contratos" ON public.contratos;
DROP POLICY IF EXISTS "Authenticated users can view contratos" ON public.contratos;

CREATE POLICY "Staff can view contratos" ON public.contratos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert contratos" ON public.contratos FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update contratos" ON public.contratos FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- COTACOES
DROP POLICY IF EXISTS "Authenticated users can delete cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Authenticated users can insert cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Authenticated users can update cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Authenticated users can view cotacoes" ON public.cotacoes;

CREATE POLICY "Staff can view cotacoes" ON public.cotacoes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert cotacoes" ON public.cotacoes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update cotacoes" ON public.cotacoes FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete cotacoes" ON public.cotacoes FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- FINANCEIRO
DROP POLICY IF EXISTS "Authenticated users can insert financeiro" ON public.financeiro;
DROP POLICY IF EXISTS "Authenticated users can update financeiro" ON public.financeiro;
DROP POLICY IF EXISTS "Authenticated users can view financeiro" ON public.financeiro;

CREATE POLICY "Staff can view financeiro" ON public.financeiro FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert financeiro" ON public.financeiro FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update financeiro" ON public.financeiro FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- MATRICULAS
DROP POLICY IF EXISTS "Authenticated users can insert matriculas" ON public.matriculas;
DROP POLICY IF EXISTS "Authenticated users can update matriculas" ON public.matriculas;
DROP POLICY IF EXISTS "Authenticated users can view matriculas" ON public.matriculas;

CREATE POLICY "Staff can view matriculas" ON public.matriculas FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert matriculas" ON public.matriculas FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update matriculas" ON public.matriculas FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- OCORRENCIAS
DROP POLICY IF EXISTS "Authenticated users can insert ocorrencias" ON public.ocorrencias;
DROP POLICY IF EXISTS "Authenticated users can update ocorrencias" ON public.ocorrencias;
DROP POLICY IF EXISTS "Authenticated users can view ocorrencias" ON public.ocorrencias;

CREATE POLICY "Staff can view ocorrencias" ON public.ocorrencias FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert ocorrencias" ON public.ocorrencias FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update ocorrencias" ON public.ocorrencias FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- PEDAGOGICO
DROP POLICY IF EXISTS "Authenticated users can insert pedagogico" ON public.pedagogico;
DROP POLICY IF EXISTS "Authenticated users can update pedagogico" ON public.pedagogico;
DROP POLICY IF EXISTS "Authenticated users can view pedagogico" ON public.pedagogico;

CREATE POLICY "Staff can view pedagogico" ON public.pedagogico FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert pedagogico" ON public.pedagogico FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update pedagogico" ON public.pedagogico FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- SOLICITACOES_COMPRA
DROP POLICY IF EXISTS "Authenticated users can insert solicitacoes_compra" ON public.solicitacoes_compra;
DROP POLICY IF EXISTS "Authenticated users can update solicitacoes_compra" ON public.solicitacoes_compra;
DROP POLICY IF EXISTS "Authenticated users can view solicitacoes_compra" ON public.solicitacoes_compra;

CREATE POLICY "Staff can view solicitacoes_compra" ON public.solicitacoes_compra FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert solicitacoes_compra" ON public.solicitacoes_compra FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update solicitacoes_compra" ON public.solicitacoes_compra FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- TURMAS
DROP POLICY IF EXISTS "Authenticated users can insert turmas" ON public.turmas;
DROP POLICY IF EXISTS "Authenticated users can update turmas" ON public.turmas;
DROP POLICY IF EXISTS "Authenticated users can view turmas" ON public.turmas;

CREATE POLICY "Staff can view turmas" ON public.turmas FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert turmas" ON public.turmas FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update turmas" ON public.turmas FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

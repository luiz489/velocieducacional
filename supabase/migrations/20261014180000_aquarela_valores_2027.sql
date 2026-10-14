-- Colégio Aquarela (0301): valores 2027 enviados pela escola (VALORES 2027.docx).
-- Fundamental I/II/Médio, almoço e semi integral; Berçário I/II e Maternal II criados.
-- Os horários do Berçário/Infantil (várias faixas de horário) ficam fora: o modelo atual só tem 4 regimes.
DO $$
DECLARE
  esc uuid := 'cd47ca83-c20d-43b8-867a-a1e7d1883c49';
  v_cat uuid;
  v_orig uuid;
  r record;
  v_matriz uuid; v_turma uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM matriculas WHERE escola_id = esc) THEN
    RAISE EXCEPTION 'Aquarela já tem matrículas; ajuste manual';
  END IF;

  -- 3ª Série do Médio: o arquivo só traz 1ª e 2ª série
  SELECT id INTO v_turma FROM turmas WHERE escola_id = esc AND nome = '3ª Série A';
  IF v_turma IS NOT NULL THEN
    SELECT matriz_curricular_id INTO v_matriz FROM turmas WHERE id = v_turma;
    DELETE FROM horarios_aulas WHERE turma_id = v_turma;
    DELETE FROM modalidades_financeiras_turma WHERE turma_id = v_turma;
    DELETE FROM planos_financeiros_turma WHERE turma_id = v_turma;
    DELETE FROM turmas WHERE id = v_turma;
    DELETE FROM matriz_disciplinas WHERE matriz_id = v_matriz;
    DELETE FROM matrizes_curriculares WHERE id = v_matriz;
  END IF;

  -- Novas turmas da Educação Infantil (clonadas da Maternal 1 A)
  SELECT t.id, t.categoria_id INTO v_orig, v_cat FROM turmas t WHERE t.escola_id = esc AND t.nome = 'Maternal 1 A';
  FOR r IN SELECT * FROM (VALUES ('Berçário 1 A','Sala 16'),('Berçário 2 A','Sala 17'),('Maternal 2 A','Sala 18')) x(nome, sala) LOOP
    IF NOT EXISTS (SELECT 1 FROM turmas WHERE escola_id = esc AND nome = r.nome) THEN
      v_matriz := gen_random_uuid(); v_turma := gen_random_uuid();
      INSERT INTO matrizes_curriculares SELECT (jsonb_populate_record(null::matrizes_curriculares, to_jsonb(s) || jsonb_build_object('id', v_matriz, 'nome', 'Matriz ' || r.nome || ' - 2027', 'serie', r.nome))).*
        FROM matrizes_curriculares s JOIN turmas t ON t.matriz_curricular_id = s.id WHERE t.id = v_orig;
      INSERT INTO matriz_disciplinas SELECT (jsonb_populate_record(null::matriz_disciplinas, to_jsonb(s) || jsonb_build_object('id', gen_random_uuid(), 'matriz_id', v_matriz))).*
        FROM matriz_disciplinas s JOIN turmas t ON t.matriz_curricular_id = s.matriz_id WHERE t.id = v_orig;
      INSERT INTO turmas SELECT (jsonb_populate_record(null::turmas, to_jsonb(s) || jsonb_build_object('id', v_turma, 'nome', r.nome, 'sala', r.sala, 'vagas_totais', 15, 'matriz_curricular_id', v_matriz))).*
        FROM turmas s WHERE s.id = v_orig;
      INSERT INTO planos_financeiros_turma SELECT (jsonb_populate_record(null::planos_financeiros_turma, to_jsonb(s) || jsonb_build_object('id', gen_random_uuid(), 'turma_id', v_turma))).*
        FROM planos_financeiros_turma s WHERE s.turma_id = v_orig;
      INSERT INTO horarios_aulas SELECT (jsonb_populate_record(null::horarios_aulas, to_jsonb(s) || jsonb_build_object('id', gen_random_uuid(), 'turma_id', v_turma))).*
        FROM horarios_aulas s WHERE s.turma_id = v_orig;
    END IF;
  END LOOP;

  -- Turno: Infantil/Berçário integral (a família escolhe o horário); demais séries pela manhã
  UPDATE turmas SET turno = 'Integral' WHERE escola_id = esc AND categoria_id = v_cat;
  UPDATE turmas SET turno = 'Manhã' WHERE escola_id = esc AND categoria_id <> v_cat;

  -- Mensalidades. Modalidades de demonstração apagadas (valores da demo não valem aqui)
  DELETE FROM modalidades_financeiras_turma WHERE escola_id = esc;
  UPDATE planos_financeiros_turma p SET valor_mensalidade = CASE
      WHEN t.nome LIKE 'Berçário%' THEN 1500
      WHEN c.nome = 'Educação Infantil' THEN 1600
      WHEN c.nome = 'Ensino Fundamental I' THEN 750
      WHEN c.nome = 'Ensino Fundamental II' THEN 850
      WHEN c.nome = 'Ensino Médio' THEN 950 END
    FROM turmas t JOIN categorias c ON c.id = t.categoria_id
    WHERE p.turma_id = t.id AND t.escola_id = esc;

  -- Opcionais: almoço 330, semi integral do Fundamental I; transporte não consta no arquivo
  UPDATE valores_opcionais_matricula SET valor = 330 WHERE escola_id = esc AND nome = 'Almoço';
  DELETE FROM matricula_valores_opcionais WHERE valor_opcional_id IN (SELECT id FROM valores_opcionais_matricula WHERE escola_id = esc AND nome = 'Transporte Escolar');
  DELETE FROM valores_opcionais_matricula WHERE escola_id = esc AND nome = 'Transporte Escolar';
  INSERT INTO valores_opcionais_matricula (escola_id, nome, valor, ordem, ativo)
  SELECT esc, x.nome, x.valor, x.ordem, true FROM (VALUES
    ('Semi Integral 13h às 17h (Fund. I)', 600, 2), ('Semi Integral 13h às 18h (Fund. I)', 700, 3)) x(nome, valor, ordem)
  WHERE NOT EXISTS (SELECT 1 FROM valores_opcionais_matricula v WHERE v.escola_id = esc AND v.nome = x.nome);
END $$;

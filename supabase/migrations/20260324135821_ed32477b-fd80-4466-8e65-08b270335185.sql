
-- Espectador can read cotacoes
CREATE POLICY "Espectadores can read cotacoes"
ON public.cotacoes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'espectador'));

-- Espectador can read alertas
CREATE POLICY "Espectadores can read alertas"
ON public.alertas FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'espectador'));

-- Espectador can read configuracoes
CREATE POLICY "Espectadores can read configuracoes"
ON public.configuracoes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'espectador'));

-- Espectador can read relatorios_semanais
CREATE POLICY "Espectadores can read relatorios_semanais"
ON public.relatorios_semanais FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'espectador'));

-- Espectador can read all profiles
CREATE POLICY "Espectadores can read profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'espectador'));

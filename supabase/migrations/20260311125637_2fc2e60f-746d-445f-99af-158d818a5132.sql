CREATE POLICY "Authenticated can update cotacoes"
ON public.cotacoes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
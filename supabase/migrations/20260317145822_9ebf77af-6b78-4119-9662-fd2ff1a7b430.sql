
CREATE TABLE public.vendor_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  can_see_lista_mix boolean NOT NULL DEFAULT true,
  can_see_promocoes boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vendor_permissions"
  ON public.vendor_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can read own permissions"
  ON public.vendor_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

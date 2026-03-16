

# Redesign Completo do Flowi — Plano de Implementação

Redesign visual completo sem alterar nenhuma funcionalidade. Paleta Linear/Vercel/Stripe em dark mode azul-profundo, nome "Flowi" com "i" em teal.

## Arquivos a modificar

### 1. `src/index.css` — Nova paleta de cores e utilitários
- Trocar todas as CSS custom properties para a nova paleta (#0F172A fundo, #0B1120 sidebar, #1E293B cards, #14B8A6 teal primário, #3B82F6 azul secundário)
- Atualizar classes utilitárias: `.card-elevated` (sem borda, sombra sutil), `.surface-input` (fundo recessed #0F172A, borda #334155, focus teal), `.label-apple`, `.table-header-dark`, `.table-row-alt`, `.table-row-hover`, `.day-separator` (gradiente teal→azul)
- Scrollbar customizada fina (#334155 thumb)

### 2. `tailwind.config.ts` — Atualizar tokens de cor
- Mapear os novos valores HSL para todas as variáveis (primary → teal, secondary → azul, warning → #F59E0B, success → #22C55E, etc.)

### 3. `src/components/AppSidebar.tsx` — Sidebar redesign
- Logo "Flowi" (Flow branco bold + i teal #14B8A6), subtítulo "OFFICER DISTRIBUIDORA" em #64748B
- Item ativo: fundo teal 12% opacity, texto teal, pill sutil
- Items inativos: texto #94A3B8, hover fundo #1E293B
- Badge alertas: #EF4444
- Footer: "Vorne AI" em #475569

### 4. `src/components/AppLayout.tsx` — Separador sidebar 1px #1E293B

### 5. `src/pages/Login.tsx` — "Flowi" logo, cores novas
### 6. `src/pages/ResetPassword.tsx` — "Flowi" logo, cores novas

### 7. `src/pages/Index.tsx` — Título branco (#F1F5F9), não amarelo
### 8. `src/pages/Controle.tsx` — Títulos brancos, tabs teal, preços 15% azul / 20% verde, day-separator gradiente, mais padding nas células
### 9. `src/pages/Dashboard.tsx` — Métricas com números brancos, ícone teal, gráficos com cores novas (barras gradiente azul→teal, pie paleta harmoniosa, line teal), tooltips com bg #1E293B
### 10. `src/pages/ListaMix.tsx` — Títulos brancos, botões secundários com borda #334155, preco_20 em verde
### 11. `src/pages/Alertas.tsx` — Título branco, borda-esquerda verde/amarelo nos cards, filtros pill teal
### 12. `src/pages/ConsultaPrecos.tsx` — Header "Flowi", título branco, promos com visual atualizado
### 13. `src/pages/Promocoes.tsx` — Títulos brancos, dialog headers teal
### 14. `src/pages/GerenciarVendedores.tsx` — Títulos brancos, dialog headers teal

### 15. `src/components/QuotationForm.tsx` — Section titles em teal uppercase, botão primário teal, botão secundário borda #334155, input focus teal
### 16. `src/components/EmailPreview.tsx` — "Email Gerado" em teal, box fundo #0F172A borda #334155, badge teal/amarelo
### 17. `src/components/ImageUpload.tsx` — Upload zone: fundo #0F172A, borda dashed #334155, drag hover teal
### 18. `src/components/MarginPreview.tsx` — 15% azul, 20% verde, custo branco
### 19. `src/components/ImportMix.tsx` — Botão borda #334155, dialog headers teal

## Detalhes técnicos

**Cores CSS (HSL para custom properties):**
- `--background`: 222 47% 11% (#0F172A)
- `--card`: 217 33% 17% (#1E293B)
- `--sidebar-background`: 222 54% 8% (#0B1120)
- `--primary`: 168 76% 37% (#14B8A6 teal)
- `--secondary`: 217 91% 60% (#3B82F6 blue)
- `--success`: 142 71% 45% (#22C55E)
- `--warning`: 38 92% 50% (#F59E0B)
- `--destructive`: 0 84% 60% (#EF4444)
- `--muted`: 217 33% 17%
- `--border`: 217 19% 27% (#334155)
- `--foreground`: 210 40% 96% (#F1F5F9)
- `--muted-foreground`: 215 16% 62% (#94A3B8)

**Abordagem:** Todas as mudanças são puramente CSS/className. A lógica JS/TS, queries, API calls, e estado permanecem 100% intactos. Cores hardcoded em componentes (ex: PIE_COLORS no Dashboard, Tooltip styles) serão atualizadas inline.

**Arquivos NÃO modificados:** Todos os edge functions, migrations, types, client, utils, format, exportExcel, alertas, AuthContext, hooks — zero alterações.




# CotaFlow — Plano de Implementação

## Visão Geral

Aplicação de controle de cotações para a Officer Distribuidora, com 3 módulos: Nova Cotação (com IA para leitura de imagens), Controle de Cotações (histórico), e Dashboard (métricas/gráficos). Usa Supabase para banco de dados e Anthropic Claude para OCR de imagens.

---

## 1. Design System e Layout Base

**Tema e cores:**
- Atualizar `src/index.css` com as cores da marca Officer (#0072BB azul, #FFCB31 amarelo, #76787A cinza, #8CC63F verde, #F5F6F8 fundo)
- Adicionar fonte DM Sans via Google Fonts no `index.html`

**Layout com Sidebar:**
- Criar `src/components/AppSidebar.tsx` usando o componente Sidebar do shadcn
- Logo "CotaFlow" + subtítulo "Officer Distribuidora" no topo
- 3 itens de navegação: Nova Cotação, Controle de Cotações, Dashboard
- Criar `src/components/AppLayout.tsx` com SidebarProvider + trigger visível

**Rotas:**
- `/` → Nova Cotação
- `/controle` → Controle de Cotações
- `/dashboard` → Dashboard

---

## 2. Banco de Dados (Supabase / Lovable Cloud)

Habilitar Lovable Cloud e criar as tabelas:

**Tabela `vendedores`:** id, nome, ativo (default true), created_at
- Inserir registro inicial: "Danielle"

**Tabela `cotacoes`:** id, vendedor, canal, produto, marca, part_number, custo (numeric), preco_15 (numeric), preco_20 (numeric), estoque, fornecedor, uf, prazo, link (nullable), created_at (default now())

RLS policies para acesso autenticado ou público conforme necessidade.

---

## 3. Nova Cotação (Página Principal)

**Componente de Upload de Imagem (`src/components/ImageUpload.tsx`):**
- Área de drag-and-drop + clique + paste (Ctrl+V)
- Preview da imagem enviada
- Estado de loading com animação durante processamento
- Drag hover state com destaque visual

**Edge Function `analyze-image`:**
- Recebe imagem em base64, envia para Anthropic Claude (claude-sonnet-4-20250514) com o prompt de extração especificado
- Retorna JSON com: produto, marca, partNumber, custo, estoque, fornecedor, uf
- Requer secret `ANTHROPIC_API_KEY`

**Formulário (`src/components/QuotationForm.tsx`):**
- Campos: Vendedor (dropdown de vendedores do Supabase), Canal (Email/Teams), Produto, Marca, Part Number, Custo R$, Estoque, Fornecedor, UF, Prazo, Link do Produto
- Formatação monetária brasileira
- Preenchimento automático via retorno da IA

**Preview de Margem (`src/components/MarginPreview.tsx`):**
- Cálculo em tempo real: Margem 15% e 20% a partir do custo
- Exibido assim que o campo Custo for preenchido

**Geração de Email (`src/components/EmailPreview.tsx`):**
- Detecção automática: se produto contém "nobreak" ou "estabilizador" → template NOBREAK, senão → template GERAL
- Badge indicando template usado (verde ou amarelo)
- Botão "Copiar" com feedback "Copiado! ✓"

**Botões:**
- "Salvar e Gerar Email" → salva no Supabase + gera email
- "Limpar" → reseta formulário

---

## 4. Controle de Cotações

**Página `src/pages/Controle.tsx`:**
- Abas de meses (JANEIRO...DEZEMBRO) estilo planilha Excel, mês atual selecionado por padrão
- Seletor de ano ao lado das abas
- Cotações agrupadas por dia com separador visual (barra azul #0072BB com texto branco e data)
- Tabela por dia: Data/Hora, Produto, Marca, PN, Custo, Preço 15%, Preço 20%, Fornecedor, Vendedor, Canal
- Ícone 🔗 clicável se o produto tiver link

---

## 5. Dashboard

**Página `src/pages/Dashboard.tsx`:**

**Cards de métricas:**
- Total de Cotações, Produto Mais Cotado, Marca Mais Cotada, Fornecedor Mais Usado

**Filtros:** Abas de mês/ano + opção "Todos"

**Gráficos (recharts):**
- Barras: cotações por dia no mês
- Pizza: distribuição por marca
- Linha: evolução mês a mês

**Tabela resumo:** Últimas 10 cotações do período

---

## 6. Integração com Anthropic Claude

- Solicitar ao usuário a `ANTHROPIC_API_KEY` via secrets do Supabase
- Edge function `analyze-image` faz a chamada à API do Claude com suporte a imagens (vision)
- O frontend envia a imagem convertida em base64 para a edge function

---

## Estrutura de Arquivos a Criar

```text
src/
  components/
    AppSidebar.tsx
    AppLayout.tsx
    ImageUpload.tsx
    QuotationForm.tsx
    MarginPreview.tsx
    EmailPreview.tsx
  pages/
    Index.tsx          (reescrito → Nova Cotação)
    Controle.tsx
    Dashboard.tsx
  lib/
    format.ts          (formatação monetária BR)
    
supabase/
  functions/
    analyze-image/
      index.ts
  config.toml
```

---

## Dependências e Pré-requisitos

- Habilitar Lovable Cloud para Supabase
- Adicionar secret `ANTHROPIC_API_KEY` para a API do Claude
- Fonte DM Sans do Google Fonts
- Todas as demais dependências (recharts, shadcn, etc.) já estão instaladas


import { QuotationForm } from "@/components/QuotationForm";

const Index = () => {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nova Cotação</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Faça upload de um print do portal ou preencha manualmente
        </p>
      </div>
      <QuotationForm />
    </div>
  );
};

export default Index;

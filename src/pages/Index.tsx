import { QuotationForm } from "@/components/QuotationForm";
import { UpdateBanner } from "@/components/UpdateBanner";

const Index = () => {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <UpdateBanner />
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Nova Cotação</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Faça upload de um print do portal ou preencha manualmente
        </p>
      </div>
      <QuotationForm />
    </div>
  );
};

export default Index;

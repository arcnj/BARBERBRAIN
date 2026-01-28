import { BirthdaySection } from "./BirthdaySection";

export function BirthdaysTab() {
  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">Aniversariantes</h2>
        <p className="text-muted-foreground mt-1">
          Gerencie os cupons de aniversário e parabenize seus clientes
        </p>
      </div>
      
      {/* Birthday Section - Now expanded by default */}
      <BirthdaySection defaultExpanded />
    </div>
  );
}

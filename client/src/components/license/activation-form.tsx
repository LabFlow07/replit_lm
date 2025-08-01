import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function ActivationForm() {
  const [activationKey, setActivationKey] = useState("");
  const [computerKey, setComputerKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateComputerKey = () => {
    // Simula la generazione di una chiave computer
    const key = `CK-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    setComputerKey(key);
    toast({
      title: "Chiave Computer Generata",
      description: "La chiave del computer è stata generata automaticamente.",
    });
  };

  const handleActivation = async () => {
    if (!activationKey.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci una chiave di attivazione valida.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Simula chiamata API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Licenza Attivata",
        description: "La licenza è stata attivata con successo.",
      });
      
      setActivationKey("");
      setComputerKey("");
    } catch (error) {
      toast({
        title: "Errore Attivazione",
        description: "Si è verificato un errore durante l'attivazione.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <i className="fas fa-key text-primary"></i>
          <span>Attivazione Licenza</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="activation-key">Chiave di Attivazione</Label>
          <Input
            id="activation-key"
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value)}
            placeholder="Inserisci la chiave di attivazione"
            className="font-mono"
          />
        </div>

        <div>
          <Label htmlFor="computer-key">Chiave Computer</Label>
          <div className="flex space-x-2">
            <Input
              id="computer-key"
              value={computerKey}
              onChange={(e) => setComputerKey(e.target.value)}
              placeholder="Genera o inserisci manualmente"
              className="font-mono flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={generateComputerKey}
              size="sm"
            >
              <i className="fas fa-refresh"></i>
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="activation-info">Informazioni Dispositivo</Label>
          <Textarea
            id="activation-info"
            placeholder="Informazioni aggiuntive sul dispositivo (opzionale)"
            rows={3}
          />
        </div>

        <div className="pt-4 space-y-2">
          <Button
            onClick={handleActivation}
            disabled={isLoading}
            className="w-full bg-primary hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Attivazione...
              </>
            ) : (
              <>
                <i className="fas fa-check mr-2"></i>
                Attiva Licenza
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setActivationKey("");
              setComputerKey("");
            }}
          >
            <i className="fas fa-times mr-2"></i>
            Annulla
          </Button>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Attivazione Offline</h4>
          <p className="text-xs text-gray-500 mb-2">
            Se non hai connessione internet, puoi attivare offline.
          </p>
          <Button variant="outline" size="sm" className="w-full">
            <i className="fas fa-download mr-2"></i>
            Scarica File Attivazione
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
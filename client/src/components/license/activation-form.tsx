import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export default function ActivationForm() {
  const [activationKey, setActivationKey] = useState("");
  const [computerId, setComputerId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activationMutation = useMutation({
    mutationFn: async (data: { activationKey: string; computerId: string }) => {
      const response = await apiRequest('POST', '/api/licenze/attiva', {
        activationKey: data.activationKey,
        computerId: data.computerId,
        deviceInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Licenza attivata",
        description: "La licenza è stata attivata con successo",
      });
      setActivationKey("");
      setComputerId("");
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore attivazione",
        description: error.message || "Errore durante l'attivazione della licenza",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey || !computerId) {
      toast({
        title: "Campi richiesti",
        description: "Inserisci sia la chiave licenza che l'ID computer",
        variant: "destructive",
      });
      return;
    }
    activationMutation.mutate({ activationKey, computerId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Attivazione Rapida
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="activationKey" className="text-sm font-medium text-gray-700">
              Activation Key
            </Label>
            <Input
              id="activationKey"
              type="text"
              placeholder="LIC-XXXX-XXXX"
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
              className="mt-1"
              disabled={activationMutation.isPending}
            />
          </div>
          
          <div>
            <Label htmlFor="computerId" className="text-sm font-medium text-gray-700">
              Computer ID
            </Label>
            <Input
              id="computerId"
              type="text"
              placeholder="COMP-XXXXXXXXX"
              value={computerId}
              onChange={(e) => setComputerId(e.target.value)}
              className="mt-1"
              disabled={activationMutation.isPending}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-blue-700 transition-colors"
            disabled={activationMutation.isPending}
          >
            {activationMutation.isPending ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Attivazione...</span>
              </div>
            ) : (
              <>
                <i className="fas fa-key mr-2"></i>
                Attiva Licenza
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

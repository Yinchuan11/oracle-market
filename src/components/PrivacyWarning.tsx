import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [isUsingTor, setIsUsingTor] = useState(false);

  useEffect(() => {
    // Check if user has already seen the warning
    const hasSeenWarning = localStorage.getItem('oracle-privacy-warning-seen');
    
    if (!hasSeenWarning) {
      // Check for Tor Browser
      const userAgent = navigator.userAgent;
      const isTorBrowser = userAgent.includes('Tor') || 
                          userAgent.includes('Firefox') && userAgent.includes('rv:') && 
                          !userAgent.includes('Chrome');
      
      setIsUsingTor(isTorBrowser);
      setShowWarning(true);
    }
  }, []);

  const handleAcceptRisk = () => {
    localStorage.setItem('oracle-privacy-warning-seen', 'true');
    setShowWarning(false);
  };

  const handleGetTorGuide = () => {
    // Redirect to settings page with Tor guide
    window.location.href = '/settings#privacy-guide';
  };

  if (!showWarning) return null;

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-yellow-500" />
            Privatsphäre & Sicherheitshinweis
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-left">
            <div className="space-y-3">

              {!isUsingTor && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    <strong>Warnung:</strong> Sie nutzen keinen Tor Browser. Ihre echte IP-Adresse ist sichtbar.
                  </AlertDescription>
                </Alert>
              )}

              {isUsingTor && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Gut:</strong> Tor Browser erkannt. Ihre IP ist besser geschützt.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="border-t pt-3">
              <p className="text-sm font-medium">Empfohlene Sicherheitsmaßnahmen:</p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• Tor Browser oder VPN verwenden</li>
                <li>• Keine echten Namen als Benutzername</li>
                
                <li>• Regelmäßig Account löschen</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleGetTorGuide} className="w-full sm:w-auto">
            Sicherheitsanleitung anzeigen
          </Button>
          <AlertDialogAction onClick={handleAcceptRisk} className="w-full sm:w-auto">
            Verstanden, Risiko akzeptieren
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
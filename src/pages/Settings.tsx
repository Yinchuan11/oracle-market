import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Moon, Sun, Trash2, Shield, Download, ExternalLink, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeletingAccount(true);
    try {
      // Call edge function to properly delete the account
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        method: 'POST'
      });

      if (error) {
        throw error;
      }

      // Sign out and redirect
      await signOut();
      
      toast({
        title: 'Konto gelöscht',
        description: 'Ihr Konto wurde erfolgreich gelöscht.',
      });

      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Fehler',
        description: 'Konto konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/marketplace')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Button>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
      </div>

      <div className="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              Darstellung
            </CardTitle>
            <CardDescription>
              Wählen Sie zwischen hellem und dunklem Modus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-toggle" className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Hell
              </Label>
              <Switch
                id="theme-toggle"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
              <Label htmlFor="theme-toggle" className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dunkel
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security Guide */}
        <Card id="privacy-guide">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privatsphäre & Anonymität
            </CardTitle>
            <CardDescription>
              Anleitungen zum anonymen und sicheren Nutzen der Plattform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Tor Browser verwenden</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Der Tor Browser leitet Ihren Traffic über mehrere Server um und verschleiert Ihre IP-Adresse.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.torproject.org/download/" target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Tor Browser herunterladen
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. VPN-Anbieter</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Empfohlene VPN-Anbieter für zusätzliche Anonymität:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• <strong>Mullvad:</strong> Keine Logs, anonyme Bezahlung möglich</li>
                  <li>• <strong>ProtonVPN:</strong> Schweizer Anbieter, starke Verschlüsselung</li>
                  <li>• <strong>IVPN:</strong> No-logs Policy, anonyme Accounts</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Bitcoin-Anonymität</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Bitcoin-Transaktionen sind öffentlich einsehbar. Verwenden Sie:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• <strong>Coin-Mixing Services:</strong> Wasabi Wallet, Samourai Whirlpool</li>
                  <li>• <strong>Neue Adressen:</strong> Für jede Transaktion neue Bitcoin-Adresse</li>
                  <li>• <strong>Monero:</strong> Als alternative Kryptowährung (falls unterstützt)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4. Verhalten auf der Plattform</h4>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Keine echten Namen als Benutzername verwenden</li>
                  <li>• Regelmäßig Account löschen und neu erstellen</li>
                  <li>• Keine wiederverwendbaren Passwörter</li>
                  <li>• Browser-Daten nach jeder Session löschen</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">5. Zusätzliche Tools</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://tails.boum.org/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Tails OS
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.whonix.org/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Whonix
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Konto-Verwaltung
            </CardTitle>
            <CardDescription>
              Verwalten Sie Ihr Benutzerkonto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Konto löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Ihr Konto, 
                    alle Ihre Daten und Ihre Bitcoin-Adresse werden dauerhaft gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deletingAccount ? 'Wird gelöscht...' : 'Konto löschen'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
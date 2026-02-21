import { DesignerLayout } from '@/components/layout/DesignerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Mail, 
  FileQuestion, 
  BookOpen,
  ExternalLink
} from 'lucide-react';

export default function DesignerSupport() {
  return (
    <DesignerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-muted-foreground mt-1">
            Besoin d'aide ? Nous sommes là pour vous
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Contact Support */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <MessageCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Chat Support</CardTitle>
                  <CardDescription>Discutez avec notre équipe</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Notre équipe est disponible du lundi au vendredi, 9h-18h (GMT+1).
              </p>
              <Button className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" />
                Démarrer une conversation
              </Button>
            </CardContent>
          </Card>

          {/* Email Support */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Email</CardTitle>
                  <CardDescription>support@4media.ma</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Nous répondons généralement sous 24h ouvrées.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href="mailto:support@4media.ma">
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer un email
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <FileQuestion className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">FAQ</CardTitle>
                  <CardDescription>Questions fréquentes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Trouvez rapidement des réponses aux questions courantes.
              </p>
              <Button variant="outline" className="w-full">
                <FileQuestion className="h-4 w-4 mr-2" />
                Consulter la FAQ
              </Button>
            </CardContent>
          </Card>

          {/* Documentation */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Documentation</CardTitle>
                  <CardDescription>Guides et tutoriels</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Apprenez à utiliser la plateforme efficacement.
              </p>
              <Button variant="outline" className="w-full">
                <BookOpen className="h-4 w-4 mr-2" />
                Voir la documentation
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Help */}
        <Card>
          <CardHeader>
            <CardTitle>Aide rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium mb-1">Comment soumettre un design ?</h4>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur "Démarrer" sur une tâche, puis utilisez le bouton de livraison 
                  pour uploader votre fichier ou partager un lien.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium mb-1">Formats acceptés ?</h4>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG, PDF, PSD, AI, Figma links, Google Drive, Dropbox.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium mb-1">Comment gérer les révisions ?</h4>
                <p className="text-sm text-muted-foreground">
                  Les demandes de révision apparaissent dans l'onglet "Révision". 
                  Consultez les commentaires et soumettez une nouvelle version.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium mb-1">Paiements</h4>
                <p className="text-sm text-muted-foreground">
                  Les paiements sont traités en fin de mois. Vérifiez votre profil 
                  pour vos informations bancaires.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DesignerLayout>
  );
}

import gerantSignature from '@/assets/gerant-signature.png';

interface ContractContentProps {
  packLabel: string;
  packPrice: number;
  durationMonths: number;
  totalAmount: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientActivity?: string;
  signedAt?: string;
  // New legal fields
  clientFullName?: string;
  clientAddress?: string;
  clientCity?: string;
  clientLegalStatus?: string;
  clientCin?: string;
  clientRaisonSociale?: string;
  clientIce?: string;
  clientSiegeAddress?: string;
  clientRepresentantLegal?: string;
  signingIp?: string;
  signatureData?: string;
  termsAccepted?: boolean;
}

export function ContractContent({
  packLabel, packPrice, durationMonths, totalAmount,
  clientName, clientEmail, clientPhone, clientActivity, signedAt,
  clientFullName, clientAddress, clientCity, clientLegalStatus,
  clientCin, clientRaisonSociale, clientIce, clientSiegeAddress,
  clientRepresentantLegal, signingIp, signatureData, termsAccepted,
}: ContractContentProps) {
  const displayName = clientFullName || clientName;
  const isSociete = clientLegalStatus === 'societe';

  return (
    <div className="prose prose-sm max-w-none text-foreground space-y-5 text-[13px] leading-relaxed">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold m-0">📄 CONTRAT COMMERCIAL PREMIUM</h2>
        <p className="text-xs text-muted-foreground m-0">(Version intégrée plateforme – BRINGCUSTOMER SARL / 4MEDIA)</p>
        <h3 className="text-base font-semibold m-0 mt-2">CONTRAT DE PRESTATION DE SERVICES</h3>
        <h3 className="text-base font-semibold m-0">DIGITAL & PERSONAL BRANDING</h3>
        <p className="text-xs text-muted-foreground">(Version Premium – High Ticket)</p>
      </div>

      <div className="text-sm font-semibold text-center">ENTRE LES SOUSSIGNÉS :</div>

      <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50 text-xs">
        <div>
          <p className="font-bold mb-1">BRINGCUSTOMER SARL</p>
          <p>ICE : 003752841000075</p>
          <p>Siège social : Marrakech – Maroc</p>
          <p>Exploitant la marque commerciale <strong>4MEDIA</strong></p>
          <p>Représentée par son Gérant</p>
          <p className="mt-1 italic">Ci-après dénommée « 4MEDIA »</p>
          <p className="mt-1 font-semibold">D'UNE PART,</p>
        </div>
        <div>
          <p className="font-bold mb-1">LE CLIENT</p>
          <p className="text-muted-foreground text-[11px] mb-1">
            {clientLegalStatus ? 'Identification complétée par le client :' : 'Identification à compléter par le client lors de la signature :'}
          </p>
          <p>Nom complet : {displayName || <Placeholder />}</p>
          <p>Email : {clientEmail || <Placeholder />}</p>
          <p>Tél : {clientPhone || <Placeholder />}</p>
          <p>Activité : {clientActivity || <Placeholder />}</p>
          <p>Adresse : {clientAddress || <Placeholder />}</p>
          <p>Ville : {clientCity || <Placeholder />}</p>

          <div className="mt-2 pt-2 border-t border-muted-foreground/20">
            <p className="font-semibold mb-1">Statut juridique :</p>
            {clientLegalStatus ? (
              isSociete ? (
                <>
                  <p>Type : Société</p>
                  <p>Raison sociale : {clientRaisonSociale || <Placeholder />}</p>
                  <p>ICE : {clientIce || <Placeholder />}</p>
                  <p>Siège social : {clientSiegeAddress || <Placeholder />}</p>
                  <p>Représentant légal : {clientRepresentantLegal || <Placeholder />}</p>
                </>
              ) : (
                <>
                  <p>Type : Personne physique</p>
                  <p>CIN : {clientCin || <Placeholder />}</p>
                </>
              )
            ) : (
              <>
                <p className="text-muted-foreground italic text-[11px]">◉ Personne physique → CIN requis</p>
                <p className="text-muted-foreground italic text-[11px]">◉ Société → Raison sociale, ICE, Siège, Représentant légal</p>
              </>
            )}
          </div>

          <p className="mt-1 italic">Ci-après dénommé « Le Client »</p>
          <p className="mt-1 font-semibold">D'AUTRE PART.</p>
        </div>
      </div>

      <Section title="ARTICLE 1 – OBJET DU CONTRAT">
        <p className="m-0">Le présent contrat a pour objet de définir les conditions dans lesquelles 4MEDIA accompagne le Client dans :</p>
        <ul className="list-disc pl-5 mt-1 space-y-0.5">
          <li>La création de contenu vidéo professionnel</li>
          <li>Le développement de son image de marque</li>
          <li>Le personal branding</li>
          <li>L'optimisation de sa présence digitale</li>
          <li>La production et le montage de vidéos réseaux sociaux</li>
        </ul>
      </Section>

      <Section title="ARTICLE 2 – PACKS & TARIFICATION">
        <p className="m-0 mb-2">Le Client sélectionne un des packs suivants :</p>
        <div className="space-y-1 mb-3 text-xs">
          <div className="flex justify-between p-2 rounded bg-muted/30">
            <span>💼 PACK 8 VIDÉOS</span><span className="font-semibold">5 500 DH / mois</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-muted/30">
            <span>💼 PACK 12 VIDÉOS</span><span className="font-semibold">6 700 DH / mois</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-muted/30">
            <span>💼 PACK 16 VIDÉOS</span><span className="font-semibold">8 600 DH / mois</span>
          </div>
        </div>
        <p className="m-0 mb-1">Durée d'engagement : <strong>4, 8 ou 12 mois</strong></p>
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mt-2">
          <p><strong>Pack sélectionné :</strong> {packLabel}</p>
          <p><strong>Prix mensuel :</strong> {packPrice.toLocaleString()} DH / mois</p>
          <p><strong>Durée :</strong> {durationMonths} mois</p>
          <p className="text-base font-bold mt-2">Montant total : {totalAmount.toLocaleString()} DH</p>
          <p className="text-[11px] text-muted-foreground mt-1">({packPrice.toLocaleString()} DH × {durationMonths} mois)</p>
        </div>
      </Section>

      <Section title="ARTICLE 3 – DURÉE">
        <ul className="list-disc pl-5 space-y-0.5 m-0">
          <li>Le contrat prend effet à la date de signature électronique.</li>
          <li>Il est conclu pour la durée sélectionnée par le Client ({durationMonths} mois).</li>
          <li>Il ne peut être résilié avant son terme sauf accord écrit entre les deux parties.</li>
        </ul>
      </Section>

      <Section title="ARTICLE 4 – MODALITÉS DE PAIEMENT">
        <ul className="list-disc pl-5 space-y-0.5 m-0">
          <li>Paiement mensuel anticipé obligatoire.</li>
          <li>Le paiement doit être effectué entre le 20 et le 31 de chaque mois pour le mois suivant.</li>
          <li>Aucun travail ne débute sans paiement validé.</li>
        </ul>
        <p className="m-0 mt-2 font-semibold">En cas de retard :</p>
        <ul className="list-disc pl-5 space-y-0.5 m-0">
          <li>Suspension automatique des livraisons.</li>
          <li>Suspension d'accès aux services.</li>
          <li>Aucun remboursement des mois déjà engagés.</li>
        </ul>
      </Section>

      <Section title="ARTICLE 5 – OBLIGATIONS DE 4MEDIA">
        <p className="m-0">4MEDIA s'engage à :</p>
        <ul className="list-disc pl-5 space-y-0.5 m-0">
          <li>Fournir un service professionnel</li>
          <li>Respecter les délais convenus</li>
          <li>Assurer la confidentialité des données</li>
          <li>Produire un contenu conforme aux standards professionnels</li>
        </ul>
      </Section>

      <Section title="ARTICLE 6 – OBLIGATIONS DU CLIENT">
        <p className="m-0">Le Client s'engage à :</p>
        <ul className="list-disc pl-5 space-y-0.5 m-0">
          <li>Fournir les informations nécessaires à la production</li>
          <li>Respecter les délais de validation</li>
          <li>Régler les paiements dans les délais</li>
          <li>Respecter les recommandations stratégiques</li>
        </ul>
      </Section>

      <Section title="ARTICLE 7 – PROPRIÉTÉ INTELLECTUELLE">
        <ul className="list-disc pl-5 space-y-0.5 m-0">
          <li>Les contenus produits deviennent la propriété du Client après paiement complet.</li>
          <li>4MEDIA conserve le droit d'utiliser les contenus à des fins de portfolio sauf demande écrite contraire.</li>
        </ul>
      </Section>

      <Section title="ARTICLE 8 – CONFIDENTIALITÉ">
        <p className="m-0">Les parties s'engagent à garder strictement confidentielles toutes les informations échangées.</p>
      </Section>

      <Section title="ARTICLE 9 – FORCE MAJEURE">
        <p className="m-0">Aucune des parties ne pourra être tenue responsable en cas de force majeure.</p>
      </Section>

      <Section title="ARTICLE 10 – DROIT APPLICABLE">
        <ul className="list-disc pl-5 space-y-0.5 m-0">
          <li>Le présent contrat est soumis au droit marocain.</li>
          <li>Tout litige relève de la compétence exclusive des tribunaux de Marrakech.</li>
        </ul>
      </Section>

      <Section title="ARTICLE 11 – VALIDITÉ JURIDIQUE">
        <p className="m-0">La signature électronique réalisée via la plateforme 4MEDIA a la même valeur juridique qu'une signature manuscrite conformément à la législation marocaine en vigueur.</p>
      </Section>

      <div className="p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30">
        <p className="text-xs font-semibold mb-1">ACCEPTATION DES CONDITIONS :</p>
        <label className="text-xs flex items-start gap-2 cursor-default select-none">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary rounded border-muted-foreground/50 flex-shrink-0"
            checked={!!termsAccepted}
            readOnly
          />
          <span>Je reconnais avoir lu et accepté l'intégralité des conditions du contrat.</span>
        </label>
        {termsAccepted && (
          <p className="text-[11px] text-green-600 dark:text-green-400 font-medium mt-1">
            ✅ Conditions acceptées par le client.
          </p>
        )}
      </div>

      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-bold mb-3 text-center">SIGNATURES ÉLECTRONIQUES</h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-lg border text-center bg-background">
            <p className="font-semibold">Pour BRINGCUSTOMER SARL (4MEDIA)</p>
            <p className="text-muted-foreground mt-1">Le Gérant</p>
            <img src={gerantSignature} alt="Signature du Gérant" className="mx-auto mt-2 max-h-20 object-contain mix-blend-darken" />
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="font-semibold">Pour le Client</p>
            <p className="text-muted-foreground mt-1">Signature électronique via plateforme</p>
            {signatureData && (
              <img src={signatureData} alt="Signature du Client" className="mx-auto mt-2 max-h-20 object-contain" />
            )}
          </div>
        </div>
      </div>

      {signedAt && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs space-y-1">
          <p className="font-bold text-green-700 dark:text-green-400">✅ Contrat signé électroniquement</p>
          <p>Date : {new Date(signedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          {signingIp && <p>Adresse IP : {signingIp}</p>}
          <p className="text-[11px] text-muted-foreground italic mt-1">
            La signature électronique a la même valeur juridique qu'une signature manuscrite conformément à la législation marocaine en vigueur.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-bold mb-1">{title}</h4>
      <div>{children}</div>
    </div>
  );
}

function Placeholder() {
  return <span className="text-muted-foreground italic">______________________</span>;
}

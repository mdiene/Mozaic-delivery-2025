
import { PaieContrat, PaieElementFixe, PaieBulletin, PaieBulletinDetail } from '../types';
import { db } from './db';

export interface PaieInput {
  salaireBase: number;
  sursalaire: number;
  primesImposables: number;
  indemniteTransport: number;
  nbParts: number;
  isCadre: boolean;
  autresGains?: { libelle: string, montant: number, isImposable: boolean, isSoumisCotisation: boolean }[];
  retenues?: { libelle: string, montant: number }[];
}

export interface ResultatPaie {
  brutSocial: number;
  brutFiscal: number;
  retenuesSalariales: number;
  ir: number;
  trimf: number;
  netAPayer: number;
  details: { libelle: string, base: number, tauxSalarial: number, montantSalarial: number, tauxPatronal: number, montantPatronal: number }[];
}

export class CalculatricePaieSN {
  private readonly PLAFOND_IPRES_RG = 256000;
  private readonly PLAFOND_IPRES_CADRE = 768000;
  private readonly PLAFOND_CSS_PF = 63000;
  private readonly PLAFOND_CSS_AT = 63000;
  private readonly EXONERATION_TRANSPORT = 20845;

  public calculer(input: PaieInput): ResultatPaie {
    const { salaireBase, sursalaire, primesImposables, indemniteTransport, nbParts, isCadre, autresGains = [], retenues = [] } = input;

    const details: any[] = [];

    // 1. Calcul du Brut
    let assietteSociale = salaireBase + sursalaire + primesImposables;
    let transportImposable = Math.max(0, indemniteTransport - this.EXONERATION_TRANSPORT);
    let brutFiscal = assietteSociale + transportImposable;

    autresGains.forEach(g => {
      if (g.isSoumisCotisation) assietteSociale += g.montant;
      if (g.isImposable) brutFiscal += g.montant;
    });

    // 2. Retenues Sociales (Salariales)
    const baseIPRES_RG = Math.min(assietteSociale, this.PLAFOND_IPRES_RG);
    const ipresRG = baseIPRES_RG * 0.056;
    details.push({ libelle: "IPRES RG", base: baseIPRES_RG, tauxSalarial: 0.056, montantSalarial: ipresRG, tauxPatronal: 0.084, montantPatronal: baseIPRES_RG * 0.084 });

    let ipresCadre = 0;
    if (isCadre) {
      const baseIPRES_Cadre = Math.min(assietteSociale, this.PLAFOND_IPRES_CADRE);
      ipresCadre = baseIPRES_Cadre * 0.024;
      details.push({ libelle: "IPRES Cadre", base: baseIPRES_Cadre, tauxSalarial: 0.024, montantSalarial: ipresCadre, tauxPatronal: 0.036, montantPatronal: baseIPRES_Cadre * 0.036 });
    }

    const baseCSS_PF = Math.min(assietteSociale, this.PLAFOND_CSS_PF);
    details.push({ libelle: "CSS Prestations Familiales", base: baseCSS_PF, tauxSalarial: 0, montantSalarial: 0, tauxPatronal: 0.07, montantPatronal: baseCSS_PF * 0.07 });

    const baseCSS_AT = Math.min(assietteSociale, this.PLAFOND_CSS_AT);
    details.push({ libelle: "CSS Accident du Travail", base: baseCSS_AT, tauxSalarial: 0, montantSalarial: 0, tauxPatronal: 0.03, montantPatronal: baseCSS_AT * 0.03 });

    const totalRetenuesSociales = ipresRG + ipresCadre;

    // 3. Calcul de l'Impôt sur le Revenu (IR)
    const fraisPro = Math.min(brutFiscal * 0.1, 75000);
    const revenuNetImposableMensuel = brutFiscal - totalRetenuesSociales - fraisPro;
    const revenuNetImposableAnnuel = revenuNetImposableMensuel * 12;

    const irAnnuel = this.calculerIRAnnuel(revenuNetImposableAnnuel, nbParts);
    const irMensuel = irAnnuel / 12;
    
    const trimf = this.calculerTRIMF(brutFiscal);

    details.push({ libelle: "Impôt sur le Revenu", base: revenuNetImposableMensuel, tauxSalarial: 0, montantSalarial: irMensuel, tauxPatronal: 0, montantPatronal: 0 });
    details.push({ libelle: "TRIMF", base: brutFiscal, tauxSalarial: 0, montantSalarial: trimf, tauxPatronal: 0, montantPatronal: 0 });

    const cfce = brutFiscal * 0.03;
    details.push({ libelle: "CFCE", base: brutFiscal, tauxSalarial: 0, montantSalarial: 0, tauxPatronal: 0.03, montantPatronal: cfce });

    // 4. Net à Payer
    let totalRetenues = totalRetenuesSociales + irMensuel + trimf;
    retenues.forEach(r => {
      totalRetenues += r.montant;
      details.push({ libelle: r.libelle, base: r.montant, tauxSalarial: 1, montantSalarial: r.montant, tauxPatronal: 0, montantPatronal: 0 });
    });

    const totalGains = brutFiscal + (indemniteTransport - transportImposable);
    const netAPayer = totalGains - totalRetenues;

    return {
      brutSocial: assietteSociale,
      brutFiscal: brutFiscal,
      retenuesSalariales: totalRetenuesSociales,
      ir: irMensuel,
      trimf: trimf,
      netAPayer: Math.round(netAPayer),
      details: details
    };
  }

  private calculerIRAnnuel(baseAnnuelle: number, nbParts: number): number {
    let impotTheorique = 0;
    if (baseAnnuelle <= 630000) return 0;
    
    if (baseAnnuelle <= 1500000) {
      impotTheorique = (baseAnnuelle - 630000) * 0.20;
    } else if (baseAnnuelle <= 4000000) {
      impotTheorique = (1500000 - 630000) * 0.20 + (baseAnnuelle - 1500000) * 0.30;
    } else if (baseAnnuelle <= 8000000) {
      impotTheorique = (1500000 - 630000) * 0.20 + (4000000 - 1500000) * 0.30 + (baseAnnuelle - 4000000) * 0.35;
    } else if (baseAnnuelle <= 13500000) {
      impotTheorique = (1500000 - 630000) * 0.20 + (4000000 - 1500000) * 0.30 + (8000000 - 4000000) * 0.35 + (baseAnnuelle - 8000000) * 0.37;
    } else {
      impotTheorique = (1500000 - 630000) * 0.20 + (4000000 - 1500000) * 0.30 + (8000000 - 4000000) * 0.35 + (13500000 - 8000000) * 0.37 + (baseAnnuelle - 13500000) * 0.40;
    }

    const reductions: Record<number, number> = {
      1: 0, 1.5: 0.10, 2: 0.15, 2.5: 0.20, 3: 0.25, 3.5: 0.30, 4: 0.35, 4.5: 0.40, 5: 0.45
    };

    const tauxReduction = reductions[nbParts] || (nbParts > 5 ? 0.45 : 0);
    return Math.max(0, impotTheorique * (1 - tauxReduction));
  }

  private calculerTRIMF(brutFiscal: number): number {
    if (brutFiscal <= 100000) return 0;
    if (brutFiscal <= 150000) return 900;
    if (brutFiscal <= 200000) return 1500;
    if (brutFiscal <= 250000) return 2000;
    return 3000;
  }
}

export const payrollService = {
  generateBulletin: async (idPersonnel: string, mois: number, annee: number) => {
    // 1. Get Contract
    const contrats = await db.getPaieContrats();
    const contrat = contrats.find(c => c.id_personnel === idPersonnel && c.active);
    if (!contrat) throw new Error("Aucun contrat actif trouvé pour cet employé.");

    // 2. Get Fixed Elements
    const elements = await db.getPaieElementsFixes(idPersonnel);
    
    const calculator = new CalculatricePaieSN();
    
    const input: PaieInput = {
      salaireBase: contrat.salaire_base_mensuel,
      sursalaire: contrat.surplus_salaire,
      primesImposables: 0,
      indemniteTransport: 0,
      nbParts: contrat.nb_parts_fiscales,
      isCadre: contrat.is_cadre,
      autresGains: [],
      retenues: []
    };

    elements.forEach(e => {
      if (e.rubrique_type === 'GAIN') {
        if (e.rubrique_libelle?.toLowerCase().includes('transport')) {
          input.indemniteTransport += e.montant;
        } else {
          input.autresGains?.push({
            libelle: e.rubrique_libelle || 'Gain',
            montant: e.montant,
            isImposable: true, // Par défaut
            isSoumisCotisation: true
          });
        }
      } else {
        input.retenues?.push({
          libelle: e.rubrique_libelle || 'Retenue',
          montant: e.montant
        });
      }
    });

    const resultat = calculator.calculer(input);

    // 3. Save Bulletin
    const bulletinPayload: Partial<PaieBulletin> = {
      id_personnel: idPersonnel,
      periode_mois: mois,
      periode_annee: annee,
      salaire_brut_total: resultat.brutFiscal,
      assiette_ipres: resultat.brutSocial,
      impot_sur_revenu: resultat.ir,
      trimf: resultat.trimf,
      net_a_payer: resultat.netAPayer,
      statut_paiement: 'BROUILLON',
      date_calcul: new Date().toISOString()
    };

    const [newBulletin] = await db.createItem('paie_bulletins', bulletinPayload);
    
    // 4. Save Details
    const detailsPayloads = resultat.details.map(d => ({
      id_bulletin: newBulletin.id_bulletin,
      libelle_ligne: d.libelle,
      base_calcul: d.base,
      taux_salarial: d.tauxSalarial,
      montant_salarial: d.montantSalarial,
      taux_patronal: d.tauxPatronal,
      montant_patronal: d.montantPatronal
    }));

    for (const d of detailsPayloads) {
      await db.createItem('paie_bulletin_details', d);
    }

    return newBulletin;
  }
};

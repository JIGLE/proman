/**
 * Iberian Lease Contract Templates
 *
 * Pre-built bilingual lease templates for:
 * - Portugal: Contrato de Arrendamento Urbano (NRAU regime)
 * - Spain: Contrato de Arrendamiento de Vivienda (LAU 2024)
 *
 * These templates include country-specific legal clauses required
 * by Portuguese and Spanish tenancy law.
 */

export interface IberianLeaseTemplateData {
  // Country
  country: "PT" | "ES";

  // Landlord
  landlordName: string;
  landlordNif: string;
  landlordAddress: string;
  landlordEmail?: string;
  landlordPhone?: string;

  // Tenant
  tenantName: string;
  tenantNif: string;
  tenantAddress: string;
  tenantEmail?: string;
  tenantPhone?: string;

  // Property
  propertyAddress: string;
  propertyDescription?: string;
  propertyTypology?: string; // e.g., T2, T3
  cadasterReference?: string; // Spain: referencia catastral
  licencaHabitacao?: string; // Portugal: licença de habitação number
  energyCertificateClass?: string; // A+, A, B, C, D, E, F

  // Lease Terms
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  paymentDueDay?: number;
  autoRenew: boolean;
  renewalNoticeDays?: number;

  // Iberian-specific
  isRendaAcessivel?: boolean; // PT: renda acessível programme
  isZonaTensionada?: boolean; // ES: stressed housing zone
  priorContractRent?: number; // ES: previous contract rent for rent cap
  fianzaMonths?: number; // ES: statutory deposit (1 month habitual, 2 months other)

  // Additional
  includedUtilities?: string[];
  specialClauses?: string[];
  signatureDate?: string;
}

function formatDatePT(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-PT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateES(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

const CSS = `
  body {
    font-family: 'Times New Roman', Georgia, serif;
    line-height: 1.8;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
    color: #1a1a1a;
    font-size: 13px;
  }
  h1 {
    text-align: center;
    font-size: 20px;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  h2 {
    font-size: 14px;
    margin-top: 24px;
    margin-bottom: 8px;
    text-transform: uppercase;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
  }
  .subtitle {
    text-align: center;
    font-size: 12px;
    color: #666;
    margin-bottom: 30px;
  }
  .parties { margin-bottom: 24px; }
  .section { margin-bottom: 16px; }
  .highlight { font-weight: bold; }
  .clause { margin-bottom: 12px; text-align: justify; }
  .signature-block {
    margin-top: 50px;
    display: flex;
    justify-content: space-between;
    page-break-inside: avoid;
  }
  .signature-line {
    width: 44%;
    text-align: center;
  }
  .signature-line .line {
    border-bottom: 1px solid #000;
    height: 40px;
    margin-bottom: 5px;
  }
  .signature-line .label { font-size: 11px; color: #666; }
  ul { margin: 8px 0; padding-left: 20px; }
  .legal-note {
    font-size: 11px;
    color: #666;
    margin-top: 30px;
    border-top: 1px solid #ccc;
    padding-top: 15px;
  }
`;

/**
 * Generate Portuguese Contrato de Arrendamento Urbano
 * Compliant with NRAU (Lei n.º 6/2006) and subsequent amendments
 */
export function generatePortugueseLease(
  data: IberianLeaseTemplateData,
): string {
  const fd = formatDatePT;
  const fe = formatEuro;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Arrendamento Urbano</title>
  <style>${CSS}</style>
</head>
<body>
  <h1>Contrato de Arrendamento Urbano</h1>
  <p class="subtitle">Nos termos do Novo Regime do Arrendamento Urbano (NRAU) — Lei n.º 6/2006</p>

  <div class="parties">
    <p>Entre:</p>
    <p><strong>PRIMEIRO OUTORGANTE (Senhorio):</strong> ${data.landlordName}, contribuinte fiscal n.º ${data.landlordNif}, 
    com domicílio em ${data.landlordAddress}${data.landlordEmail ? `, e-mail: ${data.landlordEmail}` : ""}${data.landlordPhone ? `, telefone: ${data.landlordPhone}` : ""},
    adiante designado por "Senhorio";</p>
    
    <p><strong>SEGUNDO OUTORGANTE (Arrendatário):</strong> ${data.tenantName}, contribuinte fiscal n.º ${data.tenantNif}, 
    com domicílio em ${data.tenantAddress}${data.tenantEmail ? `, e-mail: ${data.tenantEmail}` : ""}${data.tenantPhone ? `, telefone: ${data.tenantPhone}` : ""},
    adiante designado por "Arrendatário";</p>
    
    <p>É celebrado o presente contrato de arrendamento urbano para fins habitacionais, que se rege pelas cláusulas seguintes:</p>
  </div>

  <h2>Cláusula Primeira — Objecto</h2>
  <div class="section">
    <p class="clause">O Senhorio dá de arrendamento ao Arrendatário o imóvel sito em 
    <span class="highlight">${data.propertyAddress}</span>${data.propertyTypology ? `, tipologia ${data.propertyTypology}` : ""},
    destinado exclusivamente a habitação permanente do Arrendatário.</p>
    ${data.licencaHabitacao ? `<p class="clause">Licença de utilização n.º ${data.licencaHabitacao}.</p>` : ""}
    ${data.energyCertificateClass ? `<p class="clause">Certificado energético: classe ${data.energyCertificateClass}.</p>` : ""}
    ${data.propertyDescription ? `<p class="clause">Descrição: ${data.propertyDescription}</p>` : ""}
  </div>

  <h2>Cláusula Segunda — Prazo</h2>
  <div class="section">
    <p class="clause">O presente contrato tem início em <span class="highlight">${fd(data.startDate)}</span> 
    e termo em <span class="highlight">${fd(data.endDate)}</span>.</p>
    ${
      data.autoRenew
        ? `<p class="clause">O contrato renova-se automaticamente por períodos iguais ao inicial, salvo denúncia por qualquer das partes, mediante comunicação por escrito com antecedência mínima de ${data.renewalNoticeDays ?? 120} dias relativamente ao seu termo.</p>`
        : `<p class="clause">O contrato não se renova automaticamente, cessando no termo do prazo convencionado.</p>`
    }
  </div>

  <h2>Cláusula Terceira — Renda</h2>
  <div class="section">
    <p class="clause">A renda mensal é fixada em <span class="highlight">${fe(data.monthlyRent)}</span> (${numberToWordsPT(data.monthlyRent)}), 
    pagável até ao dia <span class="highlight">${data.paymentDueDay ?? 8}</span> do mês a que respeita.</p>
    <p class="clause">A renda é actualizada anualmente nos termos do artigo 24.º do NRAU, de acordo com o coeficiente de actualização publicado pelo INE.</p>
    ${
      data.isRendaAcessivel
        ? `<p class="clause"><strong>Programa Renda Acessível:</strong> Este contrato é celebrado ao abrigo do Programa de Arrendamento Acessível (Decreto-Lei n.º 68/2019), beneficiando o Senhorio da taxa autónoma de IRS de 10% sobre os rendimentos prediais.</p>`
        : ""
    }
  </div>

  <h2>Cláusula Quarta — Caução</h2>
  <div class="section">
    <p class="clause">O Arrendatário entrega ao Senhorio, a título de caução, o montante de 
    <span class="highlight">${fe(data.deposit)}</span>, correspondente a ${Math.round(data.deposit / data.monthlyRent)} mês(es) de renda.</p>
    <p class="clause">A caução será devolvida no prazo de 30 dias após a cessação do contrato, deduzidas eventuais importâncias devidas pelo Arrendatário.</p>
  </div>

  <h2>Cláusula Quinta — Obrigações do Arrendatário</h2>
  <div class="section">
    <p class="clause">a) Pagar pontualmente a renda;</p>
    <p class="clause">b) Manter o locado em bom estado de conservação;</p>
    <p class="clause">c) Não realizar obras sem autorização prévia e por escrito do Senhorio;</p>
    <p class="clause">d) Não subarrendar nem ceder a sua posição contratual sem consentimento do Senhorio;</p>
    <p class="clause">e) Comunicar ao Senhorio quaisquer defeitos do locado que exijam reparação;</p>
    <p class="clause">f) Restituir o locado no estado em que o recebeu, salvo deteriorações inerentes ao uso normal e prudente.</p>
  </div>

  <h2>Cláusula Sexta — Obrigações do Senhorio</h2>
  <div class="section">
    <p class="clause">a) Entregar o locado em condições de habitabilidade;</p>
    <p class="clause">b) Assegurar o gozo pacífico do locado;</p>
    <p class="clause">c) Realizar as obras de conservação ordinária e extraordinária;</p>
    <p class="clause">d) Emitir o recibo de renda electrónico até 5 dias após o recebimento da renda, nos termos do artigo 78.º-A do CIRS.</p>
  </div>

  ${
    data.includedUtilities && data.includedUtilities.length > 0
      ? `
  <h2>Cláusula Sétima — Despesas e Encargos</h2>
  <div class="section">
    <p class="clause">Estão incluídas na renda as seguintes despesas:</p>
    <ul>${data.includedUtilities.map((u) => `<li>${u}</li>`).join("\n      ")}</ul>
    <p class="clause">Todas as restantes despesas são da responsabilidade do Arrendatário.</p>
  </div>
  `
      : ""
  }

  ${
    data.specialClauses && data.specialClauses.length > 0
      ? `
  <h2>Cláusulas Especiais</h2>
  <div class="section">
    <ul>${data.specialClauses.map((c) => `<li>${c}</li>`).join("\n      ")}</ul>
  </div>
  `
      : ""
  }

  <h2>Disposições Finais</h2>
  <div class="section">
    <p class="clause">O presente contrato é regido pela legislação portuguesa, designadamente pelo Código Civil, pelo NRAU (Lei n.º 6/2006 e alterações posteriores) e pela demais legislação aplicável.</p>
    <p class="clause">Qualquer litígio emergente do presente contrato será dirimido pelo tribunal da comarca da situação do imóvel arrendado.</p>
    <p class="clause">O presente contrato é feito em duplicado, sendo um exemplar para cada parte.</p>
  </div>

  <div class="signature-block">
    <div class="signature-line">
      <div class="line"></div>
      <div class="label">O Senhorio</div>
      <p>${data.landlordName}</p>
      <p>NIF: ${data.landlordNif}</p>
      <p>Data: ${data.signatureDate ? fd(data.signatureDate) : "_______________"}</p>
    </div>
    <div class="signature-line">
      <div class="line"></div>
      <div class="label">O Arrendatário</div>
      <p>${data.tenantName}</p>
      <p>NIF: ${data.tenantNif}</p>
      <p>Data: ${data.signatureDate ? fd(data.signatureDate) : "_______________"}</p>
    </div>
  </div>

  <div class="legal-note">
    <p>Nota: Nos termos do artigo 2.º do Decreto-Lei n.º 160/2006, o presente contrato deve ser comunicado à Autoridade Tributária e Aduaneira no prazo de 30 dias.</p>
  </div>
</body>
</html>`;
}

/**
 * Generate Spanish Contrato de Arrendamiento de Vivienda
 * Compliant with LAU (Ley 29/1994) as amended by Ley de Vivienda 12/2023
 */
export function generateSpanishLease(data: IberianLeaseTemplateData): string {
  const fd = formatDateES;
  const fe = formatEuro;
  const fianzaMonths = data.fianzaMonths ?? 1;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Arrendamiento de Vivienda</title>
  <style>${CSS}</style>
</head>
<body>
  <h1>Contrato de Arrendamiento de Vivienda</h1>
  <p class="subtitle">Conforme a la Ley 29/1994 de Arrendamientos Urbanos (LAU) y Ley 12/2023 por el Derecho a la Vivienda</p>

  <div class="parties">
    <p>En ${data.propertyAddress.split(",").pop()?.trim() ?? "___"}, a ${data.signatureDate ? fd(data.signatureDate) : "_______________"}</p>
    
    <p><strong>REUNIDOS</strong></p>
    
    <p><strong>De una parte, como ARRENDADOR:</strong> D./Dña. ${data.landlordName}, con NIF/NIE ${data.landlordNif}, 
    con domicilio en ${data.landlordAddress}${data.landlordEmail ? `, correo electrónico: ${data.landlordEmail}` : ""}${data.landlordPhone ? `, teléfono: ${data.landlordPhone}` : ""}.</p>
    
    <p><strong>De otra parte, como ARRENDATARIO:</strong> D./Dña. ${data.tenantName}, con NIF/NIE ${data.tenantNif}, 
    con domicilio en ${data.tenantAddress}${data.tenantEmail ? `, correo electrónico: ${data.tenantEmail}` : ""}${data.tenantPhone ? `, teléfono: ${data.tenantPhone}` : ""}.</p>
    
    <p>Ambas partes se reconocen capacidad legal suficiente para el otorgamiento del presente contrato y, a tal efecto,</p>
    <p><strong>EXPONEN</strong></p>
    <p>Que el arrendador es propietario de la vivienda descrita en la estipulación primera, y que desea arrendarla al arrendatario, quien a su vez desea tomarla en arrendamiento, conviniendo ambas partes en celebrar el presente contrato con arreglo a las siguientes</p>
  </div>

  <h2>Primera — Objeto del Contrato</h2>
  <div class="section">
    <p class="clause">El arrendador cede en arrendamiento al arrendatario la vivienda sita en 
    <span class="highlight">${data.propertyAddress}</span>${data.propertyTypology ? `, tipología ${data.propertyTypology}` : ""}, 
    destinada a satisfacer la necesidad permanente de vivienda del arrendatario.</p>
    ${data.cadasterReference ? `<p class="clause">Referencia catastral: ${data.cadasterReference}.</p>` : ""}
    ${data.energyCertificateClass ? `<p class="clause">Certificado de eficiencia energética: clase ${data.energyCertificateClass}.</p>` : ""}
    ${data.propertyDescription ? `<p class="clause">Descripción: ${data.propertyDescription}</p>` : ""}
  </div>

  <h2>Segunda — Duración</h2>
  <div class="section">
    <p class="clause">El plazo de duración del arrendamiento es de ${calculateMonths(data.startDate, data.endDate)} meses, 
    desde el <span class="highlight">${fd(data.startDate)}</span> hasta el <span class="highlight">${fd(data.endDate)}</span>.</p>
    <p class="clause">Conforme al artículo 9 de la LAU, si la duración pactada fuera inferior a cinco años (o siete años si el arrendador es persona jurídica), 
    se prorrogará obligatoriamente por plazos anuales hasta alcanzar dicha duración mínima, salvo que el arrendatario manifieste su voluntad de no renovar con 30 días de antelación.</p>
    ${
      data.autoRenew
        ? `<p class="clause">Transcurrido el período mínimo legal, el contrato se prorrogará tácitamente por plazos anuales sucesivos, 
      salvo que cualquiera de las partes comunique a la otra su voluntad de no renovar con ${data.renewalNoticeDays ?? 30} días de antelación.</p>`
        : `<p class="clause">Transcurrido el período contractual, el contrato no se prorrogará tácitamente.</p>`
    }
  </div>

  <h2>Tercera — Renta</h2>
  <div class="section">
    <p class="clause">La renta mensual se fija en <span class="highlight">${fe(data.monthlyRent)}</span> (${numberToWordsES(data.monthlyRent)}), 
    pagadera dentro de los primeros <span class="highlight">${data.paymentDueDay ?? 7}</span> días de cada mes.</p>
    <p class="clause">La renta se actualizará anualmente conforme al Índice de Garantía de Competitividad (IGC) o, en su defecto, 
    al índice de referencia que establezca el Instituto Nacional de Estadística, conforme al artículo 18 de la LAU.</p>
    ${
      data.isZonaTensionada
        ? `
    <p class="clause"><strong>Zona de mercado residencial tensionado:</strong> La vivienda se encuentra en una zona declarada de mercado residencial tensionado. 
    Conforme al artículo 17.6 de la LAU (modificado por Ley 12/2023), la renta no podrá exceder la última renta vigente del contrato anterior, 
    actualizada conforme al índice de referencia.${data.priorContractRent ? ` Renta del contrato anterior: ${fe(data.priorContractRent)}.` : ""}</p>
    `
        : ""
    }
  </div>

  <h2>Cuarta — Fianza</h2>
  <div class="section">
    <p class="clause">Conforme al artículo 36 de la LAU, el arrendatario entrega al arrendador en concepto de fianza legal obligatoria 
    la cantidad de <span class="highlight">${fe(data.monthlyRent * fianzaMonths)}</span>, equivalente a ${fianzaMonths} mensualidad(es) de renta.</p>
    ${
      data.deposit > data.monthlyRent * fianzaMonths
        ? `
    <p class="clause">Adicionalmente, se establece una garantía adicional de <span class="highlight">${fe(data.deposit - data.monthlyRent * fianzaMonths)}</span>. 
    El total de garantías adicionales no podrá exceder de dos mensualidades de renta conforme al artículo 36.5 de la LAU.</p>
    `
        : ""
    }
    <p class="clause">La fianza será depositada en el organismo autonómico correspondiente conforme a la legislación aplicable.</p>
  </div>

  <h2>Quinta — Obligaciones del Arrendatario</h2>
  <div class="section">
    <p class="clause">a) Pagar la renta puntualmente en los plazos convenidos;</p>
    <p class="clause">b) Usar la vivienda con la diligencia debida, destinándola a vivienda habitual;</p>
    <p class="clause">c) No realizar obras que modifiquen la configuración de la vivienda sin consentimiento escrito del arrendador;</p>
    <p class="clause">d) No subarrendar ni ceder total o parcialmente la vivienda sin consentimiento escrito del arrendador (art. 8 LAU);</p>
    <p class="clause">e) Comunicar al arrendador los desperfectos o deterioros que requieran reparación;</p>
    <p class="clause">f) Permitir al arrendador realizar las obras de conservación y mejora previstas en la LAU, con preaviso.</p>
  </div>

  <h2>Sexta — Obligaciones del Arrendador</h2>
  <div class="section">
    <p class="clause">a) Entregar la vivienda en condiciones de habitabilidad;</p>
    <p class="clause">b) Realizar las reparaciones necesarias para la conservación de la vivienda (art. 21 LAU);</p>
    <p class="clause">c) Mantener al arrendatario en el goce pacífico del arrendamiento;</p>
    <p class="clause">d) Entregar los justificantes de pago de la renta cuando sean solicitados.</p>
  </div>

  ${
    data.includedUtilities && data.includedUtilities.length > 0
      ? `
  <h2>Séptima — Gastos y Suministros</h2>
  <div class="section">
    <p class="clause">Los siguientes suministros están incluidos en la renta:</p>
    <ul>${data.includedUtilities.map((u) => `<li>${u}</li>`).join("\n      ")}</ul>
    <p class="clause">Los demás gastos de suministros y servicios individualizables serán a cargo del arrendatario.</p>
  </div>
  `
      : ""
  }

  ${
    data.specialClauses && data.specialClauses.length > 0
      ? `
  <h2>Cláusulas Adicionales</h2>
  <div class="section">
    <ul>${data.specialClauses.map((c) => `<li>${c}</li>`).join("\n      ")}</ul>
  </div>
  `
      : ""
  }

  <h2>Disposiciones Finales</h2>
  <div class="section">
    <p class="clause">El presente contrato se rige por la Ley 29/1994 de Arrendamientos Urbanos, en la redacción dada por la Ley 12/2023, y supletoriamente por el Código Civil.</p>
    <p class="clause">Para cualquier controversia derivada del presente contrato, las partes se someten a la jurisdicción de los Juzgados y Tribunales del lugar donde radica la finca.</p>
    <p class="clause">El presente contrato se firma en dos ejemplares, uno para cada parte, a un solo efecto.</p>
  </div>

  <div class="signature-block">
    <div class="signature-line">
      <div class="line"></div>
      <div class="label">El Arrendador</div>
      <p>${data.landlordName}</p>
      <p>NIF/NIE: ${data.landlordNif}</p>
      <p>Fecha: ${data.signatureDate ? fd(data.signatureDate) : "_______________"}</p>
    </div>
    <div class="signature-line">
      <div class="line"></div>
      <div class="label">El Arrendatario</div>
      <p>${data.tenantName}</p>
      <p>NIF/NIE: ${data.tenantNif}</p>
      <p>Fecha: ${data.signatureDate ? fd(data.signatureDate) : "_______________"}</p>
    </div>
  </div>

  <div class="legal-note">
    <p>Nota: Conforme al artículo 36.1 de la LAU, la fianza deberá ser depositada en el organismo autonómico competente. 
    Este contrato deberá inscribirse en el Registro de la Propiedad si cualquiera de las partes lo solicita (art. 7 LAU).
    ${data.isZonaTensionada ? " A partir de 2025, los contratos en zonas de mercado residencial tensionado deberán registrarse en la Ventanilla Única Digital (NRUA)." : ""}</p>
  </div>
</body>
</html>`;
}

/**
 * Generate lease agreement for the appropriate country
 */
export function generateIberianLease(data: IberianLeaseTemplateData): string {
  if (data.country === "PT") {
    return generatePortugueseLease(data);
  }
  return generateSpanishLease(data);
}

// Helper: calculate months between two dates
function calculateMonths(startStr: string, endStr: string): number {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
}

// Helper: number to words in Portuguese (simplified for amounts up to €99,999)
function numberToWordsPT(amount: number): string {
  const euros = Math.floor(amount);
  const cents = Math.round((amount - euros) * 100);

  const units = [
    "",
    "um",
    "dois",
    "três",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove",
  ];
  const teens = [
    "dez",
    "onze",
    "doze",
    "treze",
    "catorze",
    "quinze",
    "dezasseis",
    "dezassete",
    "dezoito",
    "dezanove",
  ];
  const tens = [
    "",
    "",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa",
  ];
  const hundreds = [
    "",
    "cem",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];

  function convertBelow1000(n: number): string {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      return u === 0 ? tens[t] : `${tens[t]} e ${units[u]}`;
    }
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    if (remainder === 0) return hundreds[h];
    const hWord = h === 1 ? "cento" : hundreds[h];
    return `${hWord} e ${convertBelow1000(remainder)}`;
  }

  function convert(n: number): string {
    if (n === 0) return "zero";
    if (n >= 1000) {
      const thousands = Math.floor(n / 1000);
      const remainder = n % 1000;
      const tWord =
        thousands === 1 ? "mil" : `${convertBelow1000(thousands)} mil`;
      if (remainder === 0) return tWord;
      return `${tWord} e ${convertBelow1000(remainder)}`;
    }
    return convertBelow1000(n);
  }

  let result = `${convert(euros)} euro${euros !== 1 ? "s" : ""}`;
  if (cents > 0) {
    result += ` e ${convert(cents)} cêntimo${cents !== 1 ? "s" : ""}`;
  }
  return result;
}

// Helper: number to words in Spanish (simplified for amounts up to €99,999)
function numberToWordsES(amount: number): string {
  const euros = Math.floor(amount);
  const cents = Math.round((amount - euros) * 100);

  const units = [
    "",
    "uno",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
  ];
  const teens = [
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciséis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
  ];
  const twenties = [
    "veinte",
    "veintiuno",
    "veintidós",
    "veintitrés",
    "veinticuatro",
    "veinticinco",
    "veintiséis",
    "veintisiete",
    "veintiocho",
    "veintinueve",
  ];
  const tens = [
    "",
    "",
    "veinte",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
  ];
  const hundreds = [
    "",
    "cien",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ];

  function convertBelow1000(n: number): string {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 30) return twenties[n - 20];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      return u === 0 ? tens[t] : `${tens[t]} y ${units[u]}`;
    }
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    if (remainder === 0) return hundreds[h];
    const hWord = h === 1 ? "ciento" : hundreds[h];
    return `${hWord} ${convertBelow1000(remainder)}`;
  }

  function convert(n: number): string {
    if (n === 0) return "cero";
    if (n >= 1000) {
      const thousands = Math.floor(n / 1000);
      const remainder = n % 1000;
      const tWord =
        thousands === 1 ? "mil" : `${convertBelow1000(thousands)} mil`;
      if (remainder === 0) return tWord;
      return `${tWord} ${convertBelow1000(remainder)}`;
    }
    return convertBelow1000(n);
  }

  let result = `${convert(euros)} euro${euros !== 1 ? "s" : ""}`;
  if (cents > 0) {
    result += ` con ${convert(cents)} céntimo${cents !== 1 ? "s" : ""}`;
  }
  return result;
}

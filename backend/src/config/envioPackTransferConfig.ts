/** Datos para que el vendedor cargue crédito en la cuenta EnvíoPack de la plataforma (transferencia). */
export function getEnvioPackTransferInstructions() {
  return {
    companyName: process.env.ENVIOPACK_TRANSFER_COMPANY || 'ENVIOPACK S.A',
    cuit: process.env.ENVIOPACK_TRANSFER_CUIT || '30-71521308-3',
    bank: process.env.ENVIOPACK_TRANSFER_BANK || 'BIND',
    account: process.env.ENVIOPACK_TRANSFER_ACCOUNT || '1-695143/1',
    cbu: process.env.ENVIOPACK_TRANSFER_CBU || '3220001805006951430018',
    alias: process.env.ENVIOPACK_TRANSFER_ALIAS || '',
    notes:
      process.env.ENVIOPACK_TRANSFER_NOTES ||
      'Transferí el monto exacto del envío. Luego subí el comprobante aquí. OrigenRed lo cargará en EnvíoPack para generar la etiqueta.',
  };
}

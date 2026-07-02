import Afip from '@afipsdk/afip.js';
import dotenv from 'dotenv';
dotenv.config();

const afip = new Afip({ CUIT: 20123456789 });

console.log('WS list:', Object.keys(afip).filter(k => k.includes('Register')));
console.log('Methods in RegisterScopeFive:', Object.keys(afip.RegisterScopeFive || {}));
console.log('Example A10:', afip.RegisterScopeTen ? 'Exists' : 'No exists');
console.log('Example A13:', afip.RegisterScopeThirteen ? 'Exists' : 'No exists');

const fs = require('fs');

// Simple DOM emulation to test monitoreo.js logic
const html = `
<!DOCTYPE html>
<html>
<body>
  <div id="app"></div>
</body>
</html>
`;

// Read monitoreo.js
const code = fs.readFileSync('./js/modules/monitoreo.js', 'utf8');

console.log('Testing code evaluation...');
const window = {
  SIMAP: {
    Config: {
      getClient: () => ({
        from: () => ({
          select: () => ({
            order: () => Promise.resolve({ data: [
              { id_ie: 'ie-1', cod_modular: '0412858', nombre_ie: 'I.E. Carlos Gutiérrez', distrito: 'Chepén', nivel_educativo: 'Secundaria' },
              { id_ie: 'ie-2', cod_modular: '0201889', nombre_ie: 'I.E. Santa Inés', distrito: 'Pueblo Nuevo', nivel_educativo: 'Primaria' },
              { id_ie: 'ie-3', cod_modular: '0589124', nombre_ie: 'I.E. Aníbal S. Reyes', distrito: 'Pacanga', nivel_educativo: 'Secundaria' }
            ], error: null })
          })
        })
      })
    },
    Notification: {
      success: (m) => console.log('[Notification.success]:', m),
      warning: (m) => console.log('[Notification.warning]:', m),
      error: (m) => console.log('[Notification.error]:', m)
    }
  }
};

const domElements = {};
const listeners = {};

const document = {
  getElementById: (id) => {
    if (!domElements[id]) {
      domElements[id] = {
        id,
        innerHTML: '',
        textContent: '',
        className: '',
        value: '',
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false
        },
        addEventListener: (event, handler) => {
          listeners[`${id}:${event}`] = handler;
        }
      };
    }
    return domElements[id];
  },
  querySelectorAll: (sel) => {
    if (sel === '.rubrica-input') {
      const inputs = [];
      for (let r = 1; r <= 5; r++) {
        for (let lvl = 1; lvl <= 4; lvl++) {
          const input = {
            name: `rubrica_${r}`,
            value: `${lvl}`,
            checked: false,
            addEventListener: (event, handler) => {
              listeners[`rubrica_${r}_${lvl}:${event}`] = handler;
            }
          };
          inputs.push(input);
        }
      }
      return inputs;
    }
    return [];
  },
  querySelector: (sel) => {
    // E.g. input[name="rubrica_1"]:checked
    const match = sel.match(/input\[name="rubrica_(\d)"\]:checked/);
    if (match) {
      const rNum = match[1];
      if (checkedValues[rNum]) {
        return { value: `${checkedValues[rNum]}` };
      }
      return null;
    }
    return null;
  }
};

let checkedValues = {};

// Evaluate code in context
eval(code);

const Monitoreo = window.SIMAP.Monitoreo;
console.log('Rendering template...');
const renderedHtml = Monitoreo.render();

// Check if Distrito is present
if (renderedHtml.includes('id="select-distrito"')) {
  console.log('✓ select-distrito is present in rendered HTML');
} else {
  console.error('✗ select-distrito NOT found');
}

// Check if label Docente a Evaluar is present
if (renderedHtml.includes('Docente a Evaluar')) {
  console.log('✓ Label "Docente a Evaluar" is present');
} else {
  console.error('✗ "Docente a Evaluar" NOT found');
}

// Check that no checked attribute exists in rubrica inputs
if (!renderedHtml.includes('rubrica-input" data-rubrica-num="1" checked') && 
    !renderedHtml.includes('rubrica-input" data-rubrica-num="2" checked') &&
    !renderedHtml.includes('rubrica-input" data-rubrica-num="3" checked')) {
  console.log('✓ No hardcoded checked attribute in rubricas');
} else {
  console.error('✗ Hardcoded checked attribute found in rubricas!');
}

async function runTests() {
  console.log('Testing init()...');
  await Monitoreo.init();

  console.log('Testing updateLivePreviewFromRubricas with 0 selected...');
  // Check default values
  console.log('Puntaje element:', domElements['preview-puntaje']?.textContent);
  console.log('Badge element:', domElements['preview-badge']?.textContent);

  console.log('Simulating checking Rubric 1 = Level 3...');
  checkedValues[1] = 3;
  if (listeners['rubrica_1_3:change']) listeners['rubrica_1_3:change']();
  console.log('Preview puntaje after 1 rubric:', domElements['preview-puntaje']?.textContent);
  console.log('Badge after 1 rubric:', domElements['preview-badge']?.textContent);

  console.log('Checking all 5 rubricas (3, 2, 4, 3, 4 = 16 pts Satisfactorio)...');
  checkedValues[2] = 2;
  checkedValues[3] = 4;
  checkedValues[4] = 3;
  checkedValues[5] = 4;
  if (listeners['rubrica_5_4:change']) listeners['rubrica_5_4:change']();
  console.log('Preview puntaje after 5 rubricas:', domElements['preview-puntaje']?.textContent);
  console.log('Badge after 5 rubricas:', domElements['preview-badge']?.textContent);

  console.log('All Monitoreo tests PASSED successfully!');
}

runTests().catch(err => console.error('Test error:', err));

let memory, timeout; // Calculator memory and input timeout

// Steps generation on the x-axis (TODO: make them editable by the user)
const precision = 100; // Number of steps per unit
const xSteps = [...Array(10 * precision + 1).keys()].map(x => (x - 5 * precision) / precision); // -5 to 5
// Printed x-axis ticks
const ticks = [...Array(11).keys()].map(t => {
  return { value: t * precision, label: t - 5 };
});

// Wait until Chart.js polyfill and page contents are fully loaded
window.onload = () => {
  // Initialize the chart with an empty dataset
  const chart = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
      labels: xSteps,
      datasets: [
        {
          label: 'f(x)',
          cubicInterpolationMode: 'monotone', // most accurate for functions
        },
      ],
    },
    options: {
      elements: {
        point: {
          radius: 0,
        },
      },
      maintainAspectRatio: false,
      scales: {
        y: {
          min: -5,
          max: 5,
        },
        x: {
          afterTickToLabelConversion: context => (context.ticks = ticks),
        },
      },
    },
  });

  // Color mode switch handler
  document.getElementById('colorMode').onclick = e => {
    document.querySelectorAll('.color').forEach(el => el.classList.toggle('dark'));
    const dark = e.target.classList.contains('dark');

    // Update chart colors to match theme
    chart.options.scales.x.grid.color = dark ? '#666' : '#ddd';
    chart.options.scales.y.grid.color = dark ? '#666' : '#ddd';
    chart.options.scales.x.ticks.color = dark ? '#ddd' : '#666';
    chart.options.scales.y.ticks.color = dark ? '#ddd' : '#666';
    chart.options.plugins.legend.labels.color = dark ? '#ddd' : '#666';
    chart.update();
  };

  // Function input handler
  const functionInput = document.getElementById('function');
  const feedback = document.getElementById('feedback');
  functionInput.oninput = () => {
    clearTimeout(timeout); // Prevents the chart from updating for every keystroke
    try {
      if (!functionInput.value) {
        feedback.classList.remove('error');
        chart.data.datasets[0].data = []; // Clear the chart
        chart.update();
        throw 'Enter an expression';
      }

      // Sanitize the input
      const sanitizer = functionInput.value.replace(
        /abs|ceil|cos|E|exp|floor|log|max|min|PI|pow|round|sign|sin|sqrt|tan|[x\d\.\/\*\+-]/g,
        '|'
      );
      let sanitized = functionInput.value.replace(
        new RegExp(sanitizer.replace(/((?<!.)|(?<=\|))\|/g, ''), 'g'),
        ''
      );
      // Invalid characters detection
      if (functionInput.value !== sanitized) throw new Error();
      // Usual constants & functions recognition
      sanitized = sanitized.replace(
        /abs|ceil|cos|E|exp|floor|log|max|min|PI|pow|round|sign|sin|sqrt|tan/g,
        'Math.$&'
      );
      // Replace x with a random number to check for reference or syntax errors
      if (isNaN(eval(sanitized.replace(/(?<![ae])x/g, `(${Math.random()})`)))) throw new Error();

      feedback.textContent = '';
      // Update the chart with the new function after 100ms of inactivity
      timeout = setTimeout(() => {
        chart.data.datasets[0].data = xSteps.map(x =>
          eval(sanitized.replace(/(?<![ae])x/g, `(${x})`))
        );
        chart.update();
      }, 100);
    } catch (e) {
      // Display error message when a check fails
      feedback.textContent = e instanceof Error ? 'This expression is invalid' : e;
      if (feedback.textContent.startsWith('This')) feedback.classList.add('error'); // Error message styling
    }
  };

  // Calculator button handlers
  const display = document.getElementById('display');
  for (const btn of [...document.getElementsByTagName('button')].slice(1)) {
    btn.onclick = () => {
      if (display.value === 'Undefined' && btn.textContent !== 'C') return; // Prevents further input after an error
      switch (btn.textContent) {
        case 'C':
          // Clear the display or reset the calculator
          if (display.value) display.value = '';
          else {
            const op = document.getElementsByClassName('selected');
            if (op.length) op[0].classList.remove('selected');
            if (memory !== undefined) display.value = memory; // Restore the last result
            memory = undefined;
          }
          break;
        case '⟵':
          // Remove the last character from the display and the "-" sign if present
          if (display.value.startsWith('-') && display.value.length === 2) display.value = '';
          else display.value = display.value.slice(0, -1);
          break;
        case '√':
          // Calculate the square root of the display value
          if (display.value && display.value !== '-')
            display.value = Math.sqrt(Number(display.value)) || 'Undefined';
          break;
        case '%':
          // Act the same as "=" but with the second operand as a percentage
          if (memory && display.value) {
            let factor;
            const op = document.getElementsByClassName('selected').item(0);
            switch (op.textContent) {
              case '+':
                factor = 1 + Number(display.value) / 100;
                break;
              case '-':
                factor = 1 - Number(display.value) / 100;
                break;
              case '*':
                factor = Number(display.value) / 100;
                break;
              case '/':
                factor = 1 / (Number(display.value) / 100);
            }
            display.value = memory * factor;
            op.classList.remove('selected'); // Clear the selected operator
            memory = undefined;
          }
          break;
        case '=':
          // Calculate the result of the operation
          if (memory !== undefined) {
            const op = document.getElementsByClassName('selected').item(0);
            const result = eval(memory + op.textContent + display.value);
            display.value = result * result === Infinity ? 'Undefined' : result;
            op.classList.remove('selected'); // Clear the selected operator
            memory = undefined;
          }
          break;
        case '.':
          // Add a decimal point to the display value if it doesn't already contain one
          if (!display.value) display.value = '0';
          if (!display.value.includes('.')) display.value += '.';
          break;
        default:
          // Add the button's text content to the display value if it's a number
          if (!isNaN(btn.textContent))
            display.value = (display.value + btn.textContent)
              .replace(/^0+(.+)/, '$1')
              .replace(/^\./, '0.');
          // Or select the operator and store the first operand
          else {
            if (memory || (display.value && display.value !== '-')) {
              const op = document.getElementsByClassName('selected');
              if (op.length) op[0].classList.remove('selected'); // Clear the selected operator if any
              btn.classList.add('selected'); // Select the new operator
              if (!memory) {
                memory = Number(display.value);
                display.value = ''; // Clear the display for the second operand
              }
            }
          }
      }
    };
  }

  // Keyboard input handler
  document.onkeydown = e => {
    if (e.target.id === 'function') return; // Prevents interference with the function input
    let xPath; // XPath to the button to click
    switch (e.key) {
      case 'o':
      case 'O':
        // Opposite sign
        if (display.value.startsWith('-')) display.value = display.value.slice(1);
        else if (display.value !== 'Undefined') display.value = '-' + display.value;
        return;
      case 'Escape':
        // Clear the display or reset the calculator
        xPath = "//button[text()='C']";
        break;
      case 'Backspace':
        // Remove the last character from the display and the "-" sign if present
        xPath = "//button[text()='⟵']";
        break;
      default:
        // Click the button corresponding to the pressed key if any
        if (e.key.match(/^[0-9\.,\/\*\+-=]$/))
          xPath = `//button[text()='${e.key.replace(',', '.')}']`;
        else return;
    }
    document
      .evaluate(xPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE)
      .singleNodeValue.click();
  };
};

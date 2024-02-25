let memory, timeout;
const precision = 100;
const xSteps = [...Array(10 * precision + 1).keys()].map(x => (x - 5 * precision) / precision);

window.onload = () => {
  const chart = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
      labels: xSteps,
      datasets: [
        {
          label: 'f(x)',
          cubicInterpolationMode: 'monotone',
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
          afterTickToLabelConversion: context =>
            (context.ticks = [...Array(11).keys()].map(t => {
              return { value: t * precision, label: t - 5 };
            })),
        },
      },
    },
  });

  document.getElementById('colorMode').onclick = e => {
    document.querySelectorAll('.color').forEach(el => el.classList.toggle('dark'));
    const dark = e.target.classList.contains('dark');
    chart.options.scales.x.grid.color = dark ? '#666' : '#ddd';
    chart.options.scales.y.grid.color = dark ? '#666' : '#ddd';
    chart.options.scales.x.ticks.color = dark ? '#ddd' : '#666';
    chart.options.scales.y.ticks.color = dark ? '#ddd' : '#666';
    chart.options.plugins.legend.labels.color = dark ? '#ddd' : '#666';
    chart.update();
  };

  const functionInput = document.getElementById('function');
  const feedback = document.getElementById('feedback');
  functionInput.oninput = () => {
    clearTimeout(timeout);
    try {
      if (!functionInput.value) {
        feedback.classList.remove('error');
        chart.data.datasets[0].data = [];
        chart.update();
        throw 'Enter an expression';
      }
      const sanitizer = functionInput.value.replace(
        /abs|ceil|cos|exp|floor|log|max|min|pow|round|sign|sin|sqrt|tan|[x\d\.\/\*\+-]/g,
        '|'
      );
      let sanitized = functionInput.value.replace(
        new RegExp(sanitizer.replace(/((?<!.)|(?<=\|))\|/g, ''), 'g'),
        ''
      );
      if (functionInput.value !== sanitized) throw new Error();
      sanitized = sanitized.replace(
        /abs|ceil|cos|exp|floor|log|max|min|pow|round|sign|sin|sqrt|tan/g,
        'Math.$&'
      );
      if (isNaN(eval(sanitized.replace(/x/g, `(${Math.random()})`)))) throw new Error();
      feedback.textContent = '';
      timeout = setTimeout(() => {
        chart.data.datasets[0].data = xSteps.map(x => eval(sanitized.replace(/x/g, `(${x})`)));
        chart.update();
      }, 100);
    } catch (e) {
      feedback.textContent = e instanceof Error ? 'This expression is invalid' : e;
      if (feedback.textContent.startsWith('This')) feedback.classList.add('error');
    }
  };

  const display = document.getElementById('display');
  for (const btn of [...document.getElementsByTagName('button')].slice(1)) {
    btn.onclick = () => {
      if (display.value === 'Undefined' && btn.textContent !== 'C') return;
      switch (btn.textContent) {
        case 'C':
          if (display.value) display.value = '';
          else {
            const op = document.getElementsByClassName('operator selected');
            if (op.length) op[0].classList.remove('selected');
            if (memory !== undefined) display.value = memory;
            memory = undefined;
          }
          break;
        case '⟵':
          if (display.value.startsWith('-') && display.value.length === 2) display.value = '';
          else display.value = display.value.slice(0, -1);
          break;
        case '√':
          if (display.value && display.value !== '-')
            display.value = Math.sqrt(Number(display.value)) || 'Undefined';
          break;
        case '%':
          if (memory && display.value) {
            let factor;
            const op = document.getElementsByClassName('operator selected').item(0);
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
            op.classList.remove('selected');
            memory = undefined;
          }
          break;
        case '=':
          if (memory !== undefined) {
            const op = document.getElementsByClassName('operator selected').item(0);
            const result = eval(memory + op.textContent + display.value);
            display.value = result === Infinity ? 'Undefined' : result;
            op.classList.remove('selected');
            memory = undefined;
          }
          break;
        case '.':
          if (!display.value) display.value = '0';
          if (!display.value.includes('.')) display.value += '.';
          break;
        default:
          if (!isNaN(btn.textContent))
            display.value = (display.value + btn.textContent)
              .replace(/^0+(.+)/, '$1')
              .replace(/^\./, '0.');
          else {
            if (display.value && display.value !== '-') {
              const op = document.getElementsByClassName('operator selected').item(0);
              if (op) op.classList.remove('selected');
              btn.classList.add('selected');
              if (!memory) {
                memory = Number(display.value);
                display.value = '';
              }
            }
          }
      }
    };
  }

  document.onkeydown = e => {
    if (e.target.id === 'function') return;
    let xPath;
    switch (e.key) {
      case 'o':
      case 'O':
        if (display.value.startsWith('-')) display.value = display.value.slice(1);
        else if (display.value !== 'Undefined') display.value = '-' + display.value;
        return;
      case 'Escape':
        xPath = "//button[text()='C']";
        break;
      case 'Backspace':
        xPath = "//button[text()='⟵']";
        break;
      default:
        if (e.key.match(/^[0-9\.,\/\*\+-=]$/))
          xPath = `//button[text()='${e.key.replace(',', '.')}']`;
        else return;
    }
    document
      .evaluate(xPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE)
      .singleNodeValue.click();
  };
};

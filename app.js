// --- Módulo de cálculos financieros ---------------------------------------

/**
 * Calcula la rentabilidad anual neta aplicando la comisión anual (TER).
 * @param {number} grossAnnualRate Rentabilidad anual bruta (%).
 * @param {number} annualFeeRate Comisión anual (%).
 * @returns {number} Rentabilidad anual neta en formato decimal (ej. 0.05 = 5%).
 */
function calculateNetAnnualReturn(grossAnnualRate, annualFeeRate) {
  const grossFactor = 1 + grossAnnualRate / 100;
  const feeFactor = 1 - annualFeeRate / 100;
  return grossFactor * feeFactor - 1;
}

/**
 * Convierte la rentabilidad anual neta en rentabilidad mensual neta.
 * @param {number} netAnnualRate Rentabilidad anual neta en formato decimal.
 * @returns {number} Rentabilidad mensual neta en formato decimal.
 */
function calculateMonthlyRate(netAnnualRate) {
  const base = 1 + netAnnualRate;
  if (base <= 0) {
    // Pérdida total o superior al 100 % en el año: devolvemos -100 % mensual para evitar NaN.
    return -1;
  }
  return Math.pow(base, 1 / 12) - 1;
}

/**
 * Genera la serie de simulación mensual y métricas agregadas.
 * @param {Object} params Parámetros de entrada.
 * @param {number} params.initialCapital Capital inicial (P).
 * @param {number} params.monthlyContribution Aportación mensual (C).
 * @param {number} params.grossAnnualReturn Rentabilidad anual bruta (%).
 * @param {number} params.annualFee Comisión anual (%).
 * @param {number} params.annualInflation Inflación anual (%).
 * @param {number} params.years Duración en años.
 * @returns {{series: Array, summary: Object}} Serie mensual y resumen.
 */
function generateMonthlySeries(params) {
  const {
    initialCapital,
    monthlyContribution,
    grossAnnualReturn,
    annualFee,
    annualInflation,
    years
  } = params;

  const netAnnualRate = calculateNetAnnualReturn(grossAnnualReturn, annualFee);
  const monthlyRate = calculateMonthlyRate(netAnnualRate);
  const totalMonths = Math.round(years * 12);

  let balance = initialCapital;
  let totalContributed = initialCapital;
  const series = [];

  for (let month = 1; month <= totalMonths; month += 1) {
    if (monthlyRate !== 0) {
      balance *= 1 + monthlyRate;
    }

    // Aportación mensual al final del periodo.
    balance += monthlyContribution;
    totalContributed += monthlyContribution;

    const interestAccumulated = balance - totalContributed;

    series.push({
      month,
      totalContributed,
      interestAccumulated,
      totalValue: balance
    });
  }

  // Fórmula de valor futuro con aportaciones al final de cada mes.
  const growthFactor = Math.pow(1 + monthlyRate, totalMonths);
  const futureValueFormula = Math.abs(monthlyRate) < 1e-12
    ? initialCapital + monthlyContribution * totalMonths
    : initialCapital * growthFactor + monthlyContribution * ((growthFactor - 1) / monthlyRate);

  const futureValue = Number.isFinite(futureValueFormula)
    ? futureValueFormula
    : series.length > 0
      ? series[series.length - 1].totalValue
      : initialCapital;

  const totalContributions = initialCapital + monthlyContribution * totalMonths;
  const totalGrowth = futureValue - totalContributions;
  const inflationFactor = Math.pow(1 + annualInflation / 100, years);
  const futureValueReal = inflationFactor !== 0 ? futureValue / inflationFactor : futureValue;

  return {
    series,
    summary: {
      netAnnualRate,
      monthlyRate,
      totalMonths,
      futureValue,
      futureValueReal,
      totalContributed: totalContributions,
      totalGrowth
    }
  };
}

// --- Capa de UI ------------------------------------------------------------

const form = document.getElementById('parameters-form');
const clearButton = document.getElementById('clear-button');
const exportButton = document.getElementById('export-button');
const saveButton = document.getElementById('save-button');
const themeSwitch = document.getElementById('theme-switch');

const kpiNominal = document.getElementById('kpi-nominal');
const kpiReal = document.getElementById('kpi-real');
const kpiContributed = document.getElementById('kpi-contributed');
const kpiGrowth = document.getElementById('kpi-growth');

const tableBody = document.getElementById('table-body');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

const numberFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2
});

const numberFormatterNoCurrency = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const state = {
  chartInstance: null,
  series: [],
  currentPage: 1,
  rowsPerPage: 50
};

function getFieldElements() {
  return Array.from(form.querySelectorAll('.field'));
}

function parseFormValues() {
  return {
    initialCapital: Number(form.initialCapital.value),
    monthlyContribution: Number(form.monthlyContribution.value),
    grossAnnualReturn: Number(form.grossReturn.value),
    annualFee: Number(form.annualFee.value),
    annualInflation: Number(form.inflation.value),
    years: Number(form.years.value)
  };
}

function validateInputs(values) {
  const errors = {};

  if (!Number.isFinite(values.initialCapital) || values.initialCapital < 0) {
    errors.initialCapital = 'Introduce un número mayor o igual a 0.';
  }

  if (!Number.isFinite(values.monthlyContribution) || values.monthlyContribution < 0) {
    errors.monthlyContribution = 'Introduce un número mayor o igual a 0.';
  }

  if (!Number.isFinite(values.grossAnnualReturn)) {
    errors.grossReturn = 'Introduce un número válido.';
  }

  if (!Number.isFinite(values.annualFee) || values.annualFee < 0) {
    errors.annualFee = 'Introduce una comisión mayor o igual a 0.';
  }

  if (!Number.isFinite(values.annualInflation) || values.annualInflation < 0) {
    errors.inflation = 'Introduce una inflación mayor o igual a 0.';
  }

  if (!Number.isFinite(values.years) || values.years < 1 || values.years > 50 || !Number.isInteger(values.years)) {
    errors.years = 'La duración debe ser un entero entre 1 y 50.';
  }

  return errors;
}

function clearErrors() {
  getFieldElements().forEach((field) => {
    const errorEl = field.querySelector('.error');
    if (errorEl) {
      errorEl.textContent = '';
    }
  });
}

function showErrors(errors) {
  getFieldElements().forEach((field) => {
    const input = field.querySelector('input');
    const errorEl = field.querySelector('.error');
    if (input && errorEl) {
      const key = input.name;
      errorEl.textContent = errors[key] || '';
    }
  });
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return numberFormatter.format(value);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return numberFormatterNoCurrency.format(value);
}

function updateKpis(summary) {
  kpiNominal.textContent = formatCurrency(summary.futureValue);
  kpiReal.textContent = formatCurrency(summary.futureValueReal);
  kpiContributed.textContent = formatCurrency(summary.totalContributed);
  kpiGrowth.textContent = formatCurrency(summary.totalGrowth);
}

function createChart(series) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js no disponible, se omite el gráfico.');
    return;
  }

  const ctx = document.getElementById('growth-chart');
  const labels = series.map((item) => `Mes ${item.month}`);
  const contributions = series.map((item) => item.totalContributed);
  const totals = series.map((item) => item.totalValue);

  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  state.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Total aportado acumulado',
          data: contributions,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.2)',
          tension: 0.2,
          fill: false
        },
        {
          label: 'Valor total de la cartera',
          data: totals,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.2)',
          tension: 0.2,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: (value) => formatCurrency(Number(value))
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      }
    }
  });
}

function renderTable(page) {
  const { rowsPerPage, series } = state;
  const totalPages = Math.max(1, Math.ceil(series.length / rowsPerPage));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  state.currentPage = currentPage;

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageItems = series.slice(start, end);

  tableBody.innerHTML = '';

  pageItems.forEach((item) => {
    const row = document.createElement('tr');

    const monthCell = document.createElement('td');
    monthCell.textContent = item.month;
    row.appendChild(monthCell);

    const contributedCell = document.createElement('td');
    contributedCell.textContent = formatCurrency(item.totalContributed);
    row.appendChild(contributedCell);

    const interestCell = document.createElement('td');
    interestCell.textContent = formatCurrency(item.interestAccumulated);
    row.appendChild(interestCell);

    const valueCell = document.createElement('td');
    valueCell.textContent = formatCurrency(item.totalValue);
    row.appendChild(valueCell);

    tableBody.appendChild(row);
  });

  prevPageButton.disabled = currentPage === 1;
  nextPageButton.disabled = currentPage === totalPages || series.length === 0;
  pageInfo.textContent = series.length > 0 ? `Página ${currentPage} / ${totalPages}` : 'Página 0 / 0';
}

function handleExport() {
  if (!state.series.length) {
    return;
  }

  const header = 'Mes,Aportación acumulada,Intereses acumulados,Valor total\n';
  const rows = state.series
    .map((item) => [
      item.month,
      formatNumber(item.totalContributed),
      formatNumber(item.interestAccumulated),
      formatNumber(item.totalValue)
    ].join(','))
    .join('\n');

  const csvContent = header + rows;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'investment-simulator.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function clearResults() {
  state.series = [];
  state.currentPage = 1;
  tableBody.innerHTML = '';
  kpiNominal.textContent = '—';
  kpiReal.textContent = '—';
  kpiContributed.textContent = '—';
  kpiGrowth.textContent = '—';
  pageInfo.textContent = 'Página 0 / 0';
  prevPageButton.disabled = true;
  nextPageButton.disabled = true;
  exportButton.disabled = true;

  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }
}

function handleFormSubmit(event) {
  event.preventDefault();
  clearErrors();

  const values = parseFormValues();
  const errors = validateInputs(values);

  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    clearResults();
    return;
  }

  const { series, summary } = generateMonthlySeries(values);
  state.series = series;
  updateKpis(summary);
  renderTable(1);
  createChart(series);
  exportButton.disabled = false;
}

function handleClear() {
  form.reset();
  clearErrors();
  clearResults();
}

function saveParameters() {
  const values = parseFormValues();
  const errors = validateInputs(values);

  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }

  localStorage.setItem('investment-simulator-params', JSON.stringify(values));
  saveButton.textContent = 'Guardado ✔';
  setTimeout(() => {
    saveButton.textContent = 'Guardar parámetros';
  }, 2000);
}

function restoreParameters() {
  const stored = localStorage.getItem('investment-simulator-params');
  if (!stored) {
    return;
  }

  try {
    const values = JSON.parse(stored);
    form.initialCapital.value = values.initialCapital ?? '';
    form.monthlyContribution.value = values.monthlyContribution ?? '';
    form.grossReturn.value = values.grossAnnualReturn ?? '';
    form.annualFee.value = values.annualFee ?? '';
    form.inflation.value = values.annualInflation ?? '';
    form.years.value = values.years ?? '';
  } catch (error) {
    console.error('No se pudieron restaurar los parámetros guardados.', error);
  }
}

function applyStoredTheme() {
  const storedTheme = localStorage.getItem('investment-simulator-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark;

  document.body.classList.toggle('dark', shouldUseDark);
  themeSwitch.checked = shouldUseDark;
}

function handleThemeToggle() {
  const isDark = themeSwitch.checked;
  document.body.classList.toggle('dark', isDark);
  localStorage.setItem('investment-simulator-theme', isDark ? 'dark' : 'light');
}

prevPageButton.addEventListener('click', () => {
  renderTable(state.currentPage - 1);
});

nextPageButton.addEventListener('click', () => {
  renderTable(state.currentPage + 1);
});

form.addEventListener('submit', handleFormSubmit);
clearButton.addEventListener('click', handleClear);
exportButton.addEventListener('click', handleExport);
saveButton.addEventListener('click', saveParameters);
themeSwitch.addEventListener('change', handleThemeToggle);

document.addEventListener('DOMContentLoaded', () => {
  applyStoredTheme();
  restoreParameters();
});

// --- Pruebas rápidas con console.assert -----------------------------------
(function runQuickTests() {
  const almostEqual = (a, b, tolerance = 1e-6) => Math.abs(a - b) <= tolerance;

  // Caso r_m = 0
  const zeroRateParams = {
    initialCapital: 1000,
    monthlyContribution: 100,
    grossAnnualReturn: 0,
    annualFee: 0,
    annualInflation: 0,
    years: 2
  };
  const zeroRateResult = generateMonthlySeries(zeroRateParams);
  console.assert(
    almostEqual(zeroRateResult.summary.futureValue, 1000 + 100 * 24),
    'FV debe coincidir con la suma de aportaciones cuando r_m = 0'
  );

  // Caso años = 1
  const oneYear = generateMonthlySeries({
    initialCapital: 0,
    monthlyContribution: 200,
    grossAnnualReturn: 6,
    annualFee: 0,
    annualInflation: 0,
    years: 1
  });
  console.assert(
    oneYear.summary.totalMonths === 12,
    'La duración de 1 año debe producir 12 meses'
  );

  // Caso años = 30
  const thirtyYears = generateMonthlySeries({
    initialCapital: 1000,
    monthlyContribution: 50,
    grossAnnualReturn: 5,
    annualFee: 0.5,
    annualInflation: 2,
    years: 30
  });
  console.assert(
    thirtyYears.summary.totalMonths === 360,
    'La duración de 30 años debe producir 360 meses'
  );

  // Caso sin aportaciones mensuales
  const noContribution = generateMonthlySeries({
    initialCapital: 5000,
    monthlyContribution: 0,
    grossAnnualReturn: 6,
    annualFee: 0.5,
    annualInflation: 1.5,
    years: 10
  });
  console.assert(
    almostEqual(noContribution.summary.totalContributed, 5000),
    'El total aportado debe coincidir con el capital inicial cuando C = 0'
  );

  // Caso con inflación alta
  const highInflation = generateMonthlySeries({
    initialCapital: 1000,
    monthlyContribution: 200,
    grossAnnualReturn: 5,
    annualFee: 0.5,
    annualInflation: 15,
    years: 5
  });
  console.assert(
    highInflation.summary.futureValueReal < highInflation.summary.futureValue,
    'Con inflación alta, el valor real debe ser menor que el nominal'
  );
})();

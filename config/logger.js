const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
  magenta: '\x1b[35m'
};

const box = (text) => {
  const width = 50;
  const line = '='.repeat(width);
  const padding = Math.floor((width - text.length) / 2);
  const centeredText = ' '.repeat(padding) + text + ' '.repeat(padding);
  
  console.log(colors.magenta + line + colors.reset);
  console.log(colors.magenta + centeredText + colors.reset);
  console.log(colors.magenta + line + colors.reset);
};

const log = {
  header: () => {
    box("Somnia Exchange Auto Swap Bot");
    box("Created by: @airdropalc");
  },
  info: (msg) => console.log(`${colors.green}[INFO] ${msg}${colors.reset}`),
  wallet: (msg) => console.log(`${colors.yellow}[WALLET] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[ERROR] ${msg}${colors.reset}`), 
  success: (msg) => console.log(`${colors.green}[SUCCESS] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[LOADING] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[STEP] ${msg}${colors.reset}`),
  tx: (msg) => console.log(`${colors.cyan}[TX] ${msg}${colors.reset}`),
  explorer: (msg) => console.log(`${colors.cyan}[EXPLORER] ${msg}${colors.reset}`),
  proxy: (msg) => console.log(`${colors.cyan}[PROXY] ${msg}${colors.reset}`),
};

module.exports = log;